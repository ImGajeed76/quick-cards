<script lang="ts">
  import { Brackets, Check, Copy, GripVertical, Trash2 } from "@lucide/svelte";
  import { EditorView } from "@codemirror/view";
  import TagPills from "./TagPills.svelte";
  import MediaPickerPopover from "./MediaPickerPopover.svelte";
  import CardField from "./CardField.svelte";
  import { MEDIA_DRAG_TYPE } from "$lib/builder/media-drag";
  import type { BuilderMedia, BuilderModel, BuilderNote } from "$lib/builder/types";

  interface Props {
    note: BuilderNote;
    /** The model the note follows; drives layout for cloze and N-field models. */
    model: BuilderModel;
    /** All media in the package; passed through to per-field popovers. */
    media: BuilderMedia[];
    /** 1-based row number shown in the gutter when nothing is selected. */
    index: number;
    /** Last row in the deck list; Tab off the final field appends a new card. */
    isLast: boolean;
    isSelected: boolean;
    selectionMode: boolean;
    /** When false, the drag handle is hidden and reorder is disabled. */
    canDrag: boolean;
    onUpdateField: (fieldIndex: number, value: string) => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onTabOffEnd: () => void;
    onToggleSelect: (event: { extend: boolean }) => void;
    onAddTag: (tag: string) => void;
    onRemoveTag: (tag: string) => void;
    /** Upload a file and return the Anki reference token. */
    onAttachFile: (file: File) => Promise<string | null>;
    /** Backspace on the empty front field of an all-empty card. */
    onBackspaceCollapsePrevious: () => void;
    onDragHandleStart: (ev: DragEvent) => void;
    onDragHandleEnd: () => void;
  }

  let {
    note,
    model,
    media,
    index,
    isLast,
    isSelected,
    selectionMode,
    canDrag,
    onUpdateField,
    onDuplicate,
    onDelete,
    onTabOffEnd,
    onToggleSelect,
    onAddTag,
    onRemoveTag,
    onAttachFile,
    onBackspaceCollapsePrevious,
    onDragHandleStart,
    onDragHandleEnd,
  }: Props = $props();

  const isCloze = $derived(model.type === "cloze");
  const isSideBySide = $derived(!isCloze && model.fields.length === 2);

  function fieldValue(i: number): string {
    return note.fields[i] ?? "";
  }

  // ---- field navigation --------------------------------------------------

  /** Find the EditorView of one of this row's CardFields. */
  function viewForField(fieldIndex: number): EditorView | null {
    const wrapper = document.querySelector<HTMLElement>(
      `[data-note-id="${note.id}"] [data-field-index="${fieldIndex}"]`,
    );
    const content = wrapper?.querySelector<HTMLElement>(".cm-content") ?? null;
    return content ? (EditorView.findFromDOM(content) ?? null) : null;
  }

  function focusFieldAtEnd(fieldIndex: number): void {
    const view = viewForField(fieldIndex);
    if (!view) return;
    const len = view.state.doc.length;
    view.dispatch({ selection: { anchor: len } });
    view.focus();
  }

  function handleBackspaceEmpty(fieldIndex: number): void {
    if (fieldIndex > 0) {
      focusFieldAtEnd(fieldIndex - 1);
      return;
    }
    const allEmpty = model.fields.every((_, i) => fieldValue(i) === "");
    if (allEmpty) onBackspaceCollapsePrevious();
  }

  // ---- file drop ---------------------------------------------------------

  function handleDragOver(e: DragEvent): void {
    if (!e.dataTransfer) return;
    const types = Array.from(e.dataTransfer.types);
    if (!types.includes("Files") && !types.includes(MEDIA_DRAG_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  async function handleFieldDrop(e: DragEvent, fieldIndex: number): Promise<void> {
    if (!e.dataTransfer) return;
    const ref = e.dataTransfer.getData(MEDIA_DRAG_TYPE);
    if (ref) {
      e.preventDefault();
      insertRefIntoField(fieldIndex, ref);
      return;
    }
    if (e.dataTransfer.files.length === 0) return;
    e.preventDefault();
    for (const file of Array.from(e.dataTransfer.files)) {
      const fileRef = await onAttachFile(file);
      if (!fileRef) continue;
      insertRefIntoField(fieldIndex, fileRef);
    }
  }

  function insertRefIntoField(fieldIndex: number, ref: string): void {
    const view = viewForField(fieldIndex);
    if (view) {
      const sel = view.state.selection.main;
      view.dispatch({
        changes: { from: sel.from, to: sel.to, insert: ref },
        selection: { anchor: sel.from + ref.length },
      });
      view.focus();
    } else {
      onUpdateField(fieldIndex, (note.fields[fieldIndex] ?? "") + ref);
    }
  }

  function handleDragHandleStart(ev: DragEvent): void {
    if (!ev.dataTransfer) return;
    onDragHandleStart(ev);
    const row = (ev.currentTarget as HTMLElement).closest<HTMLElement>("[data-note-id]");
    if (row) ev.dataTransfer.setDragImage(row, 0, 0);
  }

  // ---- selection gutter --------------------------------------------------

  function handleGutterClick(e: MouseEvent): void {
    onToggleSelect({ extend: e.shiftKey });
  }
  function handleGutterKey(e: KeyboardEvent): void {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onToggleSelect({ extend: e.shiftKey });
    }
  }
  const checkboxAlwaysVisible = $derived(isSelected || selectionMode);

  // ---- cloze toolbar -----------------------------------------------------

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

  function handleAddClozeClick() {
    const view = viewForField(0);
    if (!view) return;
    const sel = view.state.selection.main;
    const value = view.state.doc.toString();
    const selectedText = value.slice(sel.from, sel.to) || "...";
    const wrapped = `{{c${nextClozeId(value)}::${selectedText}}}`;
    view.dispatch({
      changes: { from: sel.from, to: sel.to, insert: wrapped },
      selection: { anchor: sel.from + wrapped.length },
    });
    view.focus();
  }

  const clozeExample = "{{c1::Paris}}";
  const lastFieldIndex = $derived(model.fields.length - 1);
</script>

<div
  class="group flex items-start gap-2 rounded-md border-b border-transparent py-2 pr-3 pl-1
    transition-colors
    {isSelected ? 'bg-accent/40' : 'hover:bg-muted/30'}"
>
  <button
    type="button"
    draggable={canDrag}
    ondragstart={handleDragHandleStart}
    ondragend={onDragHandleEnd}
    tabindex={-1}
    aria-label="Drag to reorder"
    title="Drag to reorder"
    class="text-muted-foreground hover:text-foreground mt-1 grid h-6 w-4 shrink-0 cursor-grab
      place-items-center rounded opacity-0 transition-opacity active:cursor-grabbing
      {canDrag ? 'group-focus-within:opacity-100 group-hover:opacity-100' : 'pointer-events-none'}"
  >
    <GripVertical class="h-4 w-4" aria-hidden="true" />
  </button>

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
          <MediaPickerPopover
            {media}
            onPick={(ref) => insertRefIntoField(0, ref)}
            onUpload={onAttachFile}
          />
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

        <div
          role="presentation"
          data-field-index="0"
          ondragover={handleDragOver}
          ondrop={(e) => {
            void handleFieldDrop(e, 0);
          }}
        >
          <CardField
            value={fieldValue(0)}
            onChange={(v) => onUpdateField(0, v)}
            {media}
            placeholder={"The capital of France is " + clozeExample + "."}
            ariaLabel={model.fields[0]?.name ?? "Text"}
            isLastFieldOfLastRow={isLast && lastFieldIndex === 0}
            onTabOffEnd={lastFieldIndex === 0 ? onTabOffEnd : undefined}
            onBackspaceEmpty={() => handleBackspaceEmpty(0)}
          />
        </div>

        {#if model.fields.length > 1}
          <div class="space-y-1">
            <p class="text-muted-foreground text-xs">{model.fields[1]?.name ?? "Back extra"}</p>
            <div class="group/field relative">
              <div
                role="presentation"
                data-field-index="1"
                ondragover={handleDragOver}
                ondrop={(e) => {
                  void handleFieldDrop(e, 1);
                }}
                class="pr-7"
              >
                <CardField
                  value={fieldValue(1)}
                  onChange={(v) => onUpdateField(1, v)}
                  {media}
                  placeholder="Optional back-extra"
                  ariaLabel={model.fields[1]?.name ?? "Back extra"}
                  isLastFieldOfLastRow={isLast && lastFieldIndex === 1}
                  onTabOffEnd={lastFieldIndex === 1 ? onTabOffEnd : undefined}
                  onBackspaceEmpty={() => handleBackspaceEmpty(1)}
                />
              </div>
              <div
                class="absolute right-1 bottom-1 opacity-0 transition-opacity
                  group-focus-within/field:opacity-100 group-hover/field:opacity-100"
              >
                <MediaPickerPopover
                  {media}
                  onPick={(ref) => insertRefIntoField(1, ref)}
                  onUpload={onAttachFile}
                  label="Attach media to back extra"
                />
              </div>
            </div>
          </div>
        {/if}
      </div>
    {:else if isSideBySide}
      <div class="flex items-start gap-3">
        <div class="group/field relative flex-1">
          <div
            role="presentation"
            data-field-index="0"
            ondragover={handleDragOver}
            ondrop={(e) => {
              void handleFieldDrop(e, 0);
            }}
            class="pr-7"
          >
            <CardField
              value={fieldValue(0)}
              onChange={(v) => onUpdateField(0, v)}
              {media}
              placeholder={model.fields[0]?.name ?? "Term"}
              ariaLabel={model.fields[0]?.name ?? "Term"}
              isLastFieldOfLastRow={isLast && lastFieldIndex === 0}
              onTabOffEnd={lastFieldIndex === 0 ? onTabOffEnd : undefined}
              onBackspaceEmpty={() => handleBackspaceEmpty(0)}
            />
          </div>
          <div
            class="absolute right-1 bottom-1 opacity-0 transition-opacity
              group-focus-within/field:opacity-100 group-hover/field:opacity-100"
          >
            <MediaPickerPopover
              {media}
              onPick={(ref) => insertRefIntoField(0, ref)}
              onUpload={onAttachFile}
              label={`Attach media to ${model.fields[0]?.name ?? "Term"}`}
            />
          </div>
        </div>

        <div class="bg-border mt-2 w-px self-stretch" aria-hidden="true"></div>

        <div class="group/field relative flex-1">
          <div
            role="presentation"
            data-field-index="1"
            ondragover={handleDragOver}
            ondrop={(e) => {
              void handleFieldDrop(e, 1);
            }}
            class="pr-7"
          >
            <CardField
              value={fieldValue(1)}
              onChange={(v) => onUpdateField(1, v)}
              {media}
              placeholder={model.fields[1]?.name ?? "Definition"}
              ariaLabel={model.fields[1]?.name ?? "Definition"}
              isLastFieldOfLastRow={isLast && lastFieldIndex === 1}
              onTabOffEnd={lastFieldIndex === 1 ? onTabOffEnd : undefined}
              onBackspaceEmpty={() => handleBackspaceEmpty(1)}
            />
          </div>
          <div
            class="absolute right-1 bottom-1 opacity-0 transition-opacity
              group-focus-within/field:opacity-100 group-hover/field:opacity-100"
          >
            <MediaPickerPopover
              {media}
              onPick={(ref) => insertRefIntoField(1, ref)}
              onUpload={onAttachFile}
              label={`Attach media to ${model.fields[1]?.name ?? "Definition"}`}
            />
          </div>
        </div>
      </div>
    {:else}
      <div class="flex flex-col gap-2">
        {#each model.fields as field, i (i)}
          <div class="space-y-1">
            <p class="text-muted-foreground text-xs">{field.name}</p>
            <div class="group/field relative">
              <div
                role="presentation"
                data-field-index={i}
                ondragover={handleDragOver}
                ondrop={(e) => {
                  void handleFieldDrop(e, i);
                }}
                class="pr-7"
              >
                <CardField
                  value={fieldValue(i)}
                  onChange={(v) => onUpdateField(i, v)}
                  {media}
                  placeholder={field.description ?? field.name}
                  ariaLabel={field.name}
                  isLastFieldOfLastRow={isLast && lastFieldIndex === i}
                  onTabOffEnd={lastFieldIndex === i ? onTabOffEnd : undefined}
                  onBackspaceEmpty={() => handleBackspaceEmpty(i)}
                />
              </div>
              <div
                class="absolute right-1 bottom-1 opacity-0 transition-opacity
                  group-focus-within/field:opacity-100 group-hover/field:opacity-100"
              >
                <MediaPickerPopover
                  {media}
                  onPick={(ref) => insertRefIntoField(i, ref)}
                  onUpload={onAttachFile}
                  label={`Attach media to ${field.name}`}
                />
              </div>
            </div>
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
