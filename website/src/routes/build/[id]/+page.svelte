<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { Button } from "$lib/components/ui/button";

  import EditorTopbar from "$lib/components/builder/EditorTopbar.svelte";
  import Sidebar from "$lib/components/builder/Sidebar.svelte";

  import { loadPackage } from "$lib/builder/store/load";
  import { createAutosave } from "$lib/builder/store/autosave";
  import { createHistory } from "$lib/builder/history";
  import { newId } from "$lib/builder/defaults";
  import type { Id, PackageData, PackageState, Selection } from "$lib/builder/types";

  let pkgState = $state<PackageState | null>(null);
  let loadError = $state<string | null>(null);
  let saveStatus = $state<"saved" | "saving" | "error">("saved");

  const history = createHistory<PackageState>();
  const autosave = createAutosave();

  // Snapshot of can-undo/can-redo. The history module isn't reactive on its
  // own; we re-read after every mutation.
  let canUndo = $state(false);
  let canRedo = $state(false);

  function syncHistoryFlags() {
    canUndo = history.canUndo();
    canRedo = history.canRedo();
  }

  function mutate(
    recipe: (draft: PackageState) => void,
    description: string,
    coalesceKey?: string,
  ) {
    if (!pkgState) return;
    pkgState = history.mutate(pkgState, recipe, description, coalesceKey);
    syncHistoryFlags();
  }

  function undo() {
    if (!pkgState) return;
    pkgState = history.undo(pkgState);
    syncHistoryFlags();
  }

  function redo() {
    if (!pkgState) return;
    pkgState = history.redo(pkgState);
    syncHistoryFlags();
  }

  // ---- load ---------------------------------------------------------------

  onMount(async () => {
    const id = page.params.id;
    if (!id) {
      loadError = "Missing deck id.";
      return;
    }

    try {
      const data = await loadPackage(id);
      if (!data) {
        loadError = "This deck doesn't exist on this device.";
        return;
      }
      const initial: PackageState = {
        data,
        selection: pickInitialSelection(data),
      };
      pkgState = initial;
      window.addEventListener("keydown", handleKeydown);
    } catch (err) {
      loadError = err instanceof Error ? err.message : String(err);
    }
  });

  onDestroy(() => {
    window.removeEventListener("keydown", handleKeydown);
    void autosave.flush();
    autosave.dispose();
  });

  function pickInitialSelection(data: PackageData): Selection {
    const sortedDecks = Object.values(data.decks).sort((a, b) => a.order - b.order);
    const first = sortedDecks[0];
    return first ? { kind: "deck", id: first.id } : { kind: "none" };
  }

  // Autosave on every pkgState.data change.
  $effect(() => {
    if (!pkgState) return;
    saveStatus = "saving";
    autosave.schedule(pkgState.data);
    // The flush() promise fires on the next debounce tick; we mark "saved"
    // via a microtask after schedule returns. flush() is awaited here only
    // so failures surface to UI; the actual write is debounced.
    autosave
      .flush()
      .then(() => {
        saveStatus = "saved";
      })
      .catch(() => {
        saveStatus = "error";
      });
  });

  // ---- keyboard -----------------------------------------------------------

  function handleKeydown(e: KeyboardEvent) {
    const meta = e.ctrlKey || e.metaKey;
    if (!meta) return;
    if (e.key === "z" && !e.shiftKey) {
      if (isFromEditableField(e)) return;
      e.preventDefault();
      undo();
    } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
      if (isFromEditableField(e)) return;
      e.preventDefault();
      redo();
    }
  }

  // Skip global undo when the user is mid-edit in a textarea/input;
  // the browser's native field-level undo is the right behavior there.
  function isFromEditableField(e: KeyboardEvent): boolean {
    const t = e.target as HTMLElement | null;
    if (!t) return false;
    return (
      t.tagName === "INPUT" ||
      t.tagName === "TEXTAREA" ||
      t.isContentEditable
    );
  }

  // ---- actions ------------------------------------------------------------

  function setTitle(next: string) {
    mutate(
      (draft) => {
        draft.data.package.title = next;
      },
      "Rename package",
    );
  }

  function selectDeck(id: Id) {
    mutate(
      (draft) => {
        draft.selection = { kind: "deck", id };
      },
      "Select deck",
    );
  }

  function addDeck() {
    mutate((draft) => {
      const id = newId();
      const existing = Object.values(draft.data.decks);
      const order = existing.length === 0 ? 0 : Math.max(...existing.map((d) => d.order)) + 1;
      // Reuse the first config so the new deck has scheduling out of the box.
      // Phase 2 introduces per-deck preset assignment.
      const fallbackConfigId = Object.values(draft.data.configs)[0]?.id ?? "";
      draft.data.decks[id] = {
        id,
        packageId: draft.data.package.id,
        parentDeckId: null,
        name: "New deck",
        description: "",
        configId: fallbackConfigId,
        order,
        deadline: null,
      };
      draft.selection = { kind: "deck", id };
    }, "Add deck");
  }

  // ---- derived view -------------------------------------------------------

  const decks = $derived(pkgState ? Object.values(pkgState.data.decks) : []);

  const noteCounts = $derived.by(() => {
    const counts: Record<Id, number> = {};
    if (!pkgState) return counts;
    for (const note of Object.values(pkgState.data.notes)) {
      counts[note.deckId] = (counts[note.deckId] ?? 0) + 1;
    }
    return counts;
  });

  const selectedDeck = $derived(
    pkgState && pkgState.selection.kind === "deck" ? pkgState.data.decks[pkgState.selection.id] : null,
  );
</script>

<svelte:head>
  <title>{pkgState?.data.package.title ?? "Builder"} · QuickCards</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="bg-background flex h-screen flex-col">
  {#if loadError}
    <div class="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 class="text-2xl font-semibold tracking-tight">Deck not found</h1>
      <p class="text-muted-foreground max-w-sm text-sm">{loadError}</p>
      <Button onclick={() => goto(resolve("/build"))}>Back to overview</Button>
    </div>
  {:else if !pkgState}
    <div class="text-muted-foreground flex flex-1 items-center justify-center text-sm" aria-live="polite">
      Loading deck…
    </div>
  {:else}
    <EditorTopbar
      title={pkgState.data.package.title}
      {canUndo}
      {canRedo}
      {saveStatus}
      onTitleChange={setTitle}
      onUndo={undo}
      onRedo={redo}
    />

    <div class="flex flex-1 overflow-hidden">
      <Sidebar
        {decks}
        {noteCounts}
        selection={pkgState.selection}
        onSelectDeck={selectDeck}
        onAddDeck={addDeck}
      />

      <main class="flex-1 overflow-y-auto px-8 py-10">
        {#if selectedDeck}
          <div class="mx-auto max-w-3xl space-y-2">
            <h2 class="text-2xl font-semibold tracking-tight">{selectedDeck.name}</h2>
            <p class="text-muted-foreground text-sm">
              {noteCounts[selectedDeck.id] ?? 0}
              {(noteCounts[selectedDeck.id] ?? 0) === 1 ? "card" : "cards"}
            </p>
            <p class="text-muted-foreground pt-12 text-center text-sm">
              The card editor lands in the next iteration.
            </p>
          </div>
        {:else}
          <p class="text-muted-foreground py-24 text-center text-sm">
            Select a deck on the left to start editing.
          </p>
        {/if}
      </main>
    </div>
  {/if}
</div>
