<script lang="ts">
  import DeckTreeNode, { type DragState } from "./DeckTreeNode.svelte";
  import type { DeckNode, DropPosition } from "$lib/builder/deck-tree";
  import type { Id, Selection } from "$lib/builder/types";

  interface Props {
    forest: DeckNode[];
    selection: Selection;
    canDuplicateAsWriting: (id: Id) => boolean;
    onSelect: (id: Id) => void;
    onRename: (id: Id, name: string) => void;
    onAddSubdeck: (parentId: Id) => void;
    onDelete: (id: Id) => void;
    onDuplicateWriting: (id: Id, direction: "termDef" | "defTerm" | "both") => void;
    onMove: (sourceId: Id, targetId: Id, position: DropPosition) => void;
  }

  let {
    forest,
    selection,
    canDuplicateAsWriting,
    onSelect,
    onRename,
    onAddSubdeck,
    onDelete,
    onDuplicateWriting,
    onMove,
  }: Props = $props();

  // ---- ui state -----------------------------------------------------------

  let expanded = $state<Record<Id, boolean>>({});
  let editingId = $state<Id | null>(null);
  let dragState = $state<DragState>({ sourceId: null, targetId: null, position: null });

  function toggle(id: Id) {
    expanded[id] = !(expanded[id] ?? true);
  }

  function requestRename(id: Id) {
    editingId = id;
  }

  function commitRename(id: Id, name: string) {
    if (editingId !== id) return;
    editingId = null;
    const trimmed = name.trim();
    if (trimmed) onRename(id, trimmed);
  }

  function cancelRename() {
    editingId = null;
  }

  // ---- drag and drop ------------------------------------------------------

  function handleDragStart(id: Id, ev: DragEvent) {
    if (!ev.dataTransfer) return;
    ev.dataTransfer.effectAllowed = "move";
    ev.dataTransfer.setData("text/plain", id);
    dragState = { sourceId: id, targetId: null, position: null };
  }

  function handleDragOver(id: Id, ev: DragEvent) {
    if (!dragState.sourceId || dragState.sourceId === id) return;
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = "move";

    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const offset = ev.clientY - rect.top;
    const fraction = offset / rect.height;

    let position: DropPosition;
    if (fraction < 0.25) position = "before";
    else if (fraction > 0.75) position = "after";
    else position = "inside";

    if (dragState.targetId !== id || dragState.position !== position) {
      dragState = { sourceId: dragState.sourceId, targetId: id, position };
    }
  }

  function handleDragLeave(id: Id) {
    if (dragState.targetId === id) {
      dragState = { sourceId: dragState.sourceId, targetId: null, position: null };
    }
  }

  function handleDrop(id: Id, ev: DragEvent) {
    ev.preventDefault();
    const source = dragState.sourceId;
    const position = dragState.position;
    dragState = { sourceId: null, targetId: null, position: null };
    if (!source || !position || source === id) return;
    onMove(source, id, position);
    // Auto-expand destination so the user sees the moved deck land.
    if (position === "inside") expanded[id] = true;
  }

  function handleDragEnd() {
    dragState = { sourceId: null, targetId: null, position: null };
  }
</script>

<div role="tree" aria-label="Decks" class="flex flex-col gap-0.5">
  {#each forest as node (node.deck.id)}
    <DeckTreeNode
      {node}
      {selection}
      {expanded}
      {editingId}
      {dragState}
      {canDuplicateAsWriting}
      {onSelect}
      onToggle={toggle}
      onRenameRequest={requestRename}
      onRenameCommit={commitRename}
      onRenameCancel={cancelRename}
      {onAddSubdeck}
      {onDelete}
      {onDuplicateWriting}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
    />
  {/each}
</div>
