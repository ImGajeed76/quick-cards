<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import Github from "$lib/components/icons/Github.svelte";
  import { reveal } from "$lib/actions/reveal";
  import { track } from "$lib/analytics";
  import { resolve } from "$app/paths";
  import { ArrowRight, Puzzle, ClipboardPaste, Scissors, Printer } from "@lucide/svelte";
  import PdfFlashcardsPreview from "$lib/components/mockups/PdfFlashcardsPreview.svelte";
  import { SITE_NAME, SITE_URL, CWS_URL } from "$lib/site";

  const title = `Print flashcards from Quizlet · ${SITE_NAME}`;
  const description =
    "Print double-sided flashcards from a Quizlet set or any vocab list. 2x4 grid, duplex print and cut, syllable-aware hyphenation. Free, no account, in your browser, open source.";

  function trackInstallClick(source: string): void {
    track("Install CTA click", { source });
  }

  // Cards used by the hero PDF mockup. Page 1 (fronts) shows these
  // terms; the component derives the matching defs for the back face.
  const cards = [
    { term: "Photosynthesis", definition: "Plants convert sunlight to energy" },
    { term: "Mitosis", definition: "Cell divides into two identical cells" },
    { term: "Osmosis", definition: "Water moves across a membrane" },
    { term: "Cytoplasm", definition: "Gel-like substance filling a cell" },
    { term: "Ribosome", definition: "Synthesizes proteins from mRNA" },
    { term: "Nucleus", definition: "Holds the cell's DNA" },
    { term: "ATP", definition: "Cell's energy currency" },
    { term: "Mitochondria", definition: "Powerhouse of the cell" },
  ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What paper size?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "A4. The 2x4 grid produces eight cards per sheet. The same layout works on US Letter; cards land slightly different proportions but everything aligns the same way.",
        },
      },
      {
        "@type": "Question",
        name: "Will the backs line up?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. The PDF is two pages: page 1 is fronts, page 2 is backs. Backs are mirrored horizontally for long-edge duplex flip (the default on most printers). After printing double-sided, cut along the dashed lines and each card has its matching back.",
        },
      },
      {
        "@type": "Question",
        name: "What about long terms?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Long terms hyphenate at syllable boundaries instead of breaking mid-word. Useful for language vocabulary and compound nouns.",
        },
      },
    ],
  };
  /* eslint-disable no-useless-escape */
  const faqJsonLdHtml = `<script type="application/ld+json">${JSON.stringify(faqJsonLd)}<\/script>`;
  /* eslint-enable no-useless-escape */
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <link rel="canonical" href={`${SITE_URL}/print-flashcards-from-quizlet`} />
  <!-- eslint-disable svelte/no-at-html-tags -->
  {@html faqJsonLdHtml}
</svelte:head>

<div class="bg-background text-foreground flex min-h-screen flex-col">
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
        <Button
          size="sm"
          href={CWS_URL}
          onclick={() => trackInstallClick("print-header")}
          class="gap-2"
        >
          Add to Chrome
          <ArrowRight class="size-4" />
        </Button>
      </div>
    </nav>
  </header>

  <main class="flex-grow">
    <!-- ════════ Hero: tactile PDF mockup ════════
       The page's whole pitch is "physical cards in your hand." The hero
       is the two-page PDF mockup component, headline on the left so the
       eye lands on the paper first. -->

    <section class="relative overflow-hidden px-4 pt-12 pb-16 sm:px-6 sm:pt-16 sm:pb-20">
      <div
        aria-hidden="true"
        class="bg-primary pointer-events-none absolute -top-32 left-1/3 -z-10 h-[440px] w-[680px] -translate-x-1/2 rounded-full opacity-15 blur-[140px]"
      ></div>

      <div
        class="relative z-10 mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14"
      >
        <div>
          <h1
            class="text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl"
          >
            Print, cut, <span class="text-primary">study.</span>
          </h1>
          <p class="text-muted-foreground mt-5 max-w-xl text-base leading-relaxed sm:text-lg">
            A 2x4 PDF on two pages, fronts and backs. Print double-sided, cut along the dashed
            lines. Syllable-aware hyphenation so long terms don't break mid-word. From a Quizlet set
            or any vocab list.
          </p>
          <div class="mt-7 flex flex-wrap items-center gap-3">
            <Button
              href={CWS_URL}
              onclick={() => trackInstallClick("print-hero")}
              size="lg"
              class="group h-12 gap-2 px-6 text-base"
            >
              <Puzzle class="size-4" />
              Add to Chrome
              <ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Button href={resolve("/tool")} variant="outline" size="lg" class="h-12 px-5 text-base">
              <ClipboardPaste class="size-4" />
              Paste a list
            </Button>
          </div>
          <p class="text-muted-foreground/80 mt-5 font-mono text-xs tracking-wide">
            Free &nbsp;·&nbsp; A4 / US Letter &nbsp;·&nbsp; Open source
          </p>
        </div>

        <!-- PDF mockup. Two A4 pages stacked (page 1 = fronts, page 2 =
             backs peeking from behind). Same component used in the home
             dialog so the visual language is consistent across the site. -->
        <div class="relative mx-auto w-full max-w-md">
          <PdfFlashcardsPreview {cards} />
          <div class="mt-5 flex items-center justify-center gap-2">
            <Scissors class="text-muted-foreground/70 size-3.5" />
            <span class="text-muted-foreground text-xs">
              Eight cards per sheet. Print double-sided, cut along the dashed lines.
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- ════════ Two paths ════════
       Compact section: extension for a Quizlet set, web tool for any
       list. No big section heading; just two side-by-side cards. -->
    <section class="px-6 py-16 sm:py-20" use:reveal>
      <div class="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 sm:gap-5">
        <a
          href="https://chromewebstore.google.com/detail/quickcards/kjbjdolelcchfcmainniifnpkgikjfkc"
          onclick={() => trackInstallClick("print-path-ext")}
          class="border-border hover:bg-card/80 hover:border-primary/40 group flex flex-col gap-3 rounded-lg border p-5 transition-colors"
        >
          <div class="flex items-center gap-3">
            <Puzzle class="text-primary size-5" />
            <span class="text-muted-foreground/80 font-mono text-[10px] tracking-wider uppercase">
              From a Quizlet set
            </span>
          </div>
          <div class="text-foreground text-base font-medium">Browser extension on the set page</div>
          <p class="text-muted-foreground text-sm leading-relaxed">
            Open the set, click the QuickCards banner, pick PDF flashcards. PDF builds in your
            browser and downloads.
          </p>
        </a>
        <a
          href={resolve("/tool")}
          class="border-border hover:bg-card/80 hover:border-primary/40 group flex flex-col gap-3 rounded-lg border p-5 transition-colors"
        >
          <div class="flex items-center gap-3">
            <ClipboardPaste class="text-primary size-5" />
            <span class="text-muted-foreground/80 font-mono text-[10px] tracking-wider uppercase">
              From any list
            </span>
          </div>
          <div class="text-foreground text-base font-medium">Web tool, paste a list of pairs</div>
          <p class="text-muted-foreground text-sm leading-relaxed">
            Vocab list, CSV, JSON, Markdown table. Same 2x4 layout, same hyphenation, no install
            needed.
          </p>
        </a>
      </div>
    </section>

    <!-- ════════ Print settings ════════
       Single-tile stack of four print settings, monospaced and tight. The
       page already showed the layout in the hero; this part is just the
       practical "how to print without misalignment" reference. -->
    <section class="px-6 py-20 sm:py-28" use:reveal>
      <div class="mx-auto max-w-3xl">
        <div class="mb-6 flex items-center gap-3">
          <Printer class="text-primary size-4" />
          <span class="text-muted-foreground font-mono text-xs tracking-wider uppercase">
            Print settings
          </span>
        </div>
        <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">
          Set these once, save the preset.
        </h2>

        <dl class="border-border divide-border mt-7 divide-y rounded-lg border font-mono text-sm">
          <div class="grid grid-cols-[160px_1fr] gap-4 px-5 py-3.5">
            <dt class="text-muted-foreground">Two-sided</dt>
            <dd class="text-foreground/90">
              Long-edge flip <span class="text-muted-foreground/70">// the default</span>
            </dd>
          </div>
          <div class="grid grid-cols-[160px_1fr] gap-4 px-5 py-3.5">
            <dt class="text-muted-foreground">Scale</dt>
            <dd class="text-foreground/90">
              100% <span class="text-muted-foreground/70">// not "fit to page"</span>
            </dd>
          </div>
          <div class="grid grid-cols-[160px_1fr] gap-4 px-5 py-3.5">
            <dt class="text-muted-foreground">Margins</dt>
            <dd class="text-foreground/90">
              None <span class="text-muted-foreground/70">// PDF has its own</span>
            </dd>
          </div>
          <div class="grid grid-cols-[160px_1fr] gap-4 px-5 py-3.5">
            <dt class="text-muted-foreground">Paper</dt>
            <dd class="text-foreground/90">A4 or US Letter</dd>
          </div>
        </dl>
        <p class="text-muted-foreground mt-5 text-sm leading-relaxed">
          Once printed double-sided, cut along the dashed lines. You end up with eight self-backed
          cards per sheet.
        </p>
      </div>
    </section>

    <!-- ════════ Closing CTA ════════ -->
    <section class="px-6 py-20 sm:py-24">
      <div class="mx-auto max-w-3xl text-center">
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">Ready to print.</h2>
        <p class="text-muted-foreground mt-3 text-base leading-relaxed">
          From a Quizlet set with the extension. From any list with the web tool.
        </p>
        <div class="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button
            href={CWS_URL}
            onclick={() => trackInstallClick("print-footer")}
            size="lg"
            class="group h-12 gap-2 px-6 text-base"
          >
            <Puzzle class="size-4" />
            Add to Chrome
            <ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
          <Button href={resolve("/tool")} variant="outline" size="lg" class="h-12 px-5 text-base">
            <ClipboardPaste class="size-4" />
            Web tool
          </Button>
        </div>
        <div
          class="text-muted-foreground/70 mt-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs"
        >
          <a
            href={resolve("/quizlet-to-anki")}
            class="hover:text-foreground underline-offset-2 hover:underline"
          >
            Quizlet to Anki
          </a>
          <span>·</span>
          <a
            href={resolve("/csv-to-anki")}
            class="hover:text-foreground underline-offset-2 hover:underline"
          >
            CSV to Anki
          </a>
          <span>·</span>
          <a
            href={resolve("/extension")}
            class="hover:text-foreground underline-offset-2 hover:underline"
          >
            Extension
          </a>
        </div>
      </div>
    </section>
  </main>

  <footer class="border-foreground/10 border-t">
    <div
      class="text-muted-foreground mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm sm:flex-row"
    >
      <div>
        Made by
        <a href="https://oseifert.ch" class="text-foreground hover:text-primary transition-colors">
          Oliver Seifert
        </a>
        · MIT licensed.
      </div>
      <div class="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:justify-end">
        <a href={resolve("/")} class="hover:text-foreground transition-colors">Home</a>
        <a href={resolve("/extension")} class="hover:text-foreground transition-colors">Extension</a
        >
        <a href={resolve("/tool")} class="hover:text-foreground transition-colors">Tool</a>
        <a href={resolve("/privacy")} class="hover:text-foreground transition-colors">Privacy</a>
        <a
          href="https://github.com/ImGajeed76/quick-cards"
          class="hover:text-foreground transition-colors">GitHub</a
        >
      </div>
    </div>
  </footer>
</div>
