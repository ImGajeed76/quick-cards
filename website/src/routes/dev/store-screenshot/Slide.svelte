<script lang="ts" module>
  type Kind = "banner-page" | "hero" | "hung";
  export type SlideData = {
    eyebrow: string;
    headline: string;
    subtitle: string;
    image: string;
    kind: Kind;
    tabsCount?: number;
    accent?: string;
  };

  export const SLIDES: Record<string, SlideData> = {
    banner: {
      eyebrow: "FLOATING WIDGET",
      headline: "Copy without opening the popup",
      subtitle: "A small bar appears on flashcard pages. Card count and one-tap copy.",
      image: "/dev/banner.png",
      kind: "banner-page",
      accent: "Copy",
    },
    export: {
      eyebrow: "EXPORT",
      headline: "Six exports, one click",
      subtitle: "TXT, CSV, JSON, two PDF layouts, Anki .apkg, or straight into Knowt.",
      image: "/dev/popup-export.png",
      kind: "hung",
      tabsCount: 1,
      accent: "Six",
    },
    anki: {
      eyebrow: "ANKI",
      headline: "Hit your deadline",
      subtitle: "Pick a date. Get an Anki deck that paces you there.",
      image: "/dev/popup-anki.png",
      kind: "hero",
      accent: "deadline",
    },
    knowt: {
      eyebrow: "KNOWT",
      headline: "Straight into your Knowt account",
      subtitle: "Uses the Knowt session you already have. No API keys, no 100-card cap.",
      image: "/dev/popup-knowt.png",
      kind: "hero",
    },
    merge: {
      eyebrow: "MERGE",
      headline: "Many tabs, one export",
      subtitle: "Combine open Quizlet tabs into one export. Drop duplicates if you want.",
      image: "/dev/popup-merge.png",
      kind: "hung",
      tabsCount: 3,
      accent: "one",
    },
  };

  export const SLUGS = Object.keys(SLIDES);
</script>

<script lang="ts">
  let { slug }: { slug: string } = $props();

  function splitHeadline(headline: string, accent?: string): string[] {
    if (!accent) return [headline, "", ""];
    const idx = headline.indexOf(accent);
    if (idx === -1) return [headline, "", ""];
    return [headline.slice(0, idx), accent, headline.slice(idx + accent.length)];
  }

  const slide = $derived(SLIDES[slug]);
  const tabs = $derived(Array.from({ length: slide.tabsCount ?? 1 }));
  const cards = Array.from({ length: 6 });
  const headlineParts = $derived(splitHeadline(slide.headline, slide.accent));
</script>

<div class="slide" data-slide data-kind={slide.kind}>
  <div class="copy">
    <div class="eyebrow">{slide.eyebrow}</div>
    <h1>{headlineParts[0]}<span class="accent">{headlineParts[1]}</span>{headlineParts[2]}</h1>
    <p>{slide.subtitle}</p>
  </div>

  {#if slide.kind === "banner-page"}
    <!-- Page-only frame: the floating widget lives on a flashcard set
         page. Title bar, 2x3 mode grid, big study card. No branding,
         just the recognizable shape. The banner sits over the study
         card in the bottom-right corner because that's where it
         really lives, as a viewport overlay above the content. -->
    <div class="page-frame">
      <div class="page-title"></div>
      <div class="mode-grid">
        {#each cards as _, i (i)}
          <div class="mode-btn">
            <span class="mode-icon"></span>
            <span class="mode-label"></span>
          </div>
        {/each}
      </div>
      <div class="study-card">
        <span class="study-word"></span>
      </div>
      <img src={slide.image} alt="" class="banner" />
    </div>
  {/if}

  {#if slide.kind === "hung"}
    <!-- Hung frame: shows the toolbar so the QC icon (popup trigger) is
         visible. Page area below the toolbar fades out. The popup is a
         sibling of the frame so the mask doesn't dim it. -->
    <div class="hung-frame">
      <div class="tab-row">
        <div class="dots">
          <span class="dot dot-r"></span>
          <span class="dot dot-y"></span>
          <span class="dot dot-g"></span>
        </div>
        {#each tabs as _, i (i)}
          <div class="tab" class:active={i === 0}>
            <span class="tab-dot"></span>
            <span class="tab-line"></span>
          </div>
        {/each}
      </div>
      <div class="url-row">
        <span class="nav-btn"></span>
        <span class="nav-btn"></span>
        <div class="urlbar"></div>
        <div class="ext-cluster">
          <span class="ext"></span>
          <span class="ext"></span>
          <span class="ext-qc">
            <img src="/favicon-48.png" alt="" />
          </span>
          <span class="avatar"></span>
        </div>
      </div>
      <div class="hung-page"></div>
    </div>
    <img src={slide.image} alt="" class="popup" />
  {/if}

  {#if slide.kind === "hero"}
    <img src={slide.image} alt="" class="popup-hero" data-pop={slug} />
  {/if}
</div>

<style>
  /* Slide canvas, locked to 1280x800 so DevTools "Capture node screenshot"
     exports at the exact dimensions the Chrome Web Store expects. */

  .slide {
    width: 1280px;
    height: 800px;
    box-sizing: border-box;
    background: var(--background);
    color: var(--foreground);
    position: relative;
    overflow: hidden;
    isolation: isolate;
  }

  .slide::before {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle at 75% 65%,
      color-mix(in oklch, var(--primary) 22%, transparent),
      transparent 55%
    );
    z-index: 0;
    pointer-events: none;
  }

  .copy {
    position: absolute;
    top: 50%;
    left: 96px;
    transform: translateY(-50%);
    width: 480px;
    z-index: 4;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  .eyebrow {
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.14em;
    color: var(--muted-foreground);
    text-transform: uppercase;
  }
  h1 {
    font-size: 56px;
    font-weight: 600;
    line-height: 1.05;
    letter-spacing: -0.025em;
    color: var(--foreground);
    margin: 0;
  }
  h1 .accent {
    color: var(--primary);
  }
  .copy p {
    font-size: 20px;
    line-height: 1.5;
    color: var(--muted-foreground);
    margin: 0;
    max-width: 32ch;
  }

  /* === BANNER-PAGE slide === */

  .page-frame {
    position: absolute;
    top: 120px;
    left: 624px;
    width: 592px;
    height: 560px;
    border-radius: 16px;
    border: 1px solid var(--border);
    background: color-mix(in oklch, var(--card) 50%, var(--background));
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
    overflow: hidden;
    z-index: 1;
  }
  .page-title {
    position: absolute;
    top: 36px;
    left: 36px;
    width: 220px;
    height: 24px;
    border-radius: 6px;
    background: color-mix(in oklch, var(--muted-foreground) 30%, transparent);
  }
  .mode-grid {
    position: absolute;
    top: 84px;
    left: 36px;
    right: 36px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: 56px 56px;
    gap: 12px;
  }
  .mode-btn {
    border-radius: 10px;
    background: color-mix(in oklch, var(--muted-foreground) 8%, transparent);
    border: 1px solid color-mix(in oklch, var(--muted-foreground) 14%, transparent);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 16px;
  }
  .mode-icon {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    background: color-mix(in oklch, var(--muted-foreground) 30%, transparent);
    flex-shrink: 0;
  }
  .mode-label {
    flex: 1;
    height: 8px;
    border-radius: 3px;
    background: color-mix(in oklch, var(--muted-foreground) 28%, transparent);
  }
  .study-card {
    position: absolute;
    top: 228px;
    left: 36px;
    right: 36px;
    bottom: 36px;
    border-radius: 14px;
    background: color-mix(in oklch, var(--muted-foreground) 8%, transparent);
    border: 1px solid color-mix(in oklch, var(--muted-foreground) 12%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .study-word {
    width: 180px;
    height: 28px;
    border-radius: 6px;
    background: color-mix(in oklch, var(--muted-foreground) 36%, transparent);
  }
  .banner {
    position: absolute;
    bottom: 28px;
    right: 28px;
    height: 68px;
    width: auto;
    border-radius: 10px;
    box-shadow: 0 14px 36px rgba(0, 0, 0, 0.55);
  }

  /* === HUNG slide (export, merge) === */

  .hung-frame {
    position: absolute;
    top: 24px;
    left: 580px;
    width: 700px;
    height: 600px;
    border-radius: 16px;
    border: 1px solid var(--border);
    background: var(--card);
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
    overflow: hidden;
    z-index: 1;
    mask-image: linear-gradient(to bottom, black 0%, black 28%, transparent 88%);
    -webkit-mask-image: linear-gradient(to bottom, black 0%, black 28%, transparent 88%);
  }
  .tab-row {
    display: flex;
    align-items: flex-end;
    gap: 6px;
    height: 38px;
    padding: 0 18px;
    background: color-mix(in oklch, var(--card) 80%, var(--background));
  }
  .dots {
    display: flex;
    gap: 7px;
    align-self: center;
    margin-right: 10px;
    margin-bottom: 4px;
  }
  .dot {
    width: 11px;
    height: 11px;
    border-radius: 50%;
  }
  .dot-r {
    background: #ff5f57;
  }
  .dot-y {
    background: #febc2e;
  }
  .dot-g {
    background: #28c840;
  }
  .tab {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 30px;
    padding: 0 12px;
    border-radius: 8px 8px 0 0;
    background: color-mix(in oklch, var(--background) 35%, transparent);
    width: 150px;
    overflow: hidden;
  }
  .tab.active {
    background: color-mix(in oklch, var(--card) 95%, var(--background));
    border: 1px solid var(--border);
    border-bottom: none;
  }
  .tab-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: color-mix(in oklch, var(--muted-foreground) 50%, transparent);
    flex-shrink: 0;
  }
  .tab-line {
    flex: 1;
    height: 6px;
    border-radius: 3px;
    background: color-mix(in oklch, var(--muted-foreground) 28%, transparent);
  }
  .url-row {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 50px;
    padding: 0 18px;
    background: color-mix(in oklch, var(--card) 70%, var(--background));
    border-bottom: 1px solid var(--border);
  }
  .nav-btn {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: color-mix(in oklch, var(--muted-foreground) 18%, transparent);
    flex-shrink: 0;
  }
  .urlbar {
    flex: 0 0 auto;
    width: 280px;
    height: 28px;
    border-radius: 8px;
    background: color-mix(in oklch, var(--background) 70%, transparent);
    margin-left: 4px;
  }
  .ext-cluster {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ext {
    width: 26px;
    height: 26px;
    border-radius: 6px;
    background: color-mix(in oklch, var(--muted-foreground) 24%, transparent);
  }
  .ext-qc {
    width: 32px;
    height: 32px;
    border-radius: 7px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in oklch, var(--primary) 22%, transparent);
    box-shadow: 0 0 0 2px var(--primary);
  }
  .ext-qc img {
    width: 22px;
    height: 22px;
    border-radius: 4px;
    display: block;
  }
  .avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: color-mix(in oklch, var(--muted-foreground) 30%, transparent);
    margin-left: 4px;
  }
  .hung-page {
    flex: 1;
    background: color-mix(in oklch, var(--card) 30%, var(--background));
  }
  .popup {
    position: absolute;
    top: 116px;
    right: 24px;
    width: 360px;
    height: auto;
    border-radius: 14px;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55);
    z-index: 3;
    display: block;
  }

  /* === HERO slide (anki, knowt) === */

  .popup-hero {
    position: absolute;
    border-radius: 14px;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55);
    z-index: 3;
    display: block;
    height: auto;
  }
  .popup-hero[data-pop="anki"] {
    width: 400px;
    top: 58px;
    left: 720px;
  }
  .popup-hero[data-pop="knowt"] {
    width: 507px;
    top: 127px;
    left: 666px;
  }
</style>
