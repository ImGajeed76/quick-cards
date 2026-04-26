<script lang="ts">
  import { onDestroy } from "svelte";
  import { Image as ImageIcon, Music } from "@lucide/svelte";
  import type { BuilderMedia } from "$lib/builder/types";

  interface Props {
    media: BuilderMedia;
    /** Tailwind size + radius classes for the thumbnail box. */
    class?: string;
  }

  let { media, class: className = "h-5 w-5 rounded" }: Props = $props();

  let url = $state<string | null>(null);

  // Build (and revoke) the ObjectURL only for image blobs to keep the sidebar
  // light. Audio and other files fall back to an icon.
  $effect(() => {
    if (!media.mimeType.startsWith("image/")) {
      url = null;
      return;
    }
    const next = URL.createObjectURL(media.blob);
    url = next;
    return () => URL.revokeObjectURL(next);
  });

  onDestroy(() => {
    if (url) URL.revokeObjectURL(url);
  });
</script>

{#if url}
  <img src={url} alt={media.filename} class="bg-muted/40 shrink-0 object-cover {className}" />
{:else if media.mimeType.startsWith("audio/")}
  <span class="bg-muted/40 flex shrink-0 items-center justify-center {className}">
    <Music class="text-muted-foreground h-3 w-3" aria-hidden="true" />
  </span>
{:else}
  <span class="bg-muted/40 flex shrink-0 items-center justify-center {className}">
    <ImageIcon class="text-muted-foreground h-3 w-3" aria-hidden="true" />
  </span>
{/if}
