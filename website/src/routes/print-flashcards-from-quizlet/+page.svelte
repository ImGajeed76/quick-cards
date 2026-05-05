<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import Github from "$lib/components/icons/Github.svelte";
  import { reveal } from "$lib/actions/reveal";
  import { track } from "$lib/analytics";
  import { resolve } from "$app/paths";
  import { ArrowRight, Puzzle, Printer, ChevronRight, ClipboardPaste } from "@lucide/svelte";
  import { SITE_NAME, SITE_URL, CWS_URL } from "$lib/site";

  const title = `Print flashcards from Quizlet · ${SITE_NAME}`;
  const description =
    "Convert a Quizlet set or any vocab list to a printable PDF. 2x4 grid, double-sided so backs line up after folding, syllable-aware hyphenation for long terms. Free, no account, in your browser, open source.";

  function trackInstallClick(source: string): void {
    track("Install CTA click", { source });
  }

  const faq = [
    {
      q: "What paper size does it use?",
      a: "A4. The 2x4 grid produces eight cards per sheet. The same layout works on US Letter; the cards are slightly different proportions but everything aligns the same way.",
    },
    {
      q: "Are the backs aligned to the fronts when I print double-sided?",
      a: "Yes. Backs are mirrored horizontally so when you flip the page along the long edge (the default for most printers' duplex setting), each back lands behind its corresponding front. If your printer flips on the short edge instead, change the printer setting once and you are set.",
    },
    {
      q: "What if my terms are too long for one card?",
      a: "Long terms are hyphenated at syllable boundaries instead of breaking mid-word. Useful for language vocabulary, long compound nouns, and anything where mid-word breaks would confuse the reader. The hyphenation is automatic.",
    },
    {
      q: "Do I cut along the lines or fold?",
      a: "Either works. Most teachers print, fold along the horizontal mid-line so each pair becomes a self-backed card, then cut the eight pairs apart. Or print, cut into 16 single-sided pieces, then glue back to back if you prefer that look. Cards include faint cut guides so the lines are visible without dominating the page.",
    },
    {
      q: "Can I print without a Quizlet set?",
      a: "Yes. Use the QuickCards web tool, paste any vocab list (or CSV, JSON, Markdown table), pick PDF flashcards. Same layout, same hyphenation, no Quizlet involved.",
    },
    {
      q: "What about the vocab list PDF, what is that?",
      a: "A separate output, not a flashcard layout. It is a clean two-column table with auto-wrapping and page breaks, useful for offline reading or handing out as a study sheet. Both PDF outputs are available from the same set; pick whichever fits the moment.",
    },
    {
      q: "Why not just use Quizlet's own print feature?",
      a: "Quizlet's print feature exists, but it is single-sided friendly. Double-sided printing requires reloading the odd-numbered pages flipped, which most users get wrong on the first try. QuickCards' 2x4 PDF is built for double-sided printing from the start.",
    },
    {
      q: "Is QuickCards free?",
      a: "Yes. Free, open source (MIT licensed), no account, runs in your browser. Source on GitHub.",
    },
  ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
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
    <article class="px-6 py-16 sm:py-24">
      <div class="mx-auto max-w-5xl">
        <div class="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <span
              class="text-muted-foreground mb-4 inline-block font-mono text-xs tracking-wider uppercase"
            >
              Guide · Printable flashcards
            </span>
            <h1
              class="text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl"
            >
              Print flashcards <span class="text-primary">from a Quizlet set</span>.
            </h1>
            <p class="text-muted-foreground mt-6 text-lg leading-relaxed">
              A 2x4 PDF, double-sided so the backs line up after folding, with syllable-aware
              hyphenation so long terms do not break mid-word. Built for teachers, parents, and
              students who want offline cards.
            </p>
            <div class="mt-8 flex flex-wrap items-center gap-3">
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
              <Button
                href={resolve("/tool")}
                variant="outline"
                size="lg"
                class="h-12 px-5 text-base"
              >
                No Quizlet? Paste a list
              </Button>
            </div>
            <p class="text-muted-foreground/80 mt-6 font-mono text-xs tracking-wide">
              Free &nbsp;·&nbsp; No account &nbsp;·&nbsp; A4 / US Letter &nbsp;·&nbsp; Open source
            </p>
          </div>
          <div class="relative">
            <div
              class="bg-card/40 border-border/60 rounded-xl border p-3 shadow-2xl shadow-black/40"
            >
              <img
                src="/screenshots/pdf_cards.png"
                alt="2x4 grid of printable flashcards with syllable hyphenation"
                class="rounded-md"
                loading="eager"
                fetchpriority="high"
              />
            </div>
            <div
              aria-hidden="true"
              class="bg-primary/30 absolute -inset-x-4 -bottom-4 -z-10 h-12 rounded-full blur-2xl"
            ></div>
          </div>
        </div>
      </div>
    </article>

    <hr class="border-foreground/10 mx-auto w-3/5" aria-hidden="true" />

    <!-- ══════════════ Two paths ══════════════ -->
    <section class="px-6 py-20 sm:py-24" use:reveal>
      <div class="mx-auto max-w-3xl">
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">Two paths to the PDF.</h2>

        <div class="mt-12 space-y-12">
          <div>
            <div class="mb-3 flex items-center gap-3">
              <span class="text-muted-foreground/70 font-mono text-sm tabular-nums">01</span>
              <span
                class="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 font-mono text-[10px] tracking-wider uppercase"
              >
                From Quizlet
              </span>
            </div>
            <h3 class="text-xl font-semibold tracking-tight sm:text-2xl">
              Browser extension on a Quizlet set
            </h3>
            <p class="text-muted-foreground mt-3 leading-relaxed">
              Open the Quizlet set, click the QuickCards banner, pick PDF flashcards. The PDF is
              built in your browser and downloads. Open it in any PDF viewer, print double-sided
              (long-edge flip), fold and cut. No copy-paste between tabs.
            </p>
            <div class="mt-6 flex flex-wrap items-center gap-3">
              <Button
                href={CWS_URL}
                onclick={() => trackInstallClick("print-method1")}
                class="gap-2"
              >
                <Puzzle class="size-4" />
                Add to Chrome
              </Button>
              <Button href={resolve("/extension")} variant="ghost" class="gap-2">
                Read more
                <ChevronRight class="size-4" />
              </Button>
            </div>
          </div>

          <div>
            <div class="mb-3 flex items-center gap-3">
              <span class="text-muted-foreground/70 font-mono text-sm tabular-nums">02</span>
              <span
                class="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 font-mono text-[10px] tracking-wider uppercase"
              >
                From any list
              </span>
            </div>
            <h3 class="text-xl font-semibold tracking-tight sm:text-2xl">
              Web tool, paste a vocab list
            </h3>
            <p class="text-muted-foreground mt-3 leading-relaxed">
              For wordlists from a textbook, a Google Sheet, a teacher's handout, or anything that
              is not a Quizlet set. Paste the list into the web tool, pick PDF flashcards, get the
              same 2x4 layout with hyphenation. No install needed.
            </p>
            <div class="mt-6 flex flex-wrap items-center gap-3">
              <Button href={resolve("/tool")} class="gap-2">
                <ClipboardPaste class="size-4" />
                Open the web tool
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <hr class="border-foreground/10 mx-auto w-3/5" aria-hidden="true" />

    <!-- ══════════════ Print tips ══════════════ -->
    <section class="px-6 py-20 sm:py-24" use:reveal>
      <div class="mx-auto max-w-3xl">
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">Print settings.</h2>
        <p class="text-muted-foreground mt-4 leading-relaxed">
          Almost any printer driver has these. Set them once, save as a preset, never think about
          them again.
        </p>
        <ul class="text-muted-foreground/90 mt-6 space-y-3 leading-relaxed">
          <li class="flex gap-3">
            <Printer class="text-primary mt-1 size-4 shrink-0" />
            <span>
              <strong class="text-foreground">Two-sided printing:</strong> Long-edge flip (the default).
              The PDF's backs are mirrored to suit this.
            </span>
          </li>
          <li class="flex gap-3">
            <Printer class="text-primary mt-1 size-4 shrink-0" />
            <span>
              <strong class="text-foreground">Scale:</strong> 100% / Actual size. Do not let the driver
              "fit to page" or the front and back will misalign.
            </span>
          </li>
          <li class="flex gap-3">
            <Printer class="text-primary mt-1 size-4 shrink-0" />
            <span>
              <strong class="text-foreground">Margins:</strong> None / Default. The PDF has its own margins
              built in.
            </span>
          </li>
          <li class="flex gap-3">
            <Printer class="text-primary mt-1 size-4 shrink-0" />
            <span>
              <strong class="text-foreground">Paper:</strong> A4 or US Letter. Both work, the cards are
              slightly different proportions but the alignment is the same.
            </span>
          </li>
        </ul>
        <p class="text-muted-foreground mt-6 leading-relaxed">
          Once printed, fold along the horizontal mid-line of each sheet, then cut along the
          vertical and remaining horizontal lines. You end up with 8 self-backed cards per sheet.
        </p>
      </div>
    </section>

    <hr class="border-foreground/10 mx-auto w-3/5" aria-hidden="true" />

    <!-- ══════════════ FAQ ══════════════ -->
    <section class="px-6 py-20 sm:py-24" use:reveal>
      <div class="mx-auto max-w-3xl">
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">Print questions.</h2>
        <dl class="mt-10 space-y-7">
          {#each faq as item (item.q)}
            <div>
              <dt class="text-foreground text-lg font-medium tracking-tight">{item.q}</dt>
              <dd class="text-muted-foreground mt-2 leading-relaxed">{item.a}</dd>
            </div>
          {/each}
        </dl>
      </div>
    </section>

    <hr class="border-foreground/10 mx-auto w-3/5" aria-hidden="true" />

    <!-- ══════════════ Closing CTA ══════════════ -->
    <section class="px-6 py-20 sm:py-24">
      <div class="mx-auto max-w-3xl text-center">
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">Ready to print.</h2>
        <p class="text-muted-foreground mt-4 text-lg leading-relaxed">
          From a Quizlet set with the extension, or from any vocab list with the web tool.
        </p>
        <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
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
            Web tool
          </Button>
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
        <a href={resolve("/quizlet-to-anki")} class="hover:text-foreground transition-colors">
          Quizlet to Anki
        </a>
        <a href={resolve("/privacy")} class="hover:text-foreground transition-colors">Privacy</a>
      </div>
    </div>
  </footer>
</div>
