<script lang="ts">
  import { Copy, Trash2 } from "@lucide/svelte";
  import { autoresize } from "$lib/actions/autoresize";
  import type { BuilderNote } from "$lib/builder/types";

  interface Props {
    note: BuilderNote;
    /** 1-based row number shown in the gutter. */
    index: number;
    /** Last row in the deck list; Tab off the def field appends a new card. */
    isLast: boolean;
    onUpdateField: (fieldIndex: number, value: string) => void;
    onDuplicate: () => void;
    onDelete: () => void;
    /** Called when Tab leaves the def field of the last row. */
    onTabOffEnd: () => void;
  }

  let { note, index, isLast, onUpdateField, onDuplicate, onDelete, onTabOffEnd }: Props = $props();

  // Local mirrors so we can write through `bind:value` without thrashing the
  // central state. The actions module dedupes no-op updates so this is safe.
  let termValue = $derived(note.fields[0] ?? "");
  let defValue = $derived(note.fields[1] ?? "");

  function handleDefKeydown(e: KeyboardEvent) {
    if (isLast && e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      onTabOffEnd();
    }
  }
</script>

<div
  class="group hover:bg-muted/30 flex items-start gap-3 rounded-md border-b border-transparent
    py-2 pr-3 pl-3 transition-colors"
>
  <span
    class="text-muted-foreground mt-2 w-6 shrink-0 text-right text-xs tabular-nums select-none"
    aria-hidden="true"
  >
    {index}
  </span>

  <div class="flex flex-1 items-start gap-3">
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
