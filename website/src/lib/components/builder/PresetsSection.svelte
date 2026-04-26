<script lang="ts">
  import { Sliders } from "@lucide/svelte";
  import SidebarSection from "./SidebarSection.svelte";
  import type { BuilderConfig, ConfigSource, Id, Selection } from "$lib/builder/types";

  interface Props {
    configs: BuilderConfig[];
    /** Map from configId to number of decks referencing it. */
    usageByConfig: Record<Id, number>;
    selection: Selection;
    onSelect: (id: Id) => void;
    onAdd: () => void;
  }

  let { configs, usageByConfig, selection, onSelect, onAdd }: Props = $props();

  // Group: deadline-derived first (sorted by name), then default, then custom.
  const sourceOrder: Record<ConfigSource, number> = {
    default: 0,
    deadline: 1,
    custom: 2,
  };
  const sorted = $derived(
    [...configs].sort(
      (a, b) => sourceOrder[a.source] - sourceOrder[b.source] || a.name.localeCompare(b.name),
    ),
  );

  function badgeFor(source: ConfigSource): { label: string; class: string } {
    switch (source) {
      case "default":
        return { label: "Default", class: "text-muted-foreground" };
      case "deadline":
        return { label: "Deadline", class: "text-primary" };
      case "custom":
        return { label: "Custom", class: "text-foreground" };
    }
  }
</script>

<SidebarSection title="Presets" {onAdd} addLabel="New preset">
  {#if sorted.length === 0}
    <p class="text-muted-foreground px-2 py-1 text-xs">No presets yet.</p>
  {:else}
    {#each sorted as config (config.id)}
      {@const isSelected = selection.kind === "config" && selection.id === config.id}
      {@const badge = badgeFor(config.source)}
      <button
        type="button"
        onclick={() => onSelect(config.id)}
        class="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm
          transition-colors {isSelected
          ? 'bg-accent text-accent-foreground'
          : 'text-foreground hover:bg-accent/50'}"
      >
        <Sliders class="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span class="flex-1 truncate text-left">{config.name}</span>
        <span class="text-[10px] uppercase {badge.class}">{badge.label}</span>
        <span class="text-muted-foreground text-xs">{usageByConfig[config.id] ?? 0}</span>
      </button>
    {/each}
  {/if}
</SidebarSection>
