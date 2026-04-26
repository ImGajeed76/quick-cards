<script lang="ts">
  import * as Popover from "$lib/components/ui/popover";
  import { Button } from "$lib/components/ui/button";
  import { ChevronDown, Download, Link2, LoaderCircle } from "@lucide/svelte";
  import {
    downloadApkg,
    downloadCsv,
    downloadJson,
    downloadTxt,
    shareUrl,
    shareUrlViaSessionStorage,
  } from "$lib/builder/export-runner";
  import { resolve } from "$app/paths";
  import { track } from "$lib/analytics";
  import type { PackageData } from "$lib/builder/types";

  interface Props {
    data: PackageData;
  }

  let { data }: Props = $props();

  let open = $state(false);
  let busy = $state<null | "apkg" | "json" | "csv" | "txt" | "share">(null);
  let copied = $state(false);

  async function exportApkg() {
    busy = "apkg";
    try {
      await downloadApkg(data);
      track("Builder export", { format: "apkg" });
    } catch (err) {
      console.error("[builder] apkg export failed", err);
      alert("Could not generate the .apkg file. Check the console for details.");
    } finally {
      busy = null;
      open = false;
    }
  }

  function exportSync(format: "json" | "csv" | "txt") {
    busy = format;
    try {
      if (format === "json") downloadJson(data);
      if (format === "csv") downloadCsv(data);
      if (format === "txt") downloadTxt(data);
      track("Builder export", { format });
    } finally {
      busy = null;
      open = false;
    }
  }

  async function copyShareLink() {
    busy = "share";
    try {
      const origin = window.location.origin;
      const pathname = resolve("/process");
      const direct = shareUrl(data, origin, pathname);
      const link = direct ?? shareUrlViaSessionStorage(data, origin, pathname);
      await navigator.clipboard.writeText(link);
      copied = true;
      setTimeout(() => (copied = false), 1800);
      track("Builder export", { format: "share" });
    } catch (err) {
      console.error("[builder] share link failed", err);
      alert("Could not copy the share link.");
    } finally {
      busy = null;
    }
  }
</script>

<div class="flex items-center gap-1.5">
  <Button
    variant="ghost"
    size="sm"
    onclick={copyShareLink}
    disabled={busy !== null}
    aria-label="Copy share link"
    class="text-muted-foreground hover:text-foreground gap-1.5"
  >
    {#if busy === "share"}
      <LoaderCircle class="h-4 w-4 animate-spin" />
    {:else}
      <Link2 class="h-4 w-4" />
    {/if}
    {copied ? "Copied" : "Share"}
  </Button>

  <Popover.Root bind:open>
    <Popover.Trigger>
      <Button size="sm" disabled={busy !== null} class="gap-1.5">
        {#if busy === "apkg"}
          <LoaderCircle class="h-4 w-4 animate-spin" />
        {:else}
          <Download class="h-4 w-4" />
        {/if}
        Export
        <ChevronDown class="h-3.5 w-3.5 opacity-70" />
      </Button>
    </Popover.Trigger>
    <Popover.Content class="w-56 p-1" sideOffset={6} align="end">
      <button
        type="button"
        onclick={() => {
          void exportApkg();
        }}
        disabled={busy !== null}
        class="hover:bg-accent flex w-full items-center justify-between rounded-sm px-2 py-1.5
          text-sm transition-colors disabled:opacity-50"
      >
        <span class="font-medium">Anki .apkg</span>
        <span class="text-muted-foreground text-xs">FSRS-tuned</span>
      </button>
      <button
        type="button"
        onclick={() => exportSync("json")}
        disabled={busy !== null}
        class="hover:bg-accent flex w-full items-center justify-between rounded-sm px-2 py-1.5
          text-sm transition-colors disabled:opacity-50"
      >
        <span>JSON</span>
      </button>
      <button
        type="button"
        onclick={() => exportSync("csv")}
        disabled={busy !== null}
        class="hover:bg-accent flex w-full items-center justify-between rounded-sm px-2 py-1.5
          text-sm transition-colors disabled:opacity-50"
      >
        <span>CSV</span>
      </button>
      <button
        type="button"
        onclick={() => exportSync("txt")}
        disabled={busy !== null}
        class="hover:bg-accent flex w-full items-center justify-between rounded-sm px-2 py-1.5
          text-sm transition-colors disabled:opacity-50"
      >
        <span>Plain text</span>
      </button>
    </Popover.Content>
  </Popover.Root>
</div>
