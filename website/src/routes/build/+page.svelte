<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { Button } from "$lib/components/ui/button";
  import { ClipboardPaste, Plus, Hammer } from "@lucide/svelte";

  import LocalOnlyBanner from "$lib/components/builder/LocalOnlyBanner.svelte";
  import PackageCard from "$lib/components/builder/PackageCard.svelte";
  import ImportDialog from "$lib/components/builder/ImportDialog.svelte";

  import { createBlankPackage, createPackageFromFlashcardSet } from "$lib/builder/init";
  import { decks as deckRepo, notes as noteRepo, packages as packageRepo, deletePackageCascade } from "$lib/builder/store/repos";
  import { decodePayload } from "$lib/share";
  import { confirmAction } from "$lib/builder/dialogs.svelte";
  import { toast } from "svelte-sonner";
  import type { BuilderPackage } from "$lib/builder/types";

  interface Row {
    package: BuilderPackage;
    deckCount: number;
    cardCount: number;
  }

  let rows = $state<Row[] | null>(null);
  let loadError = $state<string | null>(null);
  let importOpen = $state(false);
  let busy = $state(false);

  onMount(async () => {
    const url = new URL(window.location.href);
    const payloadParam = url.searchParams.get("d");

    if (payloadParam) {
      const id = await tryConsumePayload(payloadParam);
      if (id) {
        await goto(resolve(`/build/${id}`), { replaceState: true });
        return;
      }
      // Fall through and show the overview if the payload was unusable.
      url.searchParams.delete("d");
      history.replaceState({}, "", url.toString());
    }

    await refresh();
  });

  async function tryConsumePayload(param: string): Promise<string | null> {
    try {
      let encoded = param;
      if (param === "local") {
        const stored = sessionStorage.getItem("quickcards:payload");
        if (!stored) return null;
        sessionStorage.removeItem("quickcards:payload");
        encoded = stored;
      }
      const decoded = decodePayload(encoded);
      if (!decoded || decoded.kind !== "vocab") return null;
      return await createPackageFromFlashcardSet(decoded.set);
    } catch (err) {
      console.error("[build] payload import failed", err);
      return null;
    }
  }

  async function refresh() {
    try {
      const all = await packageRepo.listAll();
      rows = await Promise.all(
        all.map(async (pkg) => {
          const [deckCount, cardCount] = await Promise.all([
            deckRepo.countByPackage(pkg.id),
            noteRepo.countByPackage(pkg.id),
          ]);
          return { package: pkg, deckCount, cardCount };
        }),
      );
    } catch (err) {
      loadError = err instanceof Error ? err.message : String(err);
    }
  }

  async function startBlank() {
    if (busy) return;
    busy = true;
    try {
      const id = await createBlankPackage();
      await goto(resolve(`/build/${id}`));
    } finally {
      busy = false;
    }
  }

  async function handleDelete(id: string) {
    const target = rows?.find((r) => r.package.id === id);
    const title = target?.package.title || "this deck";
    const ok = await confirmAction({
      title: `Delete "${title}"?`,
      description: "All decks, cards, and media in this draft will be removed. This cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    await deletePackageCascade(id);
    toast.success(`Deleted "${title}"`);
    await refresh();
  }
</script>

<svelte:head>
  <title>Builder · QuickCards</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="bg-background min-h-screen">
  <LocalOnlyBanner />

  <main class="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
    {#if loadError}
      <div
        class="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border p-6 text-sm"
        role="alert"
      >
        Could not open local storage: {loadError}
      </div>
    {:else if rows === null}
      <div class="text-muted-foreground py-24 text-center text-sm" aria-live="polite">
        Loading your decks…
      </div>
    {:else if rows.length === 0}
      <section class="flex flex-col items-center gap-6 py-16 text-center">
        <div
          class="bg-muted text-muted-foreground flex h-16 w-16 items-center justify-center rounded-full"
        >
          <Hammer class="h-8 w-8" aria-hidden="true" />
        </div>
        <div class="max-w-md space-y-2">
          <h1 class="text-3xl leading-tight font-semibold tracking-tight">Build a deck</h1>
          <p class="text-muted-foreground text-base">
            Edit cards, organize decks, and tune scheduling presets. Everything stays in this
            browser.
          </p>
        </div>
        <div class="flex flex-wrap items-center justify-center gap-3">
          <Button onclick={startBlank} disabled={busy} size="lg">
            <Plus class="mr-2 h-4 w-4" aria-hidden="true" />
            Start blank
          </Button>
          <Button variant="outline" size="lg" onclick={() => (importOpen = true)} disabled={busy}>
            <ClipboardPaste class="mr-2 h-4 w-4" aria-hidden="true" />
            Paste content
          </Button>
        </div>
      </section>
    {:else}
      <section class="space-y-8">
        <header class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 class="text-2xl leading-tight font-semibold tracking-tight">Your decks</h1>
            <p class="text-muted-foreground text-sm">
              {rows.length}
              {rows.length === 1 ? "draft" : "drafts"}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <Button variant="outline" onclick={() => (importOpen = true)} disabled={busy}>
              <ClipboardPaste class="mr-2 h-4 w-4" aria-hidden="true" />
              Paste
            </Button>
            <Button onclick={startBlank} disabled={busy}>
              <Plus class="mr-2 h-4 w-4" aria-hidden="true" />
              New deck
            </Button>
          </div>
        </header>

        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {#each rows as row (row.package.id)}
            <PackageCard
              package={row.package}
              deckCount={row.deckCount}
              cardCount={row.cardCount}
              onDelete={handleDelete}
            />
          {/each}
        </div>
      </section>
    {/if}
  </main>
</div>

<ImportDialog bind:open={importOpen} />
