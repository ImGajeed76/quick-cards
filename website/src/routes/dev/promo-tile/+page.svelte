<script lang="ts">
  import { SITE_NAME } from "$lib/site";
</script>

<svelte:head>
  <title>Promo tile preview</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="page">
  <header class="instructions">
    <h1>Chrome Web Store promo tile</h1>
    <p>
      Exactly 440x280. To capture: open DevTools, hover the tile element in the Elements panel,
      right-click it, choose <strong>Capture node screenshot</strong>. The PNG saves at the exact
      pixel size with no padding or scrollbars. No library, no canvas, no rendering surprises.
    </p>
    <p class="hint">
      Save the result to <code>extension/store/screenshots/promo-440x280.png</code>.
    </p>
  </header>

  <div class="tile-frame">
    <div class="tile" data-promo-tile>
      <div class="content">
        <div class="lockup">
          <img
            src="/favicon-128-transparent.png"
            alt=""
            class="logo"
            width="80"
            height="80"
          />
          <span class="wordmark">{SITE_NAME}</span>
        </div>
        <div class="sub">for Quizlet</div>
      </div>
    </div>
  </div>
</div>

<style>
  .page {
    min-height: 100vh;
    background: var(--background);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2.5rem;
    padding: 4rem 2rem;
  }

  .instructions {
    max-width: 560px;
    color: var(--muted-foreground);
    font-size: 0.9375rem;
    line-height: 1.6;
  }

  .instructions h1 {
    margin: 0 0 0.75rem 0;
    color: var(--foreground);
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.02em;
  }

  .instructions p {
    margin: 0 0 0.75rem 0;
  }

  .instructions strong {
    color: var(--foreground);
    font-weight: 500;
  }

  .instructions code {
    background: var(--muted);
    color: var(--foreground);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.85em;
  }

  .hint {
    color: var(--muted-foreground);
    font-size: 0.875rem;
  }

  .tile-frame {
    /* Dotted ring around the tile so the user can see its exact bounds while
       picking the element in DevTools. The ring is outside the tile and not
       captured. */
    padding: 1rem;
    border: 1px dashed var(--border);
    border-radius: 0.5rem;
  }

  .tile {
    /* Pixel-locked. No max-width, no responsive shrink. The screenshot relies
       on these dimensions being exact. */
    width: 440px;
    height: 280px;
    box-sizing: border-box;
    background: var(--background);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    isolation: isolate;
  }

  .tile::before {
    /* Strong primary glow filling the center area. Gives the dark tile
       saturated color so it doesn't read as a hole in light Chrome Web
       Store browse layouts, while the dark edges keep the frame defined. */
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse at center,
      color-mix(in oklch, var(--primary) 55%, transparent) 0%,
      color-mix(in oklch, var(--primary) 20%, transparent) 35%,
      transparent 70%
    );
    z-index: 0;
  }

  .content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }

  .lockup {
    display: flex;
    align-items: center;
    gap: 18px;
  }

  .logo {
    width: 80px;
    height: 80px;
    flex-shrink: 0;
    /* Subtle drop-shadow lifts the transparent icon off the glowy background
       so it reads as a distinct mark, not a wash. */
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4));
  }

  .wordmark {
    font-size: 52px;
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1;
    color: white;
  }

  .sub {
    font-size: 18px;
    font-weight: 500;
    letter-spacing: 0.02em;
    color: rgba(255, 255, 255, 0.7);
  }
</style>
