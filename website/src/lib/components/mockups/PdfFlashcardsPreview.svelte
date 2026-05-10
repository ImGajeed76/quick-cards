<script lang="ts">
  import type { Pair } from "$lib/demo";

  let { cards, padFrom = [] }: { cards: Pair[]; padFrom?: Pair[] } = $props();

  // Combine the user's pairs with the language pool to fill 16 slots
  // (8 per page x 2 pages). Empty slots stay blank if both run out.
  const padded = $derived([...cards, ...padFrom].slice(0, 16));
  const page1 = $derived(Array.from({ length: 8 }, (_, i) => padded[i] ?? null) as (Pair | null)[]);
  // Page 2 holds the next 8 cards (shown rotated behind, never flipped).
  const page2 = $derived(
    Array.from({ length: 8 }, (_, i) => padded[i + 8] ?? null) as (Pair | null)[],
  );
  // Back face of page 1: the same 8 cards' defs in column-swapped order
  // because a real Y-axis flip mirrors the cell layout horizontally.
  const page1BackDefs = $derived.by(() => {
    const result: (Pair | null)[] = [];
    for (let row = 0; row < 4; row++) {
      result.push(page1[row * 2 + 1]); // right column lands left
      result.push(page1[row * 2]); // left column lands right
    }
    return result;
  });

  type FlipState = "idle" | "flipping" | "flipped" | "unflipping";
  let flipState = $state<FlipState>("idle");

  function toggleFlip(): void {
    if (flipState === "flipping" || flipState === "unflipping") return;
    if (flipState === "idle") flipState = "flipping";
    else if (flipState === "flipped") flipState = "unflipping";
  }

  function onFlipEnd(): void {
    if (flipState === "flipping") flipState = "flipped";
    else if (flipState === "unflipping") flipState = "idle";
  }
</script>

<!-- Two A4 pages stacked. Page 2 (defs of the next 8 cards) sits rotated
     behind. Page 1 (terms of the first 8 cards) is on top, clickable;
     click flips it on the Y axis to reveal the matching defs. -->
<div class="relative mx-auto flex w-full items-center justify-center py-10">
  <div class="relative aspect-[210/297] h-[46vh]">
    <!-- Page 2 (next 8 cards' defs): rotated, behind, untouched.
         opacity-80 dims the whole subtree so the dashed lines and
         text dim with the paper instead of popping at full strength. -->
    <div
      aria-hidden="true"
      class="absolute inset-0 -translate-x-3 translate-y-3 -rotate-6 overflow-hidden rounded-sm bg-white p-3 opacity-80 shadow-md shadow-black/30"
    >
      <div class="relative grid h-full grid-cols-2 grid-rows-4">
        {#each page2 as slot, i (i)}
          <div class="flex items-center justify-center px-2">
            {#if slot}
              <span class="text-center text-[10px] leading-tight text-zinc-700 sm:text-xs">
                {slot.definition}
              </span>
            {/if}
          </div>
        {/each}
        <div
          class="pointer-events-none absolute top-0 bottom-0 left-1/2 -translate-x-px border-l border-dashed border-zinc-400/60"
        ></div>
        <div
          class="pointer-events-none absolute top-1/4 right-0 left-0 -translate-y-px border-t border-dashed border-zinc-400/60"
        ></div>
        <div
          class="pointer-events-none absolute top-2/4 right-0 left-0 -translate-y-px border-t border-dashed border-zinc-400/60"
        ></div>
        <div
          class="pointer-events-none absolute top-3/4 right-0 left-0 -translate-y-px border-t border-dashed border-zinc-400/60"
        ></div>
      </div>
    </div>

    <!-- Page 1 (first 8 cards): clickable, flips to show defs on back. -->
    <button
      type="button"
      onclick={toggleFlip}
      aria-label={flipState === "flipped" || flipState === "flipping"
        ? "Flip back to terms"
        : "Flip to see definitions"}
      class="absolute inset-0 cursor-pointer outline-none perspective-[1100px] focus:outline-none focus-visible:outline-none"
    >
      <div
        class="pdf-preview-flip-inner relative h-full w-full transform-3d"
        class:is-flipping={flipState === "flipping"}
        class:is-flipped={flipState === "flipped"}
        class:is-unflipping={flipState === "unflipping"}
        onanimationend={onFlipEnd}
      >
        <!-- Front face: terms -->
        <div
          class="absolute inset-0 overflow-hidden rounded-sm bg-white p-3 shadow-md shadow-black/40 backface-hidden"
        >
          <div class="relative grid h-full grid-cols-2 grid-rows-4">
            {#each page1 as slot, i (i)}
              <div class="flex items-center justify-center px-3 py-2">
                {#if slot}
                  <span class="text-center text-[11px] leading-tight text-zinc-800 sm:text-xs">
                    {slot.term}
                  </span>
                {/if}
              </div>
            {/each}
            <div
              class="pointer-events-none absolute top-0 bottom-0 left-1/2 -translate-x-px border-l border-dashed border-zinc-400/70"
            ></div>
            <div
              class="pointer-events-none absolute top-1/4 right-0 left-0 -translate-y-px border-t border-dashed border-zinc-400/70"
            ></div>
            <div
              class="pointer-events-none absolute top-2/4 right-0 left-0 -translate-y-px border-t border-dashed border-zinc-400/70"
            ></div>
            <div
              class="pointer-events-none absolute top-3/4 right-0 left-0 -translate-y-px border-t border-dashed border-zinc-400/70"
            ></div>
          </div>
        </div>

        <!-- Back face: defs (column-swapped, rotated 180 around Y so the
             text reads right-way-around once the page is flipped) -->
        <div
          class="absolute inset-0 rotate-y-180 overflow-hidden rounded-sm bg-white p-3 shadow-md shadow-black/40 backface-hidden"
        >
          <div class="relative grid h-full grid-cols-2 grid-rows-4">
            {#each page1BackDefs as slot, i (i)}
              <div class="flex items-center justify-center px-3 py-2">
                {#if slot}
                  <span class="text-center text-[11px] leading-tight text-zinc-800 sm:text-xs">
                    {slot.definition}
                  </span>
                {/if}
              </div>
            {/each}
            <div
              class="pointer-events-none absolute top-0 bottom-0 left-1/2 -translate-x-px border-l border-dashed border-zinc-400/70"
            ></div>
            <div
              class="pointer-events-none absolute top-1/4 right-0 left-0 -translate-y-px border-t border-dashed border-zinc-400/70"
            ></div>
            <div
              class="pointer-events-none absolute top-2/4 right-0 left-0 -translate-y-px border-t border-dashed border-zinc-400/70"
            ></div>
            <div
              class="pointer-events-none absolute top-3/4 right-0 left-0 -translate-y-px border-t border-dashed border-zinc-400/70"
            ></div>
          </div>
        </div>
      </div>
    </button>
  </div>
</div>

<style>
  /* Same lift-rotate / hard-slam feel as the /tool tile flip, with the
     translateZ values bumped a touch so the larger dialog page lifts
     proportionally. Forward rotates 0 to -180 and back goes 180 to 0,
     which together with the inverted Z on the slam segment matches the
     swing direction the user signed off on. */
  .pdf-preview-flip-inner {
    transform: rotateY(0deg);
  }
  .pdf-preview-flip-inner.is-flipped {
    transform: rotateY(180deg);
  }
  .pdf-preview-flip-inner.is-flipping {
    animation: pdf-preview-flip-forward 600ms linear forwards;
  }
  .pdf-preview-flip-inner.is-unflipping {
    animation: pdf-preview-flip-back 600ms linear forwards;
  }

  @keyframes pdf-preview-flip-forward {
    0% {
      transform: rotateY(0deg) translateZ(0) translateY(0);
      animation-timing-function: cubic-bezier(0.2, 0.85, 0.4, 1);
    }
    55% {
      transform: rotateY(-170deg) translateZ(-50px) translateY(-6px);
      animation-timing-function: cubic-bezier(0.6, 0, 0.9, 0.4);
    }
    100% {
      transform: rotateY(-180deg) translateZ(0) translateY(0);
    }
  }

  @keyframes pdf-preview-flip-back {
    0% {
      transform: rotateY(180deg) translateZ(0) translateY(0);
      animation-timing-function: cubic-bezier(0.2, 0.85, 0.4, 1);
    }
    55% {
      transform: rotateY(10deg) translateZ(50px) translateY(-6px);
      animation-timing-function: cubic-bezier(0.6, 0, 0.9, 0.4);
    }
    100% {
      transform: rotateY(0deg) translateZ(0) translateY(0);
    }
  }
</style>
