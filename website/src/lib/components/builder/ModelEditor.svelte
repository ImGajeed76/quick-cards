<script lang="ts">
  import { ArrowDown, ArrowUp, Copy, Lock, Plus, Trash2 } from "@lucide/svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import ModelTemplatesSection from "./ModelTemplatesSection.svelte";
  import ModelCssSection from "./ModelCssSection.svelte";
  import type { BuilderModel, Id } from "$lib/builder/types";

  interface Props {
    model: BuilderModel;
    /** Number of notes referencing this model (used for delete safety). */
    usage: number;
    onRename: (id: Id, name: string) => void;
    onDuplicateBuiltin: (id: Id) => void;
    onDelete: (id: Id) => void;
    onAddField: (id: Id) => void;
    onRenameField: (id: Id, fieldIndex: number, name: string) => void;
    onRemoveField: (id: Id, fieldIndex: number) => void;
    onMoveField: (id: Id, fieldIndex: number, direction: "up" | "down") => void;
    onAddTemplate: (id: Id) => void;
    onRemoveTemplate: (id: Id, index: number) => void;
    onRenameTemplate: (id: Id, index: number, name: string) => void;
    onUpdateTemplate: (id: Id, index: number, side: "question" | "answer", value: string) => void;
    onUpdateCss: (id: Id, css: string) => void;
  }

  let {
    model,
    usage,
    onRename,
    onDuplicateBuiltin,
    onDelete,
    onAddField,
    onRenameField,
    onRemoveField,
    onMoveField,
    onAddTemplate,
    onRemoveTemplate,
    onRenameTemplate,
    onUpdateTemplate,
    onUpdateCss,
  }: Props = $props();

  const isLocked = $derived(model.builtin !== null);

  // ---- title editing -----------------------------------------------------

  let titleValue = $derived(model.name);

  function commitTitle() {
    const next = titleValue.trim();
    if (next && next !== model.name) onRename(model.id, next);
    else titleValue = model.name;
  }

  function handleTitleKey(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.currentTarget as HTMLInputElement).blur();
    }
    if (e.key === "Escape") {
      titleValue = model.name;
      (e.currentTarget as HTMLInputElement).blur();
    }
  }

  // ---- delete ------------------------------------------------------------

  function handleDelete() {
    if (usage > 0) {
      alert(
        `Cannot delete: ${usage} ${usage === 1 ? "card uses" : "cards use"} this note type. Switch them to a different type first.`,
      );
      return;
    }
    if (!confirm(`Delete "${model.name}"? Use Ctrl+Z to undo.`)) return;
    onDelete(model.id);
  }
</script>

<div class="space-y-6">
  <header class="flex flex-wrap items-start justify-between gap-3">
    <div class="flex-1 space-y-2">
      <p class="text-muted-foreground text-xs tracking-wide uppercase">Note type</p>
      {#if isLocked}
        <div class="flex items-center gap-2">
          <h2 class="text-2xl font-semibold tracking-tight">{model.name}</h2>
          <span
            class="text-muted-foreground bg-muted/40 inline-flex items-center gap-1 rounded-full
              border px-2 py-0.5 text-xs"
          >
            <Lock class="h-3 w-3" />
            Built-in
          </span>
        </div>
      {:else}
        <Input
          bind:value={titleValue}
          onblur={commitTitle}
          onkeydown={handleTitleKey}
          aria-label="Note type name"
          class="hover:border-input focus-visible:bg-background h-10 max-w-md border-transparent
            bg-transparent text-2xl font-semibold tracking-tight shadow-none"
        />
      {/if}
      <p class="text-muted-foreground text-sm">
        {usage}
        {usage === 1 ? "card uses" : "cards use"} this type.
      </p>
    </div>

    <div class="flex items-center gap-2">
      {#if isLocked}
        <Button onclick={() => onDuplicateBuiltin(model.id)}>
          <Copy class="mr-2 h-4 w-4" />
          Duplicate to customize
        </Button>
      {:else}
        <Button variant="ghost" onclick={handleDelete} class="text-muted-foreground gap-1.5">
          <Trash2 class="h-4 w-4" />
          Delete
        </Button>
      {/if}
    </div>
  </header>

  <section class="space-y-3">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-medium">Fields</h3>
      {#if !isLocked}
        <Button variant="outline" size="sm" onclick={() => onAddField(model.id)}>
          <Plus class="mr-1 h-4 w-4" />
          Add field
        </Button>
      {/if}
    </div>

    <ul class="divide-border bg-card divide-y rounded-md border">
      {#each model.fields as field, i (i)}
        <li class="flex items-center gap-2 p-2">
          <span
            class="text-muted-foreground w-6 shrink-0 text-right text-xs tabular-nums select-none"
            aria-hidden="true"
          >
            {i + 1}
          </span>

          {#if isLocked}
            <span class="flex-1 text-sm">{field.name}</span>
          {:else}
            <Input
              value={field.name}
              oninput={(e) =>
                onRenameField(model.id, i, (e.currentTarget as HTMLInputElement).value)}
              aria-label={`Field ${i + 1} name`}
              class="h-8 flex-1"
            />
          {/if}

          {#if !isLocked}
            <div class="flex items-center gap-1">
              <button
                type="button"
                onclick={() => onMoveField(model.id, i, "up")}
                disabled={i === 0}
                aria-label="Move field up"
                class="text-muted-foreground hover:text-foreground hover:bg-accent rounded p-1
                  transition-colors disabled:opacity-30"
              >
                <ArrowUp class="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onclick={() => onMoveField(model.id, i, "down")}
                disabled={i === model.fields.length - 1}
                aria-label="Move field down"
                class="text-muted-foreground hover:text-foreground hover:bg-accent rounded p-1
                  transition-colors disabled:opacity-30"
              >
                <ArrowDown class="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onclick={() => onRemoveField(model.id, i)}
                disabled={model.fields.length <= 1}
                aria-label="Remove field"
                class="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded
                  p-1 transition-colors disabled:opacity-30"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  </section>

  <ModelTemplatesSection
    {model}
    {onAddTemplate}
    {onRemoveTemplate}
    {onRenameTemplate}
    {onUpdateTemplate}
  />

  <ModelCssSection {model} {onUpdateCss} />
</div>
