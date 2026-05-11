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
    Copy,
    Download,
    LoaderCircle,
    Plus,
    Puzzle,
    Trash2,
  } from "@lucide/svelte";
  import { toast } from "svelte-sonner";
  import {
    today,
    getLocalTimeZone,
    type DateValue,
    type CalendarDate,
  } from "@internationalized/date";
  import { decodePayload, decodeShareLink, encodeShareLink, type SharePayload } from "$lib/share";
  import { generateSetId, looksLikeSetId, loadSet, saveSet } from "$lib/storage";
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
  import type { Flashcard, FlashcardSet } from "$lib/export/types";
  import type { QuizletSetRef } from "$lib/parse";
  import { CWS_URL } from "$lib/site";

  // ────────── State ──────────

  type DownloadKind = "txt" | "csv" | "json" | "pdf-list" | "pdf-cards" | "anki";

  // Separators persist across visits via localStorage.
  const savedTerm =
    typeof localStorage !== "undefined" ? localStorage.getItem("quickcards:termSep") : null;
  const savedCard =
    typeof localStorage !== "undefined" ? localStorage.getItem("quickcards:cardSep") : null;
  const savedAnkiPace =
    typeof localStorage !== "undefined" ? localStorage.getItem("quickcards:ankiPace") : null;

  // The page renders one of three branches: a vocab currentSet (the export
  // view), a Quizlet-link transient (the install-the-extension view), or
  // a loading state. The vocab branch holds an actual FlashcardSet; the
  // Quizlet branch holds the transient URL refs.
  let currentSet = $state<FlashcardSet | null>(null);
  let quizletRefs = $state<QuizletSetRef[] | null>(null);
  let loading = $state(true);
  let copied = $state(false);
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

  // ────────── Load on mount ──────────
  //
  // URL dispatch reads from the fragment (#) first so that share blobs
  // never reach the server. The search-param branch (?) is kept for
  // backwards compatibility with old links.
  //
  //   #s=<br/gzip-base64url>  – share link payload, decode, save under
  //                             a fresh ID, rewrite to #d=<id>.
  //   #d=<short ID>           – look up the set in IndexedDB.
  //   ?s=…  /  ?d=…           – legacy. Same handling, then redirect to
  //                             the fragment form.

  // Parse share params out of the fragment first, then fall back to the
  // search string. We read window.location.hash directly because
  // SvelteKit's page.url is constructed from the request URL, which by
  // HTTP design never carries a fragment, so page.url.hash is empty on
  // initial load. window.location is the only source of truth here.
  function readSourceParams(): { s: string | null; d: string | null } {
    const rawHash = typeof window !== "undefined" ? window.location.hash : "";
    const hash = rawHash.startsWith("#") ? rawHash.slice(1) : rawHash;
    if (hash) {
      const params = new URLSearchParams(hash);
      const s = params.get("s");
      const d = params.get("d");
      if (s || d) return { s, d };
    }
    return {
      s: page.url.searchParams.get("s"),
      d: page.url.searchParams.get("d"),
    };
  }

  onMount(async () => {
    const { s, d } = readSourceParams();

    if (s) {
      const decoded = await decodeShareLink(s);
      if (!decoded) {
        await goto(resolve("/"), { replaceState: true });
        return;
      }
      await adoptPayload(decoded, { cleanUrl: true });
      finishLoading();
      return;
    }

    if (d) {
      if (looksLikeSetId(d)) {
        const found = await loadSet(d);
        if (found) {
          currentSet = found;
          // Migrate legacy ?d= URLs to the fragment form so the ID stops
          // hitting the server on refresh.
          if (page.url.searchParams.has("d")) {
            history.replaceState(history.state, "", `${resolve("/process")}#d=${d}`);
          }
          finishLoading();
          return;
        }
        // Fall through to legacy decode in case the user mashed an
        // older long blob that happens to look like an ID. Highly
        // unlikely but cheap to try.
      }
      const decoded = decodePayload(d);
      if (decoded) {
        await adoptPayload(decoded, { cleanUrl: true });
        finishLoading();
        return;
      }
    }

    await goto(resolve("/"), { replaceState: true });
  });

  // Take a freshly-decoded payload and either persist it (vocab) or
  // hold it transient (Quizlet refs). For vocab payloads we ALWAYS mint
  // a new ID, even if the payload carries one. The sender's ID is
  // meaningless to the receiver (it's a key into the sender's local
  // IndexedDB) and reusing it would silently overwrite a set the
  // receiver might already have under the same ID. Optionally rewrites
  // the URL to the canonical fragment form (#d=<id>).
  async function adoptPayload(payload: SharePayload, opts: { cleanUrl: boolean }): Promise<void> {
    if (payload.kind === "vocab") {
      const id = generateSetId();
      const persisted: FlashcardSet = { ...payload.set, id };
      await saveSet(persisted);
      currentSet = persisted;
      if (opts.cleanUrl) {
        history.replaceState(history.state, "", `${resolve("/process")}#d=${id}`);
      }
    } else {
      quizletRefs = payload.sets;
    }
  }

  function finishLoading(): void {
    loading = false;
    if (currentSet) warmExports();
  }

  function warmExports(): void {
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

  // ────────── Persist edits ──────────
  //
  // Edits flow into `currentSet` via two-way bindings; we debounce saves to
  // IndexedDB so rapid typing doesn't spam writes. Definitive actions
  // (delete card, add card) flush immediately.

  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  function persistDebounced(): void {
    if (!currentSet) return;
    if (saveTimer) clearTimeout(saveTimer);
    const snapshot = currentSet;
    saveTimer = setTimeout(() => {
      void saveSet(snapshot);
      saveTimer = null;
    }, 400);
  }

  async function persistNow(): Promise<void> {
    if (!currentSet) return;
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    await saveSet(currentSet);
  }

  // ────────── Card editing ──────────

  // Soft-delete with undo toast. The card is removed immediately and
  // persisted, but the toast holds a reference to the removed row so the
  // user can re-insert it at the original index. After the toast is
  // dismissed the deletion is final (only the IndexedDB write remains).
  function deleteCard(index: number): void {
    if (!currentSet) return;
    const [removed] = currentSet.cards.splice(index, 1);
    if (!removed) return;
    void persistNow();
    const label = removed.term.trim() || removed.definition.trim() || `card ${index + 1}`;
    toast("Card deleted", {
      description: label.length > 60 ? `${label.slice(0, 60)}…` : label,
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          if (!currentSet) return;
          const insertAt = Math.min(index, currentSet.cards.length);
          currentSet.cards.splice(insertAt, 0, removed);
          void persistNow();
        },
      },
    });
  }

  function addCard(): void {
    if (!currentSet) return;
    currentSet.cards.push({ term: "", definition: "" } satisfies Flashcard);
    void persistNow();
  }

  // ────────── Vocab helpers ──────────

  const cardCount = $derived(currentSet?.cards.length ?? 0);

  const recommendedPace = $derived.by(() => {
    if (!currentSet) return "";
    const perDay = Math.max(1, Math.ceil(cardCount / Math.max(1, ankiDays * 0.6)));
    return `Recommended pace: ~${perDay} card${perDay === 1 ? "" : "s"}/day`;
  });

  // ────────── Copy ──────────

  async function copyToClipboard() {
    if (!currentSet || copied || anyBusy) return;
    const text = formatCards(
      currentSet,
      resolveTermSep(termSepValue),
      resolveCardSep(cardSepValue),
    );
    await navigator.clipboard.writeText(text);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }

  // ────────── Downloads ──────────

  const baseName = $derived(currentSet?.title?.trim() || "flashcards");

  async function runDownload(kind: DownloadKind, fn: () => Promise<"ok" | "cancelled">) {
    if (anyBusy || !currentSet) return;
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
            currentSet as FlashcardSet,
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
      saveFile(() => toCsv(currentSet as FlashcardSet), `${baseName}.csv`, "text/csv"),
    );
  }

  function exportJson() {
    runDownload("json", () =>
      saveFile(() => JSON.stringify(currentSet, null, 2), `${baseName}.json`, "application/json"),
    );
  }

  function exportPdfList() {
    runDownload("pdf-list", () =>
      saveFile(
        async () => {
          const { generateListPDF } = await import("$lib/export/pdf-list");
          return generateListPDF(currentSet as FlashcardSet).output("arraybuffer");
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
          return generateFlashcardsPDF(currentSet as FlashcardSet).output("arraybuffer");
        },
        `${baseName}-cards.pdf`,
        "application/pdf",
      ),
    );
  }

  function exportAnki() {
    if (anyBusy || !currentSet) return;
    const withPreset = ankiPace;
    runDownload("anki", async () => {
      let failedUrls: string[] = [];
      const outcome = await saveFile(
        async () => {
          const [{ buildAnkiPackage }, { getSQL }] = await Promise.all([
            import("$lib/export/anki"),
            import("$lib/export/sql"),
          ]);
          const SQL = await getSQL();
          const result = await buildAnkiPackage({
            set: currentSet as FlashcardSet,
            days: ankiDays,
            SQL,
            withPreset,
          });
          failedUrls = result.failedUrls;
          return result.bytes;
        },
        `${baseName}.apkg`,
        "application/octet-stream",
      );
      if (outcome === "ok") {
        ankiOpen = false;
        if (withPreset) track("Anki days", { range: bucketDays(ankiDays) });
        // Anki tolerates missing media references; the .apkg still works, just
        // without the failed audio/images. Tell the user and offer the URL
        // list so they can diagnose if they care.
        if (failedUrls.length > 0) {
          const count = failedUrls.length;
          const setTitle = currentSet?.title ?? "Untitled set";
          // Same header shape as the extension popup so a log pasted into a
          // bug report carries enough context on its own.
          const log = [
            "QuickCards failed media log",
            `Generated: ${new Date().toISOString()}`,
            `Set: ${JSON.stringify(setTitle)}`,
            `Source: website`,
            `Failed: ${count} URL${count === 1 ? "" : "s"}`,
            "",
            ...failedUrls,
          ].join("\n");
          toast(`${count} media ${count === 1 ? "file" : "files"} failed to download`, {
            description: "Anki deck saved without them. Copy the URL list for diagnosis.",
            duration: 8000,
            action: {
              label: "Copy log",
              onClick: () => {
                navigator.clipboard.writeText(log).catch(() => {});
              },
            },
          });
        }
      }
      return outcome;
    });
  }

  // ────────── Share link ──────────

  let shareCopied = $state(false);
  let shareFailed = $state(false);

  // Cap on share-link size. Past ~16 KB the link still loads in browsers
  // but chat apps, email clients, and QR codes start mangling it. Above
  // this we refuse to copy and steer the user to a file export, which
  // works for sets of any size.
  const SHARE_URL_MAX_BYTES = 16384;

  async function copyShareUrl() {
    if (!currentSet) return;
    try {
      await persistNow();
      // Strip the local ID before encoding. It's a key into the sender's
      // own IndexedDB and the receiver mints their own on decode.
      const setForShare: FlashcardSet = { ...currentSet, id: "" };
      const encoded = await encodeShareLink({ kind: "vocab", set: setForShare });

      if (encoded.length > SHARE_URL_MAX_BYTES) {
        track("Share link too big", { bytes: encoded.length });
        toast("This set is too big for a share link", {
          description: "Download it as JSON or CSV and share the file instead.",
          duration: 8000,
          action: {
            label: "Download JSON",
            onClick: () => exportJson(),
          },
        });
        return;
      }

      const url = `${resolve("/process")}#s=${encoded}`;
      await navigator.clipboard.writeText(`${window.location.origin}${url}`);
      shareCopied = true;
      track("Share link", { bytes: encoded.length });
      setTimeout(() => (shareCopied = false), 1500);
    } catch (err) {
      console.error("[QuickCards] share link failed:", err);
      shareFailed = true;
      setTimeout(() => (shareFailed = false), 2200);
    }
  }
</script>

<svelte:head>
  <title>Export · QuickCards</title>
  <meta name="robots" content="noindex,nofollow" />
</svelte:head>

{#if loading}
  <div class="flex min-h-screen items-center justify-center">
    <LoaderCircle class="text-muted-foreground size-6 animate-spin" />
  </div>
{:else if quizletRefs}
  <!-- ──────── Extension-required view (Quizlet links) ──────── -->
  <div class="mx-auto max-w-[640px] px-6 py-16 sm:py-20">
    <Button variant="ghost" size="sm" href="/" class="-ml-2.5">
      <ArrowLeft />
      Back
    </Button>

    <h1 class="mt-12 text-3xl font-semibold tracking-tight">Quizlet links need the extension</h1>
    <p class="text-muted-foreground mt-3 text-[15px] leading-7">
      We can't fetch Quizlet sets from the web directly. Cloudflare blocks cross-origin requests.
      The extension runs inside your own browser session, so it works without any workarounds of
      ours.
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
        {quizletRefs.length === 1 ? "Set you pasted:" : `${quizletRefs.length} sets you pasted:`}
      </p>
      <ul class="mt-3 space-y-2">
        {#each quizletRefs as ref (ref.id)}
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
{:else if currentSet}
  <!-- ──────── Editable vocab view ──────── -->
  <div class="mx-auto max-w-6xl px-6 py-10">
    <div class="flex items-center justify-between gap-3">
      <Button variant="ghost" size="sm" href="/tool" class="-ml-2.5">
        <ArrowLeft />
        Back
      </Button>
      <Button variant="ghost" size="sm" onclick={copyShareUrl}>
        {#if shareCopied}
          <Check />
          Link copied
        {:else if shareFailed}
          <Copy />
          Couldn't copy
        {:else}
          <Copy />
          Share link
        {/if}
      </Button>
    </div>

    <!-- Three-block layout. Mobile (single column, source order):
         title-block → aside → cards-block. Desktop (two columns):
         title-block at top of left col, cards-block below it, aside
         spans both rows on the right with sticky positioning. -->
    <div
      class="mt-8 grid gap-10 lg:grid-cols-[1fr_320px] lg:grid-rows-[auto_auto] lg:gap-x-12 lg:gap-y-6"
    >
      <!-- Title + description block -->
      <div class="min-w-0 lg:col-start-1 lg:row-start-1">
        <div class="flex items-baseline justify-between gap-4">
          <input
            type="text"
            bind:value={currentSet.title}
            oninput={persistDebounced}
            onblur={persistNow}
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

        <textarea
          bind:value={currentSet.description}
          oninput={persistDebounced}
          onblur={persistNow}
          placeholder="Description (optional)"
          spellcheck="false"
          aria-label="Set description"
          rows="1"
          class="placeholder:text-muted-foreground/40 text-muted-foreground mt-2 field-sizing-content w-full resize-none bg-transparent text-sm leading-relaxed outline-none"
        ></textarea>
      </div>

      <!-- Cards block. On mobile sits below the aside (order-3); on
           desktop sits directly under the title block in the left
           column (explicit grid placement wins over order). -->
      <div class="order-3 min-w-0 lg:col-start-1 lg:row-start-2">
        <!-- Editable cards list. Each row has inline-editable term and
             definition, plus a delete button that appears on hover. -->
        <ul class="border-border divide-border/60 divide-y rounded-lg border">
          {#each currentSet.cards as card, i (i)}
            <li
              class="hover:bg-muted/30 group grid grid-cols-[2.25rem_1fr_1fr_2rem] gap-2 px-3 py-2 transition-colors"
            >
              <span
                aria-hidden="true"
                class="text-muted-foreground/60 self-center text-right font-mono text-xs tabular-nums"
              >
                {i + 1}
              </span>
              <input
                type="text"
                bind:value={card.term}
                oninput={persistDebounced}
                onblur={persistNow}
                spellcheck="false"
                placeholder="Term"
                aria-label={`Term for card ${i + 1}`}
                class="placeholder:text-muted-foreground/40 text-foreground focus:bg-background focus:ring-ring/50 min-w-0 truncate rounded-sm bg-transparent px-2 py-1 text-sm outline-none focus:ring-1"
              />
              <input
                type="text"
                bind:value={card.definition}
                oninput={persistDebounced}
                onblur={persistNow}
                spellcheck="false"
                placeholder="Definition"
                aria-label={`Definition for card ${i + 1}`}
                class="placeholder:text-muted-foreground/40 text-muted-foreground focus:bg-background focus:ring-ring/50 min-w-0 truncate rounded-sm bg-transparent px-2 py-1 text-sm outline-none focus:ring-1"
              />
              <button
                type="button"
                onclick={() => deleteCard(i)}
                aria-label={`Delete card ${i + 1}`}
                class="text-muted-foreground/70 hover:bg-destructive/10 hover:text-destructive focus-visible:ring-ring flex size-8 items-center justify-center self-center rounded opacity-0 transition-all group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:outline-none"
              >
                <Trash2 class="size-3.5" />
              </button>
            </li>
          {/each}
        </ul>

        <button
          type="button"
          onclick={addCard}
          class="border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-2.5 text-sm transition-colors"
        >
          <Plus class="size-4" />
          Add card
        </button>
      </div>

      <!-- Export sidebar. On mobile sits between title and cards
           (order-2). On desktop spans both rows on the right and
           stays sticky. -->
      <aside
        class="order-2 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start"
      >
        <!-- Separators -->
        <div class="space-y-3">
          <div class="text-muted-foreground/70 font-mono text-[10px] tracking-wider uppercase">
            Separators
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <Label class="text-muted-foreground text-xs" for="term-sep">Term-Def</Label>
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
              <Label class="text-muted-foreground text-xs" for="card-sep">Card</Label>
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
        </div>

        <Button onclick={copyToClipboard} disabled={copied || anyBusy} class="mt-5 w-full">
          {#if copied}
            <Check />
            Copied
          {:else}
            <Copy />
            Copy to clipboard
          {/if}
        </Button>

        <div class="mt-7 flex items-center gap-3">
          <Separator class="flex-1" />
          <span class="text-muted-foreground text-xs">Download</span>
          <Separator class="flex-1" />
        </div>

        <div class="mt-4 space-y-2">
          <Button
            variant="outline"
            onclick={exportTxt}
            disabled={anyBusy}
            class="w-full justify-start"
          >
            {#if busy === "txt"}
              <LoaderCircle class="animate-spin" />
              Preparing TXT…
            {:else}
              <Download />
              TXT
            {/if}
          </Button>
          <Button
            variant="outline"
            onclick={exportCsv}
            disabled={anyBusy}
            class="w-full justify-start"
          >
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
      </aside>
    </div>

    <!-- Anki dialog -->
    <Dialog.Root bind:open={ankiOpen}>
      <Dialog.Content class="sm:max-w-md">
        <Dialog.Header>
          <Dialog.Title>Anki export</Dialog.Title>
        </Dialog.Header>

        <div class="space-y-5">
          <button
            type="button"
            role="switch"
            aria-checked={ankiPace}
            onclick={() => (ankiPace = !ankiPace)}
            class="border-border hover:bg-muted/30 focus-visible:ring-ring flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-left transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none"
          >
            <span class="flex min-w-0 flex-col gap-0.5">
              <span class="text-foreground text-sm font-medium">Deadline mode (optional)</span>
              <span class="text-muted-foreground text-xs">
                Adjusts deck options for tight timelines. Anecdotal, not science-backed.
              </span>
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
