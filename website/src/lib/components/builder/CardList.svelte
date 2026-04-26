<script lang="ts">
  import { tick } from "svelte";
  import { SvelteSet } from "svelte/reactivity";
  import { Plus, Search, X } from "@lucide/svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import CardRow from "./CardRow.svelte";
  import BulkEditBar from "./BulkEditBar.svelte";
  import type { BuilderNote, Id } from "$lib/builder/types";

  interface Props {
    notes: BuilderNote[];
    onAdd: () => Id;
    onUpdateField: (noteId: Id, fieldIndex: number, value: string) => void;
    onDuplicate: (noteId: Id) => Id;
    onDelete: (noteId: Id) => void;
    onDeleteMany: (noteIds: Id[]) => void;
    onMove: (sourceId: Id, targetId: Id, position: "before" | "after") => void;
  }

  let { notes, onAdd, onUpdateField, onDuplicate, onDelete, onDeleteMany, onMove }: Props =
    $props();

  // Notes already arrive sorted, but we resort defensively.
  const sorted = $derived([...notes].sort((a, b) => a.order - b.order));

  let listEl = $state<HTMLDivElement | null>(null);

  // ---- search ------------------------------------------------------------

  let query = $state("");
  const trimmedQuery = $derived(query.trim().toLowerCase());

  const filtered = $derived.by(() => {
    if (!trimmedQuery) return sorted;
    return sorted.filter((n) => n.fields.some((f) => f.toLowerCase().includes(trimmedQuery)));
  });

  const filterActive = $derived(trimmedQuery.length > 0);

  // ---- bulk selection ----------------------------------------------------

  const selected = new SvelteSet<Id>();
  let lastClickedIndex = $state<number | null>(null);

  // Drop ids that no longer exist (deleted, or filtered out by search).
  $effect(() => {
    const visible = new Set(filtered.map((n) => n.id));
    for (const id of selected) {
      if (!visible.has(id)) selected.delete(id);
    }
  });

  const selectionMode = $derived(selected.size > 0);

  function toggleSelect(noteId: Id, index: number, extend: boolean) {
    if (extend && lastClickedIndex !== null) {
      const lo = Math.min(lastClickedIndex, index);
      const hi = Math.max(lastClickedIndex, index);
      for (let i = lo; i <= hi; i++) {
        const target = filtered[i];
        if (target) selected.add(target.id);
      }
    } else {
      if (selected.has(noteId)) selected.delete(noteId);
      else selected.add(noteId);
    }
    lastClickedIndex = index;
  }

  function clearSelection() {
    selected.clear();
    lastClickedIndex = null;
  }

  function deleteSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (ids.length > 5 && !confirm(`Delete ${ids.length} cards? Use Ctrl+Z to undo.`)) return;
    onDeleteMany(ids);
    clearSelection();
  }

  // ---- drag and drop -----------------------------------------------------

  let dragSourceId = $state<Id | null>(null);
  let dragOverId = $state<Id | null>(null);
  let dragPosition = $state<"before" | "after" | null>(null);

  function handleDragStart(noteId: Id, ev: DragEvent) {
    if (filterActive) {
      ev.preventDefault();
      return;
    }
    if (!ev.dataTransfer) return;
    ev.dataTransfer.effectAllowed = "move";
    ev.dataTransfer.setData("text/plain", noteId);
    dragSourceId = noteId;
  }

  function handleDragOver(noteId: Id, ev: DragEvent) {
    if (!dragSourceId || dragSourceId === noteId) return;
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = "move";
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const fraction = (ev.clientY - rect.top) / rect.height;
    const position: "before" | "after" = fraction < 0.5 ? "before" : "after";
    if (dragOverId !== noteId || dragPosition !== position) {
      dragOverId = noteId;
      dragPosition = position;
    }
  }

  function handleDragLeave(noteId: Id) {
    if (dragOverId === noteId) {
      dragOverId = null;
      dragPosition = null;
    }
  }

  function handleDrop(noteId: Id, ev: DragEvent) {
    ev.preventDefault();
    const source = dragSourceId;
    const position = dragPosition;
    dragSourceId = null;
    dragOverId = null;
    dragPosition = null;
    if (!source || !position || source === noteId) return;
    onMove(source, noteId, position);
  }

  function handleDragEnd() {
    dragSourceId = null;
    dragOverId = null;
    dragPosition = null;
  }

  // ---- focus helpers -----------------------------------------------------

  async function focusNote(id: Id, fieldIndex = 0): Promise<void> {
    await tick();
    const sel = `[data-note-id="${id}"] textarea[data-field-index="${fieldIndex}"]`;
    const target = listEl?.querySelector<HTMLTextAreaElement>(sel);
    target?.focus();
  }

  async function add(): Promise<void> {
    // Adding while filtered would hide the new card; clear the filter so the
    // user actually sees their new row.
    if (filterActive) query = "";
    const id = onAdd();
    await focusNote(id, 0);
  }

  async function duplicate(noteId: Id): Promise<void> {
    if (filterActive) query = "";
    const id = onDuplicate(noteId);
    await focusNote(id, 0);
  }

  async function tabOffEnd(): Promise<void> {
    await add();
  }
</script>

<div bind:this={listEl} class="flex flex-col">
  <div class="relative px-3 pb-3">
    <Search
      class="text-muted-foreground pointer-events-none absolute top-1/2 left-5 h-4 w-4
        -translate-y-1/2"
      aria-hidden="true"
    />
    <Input
      bind:value={query}
      placeholder="Search cards"
      aria-label="Search cards in this deck"
      class="h-9 pr-9 pl-9"
    />
    {#if filterActive}
      <button
        type="button"
        onclick={() => (query = "")}
        aria-label="Clear search"
        class="text-muted-foreground hover:text-foreground absolute top-1/2 right-5 -translate-y-1/2
          rounded p-1 transition-colors"
      >
        <X class="h-4 w-4" />
      </button>
    {/if}
  </div>

  {#if filtered.length === 0}
    {#if filterActive}
      <div class="text-muted-foreground py-12 text-center text-sm">
        No cards match
        <span class="text-foreground font-medium">"{query}"</span>.
      </div>
    {:else}
      <div class="text-muted-foreground py-12 text-center text-sm">
        No cards yet.
        <button
          type="button"
          class="text-primary hover:underline"
          onclick={() => {
            void add();
          }}
        >
          Add your first card
        </button>
        .
      </div>
    {/if}
  {:else}
    {#each filtered as note, i (note.id)}
      {@const showBeforeIndicator = dragOverId === note.id && dragPosition === "before"}
      {@const showAfterIndicator = dragOverId === note.id && dragPosition === "after"}
      <div
        role="listitem"
        data-note-id={note.id}
        draggable={!filterActive}
        ondragstart={(e) => handleDragStart(note.id, e)}
        ondragover={(e) => handleDragOver(note.id, e)}
        ondragleave={() => handleDragLeave(note.id)}
        ondrop={(e) => handleDrop(note.id, e)}
        ondragend={handleDragEnd}
        class="relative {dragSourceId === note.id ? 'opacity-50' : ''}"
      >
        {#if showBeforeIndicator}
          <span class="bg-primary pointer-events-none absolute top-0 right-0 left-0 h-0.5"></span>
        {/if}
        <CardRow
          {note}
          index={i + 1}
          isLast={i === filtered.length - 1}
          isSelected={selected.has(note.id)}
          {selectionMode}
          onUpdateField={(fi, v) => onUpdateField(note.id, fi, v)}
          onDuplicate={() => {
            void duplicate(note.id);
          }}
          onDelete={() => onDelete(note.id)}
          onTabOffEnd={() => {
            void tabOffEnd();
          }}
          onToggleSelect={({ extend }) => toggleSelect(note.id, i, extend)}
        />
        {#if showAfterIndicator}
          <span class="bg-primary pointer-events-none absolute right-0 bottom-0 left-0 h-0.5"
          ></span>
        {/if}
      </div>
    {/each}
  {/if}

  <div class="px-3 pt-3 pb-2">
    <Button
      variant="ghost"
      size="sm"
      onclick={() => {
        void add();
      }}
      class="text-muted-foreground hover:text-foreground -ml-2"
    >
      <Plus class="mr-1 h-4 w-4" />
      Add card
    </Button>
  </div>
</div>

{#if selected.size > 0}
  <BulkEditBar count={selected.size} onDelete={deleteSelected} onClear={clearSelection} />
{/if}
