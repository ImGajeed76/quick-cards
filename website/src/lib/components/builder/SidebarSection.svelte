<script lang="ts">
  import { ChevronRight, Plus } from "@lucide/svelte";
  import type { Snippet } from "svelte";

  interface Props {
    title: string;
    /** Whether the section is expanded by default. */
    initialOpen?: boolean;
    /** Optional add button shown next to the chevron. */
    onAdd?: () => void;
    addLabel?: string;
    children: Snippet;
  }

  let { title, initialOpen = false, onAdd, addLabel = "Add", children }: Props = $props();

  // svelte-ignore state_referenced_locally
  let open = $state(initialOpen);
</script>

<div class="flex flex-col">
  <div class="flex items-center justify-between px-4 pt-3 pb-1">
    <button
      type="button"
      onclick={() => (open = !open)}
      aria-expanded={open}
      class="text-muted-foreground hover:text-foreground -ml-1 flex items-center gap-1 rounded
        px-1 text-xs font-medium tracking-wide uppercase transition-colors"
    >
      <ChevronRight
        class="h-3 w-3 transition-transform {open ? 'rotate-90' : ''}"
        aria-hidden="true"
      />
      {title}
    </button>
    {#if onAdd}
      <button
        type="button"
        onclick={onAdd}
        aria-label={addLabel}
        class="text-muted-foreground hover:text-foreground hover:bg-accent flex h-6 w-6
          items-center justify-center rounded transition-colors"
      >
        <Plus class="h-3.5 w-3.5" />
      </button>
    {/if}
  </div>

  {#if open}
    <div class="px-2 pb-2">
      {@render children()}
    </div>
  {/if}
</div>
