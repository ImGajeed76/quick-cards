<script lang="ts">
  import * as Popover from "$lib/components/ui/popover";
  import { Button } from "$lib/components/ui/button";
  import { ChevronDown, Download, LoaderCircle } from "@lucide/svelte";
  import { downloadApkg, downloadCsv, downloadJson, downloadTxt } from "$lib/builder/export-runner";
  import { toast } from "svelte-sonner";
  import { track } from "$lib/analytics";
  import type { PackageData } from "$lib/builder/types";

  interface Props {
    data: PackageData;
  }

  let { data }: Props = $props();

  let open = $state(false);
  let busy = $state<null | "apkg" | "json" | "csv" | "txt">(null);

  async function exportApkg() {
    busy = "apkg";
    try {
      await downloadApkg(data);
      track("Builder export", { format: "apkg" });
    } catch (err) {
      console.error("[builder] apkg export failed", err);
      toast.error("Could not generate the .apkg file. See the console for details.");
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
</script>

<div class="flex items-center gap-1.5">
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
