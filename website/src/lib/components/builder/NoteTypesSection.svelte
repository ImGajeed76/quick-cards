<script lang="ts">
  import { tick } from "svelte";
  import * as ContextMenu from "$lib/components/ui/context-menu";
  import { Copy, FileText, Lock, Pencil, Trash2 } from "@lucide/svelte";
  import SidebarSection from "./SidebarSection.svelte";
  import { confirmAction } from "$lib/builder/dialogs.svelte";
  import { toast } from "svelte-sonner";
  import type { BuilderModel, Id, Selection } from "$lib/builder/types";

  interface Props {
    models: BuilderModel[];
    /** Map from modelId -> number of decks/notes that reference it. */
    usageByModel: Record<Id, number>;
    selection: Selection;
    onSelect: (id: Id) => void;
    onAddCustom: () => void;
    onDuplicateBuiltin: (id: Id) => void;
    onRename: (id: Id, name: string) => void;
    onDelete: (id: Id) => void;
  }

  let {
    models,
    usageByModel,
    selection,
    onSelect,
    onAddCustom,
    onDuplicateBuiltin,
    onRename,
    onDelete,
  }: Props = $props();

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

  // ---- inline rename ------------------------------------------------------

  let editingId = $state<Id | null>(null);
  let renameValue = $state("");
  let renameInputEl = $state<HTMLInputElement | null>(null);

  async function startRename(model: BuilderModel) {
    if (model.builtin !== null) return; // built-ins are locked
    editingId = model.id;
    renameValue = model.name;
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

  async function requestDelete(model: BuilderModel) {
    const used = usageByModel[model.id] ?? 0;
    if (used > 0) {
      toast.error(
        `Cannot delete: ${used} ${used === 1 ? "card uses" : "cards use"} this note type. Switch them first.`,
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

<SidebarSection title="Note types" onAdd={onAddCustom} addLabel="New custom note type">
  {#if sorted.length === 0}
    <p class="text-muted-foreground px-2 py-1 text-xs">No note types yet.</p>
  {:else}
    {#each sorted as model (model.id)}
      {@const isSelected = selection.kind === "model" && selection.id === model.id}
      {@const isBuiltin = model.builtin !== null}
      {@const isEditing = editingId === model.id}
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          {#if isEditing}
            <div class="bg-accent/50 flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm">
              <FileText class="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <input
                bind:this={renameInputEl}
                bind:value={renameValue}
                onblur={commitRename}
                onkeydown={handleRenameKey}
                aria-label="Rename note type"
                class="bg-background border-input flex-1 rounded border px-1 py-0 text-sm outline-none"
              />
            </div>
          {:else}
            <button
              type="button"
              ondblclick={() => startRename(model)}
              onclick={() => onSelect(model.id)}
              class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm
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
          {/if}
        </ContextMenu.Trigger>
        <ContextMenu.Content class="w-52">
          {#if isBuiltin}
            <ContextMenu.Item onSelect={() => onDuplicateBuiltin(model.id)}>
              <Copy />
              Duplicate to customize
            </ContextMenu.Item>
          {:else}
            <ContextMenu.Item onSelect={() => startRename(model)}>
              <Pencil />
              Rename
            </ContextMenu.Item>
            <ContextMenu.Separator />
            <ContextMenu.Item variant="destructive" onSelect={() => requestDelete(model)}>
              <Trash2 />
              Delete
            </ContextMenu.Item>
          {/if}
        </ContextMenu.Content>
      </ContextMenu.Root>
    {/each}
  {/if}
</SidebarSection>
