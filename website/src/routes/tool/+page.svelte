<script lang="ts">
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import { Textarea } from "$lib/components/ui/textarea";
  import Github from "$lib/components/icons/Github.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import { reveal } from "$lib/actions/reveal";
  import { track } from "$lib/analytics";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { ArrowRight, ChevronRight, Play } from "@lucide/svelte";
  import { parseInput } from "$lib/parse";
  import { encodePayload, type SharePayload } from "$lib/share";
  import { generateSetId, saveSet } from "$lib/storage";
  import { SITE_NAME, SITE_URL, CWS_URL } from "$lib/site";

  const title = `${SITE_NAME} tool · Convert flashcard data to Anki, PDF, CSV, JSON`;
  const description =
    "Paste a vocab list, CSV, TSV, JSON, Markdown table, or ChatGPT output. Get an Anki deck file (.apkg), printable PDF flashcards, CSV, JSON, or TXT. Free, no account, in your browser, open source.";

  let value = $state("");
  let error = $state<string | null>(null);
  let activeExample = $state<string | null>(null);
  // Default to Ctrl so SSR-rendered HTML doesn't claim Mac. Flip to ⌘
  // client-side when we can actually inspect the user's platform.
  let isMac = $state(false);
  const canContinue = $derived(value.trim().length > 0);

  onMount(() => {
    isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  });

  // Real example payloads. Clicking a chip fills the textarea so the user can
  // try the converter without typing anything. Examples are intentionally on
  // the same topic across formats so the result is identical.
  const examples = {
    markdown: `| Term | Definition |
| --- | --- |
| Photosynthesis | Plants convert sunlight into chemical energy |
| Mitosis | Cell division producing two identical daughter cells |
| Osmosis | Water diffusing across a semipermeable membrane |
| Cytoplasm | Gel-like substance filling a cell |`,
    csv: `term,definition
Photosynthesis,Plants convert sunlight into chemical energy
Mitosis,Cell division producing two identical daughter cells
Osmosis,Water diffusing across a semipermeable membrane
Cytoplasm,Gel-like substance filling a cell`,
    list: `Photosynthesis
Plants convert sunlight into chemical energy

Mitosis
Cell division producing two identical daughter cells

Osmosis
Water diffusing across a semipermeable membrane

Cytoplasm
Gel-like substance filling a cell`,
    json: `[
  {"term": "Photosynthesis", "definition": "Plants convert sunlight into chemical energy"},
  {"term": "Mitosis", "definition": "Cell division producing two identical daughter cells"},
  {"term": "Osmosis", "definition": "Water diffusing across a semipermeable membrane"},
  {"term": "Cytoplasm", "definition": "Gel-like substance filling a cell"}
]`,
  } as const;

  const placeholder = `Paste here. Anything that looks like cards.

A vocab list, a Markdown table from ChatGPT, a CSV from Sheets, JSON, you name it.

Or click an example below.`;

  function loadExample(key: keyof typeof examples): void {
    value = examples[key];
    activeExample = key;
    track("Tool example loaded", { format: key });
  }

  function onKeydown(e: KeyboardEvent): void {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canContinue) {
      e.preventDefault();
      handleContinue();
    }
  }

  async function handleContinue(): Promise<void> {
    if (!canContinue) return;
    error = null;
    const result = parseInput(value);
    track("Continue", { kind: result.kind, source: "tool" });

    if (result.kind === "vocab") {
      // Vocab path: save the set to IndexedDB and navigate with the
      // short ID in the URL fragment. The fragment never reaches Vercel,
      // so the ID stays purely client-side.
      const id = generateSetId();
      await saveSet({
        id,
        title: "",
        description: "",
        cards: result.pairs,
      });
      // eslint-disable-next-line svelte/no-navigation-without-resolve
      await goto(resolve("/process") + `#d=${id}`);
      return;
    }

    if (result.kind === "quizlet") {
      // Quizlet path: not persisted. Carry the URL refs in the fragment
      // (lz-string blob) since /process handles them transiently.
      const payload: SharePayload = { kind: "quizlet", sets: result.sets };
      const encoded = encodePayload(payload);
      // eslint-disable-next-line svelte/no-navigation-without-resolve
      await goto(resolve("/process") + `#d=${encoded}`);
      return;
    }

    if (result.kind === "unknown") {
      error = result.reason;
      return;
    }

    error = "Paste something first.";
  }

  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${SITE_NAME} (web tool)`,
    applicationCategory: "BrowserApplication",
    operatingSystem: "Any browser",
    url: `${SITE_URL}/tool`,
    description,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    featureList: [
      "Paste vocab lists, CSV, TSV, JSON, JSON Lines, Markdown tables, TOML",
      "Auto-detect 15+ separator styles",
      "Export to Anki .apkg, printable PDF flashcards, vocab list PDF, CSV, JSON, TXT",
      "Runs entirely in the browser, no upload",
      "Free and open source under MIT",
    ],
  };
  const howtoJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Convert pasted flashcard data to Anki, PDF, CSV, or JSON",
    description:
      "Paste vocab list, CSV, JSON, or Markdown table data into the QuickCards web tool, review the parsed cards, then export to Anki .apkg, PDF, CSV, JSON, or TXT.",
    totalTime: "PT1M",
    step: [
      {
        "@type": "HowToStep",
        name: "Paste your flashcard data",
        text: "Paste a vocab list, CSV, TSV, JSON, JSON Lines, Markdown table, TOML, or anything that looks like term/definition pairs.",
      },
      {
        "@type": "HowToStep",
        name: "Review the parsed cards",
        text: "QuickCards auto-detects the format. Edit cards inline if anything needs adjusting.",
      },
      {
        "@type": "HowToStep",
        name: "Pick an output format",
        text: "Choose Anki .apkg, printable PDF flashcards, vocab list PDF, CSV, JSON, or TXT from the export sidebar.",
      },
      {
        "@type": "HowToStep",
        name: "Download",
        text: "The file is generated entirely in your browser and saved to your downloads folder.",
      },
    ],
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Web tool",
        item: `${SITE_URL}/tool`,
      },
    ],
  };
  /* eslint-disable no-useless-escape */
  const appJsonLdHtml = `<script type="application/ld+json">${JSON.stringify(appJsonLd)}<\/script>`;
  const howtoJsonLdHtml = `<script type="application/ld+json">${JSON.stringify(howtoJsonLd)}<\/script>`;
  const breadcrumbJsonLdHtml = `<script type="application/ld+json">${JSON.stringify(breadcrumbJsonLd)}<\/script>`;
  /* eslint-enable no-useless-escape */

  // Mockup body for the JSON output tile, kept as a string + @html so
  // prettier doesn't reflow inline spans across the <pre>'s preformatted
  // whitespace. Valid JSON; nothing here would fail to parse.
  const jsonMockup = `[
  { <span class="text-primary">"term"</span>: <span class="text-muted-foreground">"ATP"</span>, <span class="text-primary">"definition"</span>: <span class="text-muted-foreground">"energy"</span> },
  { <span class="text-primary">"term"</span>: <span class="text-muted-foreground">"DNA"</span>, <span class="text-primary">"definition"</span>: <span class="text-muted-foreground">"genetic code"</span> },
  { <span class="text-primary">"term"</span>: <span class="text-muted-foreground">"Mitosis"</span>, <span class="text-primary">"definition"</span>: <span class="text-muted-foreground">"cell division"</span> }
]`;

  // Mockup body for the CSV/TSV output tile. Plain monospace text with
  // commas tinted primary so the delimiter is visible as syntax, not just
  // punctuation. Same data as the JSON / PDF tiles so the mockups feel
  // like the SAME paste rendered into four files.
  const csvMockup = `<span class="text-muted-foreground/70">term</span><span class="text-primary/70">,</span><span class="text-muted-foreground/70">definition</span>
ATP<span class="text-primary/70">,</span><span class="text-muted-foreground">energy</span>
DNA<span class="text-primary/70">,</span><span class="text-muted-foreground">genetic code</span>
Mitosis<span class="text-primary/70">,</span><span class="text-muted-foreground">cell division</span>
Osmosis<span class="text-primary/70">,</span><span class="text-muted-foreground">water flow</span>`;

  // Easter egg: clicking the foreground PDF page flips it on the Y axis
  // with a game-style lift-rotate-drop, revealing the matching defs.
  // State machine prevents click-spam from interrupting an in-flight flip.
  type PdfFlipState = "idle" | "flipping" | "flipped" | "unflipping";
  let pdfFlipState = $state<PdfFlipState>("idle");

  function togglePdfFlip(): void {
    if (pdfFlipState === "flipping" || pdfFlipState === "unflipping") return;
    if (pdfFlipState === "idle") pdfFlipState = "flipping";
    else if (pdfFlipState === "flipped") pdfFlipState = "unflipping";
  }

  function onPdfFlipEnd(): void {
    if (pdfFlipState === "flipping") pdfFlipState = "flipped";
    else if (pdfFlipState === "unflipping") pdfFlipState = "idle";
  }

  // 8 cards on page 1 (the clickable foreground page).
  const pdfPage1Terms = ["ATP", "DNA", "Mitosis", "Osmosis", "RNA", "Cell", "Gene", "Lipid"];
  // Defs in column-swapped order to match a real Y-axis flip: when paper
  // flips around its vertical centerline, the cell that was top-LEFT lands
  // top-RIGHT on the back side (and vice versa). So row-by-row, the def
  // pairs are swapped relative to the term layout.
  const pdfPage1Defs = [
    "genetic code",
    "energy",
    "water flow",
    "cell division",
    "basic unit",
    "polymer",
    "fat",
    "trait code",
  ];
  // 8 different cards on page 2 (always shown rotated behind, never flipped).
  // These are defs for cards that AREN'T on page 1, so when page 1 flips and
  // shows its own defs, page 2's defs stay visibly distinct in the background.
  const pdfPage2Defs = [
    "sugar",
    "catalyst",
    "storage sac",
    "sunlight site",
    "powerhouse",
    "protein factory",
    "control center",
    "outer wall",
  ];
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <link rel="canonical" href={`${SITE_URL}/tool`} />
  <!-- eslint-disable svelte/no-at-html-tags -->
  {@html appJsonLdHtml}
  {@html howtoJsonLdHtml}
  {@html breadcrumbJsonLdHtml}
</svelte:head>

<div class="bg-background text-foreground flex min-h-screen flex-col">
  <!-- Header -->
  <header
    class="border-foreground/10 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-30 border-b backdrop-blur-md"
  >
    <nav class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-8">
      <a href={resolve("/")} class="flex items-center gap-2 text-base font-semibold tracking-tight">
        <span>{SITE_NAME}</span>
      </a>
      <div class="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          href="https://github.com/ImGajeed76/quick-cards"
          aria-label="GitHub repository"
          class="gap-2"
        >
          <Github class="size-4" />
          <span class="hidden sm:inline">GitHub</span>
        </Button>
        <Button size="sm" href={resolve("/extension")} class="gap-2">
          On Quizlet?
          <ArrowRight class="size-4" />
        </Button>
      </div>
    </nav>
  </header>

  <main class="flex-grow">
    <!-- ════════ Hero: paste box dominates ════════
       Layout puts the box on the right, weighted heavier than the copy on the
       left, so the page reads as "this is the tool" not "this is a page about
       a tool". Example chips below the box feed it directly. -->
    <section class="relative overflow-hidden px-4 pt-10 pb-16 sm:px-6 sm:pt-16 sm:pb-24">
      <div
        aria-hidden="true"
        class="bg-primary pointer-events-none absolute -top-32 right-1/4 -z-10 h-[420px] w-[680px] rounded-full opacity-15 blur-[140px]"
      ></div>

      <div
        class="relative z-10 mx-auto grid max-w-6xl items-start gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12"
      >
        <!-- Left: copy. Intentionally short. -->
        <div class="lg:pt-6">
          <h1
            class="text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl"
          >
            Paste anything. <span class="text-primary">Get cards.</span>
          </h1>
          <p class="text-muted-foreground mt-5 text-lg leading-relaxed">
            CSV, JSON, Markdown, vocab list, ChatGPT output. The parser figures it out. Anki, PDF,
            CSV, JSON come out the other side.
          </p>
          <p class="text-muted-foreground/80 mt-6 font-mono text-xs tracking-wide">
            Free &nbsp;·&nbsp; No account &nbsp;·&nbsp; Nothing uploaded &nbsp;·&nbsp; Open source
          </p>
        </div>

        <!-- Right: the actual tool. -->
        <div>
          <div
            class="border-input bg-card focus-within:border-ring focus-within:ring-ring/50 flex flex-col gap-2 rounded-lg border p-2 shadow-2xl shadow-black/40 transition-[color,box-shadow] focus-within:ring-3"
          >
            <Textarea
              bind:value
              onkeydown={onKeydown}
              rows={11}
              {placeholder}
              spellcheck="false"
              autocapitalize="off"
              autocomplete="off"
              data-gramm="false"
              data-gramm_editor="false"
              data-enable-grammarly="false"
              class="field-sizing-fixed h-[320px] resize-none overflow-y-auto rounded-md border-0 bg-transparent px-3 py-2 font-mono text-[13px] leading-6 shadow-none focus-visible:border-0 focus-visible:ring-0"
            />
            <div class="flex items-center justify-between gap-2 px-1.5 pb-1.5">
              <span class="text-muted-foreground text-xs">
                <kbd class="bg-muted rounded px-1.5 py-0.5 font-mono text-[10px]">
                  {isMac ? "⌘" : "Ctrl"}
                </kbd>
                <span aria-hidden="true">+</span>
                <kbd class="bg-muted rounded px-1.5 py-0.5 font-mono text-[10px]">↵</kbd>
                to convert
              </span>
              <Button onclick={handleContinue} disabled={!canContinue} class="gap-1.5">
                Continue
                <ChevronRight class="size-4" />
              </Button>
            </div>
          </div>

          <!-- Example chips. Each fills the textarea with a real payload. -->
          <div class="mt-4 flex flex-wrap items-center gap-2">
            <span class="text-muted-foreground/70 mr-1 text-xs">try:</span>
            {#each ["markdown", "csv", "list", "json"] as const as key (key)}
              <button
                type="button"
                onclick={() => loadExample(key)}
                class="border-border hover:bg-card hover:border-primary/40 cursor-pointer rounded-md border px-2.5 py-1 font-mono text-xs transition-colors"
                class:border-primary={activeExample === key}
                class:bg-card={activeExample === key}
              >
                {key === "markdown" ? "Markdown table" : ""}
                {key === "csv" ? "CSV" : ""}
                {key === "list" ? "Vocab list" : ""}
                {key === "json" ? "JSON" : ""}
              </button>
            {/each}
          </div>

          {#if error}
            <p class="text-muted-foreground mt-3 text-sm">{error}</p>
          {/if}
        </div>
      </div>
    </section>

    <!-- ════════ "What comes out" ════════
       Inline HTML mockups, four formats. Aim is "you'll get one of these"
       without writing a feature grid. Each is a tiny, on-brand visual. -->
    <section class="px-6 py-16 sm:py-24" use:reveal>
      <div class="mx-auto max-w-5xl">
        <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">What comes out.</h2>
        <p class="text-muted-foreground mt-3 max-w-xl text-[15px] leading-relaxed">
          You pick which file to download. The same paste produces any of these.
        </p>

        <div class="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-4 sm:gap-6">
          <!-- Anki deck mockup: stacked cards. No FRONT/BACK labels.
               Real Anki shows the term, a separator, then the definition,
               nothing else. -->
          <div class="flex flex-col items-center text-center">
            <div class="relative mb-4 h-32 w-full">
              <div
                aria-hidden="true"
                class="border-border bg-card absolute inset-0 -translate-x-2 translate-y-2 -rotate-6 rounded-lg border"
              ></div>
              <div
                aria-hidden="true"
                class="border-border bg-card absolute inset-0 translate-x-1 -translate-y-1 rotate-3 rounded-lg border"
              ></div>
              <div
                class="border-border bg-card relative flex h-full flex-col items-center justify-center rounded-lg border p-3"
              >
                <div class="text-foreground text-[13px] font-semibold">Mitosis</div>
                <span
                  class="text-muted-foreground/70 mt-0.5 flex size-3 items-center justify-center rounded-full bg-white/5"
                >
                  <Play class="size-1.5 fill-current" />
                </span>
                <div class="bg-border/60 my-2 h-px w-3/4"></div>
                <div class="text-muted-foreground text-[10px] leading-tight">
                  Cell divides into two identical cells
                </div>
                <span
                  class="text-muted-foreground/70 mt-0.5 flex size-3 items-center justify-center rounded-full bg-white/5"
                >
                  <Play class="size-1.5 fill-current" />
                </span>
              </div>
            </div>
            <div class="text-foreground text-sm font-medium">Anki .apkg</div>
            <div class="text-muted-foreground mt-0.5 text-xs">deck file</div>
          </div>

          <!-- Printable PDF mockup: two A4-ratio pages stacked like the
               Anki cards. Page 2 sits rotated behind, holding the backs of
               EIGHT DIFFERENT cards (so it reads as a separate sheet, not
               as the back of page 1). Page 1 sits on top, clickable; click
               flips it on the Y axis with a game-style lift-rotate-drop,
               revealing the matching defs. -->
          <div class="flex flex-col items-center text-center">
            <div class="relative mb-4 flex h-32 w-full items-center justify-center">
              <!-- Page 2 (eight unrelated cards' defs): rotated, behind, untouched. -->
              <div
                aria-hidden="true"
                class="absolute aspect-[210/297] h-[94%] -translate-x-2 translate-y-1.5 -rotate-6 rounded-[2px] bg-white/85 p-1 shadow-md shadow-black/25"
              >
                <div class="relative grid h-full grid-cols-2 grid-rows-4">
                  {#each pdfPage2Defs as d, i (i)}
                    <div class="flex items-center justify-center px-0.5">
                      <span class="text-[4px] leading-none text-zinc-500">{d}</span>
                    </div>
                  {/each}
                  <div
                    class="pointer-events-none absolute top-0 bottom-0 left-1/2 -translate-x-px border-l border-dashed border-zinc-400/50"
                  ></div>
                  <div
                    class="pointer-events-none absolute top-1/4 right-0 left-0 -translate-y-px border-t border-dashed border-zinc-400/50"
                  ></div>
                  <div
                    class="pointer-events-none absolute top-2/4 right-0 left-0 -translate-y-px border-t border-dashed border-zinc-400/50"
                  ></div>
                  <div
                    class="pointer-events-none absolute top-3/4 right-0 left-0 -translate-y-px border-t border-dashed border-zinc-400/50"
                  ></div>
                </div>
              </div>

              <!-- Page 1: clickable. Outer button carries the static 2deg
                   tilt and 3D perspective. Inner div carries the flip
                   animation. Two faces with backface-hidden swap visibility
                   at rotateY 90deg. -->
              <button
                type="button"
                onclick={togglePdfFlip}
                aria-label={pdfFlipState === "flipped" || pdfFlipState === "flipping"
                  ? "Flip back to terms"
                  : "Flip to see definitions"}
                class="absolute aspect-[210/297] h-[94%] translate-x-1 -translate-y-0.5 rotate-2 cursor-pointer rounded-[2px] outline-none perspective-[900px] focus:outline-none focus-visible:outline-none"
              >
                <div
                  class="pdf-flip-inner relative h-full w-full transform-3d"
                  class:is-flipping={pdfFlipState === "flipping"}
                  class:is-flipped={pdfFlipState === "flipped"}
                  class:is-unflipping={pdfFlipState === "unflipping"}
                  onanimationend={onPdfFlipEnd}
                >
                  <!-- Front face: terms -->
                  <div
                    class="absolute inset-0 rounded-[2px] bg-white p-1 shadow-md shadow-black/40 backface-hidden"
                  >
                    <div class="relative grid h-full grid-cols-2 grid-rows-4">
                      {#each pdfPage1Terms as t, i (i)}
                        <div class="flex items-center justify-center px-0.5">
                          <span class="text-[5px] leading-none font-semibold text-zinc-700">
                            {t}
                          </span>
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

                  <!-- Back face: defs (rotated 180 around Y so they read
                       right-way-around once the page is flipped) -->
                  <div
                    class="absolute inset-0 rotate-y-180 rounded-[2px] bg-white p-1 shadow-md shadow-black/40 backface-hidden"
                  >
                    <div class="relative grid h-full grid-cols-2 grid-rows-4">
                      {#each pdfPage1Defs as d, i (i)}
                        <div class="flex items-center justify-center px-0.5">
                          <span class="text-[5px] leading-none font-medium text-zinc-700">
                            {d}
                          </span>
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
                </div>
              </button>
            </div>
            <div class="text-foreground text-sm font-medium">PDF flashcards</div>
            <div class="text-muted-foreground mt-0.5 text-xs">2x4, print double-sided</div>
          </div>

          <!-- CSV mockup: literal text in a code block, not a rendered
               spreadsheet. CSVs ARE plain text; the spreadsheet view is
               what the user gets after opening them. Comma is tinted
               primary so the eye sees it as a delimiter. Visual language
               matches the JSON tile. -->
          <div class="flex flex-col items-center text-center">
            <div class="mb-4 h-32 w-full">
              <pre
                class="border-border bg-card text-foreground/90 m-0 h-full overflow-hidden rounded-md border p-2.5 text-left font-mono text-[10px] leading-tight">{@html csvMockup}</pre>
            </div>
            <div class="text-foreground text-sm font-medium">CSV / TSV</div>
            <div class="text-muted-foreground mt-0.5 text-xs">opens in Excel, Sheets</div>
          </div>

          <!-- JSON mockup: tiny code block. Right-edge fade is applied
               INSIDE the card (on the inner pre) so the card border
               stays sharp while the content gracefully fades. -->
          <div class="flex flex-col items-center text-center">
            <div class="mb-4 h-32 w-full">
              <div class="border-border bg-card h-full overflow-hidden rounded-md border">
                <pre
                  style="mask-image: linear-gradient(to right, black 55%, transparent); -webkit-mask-image: linear-gradient(to right, black 55%, transparent);"
                  class="text-foreground/90 m-0 h-full p-2.5 text-left font-mono text-[10px] leading-tight">{@html jsonMockup}</pre>
              </div>
            </div>
            <div class="text-foreground text-sm font-medium">JSON</div>
            <div class="text-muted-foreground mt-0.5 text-xs">structured, scriptable</div>
          </div>
        </div>

        <p class="text-muted-foreground/80 mt-10 text-center text-sm">
          Plus TXT with configurable separators, and a vocab-list PDF for offline reading.
        </p>
      </div>
    </section>

    <!-- ════════ Closing nudge to the extension ════════
       The format wall + targeted-guides cluster that used to live above
       got cut: the textarea placeholder, the four output mockups, and
       the see-also row in the footer already cover that ground. -->
    <section class="px-6 py-20 sm:py-28">
      <div class="mx-auto max-w-3xl">
        <div class="border-border/60 rounded-lg border p-6 sm:p-8">
          <div class="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div class="flex-1">
              <h3 class="text-foreground text-lg font-medium">Coming from Quizlet directly?</h3>
              <p class="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                The browser extension runs on quizlet.com and exports a set in one click, with
                images and audio bundled into the .apkg. Skips the paste step entirely.
              </p>
            </div>
            <div class="flex flex-shrink-0 flex-wrap gap-2">
              <Button href={resolve("/extension")} variant="outline" size="sm">Read more</Button>
              <Button href={CWS_URL} size="sm" class="gap-1.5">
                Add to Chrome
                <ArrowRight class="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>

  <SiteFooter />
</div>

<style>
  /* PDF tile easter egg: lift-rotate-drop card flip. The translateZ peaks
     at 50% (edge-on to the camera) and the upward translateY mirrors how
     a hand lifts paper before turning it. Forwards fill mode keeps the
     end state. The matching .is-flipped class holds the flipped state
     statically between animations. */
  .pdf-flip-inner {
    transform: rotateY(0deg);
  }
  .pdf-flip-inner.is-flipped {
    transform: rotateY(180deg);
  }
  .pdf-flip-inner.is-flipping {
    animation: pdf-flip-forward 600ms linear forwards;
  }
  .pdf-flip-inner.is-unflipping {
    animation: pdf-flip-back 600ms linear forwards;
  }

  /* Two-act flip. Forward: rotateY 0 to 180 (the right swing direction
     for first click); translateZ NEGATIVE at peak so the page comes
     toward the user during lift and slams back during the second act
     (matches the user's observation that +Z at peak read as recede-then-
     approach, the inverse of what we wanted). Back: rotateY 180 to 0
     (the right swing direction for second click); translateZ POSITIVE
     at peak (left as-is because the second click already felt right).
     Act 1 (0% to 55%) launches the page with fast acceleration that
     decelerates into the apex with rotation almost complete. Act 2 (55%
     to 100%) is a hard slam with a slow start accelerating into the
     final frame. */
  @keyframes pdf-flip-forward {
    0% {
      transform: rotateY(0deg) translateZ(0) translateY(0);
      animation-timing-function: cubic-bezier(0.2, 0.85, 0.4, 1);
    }
    55% {
      transform: rotateY(-170deg) translateZ(-38px) translateY(-4px);
      animation-timing-function: cubic-bezier(0.6, 0, 0.9, 0.4);
    }
    100% {
      transform: rotateY(-180deg) translateZ(0) translateY(0);
    }
  }

  @keyframes pdf-flip-back {
    0% {
      transform: rotateY(180deg) translateZ(0) translateY(0);
      animation-timing-function: cubic-bezier(0.2, 0.85, 0.4, 1);
    }
    55% {
      transform: rotateY(10deg) translateZ(38px) translateY(-4px);
      animation-timing-function: cubic-bezier(0.6, 0, 0.9, 0.4);
    }
    100% {
      transform: rotateY(0deg) translateZ(0) translateY(0);
    }
  }
</style>
