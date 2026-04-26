<script lang="ts">
  import * as Popover from "$lib/components/ui/popover";
  import { Check, Plus, Sliders } from "@lucide/svelte";
  import type { BuilderConfig, Id } from "$lib/builder/types";

  interface Props {
    selectedConfigId: Id;
    configs: BuilderConfig[];
    onSelect: (id: Id) => void;
    onCreate: () => Id;
  }

  let { selectedConfigId, configs, onSelect, onCreate }: Props = $props();

  const selected = $derived(configs.find((c) => c.id === selectedConfigId));
  const sorted = $derived([...configs].sort((a, b) => a.name.localeCompare(b.name)));

  let open = $state(false);

  function pick(id: Id) {
    onSelect(id);
    open = false;
  }

  function makeNew() {
    const id = onCreate();
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
      <Sliders class="h-4 w-4" aria-hidden="true" />
      <span class="text-muted-foreground">Preset:</span>
      <span class="text-foreground font-medium">{selected?.name ?? "None"}</span>
    </button>
  </Popover.Trigger>
  <Popover.Content class="w-64 p-1" sideOffset={6}>
    <div role="listbox" aria-label="Preset" class="space-y-0.5">
      {#each sorted as config (config.id)}
        {@const isSelected = config.id === selectedConfigId}
        <button
          type="button"
          role="option"
          aria-selected={isSelected}
          onclick={() => pick(config.id)}
          class="hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm
            transition-colors"
        >
          <span class="flex h-4 w-4 shrink-0 items-center justify-center">
            {#if isSelected}
              <Check class="text-primary h-3.5 w-3.5" />
            {/if}
          </span>
          <span class="flex-1 truncate text-left">{config.name}</span>
          <span class="text-muted-foreground text-[10px] uppercase">{config.source}</span>
        </button>
      {/each}
      <div class="bg-border my-1 h-px"></div>
      <button
        type="button"
        onclick={makeNew}
        class="hover:bg-accent text-muted-foreground hover:text-foreground flex w-full
          items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors"
      >
        <Plus class="h-3.5 w-3.5" />
        New preset
      </button>
    </div>
  </Popover.Content>
</Popover.Root>
