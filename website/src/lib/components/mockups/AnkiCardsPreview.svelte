<script lang="ts">
  import type { Pair } from "$lib/demo";
  import { Play } from "@lucide/svelte";

  let { cards }: { cards: Pair[] } = $props();

  // Show the first card of the set as the foreground card. Stack two
  // dimmer cards behind it for the deck-file feel, mirroring the /tool
  // tile's Anki visual but at dialog scale with legible content.
  const card = $derived(cards[0] ?? { term: "", definition: "" });
</script>

<!-- Outer wrapper is taller than the cards so the rotated background
     cards' corners have room to protrude without pushing the dialog
     height. Inner container holds the fixed-size cards, centered. -->
<div class="relative mx-auto flex h-64 w-full max-w-sm items-center justify-center">
  <div class="relative h-52 w-full">
    <!-- Background card 1 -->
    <div
      aria-hidden="true"
      class="border-border bg-card absolute inset-0 -translate-x-2 translate-y-2 -rotate-6 rounded-lg border"
    ></div>
    <!-- Background card 2 -->
    <div
      aria-hidden="true"
      class="border-border bg-card absolute inset-0 translate-x-1 -translate-y-1 rotate-3 rounded-lg border"
    ></div>
    <!-- Foreground card with content -->
    <div
      class="border-border bg-card relative flex h-full flex-col items-center justify-center rounded-lg border p-6 text-center"
    >
      <div class="text-foreground text-lg leading-tight font-semibold sm:text-xl">
        {card.term}
      </div>
      <span
        aria-hidden="true"
        class="text-muted-foreground/70 mt-2 flex size-4 items-center justify-center rounded-full bg-white/5"
      >
        <Play class="size-2 fill-current" />
      </span>
      <div class="bg-border/60 my-4 h-px w-3/4"></div>
      <div class="text-muted-foreground text-sm leading-snug">
        {card.definition}
      </div>
      <span
        aria-hidden="true"
        class="text-muted-foreground/70 mt-2 flex size-4 items-center justify-center rounded-full bg-white/5"
      >
        <Play class="size-2 fill-current" />
      </span>
    </div>
  </div>
</div>
