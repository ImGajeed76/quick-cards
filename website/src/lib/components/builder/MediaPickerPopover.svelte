<script lang="ts">
  import * as Popover from "$lib/components/ui/popover";
  import { Paperclip, Upload } from "@lucide/svelte";
  import MediaThumbnail from "./MediaThumbnail.svelte";
  import { referenceFor } from "$lib/builder/media-drag";
  import type { BuilderMedia } from "$lib/builder/types";

  interface Props {
    media: BuilderMedia[];
    /** Called with the Anki reference token for the picked file. */
    onPick: (ref: string) => void;
    /** Called when the user picks a NEW file from disk. Should upload and
     * return the reference token (matches CardRow's onAttachFile). */
    onUpload: (file: File) => Promise<string | null>;
    /** Tooltip and aria-label for the trigger button. */
    label?: string;
  }

  let { media, onPick, onUpload, label = "Attach media" }: Props = $props();

  let open = $state(false);
  let fileInputEl = $state<HTMLInputElement | null>(null);

  const sorted = $derived([...media].sort((a, b) => a.filename.localeCompare(b.filename)));

  function pickExisting(m: BuilderMedia) {
    onPick(referenceFor(m));
    open = false;
  }

  async function handleUpload(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    const ref = await onUpload(file);
    if (ref) onPick(ref);
    open = false;
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger>
    <button
      type="button"
      tabindex={-1}
      aria-label={label}
      title={label}
      class="text-muted-foreground hover:text-foreground hover:bg-accent rounded p-1 transition-colors"
    >
      <Paperclip class="h-3.5 w-3.5" />
    </button>
  </Popover.Trigger>
  <Popover.Content class="w-64 p-2" sideOffset={6} align="end">
    <input
      bind:this={fileInputEl}
      type="file"
      onchange={(e) => {
        void handleUpload(e);
      }}
      class="hidden"
      aria-hidden="true"
    />

    <button
      type="button"
      onclick={() => fileInputEl?.click()}
      class="text-foreground hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5
        text-sm transition-colors"
    >
      <Upload class="h-3.5 w-3.5" />
      Upload new
    </button>

    {#if sorted.length > 0}
      <div class="bg-border my-1 h-px"></div>
      <p class="text-muted-foreground px-2 pt-1 pb-0.5 text-[10px] tracking-wide uppercase">
        From library
      </p>
      <div class="grid max-h-56 grid-cols-3 gap-1 overflow-y-auto p-1">
        {#each sorted as m (m.id)}
          <button
            type="button"
            onclick={() => pickExisting(m)}
            title={m.filename}
            class="hover:bg-accent flex flex-col items-center gap-1 rounded p-1 transition-colors"
          >
            <MediaThumbnail media={m} class="h-12 w-12 rounded" />
            <span class="text-muted-foreground w-full truncate text-[10px]">{m.filename}</span>
          </button>
        {/each}
      </div>
    {/if}
  </Popover.Content>
</Popover.Root>
