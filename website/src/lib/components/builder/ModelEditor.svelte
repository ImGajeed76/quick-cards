<script lang="ts">
  import { ArrowDown, ArrowUp, Copy, Lock, Plus, Trash2 } from "@lucide/svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import InlineTitle from "./InlineTitle.svelte";
  import ModelTemplatesSection from "./ModelTemplatesSection.svelte";
  import ModelCssSection from "./ModelCssSection.svelte";
  import { confirmAction } from "$lib/builder/dialogs.svelte";
  import { toast } from "svelte-sonner";
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
    onUpdateFieldOption: (
      id: Id,
      fieldIndex: number,
      key: "description" | "sticky" | "rtl" | "plainText" | "fontName" | "fontSize",
      value: string | number | boolean,
    ) => void;
    onUpdateLatex: (
      id: Id,
      key: "latexPre" | "latexPost" | "latexSvg",
      value: string | boolean,
    ) => void;
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
    onUpdateFieldOption,
    onUpdateLatex,
  }: Props = $props();

  const isLocked = $derived(model.builtin !== null);

  async function handleDelete() {
    if (usage > 0) {
      toast.error(
        `Cannot delete: ${usage} ${usage === 1 ? "card uses" : "cards use"} this note type. Switch them to a different type first.`,
      );
      return;
    }
    const ok = await confirmAction({
      title: `Delete "${model.name}"?`,
      description: "Use Ctrl+Z to undo.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    onDelete(model.id);
  }
</script>

<div class="space-y-6">
  <header class="flex flex-wrap items-start justify-between gap-3">
    <div class="flex-1 space-y-2">
      <p class="text-muted-foreground text-xs tracking-wide uppercase">Note type</p>
      {#if isLocked}
        <div class="flex items-center gap-2">
          <h2 class="text-2xl leading-tight font-semibold tracking-tight">{model.name}</h2>
          <span
            class="text-muted-foreground bg-muted/40 inline-flex items-center gap-1 rounded-full
              border px-2 py-0.5 text-xs"
          >
            <Lock class="h-3 w-3" />
            Built-in
          </span>
        </div>
      {:else}
        <InlineTitle
          value={model.name}
          onSave={(next) => onRename(model.id, next)}
          ariaLabel="Note type name"
          placeholder="Untitled note type"
          class="text-2xl leading-tight font-semibold tracking-tight"
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
        <li class="flex flex-col p-2">
          <div class="flex items-center gap-2">
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
          </div>

          {#if !isLocked}
            <details class="mt-1 ml-8 text-xs">
              <summary
                class="text-muted-foreground hover:text-foreground cursor-pointer select-none"
              >
                Field options
              </summary>
              <div class="mt-2 space-y-2 pb-1">
                <label class="block">
                  <span class="text-muted-foreground text-xs">Placeholder</span>
                  <input
                    type="text"
                    value={field.description ?? ""}
                    oninput={(e) =>
                      onUpdateFieldOption(
                        model.id,
                        i,
                        "description",
                        (e.currentTarget as HTMLInputElement).value,
                      )}
                    class="border-input bg-background mt-1 h-7 w-full rounded-md border px-2 text-xs"
                  />
                </label>

                <div class="grid grid-cols-2 gap-2">
                  <label class="block">
                    <span class="text-muted-foreground text-xs">Font name</span>
                    <input
                      type="text"
                      placeholder="Arial"
                      value={field.fontName ?? ""}
                      oninput={(e) =>
                        onUpdateFieldOption(
                          model.id,
                          i,
                          "fontName",
                          (e.currentTarget as HTMLInputElement).value,
                        )}
                      class="border-input bg-background mt-1 h-7 w-full rounded-md border px-2 text-xs"
                    />
                  </label>
                  <label class="block">
                    <span class="text-muted-foreground text-xs">Font size</span>
                    <input
                      type="number"
                      min="8"
                      max="72"
                      placeholder="20"
                      value={field.fontSize ?? ""}
                      oninput={(e) =>
                        onUpdateFieldOption(
                          model.id,
                          i,
                          "fontSize",
                          Number((e.currentTarget as HTMLInputElement).value) || 0,
                        )}
                      class="border-input bg-background mt-1 h-7 w-full rounded-md border px-2 text-xs"
                    />
                  </label>
                </div>

                <div class="flex flex-wrap gap-3 pt-1">
                  <label class="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={field.sticky ?? false}
                      onchange={(e) =>
                        onUpdateFieldOption(
                          model.id,
                          i,
                          "sticky",
                          (e.currentTarget as HTMLInputElement).checked,
                        )}
                      class="border-input accent-primary h-3.5 w-3.5 rounded border"
                    />
                    Sticky (keep value on next note)
                  </label>
                  <label class="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={field.rtl ?? false}
                      onchange={(e) =>
                        onUpdateFieldOption(
                          model.id,
                          i,
                          "rtl",
                          (e.currentTarget as HTMLInputElement).checked,
                        )}
                      class="border-input accent-primary h-3.5 w-3.5 rounded border"
                    />
                    Right-to-left
                  </label>
                  <label class="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={field.plainText ?? false}
                      onchange={(e) =>
                        onUpdateFieldOption(
                          model.id,
                          i,
                          "plainText",
                          (e.currentTarget as HTMLInputElement).checked,
                        )}
                      class="border-input accent-primary h-3.5 w-3.5 rounded border"
                    />
                    Plain text (no HTML)
                  </label>
                </div>
              </div>
            </details>
          {/if}
        </li>
      {/each}
    </ul>
  </section>

  {#if !isLocked}
    <details class="rounded-md border p-3">
      <summary
        class="text-muted-foreground hover:text-foreground cursor-pointer text-xs tracking-wide uppercase"
      >
        LaTeX
      </summary>
      <div class="mt-3 space-y-3">
        <label class="block text-sm">
          <span class="text-muted-foreground text-xs">Preamble</span>
          <textarea
            value={model.latexPre ?? ""}
            oninput={(e) =>
              onUpdateLatex(model.id, "latexPre", (e.currentTarget as HTMLTextAreaElement).value)}
            rows={3}
            class="border-input bg-background mt-1 w-full rounded-md border px-2 py-1 font-mono text-xs"
          ></textarea>
        </label>
        <label class="block text-sm">
          <span class="text-muted-foreground text-xs">Postamble</span>
          <textarea
            value={model.latexPost ?? ""}
            oninput={(e) =>
              onUpdateLatex(model.id, "latexPost", (e.currentTarget as HTMLTextAreaElement).value)}
            rows={2}
            class="border-input bg-background mt-1 w-full rounded-md border px-2 py-1 font-mono text-xs"
          ></textarea>
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={model.latexSvg ?? false}
            onchange={(e) =>
              onUpdateLatex(model.id, "latexSvg", (e.currentTarget as HTMLInputElement).checked)}
            class="border-input accent-primary h-4 w-4 rounded border"
          />
          Render LaTeX as SVG
        </label>
      </div>
    </details>
  {/if}

  <ModelTemplatesSection
    {model}
    {onAddTemplate}
    {onRemoveTemplate}
    {onRenameTemplate}
    {onUpdateTemplate}
  />

  <ModelCssSection {model} {onUpdateCss} />
</div>
