/**
 * Promise-based wrapper around the global confirm AlertDialog.
 *
 * Components call `confirmAction(...)` and await a boolean. The editor page
 * mounts `<ConfirmDialog />` once, which renders shadcn-svelte's AlertDialog
 * driven by this store.
 *
 * Toasts are not handled here. Import `toast` from `svelte-sonner` directly:
 *
 *   import { toast } from "svelte-sonner";
 *   toast.error("Could not save");
 */

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export interface ConfirmRequest extends ConfirmOptions {
  id: number;
  resolve: (value: boolean) => void;
}

class DialogsStore {
  confirmRequest = $state<ConfirmRequest | null>(null);
  private nextId = 1;

  ask(opts: ConfirmOptions): Promise<boolean> {
    if (this.confirmRequest) this.confirmRequest.resolve(false);
    return new Promise<boolean>((resolve) => {
      this.confirmRequest = { ...opts, id: this.nextId++, resolve };
    });
  }

  resolveConfirm(value: boolean): void {
    if (!this.confirmRequest) return;
    this.confirmRequest.resolve(value);
    this.confirmRequest = null;
  }
}

export const dialogs = new DialogsStore();

export function confirmAction(opts: ConfirmOptions): Promise<boolean> {
  return dialogs.ask(opts);
}
