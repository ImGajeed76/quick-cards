<script lang="ts">
  import { tick } from "svelte";
  import * as ContextMenu from "$lib/components/ui/context-menu";
  import { Pencil, Sliders, Trash2 } from "@lucide/svelte";
  import SidebarSection from "./SidebarSection.svelte";
  import { confirmAction } from "$lib/builder/dialogs.svelte";
  import { toast } from "svelte-sonner";
  import type { BuilderConfig, ConfigSource, Id, Selection } from "$lib/builder/types";

  interface Props {
    configs: BuilderConfig[];
    /** Map from configId to number of decks referencing it. */
    usageByConfig: Record<Id, number>;
    selection: Selection;
    onSelect: (id: Id) => void;
    onAdd: () => void;
    onRename: (id: Id, name: string) => void;
    onDelete: (id: Id) => void;
  }

  let { configs, usageByConfig, selection, onSelect, onAdd, onRename, onDelete }: Props = $props();

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

  // ---- inline rename ------------------------------------------------------

  let editingId = $state<Id | null>(null);
  let renameValue = $state("");
  let renameInputEl = $state<HTMLInputElement | null>(null);

  async function startRename(config: BuilderConfig) {
    editingId = config.id;
    renameValue = config.name;
    await tick();
    renameInputEl?.focus();
    renameInputEl?.select();
  }

  function commitRename() {
    if (!editingId) return;
    const next = renameValue.trim();
    if (next) onRename(editingId, next);
    editingId = null;
  }

  function cancelRename() {
    editingId = null;
  }

  function handleRenameKey(e: KeyboardEvent) {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      commitRename();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelRename();
    }
  }

  // ---- delete -------------------------------------------------------------

  async function requestDelete(config: BuilderConfig) {
    const used = usageByConfig[config.id] ?? 0;
    if (used > 0) {
      toast.error(
        `Cannot delete: ${used} ${used === 1 ? "deck uses" : "decks use"} this preset. Switch them first.`,
      );
      return;
    }
    const ok = await confirmAction({
      title: `Delete "${config.name}"?`,
      description: "Use Ctrl+Z to undo.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    onDelete(config.id);
  }
</script>

<SidebarSection title="Presets" {onAdd} addLabel="New preset">
  {#if sorted.length === 0}
    <p class="text-muted-foreground px-2 py-1 text-xs">No presets yet.</p>
  {:else}
    {#each sorted as config (config.id)}
      {@const isSelected = selection.kind === "config" && selection.id === config.id}
      {@const badge = badgeFor(config.source)}
      {@const isEditing = editingId === config.id}
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          {#if isEditing}
            <div class="bg-accent/50 flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm">
              <Sliders class="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <input
                bind:this={renameInputEl}
                bind:value={renameValue}
                onblur={commitRename}
                onkeydown={handleRenameKey}
                aria-label="Rename preset"
                class="bg-background border-input flex-1 rounded border px-1 py-0 text-sm outline-none"
              />
            </div>
          {:else}
            <button
              type="button"
              ondblclick={() => startRename(config)}
              onclick={() => onSelect(config.id)}
              class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm
                transition-colors {isSelected
                ? 'bg-accent text-accent-foreground'
                : 'text-foreground hover:bg-accent/50'}"
            >
              <Sliders class="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span class="flex-1 truncate text-left">{config.name}</span>
              <span class="text-[10px] uppercase {badge.class}">{badge.label}</span>
              <span class="text-muted-foreground text-xs">{usageByConfig[config.id] ?? 0}</span>
            </button>
          {/if}
        </ContextMenu.Trigger>
        <ContextMenu.Content class="w-48">
          <ContextMenu.Item onSelect={() => startRename(config)}>
            <Pencil />
            Rename
          </ContextMenu.Item>
          <ContextMenu.Separator />
          <ContextMenu.Item variant="destructive" onSelect={() => requestDelete(config)}>
            <Trash2 />
            Delete
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Root>
    {/each}
  {/if}
</SidebarSection>
