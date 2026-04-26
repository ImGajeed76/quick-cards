<script lang="ts">
  import { Trash2, X } from "@lucide/svelte";
  import { Button } from "$lib/components/ui/button";

  interface Props {
    count: number;
    onDelete: () => void;
    onClear: () => void;
  }

  let { count, onDelete, onClear }: Props = $props();
</script>

<div
  class="bg-popover text-popover-foreground pointer-events-auto fixed bottom-6 left-1/2
    z-30 flex -translate-x-1/2 items-center gap-3 rounded-full border px-2 py-1.5 shadow-md"
  role="region"
  aria-label="Bulk actions"
>
  <span class="px-3 text-sm font-medium">
    {count}
    {count === 1 ? "card" : "cards"} selected
  </span>

  <div class="bg-border h-5 w-px" aria-hidden="true"></div>

  <Button variant="ghost" size="sm" onclick={onDelete} class="text-destructive gap-1.5">
    <Trash2 class="h-4 w-4" />
    Delete
  </Button>

  <Button
    variant="ghost"
    size="icon"
    onclick={onClear}
    aria-label="Clear selection"
    class="h-8 w-8 rounded-full"
  >
    <X class="h-4 w-4" />
  </Button>
</div>
