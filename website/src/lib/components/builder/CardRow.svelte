<script lang="ts">
  import { Check, Copy, Trash2 } from "@lucide/svelte";
  import { autoresize } from "$lib/actions/autoresize";
  import TagPills from "./TagPills.svelte";
  import type { BuilderNote } from "$lib/builder/types";

  interface Props {
    note: BuilderNote;
    /** 1-based row number shown in the gutter when nothing is selected. */
    index: number;
    /** Last row in the deck list; Tab off the def field appends a new card. */
    isLast: boolean;
    /** Whether this row is part of the current bulk selection. */
    isSelected: boolean;
    /** When true, the gutter shows the checkbox even on unselected rows. */
    selectionMode: boolean;
    onUpdateField: (fieldIndex: number, value: string) => void;
    onDuplicate: () => void;
    onDelete: () => void;
    /** Called when Tab leaves the def field of the last row. */
    onTabOffEnd: () => void;
    /** Toggle this row in the bulk selection. `extend` is true on shift-click. */
    onToggleSelect: (event: { extend: boolean }) => void;
    onAddTag: (tag: string) => void;
    onRemoveTag: (tag: string) => void;
  }

  let {
    note,
    index,
    isLast,
    isSelected,
    selectionMode,
    onUpdateField,
    onDuplicate,
    onDelete,
    onTabOffEnd,
    onToggleSelect,
    onAddTag,
    onRemoveTag,
  }: Props = $props();

  let termValue = $derived(note.fields[0] ?? "");
  let defValue = $derived(note.fields[1] ?? "");

  function handleDefKeydown(e: KeyboardEvent) {
    if (isLast && e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      onTabOffEnd();
    }
  }

  function handleGutterClick(e: MouseEvent) {
    onToggleSelect({ extend: e.shiftKey });
  }

  function handleGutterKey(e: KeyboardEvent) {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onToggleSelect({ extend: e.shiftKey });
    }
  }

  // Show checkbox when: row selected, selection mode active, or row hovered.
  // Hover state is handled via `group-hover` so we can leave the checkbox always
  // present in the DOM and just toggle opacity.
  const checkboxAlwaysVisible = $derived(isSelected || selectionMode);
</script>

<div
  class="group flex items-start gap-3 rounded-md border-b border-transparent py-2 pr-3 pl-3
    transition-colors
    {isSelected ? 'bg-accent/40' : 'hover:bg-muted/30'}"
>
  <button
    type="button"
    onclick={handleGutterClick}
    onkeydown={handleGutterKey}
    tabindex={-1}
    aria-label={isSelected ? "Deselect card" : "Select card"}
    aria-pressed={isSelected}
    class="text-muted-foreground hover:text-foreground mt-1 grid h-6 w-6 shrink-0
      place-items-center rounded text-xs tabular-nums transition-colors"
  >
    <span
      class="col-start-1 row-start-1 transition-opacity {checkboxAlwaysVisible
        ? 'opacity-0'
        : 'opacity-100 group-hover:opacity-0'}"
      aria-hidden="true"
    >
      {index}
    </span>
    <span
      class="border-input bg-background col-start-1 row-start-1 flex h-4 w-4 items-center
        justify-center rounded border transition-opacity {checkboxAlwaysVisible
        ? 'opacity-100'
        : 'opacity-0 group-hover:opacity-100'}
        {isSelected ? 'bg-primary border-primary text-primary-foreground' : ''}"
    >
      {#if isSelected}
        <Check class="h-3 w-3" strokeWidth={3} />
      {/if}
    </span>
  </button>

  <div class="flex flex-1 flex-col gap-1">
    <div class="flex items-start gap-3">
      <textarea
        value={termValue}
        oninput={(e) => onUpdateField(0, (e.currentTarget as HTMLTextAreaElement).value)}
        use:autoresize={termValue}
        placeholder="Term"
        rows="1"
        data-field-index="0"
        class="placeholder:text-muted-foreground/60 focus-visible:bg-background/40 flex-1 resize-none
          rounded-sm bg-transparent px-1 py-1 text-sm leading-snug
          focus-visible:outline-none"
        aria-label="Term"
      ></textarea>

      <div class="bg-border mt-2 w-px self-stretch" aria-hidden="true"></div>

      <textarea
        value={defValue}
        oninput={(e) => onUpdateField(1, (e.currentTarget as HTMLTextAreaElement).value)}
        onkeydown={handleDefKeydown}
        use:autoresize={defValue}
        placeholder="Definition"
        rows="1"
        data-field-index="1"
        class="placeholder:text-muted-foreground/60 focus-visible:bg-background/40 flex-1 resize-none
          rounded-sm bg-transparent px-1 py-1 text-sm leading-snug
          focus-visible:outline-none"
        aria-label="Definition"
      ></textarea>
    </div>

    {#if note.tags.length > 0}
      <div class="px-1">
        <TagPills tags={note.tags} onAdd={onAddTag} onRemove={onRemoveTag} />
      </div>
    {:else}
      <div
        class="px-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      >
        <TagPills tags={note.tags} onAdd={onAddTag} onRemove={onRemoveTag} />
      </div>
    {/if}
  </div>

  <div
    class="text-muted-foreground mt-1 flex w-12 shrink-0 items-center gap-1 opacity-0
      transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
  >
    <button
      type="button"
      tabindex={-1}
      onclick={onDuplicate}
      aria-label="Duplicate card"
      class="hover:text-foreground hover:bg-accent rounded p-1 transition-colors"
    >
      <Copy class="h-4 w-4" />
    </button>
    <button
      type="button"
      tabindex={-1}
      onclick={onDelete}
      aria-label="Delete card"
      class="hover:text-destructive hover:bg-destructive/10 rounded p-1 transition-colors"
    >
      <Trash2 class="h-4 w-4" />
    </button>
  </div>
</div>

<style>
  /* Stop the textarea from rendering an off-grid scrollbar before autoresize
     runs on the first paint. */
  textarea {
    overflow: hidden;
  }
</style>
