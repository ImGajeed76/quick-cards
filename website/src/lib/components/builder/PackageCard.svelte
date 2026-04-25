<script lang="ts">
  import { resolve } from "$app/paths";
  import { Trash2 } from "@lucide/svelte";
  import type { BuilderPackage } from "$lib/builder/types";

  interface Props {
    package: BuilderPackage;
    deckCount: number;
    cardCount: number;
    onDelete: (id: string) => void;
  }

  let { package: pkg, deckCount, cardCount, onDelete }: Props = $props();

  const updatedLabel = $derived(formatRelative(pkg.updatedAt));

  function formatRelative(timestamp: number): string {
    const ms = Date.now() - timestamp;
    const m = Math.round(ms / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    if (d < 30) return `${d}d ago`;
    const mo = Math.round(d / 30);
    return `${mo}mo ago`;
  }

  function handleDelete(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    onDelete(pkg.id);
  }
</script>

<a
  href={resolve(`/build/${pkg.id}`)}
  class="group bg-card hover:border-primary/40 focus-visible:ring-ring relative flex h-full
    flex-col gap-3 rounded-lg border p-6 transition-colors focus-visible:ring-2
    focus-visible:outline-none"
>
  <h3 class="text-foreground line-clamp-2 text-lg font-medium">
    {pkg.title || "Untitled deck"}
  </h3>

  <p class="text-muted-foreground text-sm">
    {deckCount}
    {deckCount === 1 ? "deck" : "decks"} &middot; {cardCount}
    {cardCount === 1 ? "card" : "cards"}
  </p>

  <div class="text-muted-foreground mt-auto flex items-center justify-between text-xs">
    <span>Edited {updatedLabel}</span>

    <button
      type="button"
      onclick={handleDelete}
      class="text-muted-foreground hover:text-destructive focus-visible:ring-ring rounded
        p-1 opacity-0 transition-[color,opacity] group-hover:opacity-100
        focus-visible:opacity-100 focus-visible:ring-2 focus-visible:outline-none"
      aria-label="Delete deck"
    >
      <Trash2 class="h-4 w-4" />
    </button>
  </div>
</a>
