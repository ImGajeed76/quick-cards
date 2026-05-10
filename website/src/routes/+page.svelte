<script lang="ts">
  import { onMount } from "svelte";
  import { resolve } from "$app/paths";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import {
    ArrowRight,
    ChevronDown,
    ChevronRight,
    Download,
    Puzzle,
    ClipboardPaste,
    FileText,
  } from "@lucide/svelte";
  import Github from "$lib/components/icons/Github.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import PdfFlashcardsPreview from "$lib/components/mockups/PdfFlashcardsPreview.svelte";
  import PdfListPreview from "$lib/components/mockups/PdfListPreview.svelte";
  import AnkiCardsPreview from "$lib/components/mockups/AnkiCardsPreview.svelte";
  import { track } from "$lib/analytics";
  import { reveal } from "$lib/actions/reveal";
  import { nextExample, FORMAT_LABELS, type Example } from "$lib/demo";
  import { formatCards, toCsv } from "$lib/export/formatting";
  import { SITE_NAME, SITE_URL, SITE_TAGLINE, CWS_URL } from "$lib/site";

  const title = `${SITE_NAME} · ${SITE_TAGLINE}`;
  const description =
    "Two free, open-source tools for getting your flashcards anywhere they need to go. Browser extension for Quizlet, web tool for any pasted data. Export to Anki (.apkg), PDF, CSV, JSON, or import straight into Knowt.";

  function trackInstallClick(source: string): void {
    track("Install CTA click", { source });
  }

  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BrowserApplication",
    operatingSystem: "Chrome, Edge, Brave, Opera",
    url: SITE_URL,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/favicon-128.png`,
    sameAs: ["https://github.com/ImGajeed76/quick-cards"],
  };

  // JSON-LD tag strings, built here because template literals inside @html
  // trip the svelte-eslint parser. The backslash escape on the close tag
  // stops the parser from treating the literal tokens as a second component
  // block (no effect at runtime).
  /* eslint-disable no-useless-escape */
  const appJsonLdHtml = `<script type="application/ld+json">${JSON.stringify(appJsonLd)}<\/script>`;
  const orgJsonLdHtml = `<script type="application/ld+json">${JSON.stringify(orgJsonLd)}<\/script>`;
  /* eslint-enable no-useless-escape */

  let { data } = $props();

  // svelte-ignore state_referenced_locally
  let displayStars = $state<number | null>(data.stars);

  // Stars count-up. Only animate when the number is large enough that
  // counting is actually visible. Otherwise just show the final value.
  onMount(() => {
    const initial = data.stars;
    if (initial === null || initial < 4) return;
    const target: number = initial;

    displayStars = 0;
    const duration = 800;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      displayStars = Math.round(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  function formatStars(n: number): string {
    if (n < 1000) return n.toString();
    const k = n / 1000;
    return (Math.round(k * 10) / 10).toString().replace(/\.0$/, "") + "k";
  }

  function scrollToAbout() {
    document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
  }

  // Bordered-hover glow: update per-card CSS vars on every mouse move in
  // the section so each card's ::after gradient tracks the cursor. The
  // glow is shown for every card while the cursor is anywhere in the
  // section, no flicker between cards.
  function handleGuideMove(event: MouseEvent): void {
    const container = event.currentTarget as HTMLElement;
    for (const card of container.querySelectorAll<HTMLElement>(".guide-card")) {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mouse-x", `${event.clientX - rect.left}px`);
      card.style.setProperty("--mouse-y", `${event.clientY - rect.top}px`);
    }
  }

  // ── Demo cycle ───────────────────────────────────────────────────────
  let currentExample = $state<Example>(nextExample());
  let demoVisible = $state(true);
  let demoHover = $state(false);
  let previewOpen = $state(false);
  let previewFormat = $state<"txt" | "csv" | "json" | "pdf-list" | "pdf-cards" | "anki" | null>(
    null,
  );

  // Tokens for the word-by-word blur animation, splits on whitespace,
  // keeping the whitespace as separators so layout (spaces, newlines) is
  // preserved. Only the non-whitespace tokens animate.
  const tokenized = $derived(
    (() => {
      const parts = currentExample.text.split(/(\s+)/);
      let wordIdx = 0;
      return parts.map((part) => {
        const isWord = part.length > 0 && !/^\s+$/.test(part);
        return { text: part, isWord, idx: isWord ? wordIdx++ : -1 };
      });
    })(),
  );

  const cyclePaused = $derived(demoHover || previewOpen);

  onMount(() => {
    const DISPLAY_MS = 4500;
    const FADE_MS = 320;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function schedule() {
      timer = setTimeout(() => {
        if (cyclePaused || document.visibilityState === "hidden") {
          schedule();
          return;
        }
        demoVisible = false;
        timer = setTimeout(() => {
          currentExample = nextExample(currentExample);
          demoVisible = true;
          schedule();
        }, FADE_MS);
      }, DISPLAY_MS);
    }

    schedule();
    return () => {
      if (timer) clearTimeout(timer);
    };
  });

  // Preview content generation — reuses the same formatters that produce
  // real downloads on /process, so visitors see exactly what they'd get.
  const previewSet = $derived({
    id: "preview",
    title: "Example set",
    description: "",
    cards: currentExample.pairs,
  });

  const previewText = $derived.by(() => {
    if (previewFormat === "txt") return formatCards(previewSet, "\t", "\n");
    if (previewFormat === "csv") return toCsv(previewSet);
    if (previewFormat === "json") return JSON.stringify(previewSet, null, 2);
    return "";
  });

  // Syntax-tinted HTML for the CSV / JSON previews. Content is generated
  // from our own demo data (no user input), so direct {@html} injection
  // is safe. For CSV: header row in muted, commas tinted primary, term
  // and def cells in foreground / muted-foreground respectively. For
  // JSON: object keys tinted primary, string values in muted-foreground.
  const previewHtml = $derived.by(() => {
    if (previewFormat === "csv") {
      const lines = previewText.split("\n");
      return lines
        .map((line, lineIdx) => {
          const cells = line.split(",");
          const isHeader = lineIdx === 0;
          return cells
            .map((cell, cellIdx) => {
              if (isHeader) {
                return `<span class="text-muted-foreground/70">${cell}</span>`;
              }
              if (cellIdx === 0) {
                return `<span class="text-foreground">${cell}</span>`;
              }
              return `<span class="text-muted-foreground">${cell}</span>`;
            })
            .join('<span class="text-primary/70">,</span>');
        })
        .join("\n");
    }
    if (previewFormat === "json") {
      return previewText
        .replace(/("[^"\\]*(?:\\.[^"\\]*)*")(\s*:)/g, '<span class="text-primary">$1</span>$2')
        .replace(
          /(:\s*)("[^"\\]*(?:\\.[^"\\]*)*")/g,
          '$1<span class="text-muted-foreground">$2</span>',
        );
    }
    return previewText;
  });

  const previewFilename = $derived(
    previewFormat === "csv"
      ? "cards.csv"
      : previewFormat === "json"
        ? "cards.json"
        : previewFormat === "txt"
          ? "cards.txt"
          : "",
  );

  function openPreview(format: typeof previewFormat) {
    previewFormat = format;
    previewOpen = true;
  }
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <link rel="preconnect" href="https://api.github.com" crossorigin="anonymous" />
  <link rel="dns-prefetch" href="https://plausible.axonotes.ch" />
  <!-- eslint-disable svelte/no-at-html-tags — content is our own JSON.stringify output, no user input -->
  {@html appJsonLdHtml}
  {@html orgJsonLdHtml}
</svelte:head>

<div class="flex flex-col">
  <!-- ══════════════ Hero ══════════════ -->
  <section class="relative flex min-h-[88vh] flex-col">
    <!-- Ambient violet glow -->
    <div
      class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60vh]"
      style="background: radial-gradient(ellipse 60% 70% at 50% 0%, color-mix(in oklch, var(--primary) 22%, transparent), transparent 70%);"
    ></div>

    <!-- Header -->
    <header class="flex items-center justify-end gap-2 px-6 py-5">
      <Button
        variant="outline"
        size="sm"
        href="https://github.com/ImGajeed76/quick-cards"
        class="rounded-full"
        aria-label="GitHub repository"
      >
        <Github />
        {#if displayStars !== null}
          <span class="tabular-nums">{formatStars(displayStars)}</span>
        {/if}
      </Button>
      <Button
        variant="outline"
        size="sm"
        href={CWS_URL}
        onclick={() => trackInstallClick("header")}
        class="rounded-full"
      >
        Get the extension
      </Button>
    </header>

    <!-- Main hero. Brand-first hub. The two distinct surfaces are surfaced
         as parallel CTAs so a visitor can pick the path that fits their
         situation without scrolling. -->
    <main class="flex flex-1 flex-col items-center justify-center px-4 pb-24">
      <div class="w-full max-w-3xl text-center">
        <h1 class="text-5xl font-bold tracking-tight sm:text-6xl">
          Export Cards, <span class="text-primary">quick.</span>
        </h1>
        <p class="text-muted-foreground mx-auto mt-6 max-w-xl text-lg leading-relaxed">
          Extension for Quizlet, web tool for everything else.<br />
          Anki, PDF, CSV, JSON.
        </p>

        <div class="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button
            href={CWS_URL}
            onclick={() => trackInstallClick("home-hero")}
            size="lg"
            class="h-12 gap-2 px-6 text-base"
          >
            <Puzzle class="size-4" />
            Add to Chrome
          </Button>
          <Button
            href={resolve("/tool")}
            variant="outline"
            size="lg"
            class="h-12 gap-2 px-6 text-base"
          >
            <ClipboardPaste class="size-4" />
            Open the web tool
          </Button>
        </div>

        <p class="text-muted-foreground/80 mt-8 font-mono text-xs tracking-wide">
          Free &nbsp;·&nbsp; No account &nbsp;·&nbsp; No upload &nbsp;·&nbsp; Open source
        </p>
      </div>
    </main>

    <!-- Scroll-down hint -->
    <button
      type="button"
      onclick={scrollToAbout}
      aria-label="Learn more"
      class="animate-hint-down text-muted-foreground hover:bg-muted hover:text-foreground absolute bottom-8 left-1/2 inline-flex size-10 -translate-x-1/2 items-center justify-center rounded-full transition-colors"
    >
      <ChevronDown class="size-5" />
    </button>
  </section>

  <!-- ══════════════ Section 1 — Paste → Export demo ══════════════ -->
  <section id="about" class="scroll-mt-8 px-6 py-24 sm:py-32">
    <div class="mx-auto max-w-5xl">
      <div use:reveal class="text-center">
        <h2
          class="inline-flex items-center justify-center gap-3 text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          Paste anything
          <ArrowRight class="text-muted-foreground size-7 shrink-0 sm:size-8" aria-hidden="true" />
          <span class="text-primary">Export anywhere</span>
        </h2>
        <p class="text-muted-foreground mx-auto mt-3 max-w-xl text-[15px] leading-6">
          QuickCards figures out what you pasted.<br />
          Export to PDF, Anki, TXT, CSV, or JSON.
        </p>
      </div>

      <div
        use:reveal={{ delay: 120 }}
        class="demo-wrap mt-14"
        onmouseenter={() => (demoHover = true)}
        onmouseleave={() => (demoHover = false)}
        role="region"
        aria-label="Paste to export demo"
      >
        <div class="demo-grid">
          <!-- Left: cycling input -->
          <div class="demo-panel">
            <div class="demo-panel-label">
              Paste
              <span class="demo-format-pill">{FORMAT_LABELS[currentExample.format]}</span>
            </div>
            <div class="demo-input" class:fading={!demoVisible}>
              {#key currentExample.text}
                <pre class="demo-code">{#each tokenized as t, i (i)}{#if t.isWord}<span
                        class="token"
                        style="animation-delay: {t.idx * 55}ms">{t.text}</span
                      >{:else}<span class="ws">{t.text}</span>{/if}{/each}</pre>
              {/key}
            </div>
          </div>

          <!-- Right: canonical output -->
          <div class="demo-panel">
            <div class="demo-panel-label">Gets you</div>
            <div class="demo-output" class:fading={!demoVisible}>
              <div class="demo-card-list">
                {#each currentExample.pairs as p, i (i)}
                  <div class="demo-card-row">
                    <span class="demo-term">{p.term}</span>
                    <span class="demo-def">{p.definition}</span>
                  </div>
                {/each}
              </div>
              <div class="demo-exports">
                <button type="button" class="demo-export-btn" onclick={() => openPreview("txt")}>
                  <Download class="size-3.5" /> TXT
                </button>
                <button type="button" class="demo-export-btn" onclick={() => openPreview("csv")}>
                  <Download class="size-3.5" /> CSV
                </button>
                <button type="button" class="demo-export-btn" onclick={() => openPreview("json")}>
                  <Download class="size-3.5" /> JSON
                </button>
                <button
                  type="button"
                  class="demo-export-btn"
                  onclick={() => openPreview("pdf-list")}
                >
                  <Download class="size-3.5" /> PDF · Vocab list
                </button>
                <button
                  type="button"
                  class="demo-export-btn"
                  onclick={() => openPreview("pdf-cards")}
                >
                  <Download class="size-3.5" /> PDF · Flashcards
                </button>
                <button type="button" class="demo-export-btn" onclick={() => openPreview("anki")}>
                  <Download class="size-3.5" /> Anki .apkg
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p use:reveal class="text-muted-foreground/70 mt-10 text-center text-xs">
        Recognizes vocab lists, JSON, CSV, TSV, Markdown, TOML, and more.
      </p>
    </div>
  </section>

  <!-- Demo preview dialog — shows what each format actually looks like. -->
  <Dialog.Root bind:open={previewOpen}>
    <Dialog.Content class="sm:max-w-2xl">
      <Dialog.Header>
        <Dialog.Title>
          {#if previewFormat === "txt"}TXT preview{/if}
          {#if previewFormat === "csv"}CSV preview{/if}
          {#if previewFormat === "json"}JSON preview{/if}
          {#if previewFormat === "pdf-list"}PDF · Vocab list{/if}
          {#if previewFormat === "pdf-cards"}PDF · Flashcards{/if}
          {#if previewFormat === "anki"}Anki .apkg export{/if}
        </Dialog.Title>
        <Dialog.Description>
          {#if previewFormat === "txt" || previewFormat === "csv" || previewFormat === "json"}
            Exactly what would land in your file. Your separators, your cards, nothing else.
          {:else if previewFormat === "pdf-list"}
            Violet-themed table with auto-wrapping and page breaks. Prints beautifully.
          {:else if previewFormat === "pdf-cards"}
            2×4 A4 grid, double-sided with mirrored backs. Print, fold, study.
          {:else if previewFormat === "anki"}
            Two decks (flashcards + typing). Optional deadline-mode preset, or use Anki's defaults.
          {/if}
        </Dialog.Description>
      </Dialog.Header>

      <div class="preview-body">
        {#if previewFormat === "txt" || previewFormat === "csv" || previewFormat === "json"}
          <div class="preview-file">
            <div class="preview-file-chrome">
              <FileText class="size-3.5 shrink-0" />
              <span class="font-mono">{previewFilename}</span>
            </div>
            {#if previewFormat === "txt"}
              <pre class="preview-code">{previewText}</pre>
            {:else if previewFormat === "csv"}
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              <pre class="preview-code">{@html previewHtml}</pre>
            {:else}
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              <pre class="preview-code preview-code-fade">{@html previewHtml}</pre>
            {/if}
          </div>
        {:else if previewFormat === "pdf-list"}
          <PdfListPreview
            title="Example set"
            cards={currentExample.pairs}
            padFrom={currentExample.pool}
          />
        {:else if previewFormat === "pdf-cards"}
          <PdfFlashcardsPreview cards={currentExample.pairs} padFrom={currentExample.pool} />
        {:else if previewFormat === "anki"}
          <div class="preview-anki">
            <AnkiCardsPreview cards={currentExample.pairs} />
            <div class="preview-anki-info">
              <div class="preview-anki-stat">
                <span class="preview-anki-label">Two decks:</span>
              </div>
              <ul class="preview-anki-list">
                <li>Flashcards (both directions), {currentExample.pairs.length * 2} cards</li>
                <li>Typing (both directions), up to {currentExample.pairs.length * 2} cards</li>
              </ul>
              <div class="preview-anki-meta">
                Optional deadline-mode preset for tight deadlines, or use Anki's defaults. Useful
                under two weeks. Anecdotal, not science-backed.
              </div>
            </div>
          </div>
        {/if}
      </div>
    </Dialog.Content>
  </Dialog.Root>

  <!-- ══════════════ Anti-feature strip ══════════════
       Replaces the "Four things worth knowing" feature grid which was the
       most generic moment on the site. Single-line, four short callouts,
       inline mono labels, no card containers. Communicates the same trust
       points (in-browser, shareable, open source) in a quarter the height. -->
  <section class="px-6 py-16 sm:py-20">
    <div class="mx-auto max-w-5xl">
      <div
        class="text-muted-foreground/80 grid grid-cols-2 gap-x-8 gap-y-4 font-mono text-xs sm:grid-cols-4 sm:text-sm"
      >
        <div class="flex flex-col gap-1">
          <span class="text-primary text-[10px] tracking-wider uppercase">runs in</span>
          <span class="text-foreground/90">your browser</span>
          <span class="text-muted-foreground/70 font-sans text-[11px] leading-snug">
            No server, no upload, no account.
          </span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-primary text-[10px] tracking-wider uppercase">shared via</span>
          <span class="text-foreground/90">private links</span>
          <span class="text-muted-foreground/70 font-sans text-[11px] leading-snug">
            Compressed into the URL fragment. Never reaches our server.
          </span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-primary text-[10px] tracking-wider uppercase">licensed</span>
          <span class="text-foreground/90">MIT, on GitHub</span>
          <span class="text-muted-foreground/70 font-sans text-[11px] leading-snug">
            <a
              href="https://github.com/ImGajeed76/quick-cards"
              class="text-foreground hover:text-primary underline-offset-2 hover:underline"
            >
              View source</a
            >. Fork it, send a PR.
          </span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-primary text-[10px] tracking-wider uppercase">priced at</span>
          <span class="text-foreground/90">$0, forever</span>
          <span class="text-muted-foreground/70 font-sans text-[11px] leading-snug">
            No "free for students," no trials. Just free.
          </span>
        </div>
      </div>
    </div>
  </section>

  <!-- ══════════════ Section 3 — Extension ══════════════ -->
  <section id="extension" class="scroll-mt-8 px-6 py-24 sm:py-32">
    <div class="mx-auto max-w-4xl">
      <div use:reveal class="border-border rounded-lg border p-8 sm:p-12">
        <div class="grid items-center gap-10 sm:grid-cols-[1fr_auto]">
          <div>
            <span
              class="text-muted-foreground mb-3 inline-block font-mono text-xs tracking-wider uppercase"
            >
              Browser extension
            </span>
            <h2 class="text-3xl font-semibold tracking-tight">On Quizlet? Skip the paste step.</h2>
            <p class="text-muted-foreground mt-4 text-[15px] leading-7">
              The extension runs on quizlet.com pages and exports the open set with one click. Anki
              deck file (.apkg) with images and audio bundled, printable PDF, CSV, JSON, or direct
              import into Knowt using your existing session. Optionally merges multiple open Quizlet
              tabs into one deck, with deduplication.
            </p>
            <div class="mt-6 flex flex-wrap gap-3">
              <Button href={CWS_URL} onclick={() => trackInstallClick("home-body")}>
                <Puzzle />
                Add to Chrome
              </Button>
              <Button variant="outline" href={resolve("/extension")}>
                Read more
                <ArrowRight class="size-4" />
              </Button>
            </div>
          </div>
          <img
            src="/screenshots/floating_banner.png"
            alt="QuickCards floating banner on a Quizlet set page"
            width="619"
            height="277"
            class="border-border mx-auto w-full max-w-sm rounded-md border shadow-xl shadow-black/30"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </div>
  </section>

  <!-- ══════════════ Section 4 — Guides ══════════════
     Editorial link cluster pointing at the topical landing pages. Cards
     use the bordered-hover-glow treatment: the gradient ring tracks the
     cursor across the section. -->
  <!-- onmousemove drives the glow effect; decorative -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <section onmousemove={handleGuideMove} class="guides-section px-6 py-24 sm:py-32">
    <div class="mx-auto max-w-4xl">
      <div use:reveal class="mb-12 max-w-xl">
        <span class="text-muted-foreground mb-3 block font-mono text-xs tracking-wider uppercase">
          Guides
        </span>
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
          Coming from somewhere specific?
        </h2>
        <p class="text-muted-foreground mt-4 leading-relaxed">
          Each guide is a focused walkthrough for a particular starting point: what the workflow
          looks like, what to watch for, and how QuickCards fits.
        </p>
      </div>

      <div use:reveal={{ delay: 80 }} class="guide-grid">
        <a href={resolve("/quizlet-to-anki")} class="guide-card group">
          <div class="guide-card-inner">
            <div class="flex-1">
              <div class="text-foreground text-base font-medium">Quizlet to Anki</div>
              <div class="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                Three methods, fairly compared. Extension recommended for media support.
              </div>
            </div>
            <ChevronRight
              class="text-muted-foreground/50 group-hover:text-primary mt-0.5 size-4 shrink-0 transition-colors"
            />
          </div>
        </a>
        <a href={resolve("/csv-to-anki")} class="guide-card group">
          <div class="guide-card-inner">
            <div class="flex-1">
              <div class="text-foreground text-base font-medium">CSV to Anki</div>
              <div class="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                Spreadsheets, Google Sheets, Excel. No add-on, no field mapping, no encoding issues.
              </div>
            </div>
            <ChevronRight
              class="text-muted-foreground/50 group-hover:text-primary mt-0.5 size-4 shrink-0 transition-colors"
            />
          </div>
        </a>
        <a href={resolve("/chatgpt-flashcards-to-anki")} class="guide-card group">
          <div class="guide-card-inner">
            <div class="flex-1">
              <div class="text-foreground text-base font-medium">ChatGPT flashcards to Anki</div>
              <div class="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                Markdown tables, numbered lists, JSON arrays. Paste straight in, no cleanup.
              </div>
            </div>
            <ChevronRight
              class="text-muted-foreground/50 group-hover:text-primary mt-0.5 size-4 shrink-0 transition-colors"
            />
          </div>
        </a>
        <a href={resolve("/print-flashcards-from-quizlet")} class="guide-card group">
          <div class="guide-card-inner">
            <div class="flex-1">
              <div class="text-foreground text-base font-medium">Print flashcards from Quizlet</div>
              <div class="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                2x4 double-sided PDF with syllable-aware hyphenation. For teachers, parents, and
                offline study.
              </div>
            </div>
            <ChevronRight
              class="text-muted-foreground/50 group-hover:text-primary mt-0.5 size-4 shrink-0 transition-colors"
            />
          </div>
        </a>
      </div>

      <p class="text-muted-foreground/70 mt-8 text-sm">
        Coming from Knowt?
        <a
          href={resolve("/knowt-alternative")}
          class="text-foreground hover:text-primary ml-1 underline-offset-4 hover:underline"
        >
          Read the Knowt comparison
        </a>.
      </p>
    </div>
  </section>

  <SiteFooter />
</div>

<style>
  /* ── Paste → Export demo ───────────────────────────────────────────
	 * Two-column layout on sm+, stacked on mobile. Left is the cycling
	 * input (word-by-word blur reveal), right is the canonical cards +
	 * export buttons. Both fade together between cycles; word stagger
	 * fires on re-mount via {#key}.
	 */

  .demo-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: 1fr;
  }

  @media (min-width: 640px) {
    .demo-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  .demo-panel {
    position: relative;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
    background: color-mix(in oklch, var(--card) 60%, transparent);
    padding: 1rem 1.25rem 1.25rem;
    height: 420px; /* fixed — no resize as content cycles */
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .demo-panel-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted-foreground);
    margin-bottom: 0.75rem;
  }

  .demo-format-pill {
    display: inline-flex;
    align-items: center;
    height: 1.25rem;
    padding: 0 0.5rem;
    border-radius: 9999px;
    background: color-mix(in oklch, var(--primary) 18%, transparent);
    color: var(--primary);
    font-size: 0.675rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: none;
  }

  .demo-input,
  .demo-output {
    flex: 1;
    min-height: 0; /* lets children's overflow work inside a flex parent */
    transition:
      opacity 320ms ease-out,
      filter 320ms ease-out;
  }

  .demo-input {
    overflow: hidden;
  }

  .demo-output {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .demo-input.fading,
  .demo-output.fading {
    opacity: 0;
    filter: blur(6px);
  }

  .demo-code {
    margin: 0;
    font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
    font-size: 0.875rem;
    line-height: 1.6;
    color: var(--foreground);
    white-space: pre-wrap;
    word-break: break-word;
    overflow: hidden;
  }

  .demo-code .token {
    display: inline-block;
    animation: blur-word-in 380ms ease-out both;
  }

  .demo-code .ws {
    white-space: pre;
  }

  @keyframes blur-word-in {
    from {
      filter: blur(8px);
      opacity: 0;
      transform: translateY(2px);
    }
    to {
      filter: blur(0);
      opacity: 1;
      transform: translateY(0);
    }
  }

  .demo-card-list {
    flex: 1;
    min-height: 0; /* allow the list to shrink so exports stay pinned */
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
    overflow-y: auto;
  }

  .demo-card-row {
    display: grid;
    grid-template-columns: 40% 1fr;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    border-bottom: 1px solid var(--border);
  }

  .demo-card-row:last-child {
    border-bottom: none;
  }

  .demo-card-row:nth-child(even) {
    background: color-mix(in oklch, var(--muted) 40%, transparent);
  }

  .demo-term {
    color: var(--foreground);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .demo-def {
    color: var(--muted-foreground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .demo-exports {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.375rem;
  }

  .demo-export-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    height: 2rem;
    padding: 0 0.625rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
    background: transparent;
    color: var(--foreground);
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition:
      background 150ms,
      border-color 150ms,
      color 150ms;
  }

  .demo-export-btn:hover {
    background: var(--muted);
    border-color: var(--input);
  }

  /* ── Preview dialog body ──────────────────────────────────────────── */

  .preview-body {
    max-height: 60vh;
    overflow: auto;
  }

  /* File-chrome wrapper around the text-format previews so TXT / CSV /
     JSON read as actual files (filename in mono, file-icon header) and
     not just textareas. The chrome bar is shared across all three. */
  .preview-file {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--muted);
  }
  .preview-file-chrome {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.875rem;
    border-bottom: 1px solid var(--border);
    background: var(--card);
    color: var(--muted-foreground);
    font-size: 0.75rem;
  }

  .preview-code {
    margin: 0;
    padding: 1rem;
    font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
    font-size: 0.8125rem;
    line-height: 1.6;
    color: var(--foreground);
    background: transparent;
    white-space: pre-wrap;
    word-break: break-word;
    overflow-x: hidden;
  }

  /* JSON variant: cap the visible height and fade the bottom inside
     the file frame. When the JSON is short, the fade falls in empty
     whitespace and is invisible. When it's long, the bottom rows fade
     into the file's muted bg, signalling "there's more". */
  .preview-code-fade {
    max-height: 22rem;
    overflow: hidden;
    mask-image: linear-gradient(to bottom, black 75%, transparent);
    -webkit-mask-image: linear-gradient(to bottom, black 75%, transparent);
  }

  .preview-anki {
    display: grid;
    gap: 1.5rem;
  }

  @media (min-width: 640px) {
    .preview-anki {
      grid-template-columns: 1fr 1fr;
      align-items: center;
    }
  }

  .preview-anki-info {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    font-size: 0.875rem;
  }

  .preview-anki-label {
    font-weight: 600;
    color: var(--foreground);
  }

  .preview-anki-list {
    margin: 0;
    padding-left: 1.25rem;
    color: var(--muted-foreground);
    line-height: 1.7;
  }

  .preview-anki-meta {
    padding-top: 0.5rem;
    border-top: 1px solid var(--border);
    color: var(--muted-foreground);
    font-size: 0.8125rem;
  }

  /* Bordered hover-glow for the Guides cluster.
   * Each card uses a thin gradient ring that tracks the cursor; the ring
   * is shown for every card when the cursor is anywhere in the section,
   * so the eye doesn't see it flicker between cards. */

  .guide-grid {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: 1fr;
  }

  @media (min-width: 640px) {
    .guide-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  .guide-card {
    position: relative;
    border-radius: var(--radius-lg);
    background: var(--border);
    isolation: isolate;
    overflow: hidden;
    text-decoration: none;
    color: inherit;
  }

  .guide-card::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: radial-gradient(
      320px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
      color-mix(in oklch, var(--primary) 75%, transparent),
      transparent 45%
    );
    opacity: 0;
    transition: opacity 500ms ease-out;
    pointer-events: none;
    z-index: 1;
  }

  .guides-section:hover .guide-card::after {
    opacity: 1;
  }

  .guide-card-inner {
    position: relative;
    z-index: 2;
    margin: 1px;
    min-height: calc(100% - 2px);
    background: var(--card);
    border-radius: calc(var(--radius-lg) - 1px);
    padding: 1.25rem;
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    box-sizing: border-box;
  }
</style>
