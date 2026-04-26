<script lang="ts">
  import { ChevronRight, Folder } from "@lucide/svelte";
  import { Input } from "$lib/components/ui/input";
  import DeckContextMenu from "./DeckContextMenu.svelte";
  import DeckTreeNode from "./DeckTreeNode.svelte";
  import type { DeckNode } from "$lib/builder/deck-tree";
  import type { Id, Selection } from "$lib/builder/types";
  import type { DropPosition } from "$lib/builder/deck-tree";

  export interface DragState {
    sourceId: Id | null;
    targetId: Id | null;
    position: DropPosition | null;
  }

  interface Props {
    node: DeckNode;
    selection: Selection;
    expanded: Record<Id, boolean>;
    editingId: Id | null;
    dragState: DragState;
    canDuplicateAsWriting: (id: Id) => boolean;
    onSelect: (id: Id) => void;
    onToggle: (id: Id) => void;
    onRenameRequest: (id: Id) => void;
    onRenameCommit: (id: Id, name: string) => void;
    onRenameCancel: () => void;
    onAddSubdeck: (parentId: Id) => void;
    onDelete: (id: Id) => void;
    onDuplicateWriting: (id: Id, direction: "termDef" | "defTerm" | "both") => void;
    onDragStart: (id: Id, ev: DragEvent) => void;
    onDragOver: (id: Id, ev: DragEvent) => void;
    onDragLeave: (id: Id) => void;
    onDrop: (id: Id, ev: DragEvent) => void;
    onDragEnd: () => void;
  }

  let {
    node,
    selection,
    expanded,
    editingId,
    dragState,
    canDuplicateAsWriting,
    onSelect,
    onToggle,
    onRenameRequest,
    onRenameCommit,
    onRenameCancel,
    onAddSubdeck,
    onDelete,
    onDuplicateWriting,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    onDragEnd,
  }: Props = $props();

  const id = $derived(node.deck.id);
  const isOpen = $derived(expanded[id] ?? true);
  const isSelected = $derived(selection.kind === "deck" && selection.id === id);
  const isEditing = $derived(editingId === id);
  const hasChildren = $derived(node.children.length > 0);

  const isDragTarget = $derived(dragState.targetId === id);
  const indicatorBefore = $derived(isDragTarget && dragState.position === "before");
  const indicatorAfter = $derived(isDragTarget && dragState.position === "after");
  const indicatorInside = $derived(isDragTarget && dragState.position === "inside");

  // svelte-ignore state_referenced_locally
  let renameValue = $state(node.deck.name);
  // Reset only on the false → true edge so re-renders mid-edit don't
  // overwrite what the user is typing.
  let prevEditing = $state(false);
  $effect(() => {
    if (isEditing && !prevEditing) renameValue = node.deck.name;
    prevEditing = isEditing;
  });

  let renameInputEl = $state<HTMLInputElement | null>(null);
  $effect(() => {
    if (isEditing && renameInputEl) {
      renameInputEl.focus();
      renameInputEl.select();
    }
  });

  function commitRename() {
    onRenameCommit(id, renameValue);
  }

  function handleRenameKey(e: KeyboardEvent) {
    // Always stop propagation so the row's keydown (which treats space and
    // Enter as "select deck") never fires while we're typing in the input.
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      commitRename();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onRenameCancel();
    }
  }
</script>

<div class="relative">
  <DeckContextMenu
    canDuplicateAsWriting={canDuplicateAsWriting(id)}
    onRename={() => onRenameRequest(id)}
    onAddSubdeck={() => onAddSubdeck(id)}
    onDelete={() => onDelete(id)}
    onDuplicateWriting={(dir) => onDuplicateWriting(id, dir)}
  >
    <div
      role="treeitem"
      aria-selected={isSelected}
      aria-expanded={hasChildren ? isOpen : undefined}
      draggable={!isEditing}
      ondragstart={(e) => onDragStart(id, e)}
      ondragover={(e) => onDragOver(id, e)}
      ondragleave={() => onDragLeave(id)}
      ondrop={(e) => onDrop(id, e)}
      ondragend={onDragEnd}
      class="group relative flex h-7 w-full cursor-pointer items-center gap-1.5 rounded-md
        pr-2 text-sm transition-colors
        {isSelected ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/50'}
        {indicatorInside ? 'ring-primary/40 ring-2 ring-inset' : ''}"
      style="padding-left: {node.depth * 12 + 4}px"
      onclick={() => {
        if (!isEditing) onSelect(id);
      }}
      onkeydown={(e) => {
        if (isEditing) return;
        const target = e.target as HTMLElement | null;
        if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(id);
        }
      }}
      tabindex="0"
    >
      {#if hasChildren}
        <button
          type="button"
          onclick={(e) => {
            e.stopPropagation();
            onToggle(id);
          }}
          class="hover:bg-accent flex h-4 w-4 shrink-0 items-center justify-center rounded"
          aria-label={isOpen ? "Collapse" : "Expand"}
          tabindex="-1"
        >
          <ChevronRight class="h-3.5 w-3.5 transition-transform {isOpen ? 'rotate-90' : ''}" />
        </button>
      {:else}
        <span class="w-4 shrink-0"></span>
      {/if}

      <Folder class="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-hidden="true" />

      {#if isEditing}
        <Input
          bind:ref={renameInputEl}
          bind:value={renameValue}
          onblur={commitRename}
          onkeydown={handleRenameKey}
          onclick={(e: MouseEvent) => e.stopPropagation()}
          ondragstart={(e: DragEvent) => e.preventDefault()}
          class="h-6 px-1 py-0 text-sm"
        />
      {:else}
        <span class="flex-1 truncate text-left">{node.deck.name || "Untitled deck"}</span>
        <span class="text-muted-foreground text-xs">{node.totalNoteCount}</span>
      {/if}

      {#if indicatorBefore}
        <span class="bg-primary pointer-events-none absolute top-0 right-0 left-0 h-0.5"></span>
      {/if}
      {#if indicatorAfter}
        <span class="bg-primary pointer-events-none absolute right-0 bottom-0 left-0 h-0.5"></span>
      {/if}
    </div>
  </DeckContextMenu>

  {#if hasChildren && isOpen}
    {#each node.children as child (child.deck.id)}
      <DeckTreeNode
        node={child}
        {selection}
        {expanded}
        {editingId}
        {dragState}
        {canDuplicateAsWriting}
        {onSelect}
        {onToggle}
        {onRenameRequest}
        {onRenameCommit}
        {onRenameCancel}
        {onAddSubdeck}
        {onDelete}
        {onDuplicateWriting}
        {onDragStart}
        {onDragOver}
        {onDragLeave}
        {onDrop}
        {onDragEnd}
      />
    {/each}
  {/if}
</div>
