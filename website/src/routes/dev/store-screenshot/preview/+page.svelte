<script lang="ts">
  import Slide, { SLUGS } from "../Slide.svelte";
</script>

<svelte:head>
  <title>Store screenshot: preview</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="preview-page">
  <p class="caption">Carousel preview, slides at 50% scale. Scroll horizontally.</p>

  <div class="carousel">
    {#each SLUGS as slug (slug)}
      <div class="slot">
        <div class="scale-wrap">
          <Slide {slug} />
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .preview-page {
    background: var(--background);
    min-height: calc(100vh - 60px);
    padding: 2rem 0;
  }

  .caption {
    color: var(--muted-foreground);
    font-size: 0.875rem;
    text-align: center;
    margin: 0 0 1.5rem 0;
  }

  /* Horizontal scroll container with snap. Padding-inline gives the
     first/last slide breathing room at the edges. */
  .carousel {
    display: flex;
    gap: 24px;
    overflow-x: auto;
    padding: 0 2rem 2rem 2rem;
    scroll-snap-type: x mandatory;
  }

  /* Each slot is the visual size of a 50%-scaled slide (640x400). The
     full 1280x800 Slide is rendered inside scale-wrap and shrunk down
     so it fits the slot. overflow:hidden clips anything that bleeds. */
  .slot {
    flex: 0 0 auto;
    width: 640px;
    height: 400px;
    border-radius: 12px;
    overflow: hidden;
    scroll-snap-align: center;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    border: 1px solid var(--border);
  }

  .scale-wrap {
    width: 1280px;
    height: 800px;
    transform: scale(0.5);
    transform-origin: top left;
  }
</style>
