<script lang="ts">
  import { Plus, Trash2, X } from "@lucide/svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import CodeEditor from "./CodeEditor.svelte";
  import type { BuilderModel, Id } from "$lib/builder/types";

  interface Props {
    model: BuilderModel;
    onAddTemplate: (id: Id) => void;
    onRemoveTemplate: (id: Id, index: number) => void;
    onRenameTemplate: (id: Id, index: number, name: string) => void;
    onUpdateTemplate: (id: Id, index: number, side: "question" | "answer", value: string) => void;
  }

  let { model, onAddTemplate, onRemoveTemplate, onRenameTemplate, onUpdateTemplate }: Props =
    $props();

  const isLocked = $derived(model.builtin !== null);
  const isCloze = $derived(model.type === "cloze");

  let activeIndex = $state(0);

  // Clamp activeIndex when templates change.
  $effect(() => {
    if (activeIndex >= model.templates.length)
      activeIndex = Math.max(0, model.templates.length - 1);
  });

  const active = $derived(model.templates[activeIndex]);

  function handleRemove(index: number) {
    if (model.templates.length <= 1) return;
    if (!confirm(`Delete "${model.templates[index].name}"? Use Ctrl+Z to undo.`)) return;
    onRemoveTemplate(model.id, index);
    if (activeIndex >= model.templates.length - 1) activeIndex = Math.max(0, activeIndex - 1);
  }
</script>

<section class="space-y-3">
  <div class="flex flex-wrap items-center justify-between gap-2">
    <h3 class="text-sm font-medium">Templates</h3>
    {#if !isLocked && !isCloze}
      <Button variant="outline" size="sm" onclick={() => onAddTemplate(model.id)}>
        <Plus class="mr-1 h-4 w-4" />
        Add template
      </Button>
    {/if}
  </div>

  {#if model.templates.length > 1}
    <div role="tablist" class="border-border flex flex-wrap gap-1 border-b" aria-label="Templates">
      {#each model.templates as template, i (i)}
        {@const selected = i === activeIndex}
        <div class="group flex items-center">
          <button
            type="button"
            role="tab"
            aria-selected={selected}
            onclick={() => (activeIndex = i)}
            class="px-3 py-1.5 text-sm transition-colors {selected
              ? 'border-primary text-foreground border-b-2'
              : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent'}"
          >
            {template.name}
          </button>
          {#if !isLocked}
            <button
              type="button"
              onclick={() => handleRemove(i)}
              aria-label="Remove template"
              class="text-muted-foreground hover:text-destructive ml-1 rounded p-0.5 opacity-0
                transition-[color,opacity] group-hover:opacity-100 disabled:opacity-30"
              disabled={model.templates.length <= 1}
            >
              <X class="h-3.5 w-3.5" />
            </button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  {#if active}
    <div class="space-y-3">
      {#if !isLocked}
        <div class="space-y-1.5">
          <Label class="text-muted-foreground text-xs" for="tpl-name">Template name</Label>
          <Input
            id="tpl-name"
            value={active.name}
            oninput={(e) =>
              onRenameTemplate(model.id, activeIndex, (e.currentTarget as HTMLInputElement).value)}
            class="h-9 max-w-xs"
          />
        </div>
      {/if}

      <div class="space-y-1.5">
        <Label class="text-muted-foreground text-xs">Question (front)</Label>
        {#if isLocked}
          <pre
            class="bg-muted/30 max-h-40 overflow-auto rounded-md border p-3 text-xs">{active.questionFormat}</pre>
        {:else}
          <CodeEditor
            value={active.questionFormat}
            onChange={(v) => onUpdateTemplate(model.id, activeIndex, "question", v)}
            language="html"
          />
        {/if}
      </div>

      <div class="space-y-1.5">
        <Label class="text-muted-foreground text-xs">Answer (back)</Label>
        {#if isLocked}
          <pre
            class="bg-muted/30 max-h-40 overflow-auto rounded-md border p-3 text-xs">{active.answerFormat}</pre>
        {:else}
          <CodeEditor
            value={active.answerFormat}
            onChange={(v) => onUpdateTemplate(model.id, activeIndex, "answer", v)}
            language="html"
          />
        {/if}
      </div>

      {#if !isLocked && model.templates.length > 1}
        <div class="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onclick={() => handleRemove(activeIndex)}
            class="text-muted-foreground gap-1.5"
          >
            <Trash2 class="h-3.5 w-3.5" />
            Delete this template
          </Button>
        </div>
      {/if}
    </div>
  {/if}
</section>
