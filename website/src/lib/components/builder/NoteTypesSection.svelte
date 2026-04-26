<script lang="ts">
  import { FileText, Lock } from "@lucide/svelte";
  import SidebarSection from "./SidebarSection.svelte";
  import type { BuilderModel, Id, Selection } from "$lib/builder/types";

  interface Props {
    models: BuilderModel[];
    /** Map from modelId -> number of decks/notes that reference it. */
    usageByModel: Record<Id, number>;
    selection: Selection;
    onSelect: (id: Id) => void;
    onAddCustom: () => void;
  }

  let { models, usageByModel, selection, onSelect, onAddCustom }: Props = $props();

  // Built-ins first (in a stable order), then custom by name.
  const BUILTIN_ORDER = ["basic", "basicAndReversed", "basicTyping", "cloze"];
  const sorted = $derived.by(() => {
    const builtins = models
      .filter((m) => m.builtin !== null)
      .sort(
        (a, b) => BUILTIN_ORDER.indexOf(a.builtin ?? "") - BUILTIN_ORDER.indexOf(b.builtin ?? ""),
      );
    const custom = models
      .filter((m) => m.builtin === null)
      .sort((a, b) => a.name.localeCompare(b.name));
    return [...builtins, ...custom];
  });
</script>

<SidebarSection title="Note types" onAdd={onAddCustom} addLabel="New custom note type">
  {#if sorted.length === 0}
    <p class="text-muted-foreground px-2 py-1 text-xs">No note types yet.</p>
  {:else}
    {#each sorted as model (model.id)}
      {@const isSelected = selection.kind === "model" && selection.id === model.id}
      {@const isBuiltin = model.builtin !== null}
      <button
        type="button"
        onclick={() => onSelect(model.id)}
        class="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm
          transition-colors {isSelected
          ? 'bg-accent text-accent-foreground'
          : 'text-foreground hover:bg-accent/50'}"
      >
        <FileText class="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span class="flex-1 truncate text-left">{model.name}</span>
        {#if isBuiltin}
          <Lock class="text-muted-foreground h-3 w-3" aria-label="Built-in (read-only)" />
        {/if}
        <span class="text-muted-foreground text-xs">{usageByModel[model.id] ?? 0}</span>
      </button>
    {/each}
  {/if}
</SidebarSection>
