<script lang="ts">
  import * as Popover from "$lib/components/ui/popover";
  import { Check, FileText, Lock } from "@lucide/svelte";
  import type { BuilderModel, Id } from "$lib/builder/types";

  interface Props {
    /** Currently selected model id for the deck. */
    selectedModelId: Id;
    models: BuilderModel[];
    onSelect: (modelId: Id) => void;
  }

  let { selectedModelId, models, onSelect }: Props = $props();

  const selected = $derived(models.find((m) => m.id === selectedModelId));

  const sorted = $derived.by(() => {
    const builtinOrder = ["basic", "basicAndReversed", "basicTyping", "cloze"];
    const builtins = models
      .filter((m) => m.builtin !== null)
      .sort(
        (a, b) => builtinOrder.indexOf(a.builtin ?? "") - builtinOrder.indexOf(b.builtin ?? ""),
      );
    const custom = models
      .filter((m) => m.builtin === null)
      .sort((a, b) => a.name.localeCompare(b.name));
    return [...builtins, ...custom];
  });

  let open = $state(false);

  function pick(id: Id) {
    onSelect(id);
    open = false;
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger>
    <button
      type="button"
      class="bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground inline-flex
        items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors"
    >
      <FileText class="h-4 w-4" aria-hidden="true" />
      <span class="text-muted-foreground">Note type:</span>
      <span class="text-foreground font-medium">{selected?.name ?? "None"}</span>
    </button>
  </Popover.Trigger>
  <Popover.Content class="w-64 p-1" sideOffset={6}>
    <div role="listbox" aria-label="Note type">
      {#each sorted as model (model.id)}
        {@const isSelected = model.id === selectedModelId}
        <button
          type="button"
          role="option"
          aria-selected={isSelected}
          onclick={() => pick(model.id)}
          class="hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm
            transition-colors"
        >
          <span class="flex h-4 w-4 shrink-0 items-center justify-center">
            {#if isSelected}
              <Check class="text-primary h-3.5 w-3.5" />
            {/if}
          </span>
          <span class="flex-1 truncate text-left">{model.name}</span>
          {#if model.builtin !== null}
            <Lock class="text-muted-foreground h-3 w-3" aria-label="Built-in" />
          {/if}
        </button>
      {/each}
    </div>
  </Popover.Content>
</Popover.Root>
