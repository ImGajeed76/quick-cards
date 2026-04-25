<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Folder, Plus } from "@lucide/svelte";
  import type { BuilderDeck, Id, Selection } from "$lib/builder/types";

  interface Props {
    decks: BuilderDeck[];
    noteCounts: Record<Id, number>;
    selection: Selection;
    onSelectDeck: (id: Id) => void;
    onAddDeck: () => void;
  }

  let { decks, noteCounts, selection, onSelectDeck, onAddDeck }: Props = $props();

  // Stable, name-sorted view; Phase 2 swaps this for the real tree (parent/order).
  const sortedDecks = $derived(
    [...decks].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
  );
</script>

<aside class="bg-background flex h-full w-64 shrink-0 flex-col border-r">
  <div class="flex items-center justify-between px-4 pt-4 pb-2">
    <h2 class="text-muted-foreground text-xs font-medium tracking-wide uppercase">Decks</h2>
    <Button variant="ghost" size="icon" onclick={onAddDeck} aria-label="Add deck" class="h-7 w-7">
      <Plus class="h-4 w-4" />
    </Button>
  </div>

  <nav class="flex-1 overflow-y-auto px-2 pb-4">
    {#each sortedDecks as deck (deck.id)}
      {@const isSelected = selection.kind === "deck" && selection.id === deck.id}
      <button
        type="button"
        onclick={() => onSelectDeck(deck.id)}
        class="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm
          transition-colors {isSelected
          ? 'bg-accent text-accent-foreground'
          : 'text-foreground hover:bg-accent/50'}"
      >
        <Folder class="text-muted-foreground h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="flex-1 truncate text-left">{deck.name || "Untitled deck"}</span>
        <span class="text-muted-foreground text-xs">{noteCounts[deck.id] ?? 0}</span>
      </button>
    {/each}
  </nav>
</aside>
