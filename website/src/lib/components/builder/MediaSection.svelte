<script lang="ts">
  import { tick } from "svelte";
  import * as ContextMenu from "$lib/components/ui/context-menu";
  import { Pencil, Trash2 } from "@lucide/svelte";
  import SidebarSection from "./SidebarSection.svelte";
  import MediaThumbnail from "./MediaThumbnail.svelte";
  import { MEDIA_PER_PACKAGE_LIMIT } from "$lib/builder/types";
  import { MEDIA_DRAG_TYPE, referenceFor } from "$lib/builder/media-drag";
  import { confirmAction } from "$lib/builder/dialogs.svelte";
  import { toast } from "svelte-sonner";
  import type { BuilderMedia, Id, Selection } from "$lib/builder/types";

  interface Props {
    media: BuilderMedia[];
    /** Map from media filename to count of notes referencing it. */
    usageByFilename: Record<string, number>;
    selection: Selection;
    onSelect: (id: Id) => void;
    onAdd: (file: File) => void;
    onRename: (id: Id, filename: string) => void;
    onDelete: (id: Id) => void;
  }

  let { media, usageByFilename, selection, onSelect, onAdd, onRename, onDelete }: Props = $props();

  let fileInput = $state<HTMLInputElement | null>(null);

  const sorted = $derived([...media].sort((a, b) => a.filename.localeCompare(b.filename)));
  const totalSize = $derived(media.reduce((sum, m) => sum + m.size, 0));
  const percentUsed = $derived(Math.min(100, (totalSize / MEDIA_PER_PACKAGE_LIMIT) * 100));

  function handleFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const files = input.files;
    if (!files) return;
    for (const file of Array.from(files)) onAdd(file);
    input.value = "";
  }

  // ---- inline rename ------------------------------------------------------

  let editingId = $state<Id | null>(null);
  let renameValue = $state("");
  let renameInputEl = $state<HTMLInputElement | null>(null);

  async function startRename(m: BuilderMedia) {
    editingId = m.id;
    renameValue = m.filename;
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

  async function requestDelete(m: BuilderMedia) {
    const used = usageByFilename[m.filename] ?? 0;
    if (used > 0) {
      toast.error(
        `"${m.filename}" is used by ${used} ${used === 1 ? "card" : "cards"}. Remove the references first.`,
      );
      return;
    }
    const ok = await confirmAction({
      title: `Delete "${m.filename}"?`,
      description: "Use Ctrl+Z to undo.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    onDelete(m.id);
  }

  function format(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function handleDragStart(m: BuilderMedia, ev: DragEvent) {
    if (!ev.dataTransfer) return;
    ev.dataTransfer.effectAllowed = "copy";
    ev.dataTransfer.setData("text/plain", referenceFor(m));
    ev.dataTransfer.setData(MEDIA_DRAG_TYPE, referenceFor(m));
  }
</script>

<SidebarSection title="Media" onAdd={() => fileInput?.click()} addLabel="Upload media file">
  <input
    bind:this={fileInput}
    type="file"
    multiple
    onchange={handleFileChange}
    class="hidden"
    aria-hidden="true"
  />

  {#if sorted.length === 0}
    <p class="text-muted-foreground px-2 py-1 text-xs">
      No media yet. Drop files on a card to attach.
    </p>
  {:else}
    {#each sorted as m (m.id)}
      {@const isSelected = selection.kind === "mediaItem" && selection.id === m.id}
      {@const isEditing = editingId === m.id}
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          {#if isEditing}
            <div class="bg-accent/50 flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm">
              <MediaThumbnail media={m} />
              <input
                bind:this={renameInputEl}
                bind:value={renameValue}
                onblur={commitRename}
                onkeydown={handleRenameKey}
                aria-label="Rename media file"
                class="bg-background border-input flex-1 rounded border px-1 py-0 text-xs outline-none"
              />
            </div>
          {:else}
            <button
              type="button"
              draggable="true"
              ondragstart={(e) => handleDragStart(m, e)}
              ondblclick={() => startRename(m)}
              onclick={() => onSelect(m.id)}
              title="Drag onto a card to attach, or click to view"
              class="flex w-full cursor-grab items-center gap-2 rounded-md px-2 py-1 text-sm
                transition-colors active:cursor-grabbing
                {isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/40'}"
            >
              <MediaThumbnail media={m} />
              <span class="flex-1 truncate text-left text-xs">{m.filename}</span>
              <span class="text-muted-foreground text-[10px]">{format(m.size)}</span>
            </button>
          {/if}
        </ContextMenu.Trigger>
        <ContextMenu.Content class="w-48">
          <ContextMenu.Item onSelect={() => startRename(m)}>
            <Pencil />
            Rename
          </ContextMenu.Item>
          <ContextMenu.Separator />
          <ContextMenu.Item variant="destructive" onSelect={() => requestDelete(m)}>
            <Trash2 />
            Delete
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Root>
    {/each}
  {/if}

  <div class="mt-2 px-2">
    <div class="bg-muted/40 h-1 overflow-hidden rounded-full">
      <div class="bg-primary h-full" style="width: {percentUsed}%"></div>
    </div>
    <p class="text-muted-foreground mt-1 text-[10px]">
      {format(totalSize)} of {format(MEDIA_PER_PACKAGE_LIMIT)} used
    </p>
  </div>
</SidebarSection>
