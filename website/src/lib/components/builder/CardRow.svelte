<script lang="ts">
  import { Brackets, Check, Copy, Trash2 } from "@lucide/svelte";
  import { autoresize } from "$lib/actions/autoresize";
  import TagPills from "./TagPills.svelte";
  import type { BuilderModel, BuilderNote } from "$lib/builder/types";

  interface Props {
    note: BuilderNote;
    /** The model the note follows; drives layout for cloze and N-field models. */
    model: BuilderModel;
    /** 1-based row number shown in the gutter when nothing is selected. */
    index: number;
    /** Last row in the deck list; Tab off the final field appends a new card. */
    isLast: boolean;
    isSelected: boolean;
    selectionMode: boolean;
    onUpdateField: (fieldIndex: number, value: string) => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onTabOffEnd: () => void;
    onToggleSelect: (event: { extend: boolean }) => void;
    onAddTag: (tag: string) => void;
    onRemoveTag: (tag: string) => void;
  }

  let {
    note,
    model,
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

  const isCloze = $derived(model.type === "cloze");
  const isSideBySide = $derived(!isCloze && model.fields.length === 2);

  function fieldValue(i: number): string {
    return note.fields[i] ?? "";
  }

  function handleFieldKeydown(e: KeyboardEvent, fieldIndex: number) {
    const isLastField = fieldIndex === model.fields.length - 1;
    if (isLast && isLastField && e.key === "Tab" && !e.shiftKey) {
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

  const checkboxAlwaysVisible = $derived(isSelected || selectionMode);

  // ---- cloze helpers -----------------------------------------------------

  const clozeText = $derived(fieldValue(0));
  const clozeCount = $derived.by(() => {
    if (!isCloze) return 0;
    return uniqueClozeIds(clozeText).length;
  });

  function uniqueClozeIds(value: string): number[] {
    const ids: number[] = [];
    for (const match of value.matchAll(/\{\{c(\d+)::/g)) {
      const n = Number.parseInt(match[1], 10);
      if (!ids.includes(n)) ids.push(n);
    }
    return ids;
  }

  function nextClozeId(value: string): number {
    const ids = uniqueClozeIds(value);
    let next = 1;
    while (ids.includes(next)) next += 1;
    return next;
  }

  function addCloze(textarea: HTMLTextAreaElement) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    if (start == null || end == null) return;
    const selectedText = value.slice(start, end) || "...";
    const wrapped = `{{c${nextClozeId(value)}::${selectedText}}}`;
    const updated = value.slice(0, start) + wrapped + value.slice(end);
    onUpdateField(0, updated);
    requestAnimationFrame(() => {
      const caret = start + wrapped.length;
      textarea.focus();
      textarea.setSelectionRange(caret, caret);
    });
  }

  let clozeTextareaEl = $state<HTMLTextAreaElement | null>(null);

  function handleAddClozeClick() {
    if (!clozeTextareaEl) return;
    addCloze(clozeTextareaEl);
  }

  // Avoid `{{` literally in the markup since Svelte would parse it as an
  // expression delimiter; build the example placeholder in JS instead.
  const clozeExample = "{{c1::Paris}}";
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
    {#if isCloze}
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <button
            type="button"
            onclick={handleAddClozeClick}
            tabindex={-1}
            class="bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground inline-flex
              items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors"
            aria-label="Wrap selection in a cloze"
          >
            <Brackets class="h-3.5 w-3.5" />
            Add cloze
          </button>
          {#if clozeCount > 0}
            <span class="text-muted-foreground text-xs">
              {clozeCount}
              {clozeCount === 1 ? "cloze" : "clozes"}
            </span>
          {:else}
            <span class="text-muted-foreground text-xs">
              Wrap text in &#123;&#123;c1::...&#125;&#125;
            </span>
          {/if}
        </div>

        <textarea
          bind:this={clozeTextareaEl}
          value={fieldValue(0)}
          oninput={(e) => onUpdateField(0, (e.currentTarget as HTMLTextAreaElement).value)}
          onkeydown={(e) => handleFieldKeydown(e, 0)}
          use:autoresize={fieldValue(0)}
          placeholder={"The capital of France is " + clozeExample + "."}
          rows="1"
          data-field-index="0"
          class="placeholder:text-muted-foreground/60 focus-visible:bg-background/40 resize-none
            rounded-sm bg-transparent px-1 py-1 font-mono text-sm leading-snug
            focus-visible:outline-none"
          aria-label={model.fields[0]?.name ?? "Text"}
        ></textarea>

        {#if model.fields.length > 1}
          <div class="space-y-1">
            <p class="text-muted-foreground text-xs">{model.fields[1]?.name ?? "Back extra"}</p>
            <textarea
              value={fieldValue(1)}
              oninput={(e) => onUpdateField(1, (e.currentTarget as HTMLTextAreaElement).value)}
              onkeydown={(e) => handleFieldKeydown(e, 1)}
              use:autoresize={fieldValue(1)}
              placeholder="Optional back-extra"
              rows="1"
              data-field-index="1"
              class="placeholder:text-muted-foreground/60 focus-visible:bg-background/40 resize-none
                rounded-sm bg-transparent px-1 py-1 text-sm leading-snug
                focus-visible:outline-none"
              aria-label={model.fields[1]?.name ?? "Back extra"}
            ></textarea>
          </div>
        {/if}
      </div>
    {:else if isSideBySide}
      <div class="flex items-start gap-3">
        <textarea
          value={fieldValue(0)}
          oninput={(e) => onUpdateField(0, (e.currentTarget as HTMLTextAreaElement).value)}
          onkeydown={(e) => handleFieldKeydown(e, 0)}
          use:autoresize={fieldValue(0)}
          placeholder={model.fields[0]?.name ?? "Term"}
          rows="1"
          data-field-index="0"
          class="placeholder:text-muted-foreground/60 focus-visible:bg-background/40 flex-1 resize-none
            rounded-sm bg-transparent px-1 py-1 text-sm leading-snug
            focus-visible:outline-none"
          aria-label={model.fields[0]?.name ?? "Term"}
        ></textarea>

        <div class="bg-border mt-2 w-px self-stretch" aria-hidden="true"></div>

        <textarea
          value={fieldValue(1)}
          oninput={(e) => onUpdateField(1, (e.currentTarget as HTMLTextAreaElement).value)}
          onkeydown={(e) => handleFieldKeydown(e, 1)}
          use:autoresize={fieldValue(1)}
          placeholder={model.fields[1]?.name ?? "Definition"}
          rows="1"
          data-field-index="1"
          class="placeholder:text-muted-foreground/60 focus-visible:bg-background/40 flex-1 resize-none
            rounded-sm bg-transparent px-1 py-1 text-sm leading-snug
            focus-visible:outline-none"
          aria-label={model.fields[1]?.name ?? "Definition"}
        ></textarea>
      </div>
    {:else}
      <div class="flex flex-col gap-2">
        {#each model.fields as field, i (i)}
          <div class="space-y-1">
            <p class="text-muted-foreground text-xs">{field.name}</p>
            <textarea
              value={fieldValue(i)}
              oninput={(e) => onUpdateField(i, (e.currentTarget as HTMLTextAreaElement).value)}
              onkeydown={(e) => handleFieldKeydown(e, i)}
              use:autoresize={fieldValue(i)}
              placeholder={field.description ?? field.name}
              rows="1"
              data-field-index={i}
              class="placeholder:text-muted-foreground/60 focus-visible:bg-background/40 w-full
                resize-none rounded-sm bg-transparent px-1 py-1 text-sm leading-snug
                focus-visible:outline-none"
              aria-label={field.name}
            ></textarea>
          </div>
        {/each}
      </div>
    {/if}

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
  textarea {
    overflow: hidden;
  }
</style>
