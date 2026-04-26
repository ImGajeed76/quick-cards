<script lang="ts">
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { dialogs } from "$lib/builder/dialogs.svelte";

  const request = $derived(dialogs.confirmRequest);
  const open = $derived(request !== null);

  function handleOpenChange(value: boolean) {
    if (!value) dialogs.resolveConfirm(false);
  }
</script>

<AlertDialog.Root {open} onOpenChange={handleOpenChange}>
  <AlertDialog.Content>
    {#if request}
      <AlertDialog.Header>
        <AlertDialog.Title>{request.title}</AlertDialog.Title>
        {#if request.description}
          <AlertDialog.Description>{request.description}</AlertDialog.Description>
        {/if}
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel onclick={() => dialogs.resolveConfirm(false)}>
          {request.cancelLabel ?? "Cancel"}
        </AlertDialog.Cancel>
        <AlertDialog.Action
          variant={request.destructive ? "destructive" : "default"}
          onclick={() => dialogs.resolveConfirm(true)}
        >
          {request.confirmLabel ?? "Confirm"}
        </AlertDialog.Action>
      </AlertDialog.Footer>
    {/if}
  </AlertDialog.Content>
</AlertDialog.Root>
