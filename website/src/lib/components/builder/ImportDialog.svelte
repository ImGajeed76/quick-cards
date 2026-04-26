<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Textarea } from "$lib/components/ui/textarea";
  import { Label } from "$lib/components/ui/label";
  import * as Dialog from "$lib/components/ui/dialog";
  import { parseInput } from "$lib/parse";
  import { createPackageFromFlashcardSet } from "$lib/builder/init";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";

  interface Props {
    open: boolean;
  }

  let { open = $bindable() }: Props = $props();

  let value = $state("");
  let busy = $state(false);
  let error = $state<string | null>(null);

  const placeholder = "bonjour - hello\nmerci - thank you\n...";

  const trimmed = $derived(value.trim());
  const canCreate = $derived(trimmed.length > 0 && !busy);

  async function create() {
    if (!canCreate) return;
    busy = true;
    error = null;
    try {
      const parsed = parseInput(value);
      if (parsed.kind === "vocab") {
        const id = await createPackageFromFlashcardSet({
          title: "Pasted deck",
          description: "",
          cards: parsed.pairs.map((p) => ({ term: p.term, definition: p.definition })),
        });
        await goto(resolve(`/build/${id}`));
      } else if (parsed.kind === "quizlet") {
        error = "Paste your card text directly. Quizlet links are imported through the extension.";
      } else if (parsed.kind === "empty") {
        error = "Paste at least one card first.";
      } else {
        error = parsed.kind === "unknown" ? parsed.reason : "Could not read those cards.";
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      busy = false;
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-lg">
    <Dialog.Header>
      <Dialog.Title>Paste your cards</Dialog.Title>
      <Dialog.Description>
        Term and definition per line, separated by tab, comma, dash, or colon. Markdown tables and
        JSON also work.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-2">
      <Label for="import-input" class="sr-only">Cards</Label>
      <Textarea
        id="import-input"
        bind:value
        {placeholder}
        rows={8}
        class="max-h-[50vh] resize-none overflow-y-auto font-mono text-sm"
        disabled={busy}
      />
      {#if error}
        <p class="text-destructive text-sm" role="alert">{error}</p>
      {/if}
    </div>

    <Dialog.Footer>
      <Button variant="ghost" onclick={() => (open = false)} disabled={busy}>Cancel</Button>
      <Button onclick={create} disabled={!canCreate}>
        {busy ? "Creating…" : "Create deck"}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
