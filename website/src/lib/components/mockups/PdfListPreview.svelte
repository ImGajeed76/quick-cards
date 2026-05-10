<script lang="ts">
  import type { Pair } from "$lib/demo";

  let { title, cards, padFrom = [] }: { title: string; cards: Pair[]; padFrom?: Pair[] } = $props();

  // Pad the displayed list with pool entries so the table looks like a
  // real document instead of 3 lonely rows. Page 1 holds the first 9
  // rows, page 2 (peeking from behind, rotated) holds the continuation.
  const padded = $derived([...cards, ...padFrom].slice(0, 14));
  const page1Rows = $derived(padded.slice(0, 9));
  const page2Rows = $derived(padded.slice(9, 14));
</script>

<!-- Two A4 pages stacked. Page 2 (continuation rows) sits rotated behind
     so the preview reads as a real multi-page document. Page 1 carries
     the title and primary table. The table itself uses square corners
     to match the real PDF; the page outline stays slightly rounded so
     it reads as a piece of paper. -->
<div class="relative mx-auto flex w-full items-center justify-center py-8">
  <div class="relative aspect-[210/297] h-[52vh]">
    <!-- Page 2 (continuation, rotated, behind). opacity-85 dims the
         whole subtree (paper AND table) uniformly so the table doesn't
         pop white against a tinted page. -->
    <div
      aria-hidden="true"
      class="absolute inset-0 -translate-x-3 translate-y-3 -rotate-6 overflow-hidden rounded-sm bg-white p-5 opacity-80 shadow-md shadow-black/30"
    >
      <div class="border border-zinc-200">
        <div
          class="grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,2fr)] bg-violet-500 text-[9px] font-semibold text-white"
        >
          <div class="px-2 py-1">#</div>
          <div class="px-2 py-1">Term</div>
          <div class="px-2 py-1">Definition</div>
        </div>
        {#each page2Rows as card, i (i)}
          <div
            class={`grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,2fr)] text-[9px] leading-snug ${
              i % 2 === 1 ? "bg-violet-50" : "bg-white"
            }`}
          >
            <div class="px-2 py-1 text-zinc-500 tabular-nums">{i + 10}</div>
            <div class="px-2 py-1 break-words text-zinc-800">{card.term}</div>
            <div class="px-2 py-1 break-words text-zinc-700">{card.definition}</div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Page 1 (title + first 9 rows) -->
    <div
      class="absolute inset-0 overflow-hidden rounded-sm bg-white px-6 py-6 shadow-md shadow-black/40"
    >
      <h3 class="mb-5 text-base leading-tight font-bold text-violet-700">
        {title}
      </h3>
      <div class="border border-zinc-200">
        <div
          class="grid grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,2fr)] bg-violet-500 text-[10px] font-semibold text-white"
        >
          <div class="px-2 py-1.5">#</div>
          <div class="px-2 py-1.5">Term</div>
          <div class="px-2 py-1.5">Definition</div>
        </div>
        {#each page1Rows as card, i (i)}
          <div
            class={`grid grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,2fr)] text-[9.5px] leading-snug ${
              i % 2 === 1 ? "bg-violet-50" : "bg-white"
            }`}
          >
            <div class="px-2 py-1.5 text-zinc-500 tabular-nums">{i + 1}</div>
            <div class="px-2 py-1.5 break-words text-zinc-800">{card.term}</div>
            <div class="px-2 py-1.5 break-words text-zinc-700">{card.definition}</div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
