<script lang="ts">
  import { HardDrive } from "@lucide/svelte";
</script>

<div
  class="bg-muted/40 text-muted-foreground flex items-center justify-center gap-2 border-b px-4 py-2 text-xs"
  role="status"
>
  <HardDrive class="h-3.5 w-3.5" aria-hidden="true" />
  <span>
    Your decks are stored locally in this browser. They never leave your device, so clearing your
    browser data deletes them.
  </span>
</div>
