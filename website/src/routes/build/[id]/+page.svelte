<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { Button } from "$lib/components/ui/button";

  import EditorTopbar from "$lib/components/builder/EditorTopbar.svelte";
  import Sidebar from "$lib/components/builder/Sidebar.svelte";
  import CardList from "$lib/components/builder/CardList.svelte";
  import DeadlineBar from "$lib/components/builder/DeadlineBar.svelte";
  import DeadlineModal from "$lib/components/builder/DeadlineModal.svelte";
  import ModelEditor from "$lib/components/builder/ModelEditor.svelte";
  import NoteTypePill from "$lib/components/builder/NoteTypePill.svelte";
  import PresetEditor from "$lib/components/builder/PresetEditor.svelte";
  import PresetPill from "$lib/components/builder/PresetPill.svelte";
  import type { DeadlineDeck } from "$lib/components/builder/DeadlineModal.svelte";

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

  // ---- models -------------------------------------------------------------

  const allModels = $derived(pkgState ? Object.values(pkgState.data.models) : []);

  const modelUsage = $derived.by(() => {
    const counts: Record<Id, number> = {};
    if (!pkgState) return counts;
    for (const note of Object.values(pkgState.data.notes)) {
      counts[note.modelId] = (counts[note.modelId] ?? 0) + 1;
    }
    return counts;
  });

  const selectedModel = $derived(
    pkgState && pkgState.selection.kind === "model"
      ? pkgState.data.models[pkgState.selection.id]
      : null,
  );

  // ---- configs ------------------------------------------------------------

  const allConfigs = $derived(pkgState ? Object.values(pkgState.data.configs) : []);

  const configUsage = $derived.by(() => {
    const counts: Record<Id, number> = {};
    if (!pkgState) return counts;
    for (const d of Object.values(pkgState.data.decks)) {
      counts[d.configId] = (counts[d.configId] ?? 0) + 1;
    }
    return counts;
  });

  const selectedConfig = $derived(
    pkgState && pkgState.selection.kind === "config"
      ? pkgState.data.configs[pkgState.selection.id]
      : null,
  );

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

  // ---- deadline modal ----------------------------------------------------

  let deadlineModalOpen = $state(false);

  const allDecksForDeadline = $derived.by<DeadlineDeck[]>(() => {
    if (!pkgState) return [];
    const data = pkgState.data;
    return Object.values(data.decks)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
      .map((d) => ({
        id: d.id,
        name: d.name || "Untitled deck",
        isCustomized: data.configs[d.configId]?.source === "custom",
      }));
  });

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
      data={pkgState.data}
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
        models={allModels}
        {modelUsage}
        onSelectModel={actions.model.select}
        onAddCustomModel={() => {
          actions.model.addCustom();
        }}
        configs={allConfigs}
        {configUsage}
        onSelectConfig={actions.config.select}
        onAddConfig={() => {
          actions.config.add();
        }}
      />

      <main class="flex-1 overflow-y-auto px-6 py-8">
        {#if selectedConfig}
          <div class="mx-auto max-w-3xl">
            <PresetEditor
              config={selectedConfig}
              usage={configUsage[selectedConfig.id] ?? 0}
              onRename={actions.config.rename}
              onDelete={actions.config.delete}
              onUpdate={actions.config.updateField}
            />
          </div>
        {:else if selectedModel}
          <div class="mx-auto max-w-3xl">
            <ModelEditor
              model={selectedModel}
              usage={modelUsage[selectedModel.id] ?? 0}
              onRename={actions.model.rename}
              onDuplicateBuiltin={actions.model.duplicateBuiltin}
              onDelete={actions.model.delete}
              onAddField={(id) => actions.model.addField(id, "Field")}
              onRenameField={actions.model.renameField}
              onRemoveField={actions.model.removeField}
              onMoveField={actions.model.moveField}
              onAddTemplate={(id) => actions.model.addTemplate(id, "")}
              onRemoveTemplate={actions.model.removeTemplate}
              onRenameTemplate={actions.model.renameTemplate}
              onUpdateTemplate={actions.model.updateTemplate}
              onUpdateCss={actions.model.updateCss}
            />
          </div>
        {:else if selectedDeck}
          <div class="mx-auto max-w-3xl space-y-6">
            <header class="space-y-3">
              {#if breadcrumbs.length > 1}
                <nav class="text-muted-foreground text-xs" aria-label="Deck path">
                  {breadcrumbs.slice(0, -1).join(" / ")} /
                </nav>
              {/if}
              <h2 class="text-2xl font-semibold tracking-tight">{selectedDeck.name}</h2>
              <div class="flex flex-wrap items-center gap-3">
                <p class="text-muted-foreground text-sm">
                  {selectedDeckCount}
                  {selectedDeckCount === 1 ? "card" : "cards"}
                </p>
                <DeadlineBar
                  deadline={selectedDeck.deadline}
                  onOpen={() => (deadlineModalOpen = true)}
                />
                <NoteTypePill
                  selectedModelId={selectedDeck.modelId}
                  models={allModels}
                  onSelect={(modelId) => actions.deck.setNoteType(selectedDeck.id, modelId)}
                />
                <PresetPill
                  selectedConfigId={selectedDeck.configId}
                  configs={allConfigs}
                  onSelect={(configId) => actions.config.setForDeck(selectedDeck.id, configId)}
                  onCreate={() => actions.config.add()}
                />
              </div>
            </header>

            <CardList
              notes={selectedDeckNotes}
              onAdd={() => actions.note.add(selectedDeck.id)}
              onUpdateField={actions.note.updateField}
              onDuplicate={actions.note.duplicate}
              onDelete={actions.note.delete}
              onDeleteMany={actions.note.deleteMany}
              onMove={actions.note.move}
              onAddTag={actions.note.addTag}
              onRemoveTag={actions.note.removeTag}
            />
          </div>
        {:else}
          <p class="text-muted-foreground py-24 text-center text-sm">
            Select a deck on the left to start editing.
          </p>
        {/if}
      </main>
    </div>

    {#if selectedDeck}
      <DeadlineModal
        bind:open={deadlineModalOpen}
        allDecks={allDecksForDeadline}
        currentDeckId={selectedDeck.id}
        initialDeadline={selectedDeck.deadline}
        onSave={({ deckIds, deadline }) => actions.deck.setDeadline(deckIds, deadline)}
        onClose={() => (deadlineModalOpen = false)}
      />
    {/if}
  {/if}
</div>
