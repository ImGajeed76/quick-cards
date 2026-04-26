<script lang="ts">
  import { onDestroy } from "svelte";
  import { Trash2 } from "@lucide/svelte";
  import { Button } from "$lib/components/ui/button";
  import InlineTitle from "./InlineTitle.svelte";
  import { confirmAction } from "$lib/builder/dialogs.svelte";
  import { toast } from "svelte-sonner";
  import type { BuilderMedia, Id } from "$lib/builder/types";

  interface Props {
    media: BuilderMedia;
    usage: number;
    onRename: (id: Id, filename: string) => void;
    onDelete: (id: Id) => void;
  }

  let { media, usage, onRename, onDelete }: Props = $props();

  let url = $state<string | null>(null);

  $effect(() => {
    const next = URL.createObjectURL(media.blob);
    url = next;
    return () => URL.revokeObjectURL(next);
  });

  onDestroy(() => {
    if (url) URL.revokeObjectURL(url);
  });

  const isImage = $derived(media.mimeType.startsWith("image/"));
  const isAudio = $derived(media.mimeType.startsWith("audio/"));

  function format(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  async function handleDelete() {
    if (usage > 0) {
      toast.error(
        `"${media.filename}" is used by ${usage} ${usage === 1 ? "card" : "cards"}. Remove the references first.`,
      );
      return;
    }
    const ok = await confirmAction({
      title: `Delete "${media.filename}"?`,
      description: "Use Ctrl+Z to undo.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    onDelete(media.id);
  }
</script>

<div class="space-y-6">
  <header class="flex flex-wrap items-start justify-between gap-3">
    <div class="flex-1 space-y-2">
      <p class="text-muted-foreground text-xs tracking-wide uppercase">Media</p>
      <InlineTitle
        value={media.filename}
        onSave={(next) => onRename(media.id, next)}
        ariaLabel="Filename"
        placeholder="filename"
        class="text-2xl leading-tight font-semibold tracking-tight break-all"
      />
      <p class="text-muted-foreground text-sm">
        {media.mimeType || "unknown type"} · {format(media.size)} · used by {usage}
        {usage === 1 ? "card" : "cards"}
      </p>
    </div>
    <Button variant="ghost" onclick={handleDelete} class="text-muted-foreground gap-1.5">
      <Trash2 class="h-4 w-4" />
      Delete
    </Button>
  </header>

  <div class="bg-card flex items-center justify-center rounded-lg border p-6">
    {#if isImage && url}
      <img
        src={url}
        alt={media.filename}
        class="max-h-[60vh] max-w-full rounded-md object-contain"
      />
    {:else if isAudio && url}
      <audio src={url} controls class="w-full max-w-md">
        <track kind="captions" />
      </audio>
    {:else}
      <p class="text-muted-foreground text-sm">No preview available for this file type.</p>
    {/if}
  </div>
</div>
