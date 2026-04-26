<script lang="ts">
  import { Image as ImageIcon, Music, Trash2 } from "@lucide/svelte";
  import SidebarSection from "./SidebarSection.svelte";
  import { MEDIA_PER_PACKAGE_LIMIT } from "$lib/builder/types";
  import type { BuilderMedia, Id } from "$lib/builder/types";

  interface Props {
    media: BuilderMedia[];
    /** Map from media filename to count of notes referencing it. */
    usageByFilename: Record<string, number>;
    onAdd: (file: File) => void;
    onDelete: (id: Id) => void;
  }

  let { media, usageByFilename, onAdd, onDelete }: Props = $props();

  let fileInput = $state<HTMLInputElement | null>(null);

  const sorted = $derived([...media].sort((a, b) => a.filename.localeCompare(b.filename)));
  const totalSize = $derived(media.reduce((sum, m) => sum + m.size, 0));
  const percentUsed = $derived(Math.min(100, (totalSize / MEDIA_PER_PACKAGE_LIMIT) * 100));

  function isImage(mime: string): boolean {
    return mime.startsWith("image/");
  }
  function isAudio(mime: string): boolean {
    return mime.startsWith("audio/");
  }

  function handleFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const files = input.files;
    if (!files) return;
    for (const file of Array.from(files)) onAdd(file);
    input.value = "";
  }

  function handleDelete(m: BuilderMedia) {
    const used = usageByFilename[m.filename] ?? 0;
    if (used > 0) {
      alert(
        `"${m.filename}" is used by ${used} ${used === 1 ? "card" : "cards"}. Remove the references first.`,
      );
      return;
    }
    onDelete(m.id);
  }

  function format(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      <div
        class="group hover:bg-accent/40 flex items-center gap-2 rounded-md px-2 py-1 text-sm
          transition-colors"
      >
        {#if isImage(m.mimeType)}
          <ImageIcon class="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {:else if isAudio(m.mimeType)}
          <Music class="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {:else}
          <span class="text-muted-foreground h-3.5 w-3.5 shrink-0 text-center text-xs">F</span>
        {/if}
        <span class="flex-1 truncate text-left text-xs">{m.filename}</span>
        <span class="text-muted-foreground text-[10px]">{format(m.size)}</span>
        <button
          type="button"
          onclick={() => handleDelete(m)}
          aria-label={`Delete ${m.filename}`}
          class="text-muted-foreground hover:text-destructive rounded p-0.5 opacity-0
            transition-[color,opacity] group-hover:opacity-100"
        >
          <Trash2 class="h-3 w-3" />
        </button>
      </div>
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
