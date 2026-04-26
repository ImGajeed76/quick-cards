<script lang="ts">
  import { Toaster } from "$lib/components/ui/sonner";
  import ConfirmDialog from "$lib/components/builder/ConfirmDialog.svelte";

  let { children } = $props();
</script>

{@render children?.()}

<Toaster richColors closeButton position="bottom-right" />
<ConfirmDialog />
