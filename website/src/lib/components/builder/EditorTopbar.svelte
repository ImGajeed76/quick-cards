<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { ArrowLeft, Redo2, Undo2 } from "@lucide/svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import ExportMenu from "./ExportMenu.svelte";
  import type { PackageData } from "$lib/builder/types";

  interface Props {
    title: string;
    canUndo: boolean;
    canRedo: boolean;
    saveStatus: "saved" | "saving" | "error";
    /** Snapshot of the current package; passed through to ExportMenu. */
    data: PackageData;
    onTitleChange: (next: string) => void;
    onUndo: () => void;
    onRedo: () => void;
  }

  let { title, canUndo, canRedo, saveStatus, data, onTitleChange, onUndo, onRedo }: Props =
    $props();

  // Writable derived: mirrors `title` but accepts local edits while focused.
  // Reassigns to the source value when `title` changes externally (e.g. undo).
  let local = $derived(title);

  function commit() {
    const next = local.trim();
    if (next && next !== title) onTitleChange(next);
    else local = title;
  }
</script>

<header class="bg-background sticky top-0 z-20 flex h-14 items-center gap-3 border-b px-4 sm:px-6">
  <Button
    variant="ghost"
    size="icon"
    onclick={() => goto(resolve("/build"))}
    aria-label="Back to overview"
  >
    <ArrowLeft class="h-4 w-4" />
  </Button>

  <Input
    bind:value={local}
    onblur={commit}
    onkeydown={(e: KeyboardEvent) => {
      if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
      if (e.key === "Escape") {
        local = title;
        (e.currentTarget as HTMLInputElement).blur();
      }
    }}
    aria-label="Deck title"
    class="hover:border-input focus-visible:bg-background h-9 max-w-sm border-transparent bg-transparent text-base
      font-medium shadow-none"
  />

  <div class="text-muted-foreground ml-auto flex items-center gap-3 text-xs">
    {#if saveStatus === "saving"}
      <span aria-live="polite">Saving…</span>
    {:else if saveStatus === "saved"}
      <span>Saved</span>
    {:else}
      <span class="text-destructive">Save failed</span>
    {/if}

    <div class="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onclick={onUndo}
        disabled={!canUndo}
        aria-label="Undo (Ctrl+Z)"
      >
        <Undo2 class="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onclick={onRedo}
        disabled={!canRedo}
        aria-label="Redo (Ctrl+Shift+Z)"
      >
        <Redo2 class="h-4 w-4" />
      </Button>
    </div>

    <div class="bg-border h-5 w-px" aria-hidden="true"></div>

    <ExportMenu {data} />
  </div>
</header>
