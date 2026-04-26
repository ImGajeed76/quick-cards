<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { Button } from "$lib/components/ui/button";

  import EditorTopbar from "$lib/components/builder/EditorTopbar.svelte";
  import Sidebar from "$lib/components/builder/Sidebar.svelte";
  import CardList from "$lib/components/builder/CardList.svelte";

  import { loadPackage } from "$lib/builder/store/load";
  import { createAutosave } from "$lib/builder/store/autosave";
  import { createHistory } from "$lib/builder/history";
  import { createActions } from "$lib/builder/actions";
  import { buildDeckForest, isSimpleFlashcardDeck } from "$lib/builder/deck-tree";
  import type { BuilderDeck, Id, PackageData, PackageState, Selection } from "$lib/builder/types";

  let pkgState = $state<PackageState | null>(null);
  let loadError = $state<string | null>(null);
  let saveStatus = $state<"saved" | "saving" | "error">("saved");

  const history = createHistory<PackageState>();
  const autosave = createAutosave();

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

  const actions = createActions(mutate);

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
      pkgState = { data, selection: pickInitialSelection(data) };
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

  function isFromEditableField(e: KeyboardEvent): boolean {
    const t = e.target as HTMLElement | null;
    if (!t) return false;
    return t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable;
  }

  // ---- delete with confirm ------------------------------------------------

  function confirmAndDelete(id: Id) {
    if (!pkgState) return;
    const deck = pkgState.data.decks[id];
    if (!deck) return;
    const childCount = Object.values(pkgState.data.decks).filter(
      (d) => d.parentDeckId === id,
    ).length;
    const noteCount = Object.values(pkgState.data.notes).filter((n) => n.deckId === id).length;
    const detail =
      childCount > 0
        ? `"${deck.name}" has ${childCount} subdeck${childCount === 1 ? "" : "s"}. They will also be deleted.`
        : noteCount > 0
          ? `"${deck.name}" has ${noteCount} card${noteCount === 1 ? "" : "s"}. They will be deleted.`
          : `Delete "${deck.name}"?`;
    if (!confirm(`${detail}\n\nUse Ctrl+Z to undo.`)) return;
    actions.deck.delete(id);
  }

  // ---- derived view -------------------------------------------------------

  const forest = $derived.by(() => {
    if (!pkgState) return [];
    return buildDeckForest({ decks: pkgState.data.decks, notes: pkgState.data.notes });
  });

  const selectedDeck = $derived(
    pkgState && pkgState.selection.kind === "deck"
      ? pkgState.data.decks[pkgState.selection.id]
      : null,
  );

  const selectedDeckNotes = $derived.by(() => {
    if (!pkgState || !selectedDeck) return [];
    return Object.values(pkgState.data.notes)
      .filter((n) => n.deckId === selectedDeck.id)
      .sort((a, b) => a.order - b.order);
  });

  const selectedDeckCount = $derived(selectedDeckNotes.length);

  function canDuplicateAsWriting(deckId: Id): boolean {
    if (!pkgState) return false;
    const deck = pkgState.data.decks[deckId];
    if (!deck) return false;
    return (
      isSimpleFlashcardDeck({
        deck,
        decks: pkgState.data.decks,
        notes: pkgState.data.notes,
        models: pkgState.data.models,
      }) !== null
    );
  }

  // Breadcrumbs from root to selected deck.
  const breadcrumbs = $derived.by<string[]>(() => {
    if (!pkgState || !selectedDeck) return [];
    const decks = pkgState.data.decks;
    const trail: string[] = [];
    let cur: Id | null = selectedDeck.id;
    while (cur) {
      const next: BuilderDeck | undefined = decks[cur];
      if (!next) break;
      trail.unshift(next.name || "Untitled deck");
      cur = next.parentDeckId;
    }
    return trail;
  });
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
    <div
      class="text-muted-foreground flex flex-1 items-center justify-center text-sm"
      aria-live="polite"
    >
      Loading deck…
    </div>
  {:else}
    <EditorTopbar
      title={pkgState.data.package.title}
      {canUndo}
      {canRedo}
      {saveStatus}
      onTitleChange={actions.package.setTitle}
      onUndo={undo}
      onRedo={redo}
    />

    <div class="flex flex-1 overflow-hidden">
      <Sidebar
        {forest}
        selection={pkgState.selection}
        {canDuplicateAsWriting}
        onSelect={actions.deck.select}
        onAddRoot={actions.deck.addRoot}
        onAddSubdeck={actions.deck.addUnder}
        onRename={actions.deck.rename}
        onDelete={confirmAndDelete}
        onDuplicateWriting={actions.deck.duplicateAsWriting}
        onMove={actions.deck.move}
      />

      <main class="flex-1 overflow-y-auto px-6 py-8">
        {#if selectedDeck}
          <div class="mx-auto max-w-3xl space-y-6">
            <header class="space-y-2">
              {#if breadcrumbs.length > 1}
                <nav class="text-muted-foreground text-xs" aria-label="Deck path">
                  {breadcrumbs.slice(0, -1).join(" / ")} /
                </nav>
              {/if}
              <h2 class="text-2xl font-semibold tracking-tight">{selectedDeck.name}</h2>
              <p class="text-muted-foreground text-sm">
                {selectedDeckCount}
                {selectedDeckCount === 1 ? "card" : "cards"}
              </p>
            </header>

            <CardList
              notes={selectedDeckNotes}
              onAdd={() => actions.note.add(selectedDeck.id)}
              onUpdateField={actions.note.updateField}
              onDuplicate={actions.note.duplicate}
              onDelete={actions.note.delete}
              onDeleteMany={actions.note.deleteMany}
              onMove={actions.note.move}
            />
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
