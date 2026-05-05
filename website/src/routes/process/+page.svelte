<script lang="ts">
  import { onMount } from "svelte";
  import { slide } from "svelte/transition";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Separator } from "$lib/components/ui/separator";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Popover from "$lib/components/ui/popover";
  import { Calendar } from "$lib/components/ui/calendar";
  import {
    ArrowLeft,
    ArrowUpRight,
    Check,
    ChevronDown,
    ChevronRight,
    Copy,
    Download,
    LoaderCircle,
    Puzzle,
  } from "@lucide/svelte";
  import {
    today,
    getLocalTimeZone,
    type DateValue,
    type CalendarDate,
  } from "@internationalized/date";
  import { decodePayload, encodePayload, type SharePayload } from "$lib/share";
  import { track, bucketDays } from "$lib/analytics";
  import {
    TERM_SEP_PRESETS,
    CARD_SEP_PRESETS,
    resolveTermSep,
    resolveCardSep,
    formatCards,
    toCsv,
    saveFile,
  } from "$lib/export/formatting";
  import type { FlashcardSet } from "$lib/export/types";
  import { CWS_URL } from "$lib/site";

  // ────────── State ──────────

  type DownloadKind = "txt" | "csv" | "json" | "pdf-list" | "pdf-cards" | "anki";

  const SHARE_URL_MAX = 8000;

  // Separators persist across visits via localStorage (client-only with ssr=false).
  const savedTerm =
    typeof localStorage !== "undefined" ? localStorage.getItem("quickcards:termSep") : null;
  const savedCard =
    typeof localStorage !== "undefined" ? localStorage.getItem("quickcards:cardSep") : null;
  // Same persistence for the Anki pacing toggle. When false, the apkg ships
  // no FSRS preset and Anki uses the user's existing default scheduling.
  const savedAnkiPace =
    typeof localStorage !== "undefined" ? localStorage.getItem("quickcards:ankiPace") : null;

  let payload = $state<SharePayload | null>(null);
  // True when the page was opened via `?d=local` (sessionStorage handoff from
  // the homepage). Local payloads aren't reachable by anyone but the current
  // tab, so the "Share link" affordance is meaningless and gets hidden.
  let isLocal = $state(false);
  let copied = $state(false);
  let previewOpen = $state(false);
  let busy = $state<DownloadKind | null>(null);

  const anyBusy = $derived(busy !== null);

  let termSepValue = $state(savedTerm || "Tab");
  let cardSepValue = $state(savedCard || "Newline");
  let ankiPace = $state(savedAnkiPace !== "0");

  $effect(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("quickcards:termSep", termSepValue);
      localStorage.setItem("quickcards:cardSep", cardSepValue);
      localStorage.setItem("quickcards:ankiPace", ankiPace ? "1" : "0");
    }
  });

  // Anki dialog state
  const tz = getLocalTimeZone();
  const todayDate = today(tz);
  let ankiOpen = $state(false);
  let ankiSelected = $state<DateValue>(todayDate.add({ days: 14 }));

  const ankiDays = $derived(diffDays(todayDate, ankiSelected));

  function diffDays(from: DateValue, to: DateValue): number {
    const fromMs = from.toDate(tz).getTime();
    const toMs = to.toDate(tz).getTime();
    return Math.round((toMs - fromMs) / 86_400_000);
  }

  function setDaysFromInput(days: number) {
    if (!Number.isFinite(days) || days < 1) return;
    ankiSelected = todayDate.add({ days });
  }

  // ────────── Load payload from URL ──────────

  onMount(() => {
    const d = page.url.searchParams.get("d");
    if (!d) {
      goto(resolve("/"), { replaceState: true });
      return;
    }
    if (d === "local") {
      isLocal = true;
      const raw = sessionStorage.getItem("quickcards:payload");
      if (!raw) {
        goto(resolve("/"), { replaceState: true });
        return;
      }
      try {
        payload = JSON.parse(raw) as SharePayload;
      } catch {
        goto(resolve("/"), { replaceState: true });
      }
    } else {
      const decoded = decodePayload(d);
      if (!decoded) {
        goto(resolve("/"), { replaceState: true });
        return;
      }
      payload = decoded;
    }

    // Warm the export chunks + sql.js WASM in the background so the first
    // click doesn't pay for the initial download / wasm init.
    if (payload?.kind === "vocab") {
      const warm = () => {
        void import("$lib/export/pdf-list");
        void import("$lib/export/pdf-flashcards");
        void import("$lib/export/anki");
        void import("$lib/export/sql").then((m) => m.getSQL());
      };
      if (typeof requestIdleCallback === "function") {
        requestIdleCallback(warm);
      } else {
        setTimeout(warm, 0);
      }
    }
  });

  // ────────── Vocab helpers ──────────

  const set = $derived<FlashcardSet | null>(payload?.kind === "vocab" ? payload.set : null);
  const cardCount = $derived(set?.cards.length ?? 0);

  const recommendedPace = $derived.by(() => {
    if (!set) return "";
    const perDay = Math.max(1, Math.ceil(cardCount / Math.max(1, ankiDays * 0.6)));
    return `Recommended pace: ~${perDay} card${perDay === 1 ? "" : "s"}/day`;
  });

  // ────────── Copy ──────────

  async function copyToClipboard() {
    if (!set || copied || anyBusy) return;
    const text = formatCards(set, resolveTermSep(termSepValue), resolveCardSep(cardSepValue));
    await navigator.clipboard.writeText(text);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }

  // ────────── Downloads ──────────

  const baseName = $derived(set?.title?.trim() || "flashcards");

  async function runDownload(kind: DownloadKind, fn: () => Promise<"ok" | "cancelled">) {
    if (anyBusy || !set) return;
    busy = kind;
    try {
      const outcome = await fn();
      if (outcome === "ok") track("Export", { format: kind });
    } catch (err) {
      console.error(`[QuickCards] ${kind} export failed:`, err);
    } finally {
      busy = null;
    }
  }

  function exportTxt() {
    runDownload("txt", () =>
      saveFile(
        () =>
          formatCards(
            set as FlashcardSet,
            resolveTermSep(termSepValue),
            resolveCardSep(cardSepValue),
          ),
        `${baseName}.txt`,
        "text/plain",
      ),
    );
  }

  function exportCsv() {
    runDownload("csv", () =>
      saveFile(() => toCsv(set as FlashcardSet), `${baseName}.csv`, "text/csv"),
    );
  }

  function exportJson() {
    runDownload("json", () =>
      saveFile(() => JSON.stringify(set, null, 2), `${baseName}.json`, "application/json"),
    );
  }

  function exportPdfList() {
    runDownload("pdf-list", () =>
      saveFile(
        async () => {
          const { generateListPDF } = await import("$lib/export/pdf-list");
          return generateListPDF(set as FlashcardSet).output("arraybuffer");
        },
        `${baseName}-list.pdf`,
        "application/pdf",
      ),
    );
  }

  function exportPdfFlashcards() {
    runDownload("pdf-cards", () =>
      saveFile(
        async () => {
          const { generateFlashcardsPDF } = await import("$lib/export/pdf-flashcards");
          return generateFlashcardsPDF(set as FlashcardSet).output("arraybuffer");
        },
        `${baseName}-cards.pdf`,
        "application/pdf",
      ),
    );
  }

  function exportAnki() {
    if (anyBusy || !set) return;
    const withPreset = ankiPace;
    runDownload("anki", async () => {
      const outcome = await saveFile(
        async () => {
          const [{ buildAnkiPackage }, { getSQL }] = await Promise.all([
            import("$lib/export/anki"),
            import("$lib/export/sql"),
          ]);
          const SQL = await getSQL();
          return buildAnkiPackage({
            set: set as FlashcardSet,
            days: ankiDays,
            SQL,
            withPreset,
          });
        },
        `${baseName}.apkg`,
        "application/octet-stream",
      );
      if (outcome === "ok") {
        ankiOpen = false;
        if (withPreset) track("Anki days", { range: bucketDays(ankiDays) });
      }
      return outcome;
    });
  }

  // ────────── Share URL ──────────

  let shareCopied = $state(false);
  let shareFailed = $state(false);

  /** Computes the current `/process` URL. Name, description, cards are all in the
   *  compressed `?d=` payload (no separate query params). */
  function buildShareUrl(): { url: string; tooLong: boolean } {
    if (!payload) return { url: "/process", tooLong: false };
    const encoded = encodePayload(payload);
    if (encoded.length > SHARE_URL_MAX) {
      sessionStorage.setItem("quickcards:payload", JSON.stringify(payload));
      return { url: "/process?d=local", tooLong: true };
    }
    return { url: `/process?d=${encoded}`, tooLong: false };
  }

  /** Sync the address bar with the current payload. No navigation. */
  function syncUrl() {
    if (!payload) return;
    const { url } = buildShareUrl();
    history.replaceState(history.state, "", url);
  }

  async function copyShareUrl() {
    if (!payload) return;
    const { url, tooLong } = buildShareUrl();
    if (tooLong) {
      shareFailed = true;
      setTimeout(() => (shareFailed = false), 2200);
      return;
    }
    history.replaceState(history.state, "", url);
    await navigator.clipboard.writeText(`${window.location.origin}${url}`);
    shareCopied = true;
    track("Share link");
    setTimeout(() => (shareCopied = false), 1500);
  }
</script>

<svelte:head>
  <title>Export · QuickCards</title>
  <meta name="robots" content="noindex,nofollow" />
</svelte:head>

{#if !payload}
  <!-- Mount is pulling the payload; keep empty for the brief flash. -->
  <div class="flex min-h-screen items-center justify-center">
    <LoaderCircle class="text-muted-foreground size-6 animate-spin" />
  </div>
{:else if payload.kind === "quizlet"}
  <!-- ──────── Extension-required view ──────── -->
  <div class="mx-auto max-w-[640px] px-6 py-16 sm:py-20">
    <Button variant="ghost" size="sm" href="/" class="-ml-2.5">
      <ArrowLeft />
      Back
    </Button>

    <h1 class="mt-12 text-3xl font-semibold tracking-tight">Quizlet links need the extension</h1>
    <p class="text-muted-foreground mt-3 text-[15px] leading-7">
      We can't fetch Quizlet sets from the web directly. Cloudflare blocks cross-origin requests.
      The extension runs inside your own browser session, so it works around this without any
      workarounds of ours.
    </p>

    <div class="mt-8 flex flex-wrap gap-3">
      <Button href={CWS_URL}>
        <Puzzle />
        Add to Chrome
      </Button>
      <Button variant="outline" href="/">
        <ArrowLeft />
        Back to paste
      </Button>
    </div>

    <div class="mt-16">
      <p class="text-muted-foreground text-sm">
        {payload.sets.length === 1 ? "Set you pasted:" : `${payload.sets.length} sets you pasted:`}
      </p>
      <ul class="mt-3 space-y-2">
        {#each payload.sets as ref (ref.id)}
          <li>
            <!-- eslint-disable svelte/no-navigation-without-resolve -- ref.url is an external Quizlet URL, not a route on our site -->
            <a
              href={ref.url}
              target="_blank"
              rel="noopener"
              class="text-primary inline-flex items-center gap-1.5 text-sm hover:underline"
            >
              {ref.url}
              <ArrowUpRight class="size-3.5" />
            </a>
            <!-- eslint-enable svelte/no-navigation-without-resolve -->
          </li>
        {/each}
      </ul>
    </div>
  </div>
{:else if payload.kind === "vocab" && set}
  <!-- ──────── Export view ──────── -->
  <div class="mx-auto max-w-[640px] px-6 py-12">
    <div class="flex items-center justify-between">
      <Button variant="ghost" size="sm" href="/" class="-ml-2.5">
        <ArrowLeft />
        Back
      </Button>
      {#if !isLocal}
        <Button variant="ghost" size="sm" onclick={copyShareUrl}>
          {#if shareCopied}
            <Check />
            Link copied
          {:else if shareFailed}
            <Copy />
            Too large to share
          {:else}
            <Copy />
            Share link
          {/if}
        </Button>
      {/if}
    </div>

    <div class="mt-10 flex items-baseline justify-between gap-4">
      <input
        type="text"
        bind:value={payload.set.title}
        onblur={syncUrl}
        placeholder="Untitled set"
        spellcheck="false"
        aria-label="Set title"
        class="placeholder:text-muted-foreground/40 min-w-0 flex-1 bg-transparent text-3xl font-semibold tracking-tight outline-none"
      />
      <span class="text-muted-foreground shrink-0 text-sm">
        <span class="text-foreground font-semibold tabular-nums">{cardCount}</span>
        {cardCount === 1 ? "card" : "cards"}
      </span>
    </div>

    <!-- Preview -->
    <div class="mt-8">
      <button
        type="button"
        onclick={() => (previewOpen = !previewOpen)}
        class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ChevronRight class="size-3.5 transition-transform {previewOpen ? 'rotate-90' : ''}" />
        Preview
      </button>
      {#if previewOpen}
        <div class="border-border mt-3 max-h-64 overflow-y-auto rounded-md border">
          <table class="w-full text-sm">
            <tbody>
              {#each set.cards.slice(0, 20) as card, i (i)}
                <tr class="border-border border-b last:border-0 {i % 2 === 1 ? 'bg-muted/30' : ''}">
                  <td class="w-2/5 max-w-0 truncate px-3 py-1.5 font-medium">{card.term}</td>
                  <td class="text-muted-foreground max-w-0 truncate px-3 py-1.5"
                    >{card.definition}</td
                  >
                </tr>
              {/each}
              {#if set.cards.length > 20}
                <tr>
                  <td colspan="2" class="text-muted-foreground px-3 py-2 text-center text-xs">
                    … and {set.cards.length - 20} more
                  </td>
                </tr>
              {/if}
            </tbody>
          </table>
        </div>
      {/if}
    </div>

    <!-- Separators -->
    <div class="mt-10 grid grid-cols-2 gap-4">
      <div class="space-y-1.5">
        <Label class="text-muted-foreground text-xs" for="term-sep">Term-Def separator</Label>
        <div class="relative">
          <Input id="term-sep" bind:value={termSepValue} placeholder="e.g. |" class="pr-9" />
          <Popover.Root>
            <Popover.Trigger
              class="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 inline-flex items-center px-2.5"
              aria-label="Term separator presets"
            >
              <ChevronDown class="size-4" />
            </Popover.Trigger>
            <Popover.Content align="end" class="w-48 p-1">
              {#each TERM_SEP_PRESETS as preset (preset)}
                <button
                  type="button"
                  onclick={() => (termSepValue = preset)}
                  class="hover:bg-accent hover:text-accent-foreground flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm transition-colors"
                >
                  <span>{preset}</span>
                  {#if termSepValue === preset}
                    <Check class="text-primary size-4" />
                  {/if}
                </button>
              {/each}
            </Popover.Content>
          </Popover.Root>
        </div>
      </div>

      <div class="space-y-1.5">
        <Label class="text-muted-foreground text-xs" for="card-sep">Card separator</Label>
        <div class="relative">
          <Input id="card-sep" bind:value={cardSepValue} placeholder="e.g. --" class="pr-9" />
          <Popover.Root>
            <Popover.Trigger
              class="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 inline-flex items-center px-2.5"
              aria-label="Card separator presets"
            >
              <ChevronDown class="size-4" />
            </Popover.Trigger>
            <Popover.Content align="end" class="w-48 p-1">
              {#each CARD_SEP_PRESETS as preset (preset)}
                <button
                  type="button"
                  onclick={() => (cardSepValue = preset)}
                  class="hover:bg-accent hover:text-accent-foreground flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm transition-colors"
                >
                  <span>{preset}</span>
                  {#if cardSepValue === preset}
                    <Check class="text-primary size-4" />
                  {/if}
                </button>
              {/each}
            </Popover.Content>
          </Popover.Root>
        </div>
      </div>
    </div>

    <!-- Copy -->
    <Button onclick={copyToClipboard} disabled={copied || anyBusy} class="mt-6 w-full">
      {#if copied}
        <Check />
        Copied
      {:else}
        <Copy />
        Copy to clipboard
      {/if}
    </Button>

    <!-- Divider -->
    <div class="mt-8 flex items-center gap-3">
      <Separator class="flex-1" />
      <span class="text-muted-foreground text-xs">Download as file</span>
      <Separator class="flex-1" />
    </div>

    <!-- Downloads -->
    <div class="mt-6 space-y-2">
      <Button variant="outline" onclick={exportTxt} disabled={anyBusy} class="w-full justify-start">
        {#if busy === "txt"}
          <LoaderCircle class="animate-spin" />
          Preparing TXT…
        {:else}
          <Download />
          TXT
        {/if}
      </Button>
      <Button variant="outline" onclick={exportCsv} disabled={anyBusy} class="w-full justify-start">
        {#if busy === "csv"}
          <LoaderCircle class="animate-spin" />
          Preparing CSV…
        {:else}
          <Download />
          CSV
        {/if}
      </Button>
      <Button
        variant="outline"
        onclick={exportJson}
        disabled={anyBusy}
        class="w-full justify-start"
      >
        {#if busy === "json"}
          <LoaderCircle class="animate-spin" />
          Preparing JSON…
        {:else}
          <Download />
          JSON
        {/if}
      </Button>
      <Button
        variant="outline"
        onclick={exportPdfList}
        disabled={anyBusy}
        class="w-full justify-start"
      >
        {#if busy === "pdf-list"}
          <LoaderCircle class="animate-spin" />
          Generating PDF…
        {:else}
          <Download />
          PDF · Vocab list
        {/if}
      </Button>
      <Button
        variant="outline"
        onclick={exportPdfFlashcards}
        disabled={anyBusy}
        class="w-full justify-start"
      >
        {#if busy === "pdf-cards"}
          <LoaderCircle class="animate-spin" />
          Generating PDF…
        {:else}
          <Download />
          PDF · Flashcards
        {/if}
      </Button>
      <Button
        variant="outline"
        onclick={() => (ankiOpen = true)}
        disabled={anyBusy}
        class="w-full justify-start"
      >
        {#if busy === "anki"}
          <LoaderCircle class="animate-spin" />
          Generating .apkg…
        {:else}
          <Download />
          Anki · .apkg
        {/if}
      </Button>
    </div>

    <!-- Anki Dialog -->
    <Dialog.Root bind:open={ankiOpen}>
      <Dialog.Content class="sm:max-w-md">
        <Dialog.Header>
          <Dialog.Title>Anki export</Dialog.Title>
        </Dialog.Header>

        <div class="space-y-5">
          <!-- Pace toggle, full card style. Off = ship the deck with no preset;
               the user's existing Anki default scheduling takes over. On =
               expand the day picker below and bundle a preset with deck options
               adjusted for the deadline (anecdotal, useful under ~2 weeks). -->
          <button
            type="button"
            role="switch"
            aria-checked={ankiPace}
            onclick={() => (ankiPace = !ankiPace)}
            class="border-border hover:bg-muted/30 focus-visible:ring-ring flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-left transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none"
          >
            <span class="flex min-w-0 flex-col gap-0.5">
              <span class="text-foreground text-sm font-medium">Deadline mode (optional)</span>
              <span class="text-muted-foreground text-xs"
                >Adjusts deck options for tight timelines. Anecdotal, not science-backed.</span
              >
            </span>
            <span
              class="relative mt-0.5 inline-flex h-5 w-8 shrink-0 items-center rounded-full transition-colors duration-200"
              class:bg-primary={ankiPace}
              class:bg-muted={!ankiPace}
            >
              <span
                class="inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200"
                class:translate-x-3.5={ankiPace}
                class:translate-x-0.5={!ankiPace}
              ></span>
            </span>
          </button>

          {#if ankiPace}
            <div class="space-y-5" transition:slide={{ duration: 180 }}>
              <div class="space-y-1.5">
                <Label class="text-muted-foreground text-xs" for="anki-days">Days</Label>
                <Input
                  id="anki-days"
                  type="number"
                  min="1"
                  value={ankiDays}
                  oninput={(e) => setDaysFromInput(Number((e.target as HTMLInputElement).value))}
                  class="tabular-nums [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>

              <div class="border-border flex justify-center rounded-md border">
                <Calendar
                  type="single"
                  bind:value={ankiSelected as CalendarDate}
                  minValue={todayDate.add({ days: 1 })}
                  class="bg-transparent"
                />
              </div>

              <p class="text-muted-foreground text-center text-xs">{recommendedPace}</p>
            </div>
          {/if}
        </div>

        <Dialog.Footer>
          <Button onclick={exportAnki} disabled={anyBusy} class="w-full">
            {#if busy === "anki"}
              <LoaderCircle class="animate-spin" />
              Generating…
            {:else}
              <Download />
              Download
            {/if}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  </div>
{/if}
