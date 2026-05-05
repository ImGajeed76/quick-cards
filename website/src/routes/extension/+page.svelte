<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import Github from "$lib/components/icons/Github.svelte";
  import { reveal } from "$lib/actions/reveal";
  import { track } from "$lib/analytics";
  import { resolve } from "$app/paths";
  import {
    ArrowRight,
    Puzzle,
    Layers,
    Image as ImageIcon,
    ShieldCheck,
    Code2,
    Download,
    FileText,
    FileSpreadsheet,
    FileJson,
    FileType,
    Send,
    Files,
    BookOpen,
  } from "@lucide/svelte";
  import { SITE_NAME, SITE_URL, CWS_URL, SITE_REPO } from "$lib/site";

  const title = `${SITE_NAME} extension · Convert any Quizlet set to Anki, PDF, CSV, JSON, or Knowt`;
  const description =
    "Browser extension that exports any Quizlet set to Anki (.apkg), printable PDF flashcards, vocab list PDF, CSV, JSON, TXT, or sends it straight into Knowt. Free, no account, runs in your browser, open source.";

  function trackInstallClick(source: string): void {
    track("Install CTA click", { source });
  }

  // SoftwareApplication schema specifically for the browser extension. Same
  // org schema and family as the homepage but scoped to the BrowserApplication
  // surface, so search engines don't conflate the extension with the web tool.
  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${SITE_NAME} (extension)`,
    applicationCategory: "BrowserApplication",
    operatingSystem: "Chrome, Edge, Brave, Opera, Firefox (sideload)",
    url: `${SITE_URL}/extension`,
    description,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    sameAs: [SITE_REPO, CWS_URL],
  };
  /* eslint-disable no-useless-escape */
  const appJsonLdHtml = `<script type="application/ld+json">${JSON.stringify(appJsonLd)}<\/script>`;
  /* eslint-enable no-useless-escape */

  const formats = [
    {
      icon: Layers,
      name: "Anki",
      desc: "Anki deck file (.apkg) with images and audio bundled.",
    },
    {
      icon: FileText,
      name: "PDF flashcards",
      desc: "2x4 grid, double-sided, syllable-aware hyphenation.",
    },
    {
      icon: FileText,
      name: "PDF vocab list",
      desc: "Clean two-column table for printing or studying offline.",
    },
    {
      icon: FileSpreadsheet,
      name: "CSV",
      desc: "Open in Excel, Sheets, Numbers. Headerless or labeled.",
    },
    {
      icon: FileJson,
      name: "JSON",
      desc: "Structured data for programmatic use.",
    },
    {
      icon: FileType,
      name: "TXT",
      desc: "Plain text with configurable separators.",
    },
    {
      icon: Send,
      name: "Knowt",
      desc: "One click. Uses your Knowt session, no API key.",
    },
  ];

  const steps = [
    {
      n: "01",
      icon: Puzzle,
      title: "Install the extension",
      description: "From the Chrome Web Store, or sideload the release ZIP for Firefox.",
    },
    {
      n: "02",
      icon: BookOpen,
      title: "Open a Quizlet set",
      description:
        "A small QuickCards banner appears at the bottom of the page with the card count.",
    },
    {
      n: "03",
      icon: Download,
      title: "Pick where it goes",
      description: "Anki deck file, printable PDF, CSV, JSON, TXT, or send it straight into Knowt.",
    },
  ];

  const differentiators = [
    {
      icon: ShieldCheck,
      title: "Works on any set you can see",
      description:
        "If your browser can open the set, QuickCards can export it. No login automation, no scraping detour. Includes sets you didn't create yourself, so a teacher's set or a friend's set isn't off-limits.",
    },
    {
      icon: Files,
      title: "Merge multiple open tabs",
      description:
        "Have three Quizlet tabs open for chapters 4, 5, and 6? QuickCards can merge them into one export with optional case-insensitive deduplication. Useful when teachers split a unit across sets.",
    },
    {
      icon: ImageIcon,
      title: "Media survives the export",
      description:
        "Images, user-recorded audio, and Quizlet's TTS audio are bundled into the .apkg so cards work offline. CSV imports usually drop media; we don't.",
    },
    {
      icon: Code2,
      title: "Open source, MIT licensed",
      description:
        "The extension runs inside your own browser session. No third-party server, no analytics on your card content, every line on GitHub.",
    },
  ];
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <link rel="canonical" href={`${SITE_URL}/extension`} />
  <!-- eslint-disable svelte/no-at-html-tags — content is our own JSON.stringify output, no user input -->
  {@html appJsonLdHtml}
</svelte:head>

<div class="bg-background text-foreground flex min-h-screen flex-col">
  <!-- ══════════════ Header ══════════════ -->
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
          href={SITE_REPO}
          aria-label="GitHub repository"
          class="gap-2"
        >
          <Github class="size-4" />
          <span class="hidden sm:inline">GitHub</span>
        </Button>
        <Button
          size="sm"
          href={CWS_URL}
          onclick={() => trackInstallClick("extension-header")}
          class="gap-2"
        >
          Add to Chrome
          <ArrowRight class="size-4" />
        </Button>
      </div>
    </nav>
  </header>

  <main class="flex-grow">
    <!-- ══════════════ Hero ══════════════ -->
    <section class="relative overflow-hidden px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
      <div
        aria-hidden="true"
        class="text-foreground absolute inset-0 -z-20 opacity-[0.04]"
        style="background-image: linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px); background-size: 56px 56px;"
      ></div>
      <div
        aria-hidden="true"
        class="from-background pointer-events-none absolute inset-0 -z-10 bg-radial-[ellipse_at_center] from-30% to-transparent"
      ></div>
      <div
        aria-hidden="true"
        class="bg-primary pointer-events-none absolute -top-32 left-1/2 -z-10 h-[480px] w-[760px] -translate-x-1/2 rounded-full opacity-15 blur-[140px]"
      ></div>

      <div
        class="relative z-10 mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16"
      >
        <div>
          <span
            class="text-muted-foreground mb-4 inline-block font-mono text-xs tracking-wider uppercase"
          >
            Browser extension · Chrome and Firefox
          </span>
          <h1
            class="text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl"
          >
            Export any Quizlet set, <span class="text-primary">in your browser.</span>
          </h1>
          <p class="text-muted-foreground mt-6 max-w-xl text-lg leading-relaxed">
            Open a Quizlet set, click the QuickCards banner, get an Anki deck file (.apkg),
            printable PDF, CSV, JSON, or send it straight into your Knowt account. One click. No
            copy-paste, no add-on.
          </p>

          <div class="mt-8 flex flex-wrap items-center gap-3">
            <Button
              href={CWS_URL}
              onclick={() => trackInstallClick("extension-hero")}
              size="lg"
              class="group h-12 gap-2 px-6 text-base"
            >
              <Puzzle class="size-4" />
              Add to Chrome
              <ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Button
              href={`${SITE_REPO}/tree/main/extension#sideload-manual-install`}
              variant="outline"
              size="lg"
              class="h-12 px-5 text-base"
            >
              Sideload (Firefox / manual)
            </Button>
          </div>

          <p class="text-muted-foreground/80 mt-8 font-mono text-xs tracking-wide">
            Free &nbsp;·&nbsp; No account &nbsp;·&nbsp; Open source &nbsp;·&nbsp; Manifest V3
          </p>
        </div>

        <div class="relative">
          <div class="bg-card/40 border-border/60 rounded-xl border p-3 shadow-2xl shadow-black/40">
            <img
              src="/screenshots/floating_banner.png"
              alt="QuickCards floating banner on a Quizlet set page"
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
    </section>

    <hr class="border-foreground/10 mx-auto w-3/5" aria-hidden="true" />

    <!-- ══════════════ Format strip ══════════════ -->
    <section class="px-6 py-20 sm:py-24" use:reveal>
      <div class="mx-auto max-w-5xl">
        <div class="mb-10 flex flex-col items-center text-center">
          <span class="text-muted-foreground mb-3 font-mono text-xs tracking-wider uppercase">
            Anywhere you study
          </span>
          <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
            Seven export targets, one click each.
          </h2>
        </div>
        <div
          class="bg-border/50 grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-[repeat(7,minmax(0,1fr))]"
        >
          {#each formats as f (f.name)}
            {@const Icon = f.icon}
            <div class="bg-background flex flex-col gap-3 p-5 lg:p-4">
              <Icon class="text-primary size-5 shrink-0" />
              <div class="flex flex-col gap-1">
                <span class="text-sm font-medium">{f.name}</span>
                <span class="text-muted-foreground text-xs leading-relaxed lg:hidden">
                  {f.desc}
                </span>
              </div>
            </div>
          {/each}
        </div>
        <p class="text-muted-foreground/80 mt-8 text-center text-sm">
          Anki deck file (.apkg) with media, printable PDF flashcards (2x4 double-sided), vocab list
          PDF, CSV, JSON, TXT, and direct import into Knowt.
        </p>
      </div>
    </section>

    <hr class="border-foreground/10 mx-auto w-3/5" aria-hidden="true" />

    <!-- ══════════════ How it works ══════════════ -->
    <section class="px-6 py-24 sm:py-32" use:reveal>
      <div class="mx-auto max-w-5xl">
        <div class="mb-14 flex flex-col items-center text-center">
          <span class="text-muted-foreground mb-3 font-mono text-xs tracking-wider uppercase">
            How it works
          </span>
          <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">Install. Open. Export.</h2>
          <p class="text-muted-foreground mt-4 max-w-xl">
            Three steps from a Quizlet set to a finished file. No setup, no command line.
          </p>
        </div>
        <div class="bg-border/50 grid grid-cols-1 gap-px sm:grid-cols-3">
          {#each steps as step (step.title)}
            {@const Icon = step.icon}
            <div class="bg-background group flex flex-col gap-4 p-8">
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground/70 font-mono text-sm tabular-nums">{step.n}</span
                >
                <Icon class="text-primary size-5 transition-transform group-hover:scale-110" />
              </div>
              <h3 class="text-xl font-medium">{step.title}</h3>
              <p class="text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          {/each}
        </div>
      </div>
    </section>

    <hr class="border-foreground/10 mx-auto w-3/5" aria-hidden="true" />

    <!-- ══════════════ Why people switch ══════════════ -->
    <section class="px-6 py-24 sm:py-32" use:reveal>
      <div class="mx-auto max-w-4xl">
        <div class="mb-14 flex flex-col items-center text-center">
          <span class="text-muted-foreground mb-3 font-mono text-xs tracking-wider uppercase">
            Why people switch
          </span>
          <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
            What other importers can't do.
          </h2>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {#each differentiators as item (item.title)}
            {@const Icon = item.icon}
            <div
              class="border-border bg-card/30 hover:bg-card/50 rounded-lg border p-6 transition-colors"
            >
              <div class="flex gap-4">
                <div
                  class="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-md"
                >
                  <Icon class="size-5" />
                </div>
                <div class="flex flex-col gap-1.5">
                  <h3 class="text-lg font-medium">{item.title}</h3>
                  <p class="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </section>

    <hr class="border-foreground/10 mx-auto w-3/5" aria-hidden="true" />

    <!-- ══════════════ Use cases (editorial list) ══════════════ -->
    <section class="px-6 py-24 sm:py-32" use:reveal>
      <div class="mx-auto max-w-3xl">
        <div class="mb-14 max-w-xl">
          <span class="text-muted-foreground mb-3 block font-mono text-xs tracking-wider uppercase">
            What people use it for
          </span>
          <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
            Same flow, every reason to export.
          </h2>
          <p class="text-muted-foreground mt-4 leading-relaxed">
            Open the set, click the banner, pick a destination. The pattern is the same whether
            you're moving years of saved sets to Anki or printing flashcards for tomorrow's exam.
          </p>
        </div>

        <ul class="border-foreground/10 divide-foreground/10 divide-y border-y">
          <li class="grid grid-cols-[3rem_1fr] gap-6 py-7 sm:grid-cols-[4rem_1fr] sm:gap-8 sm:py-8">
            <span
              class="text-muted-foreground/70 font-mono text-sm tabular-nums sm:text-base"
              aria-hidden="true">01</span
            >
            <div>
              <h3 class="text-lg font-medium tracking-tight sm:text-xl">
                Migrate your Quizlet library to Anki
              </h3>
              <p class="text-muted-foreground mt-2 leading-relaxed">
                Convert a Quizlet set to an Anki deck file (.apkg) with images, user audio, and
                Quizlet's TTS bundled in. Import once into Anki and your cards work the same on
                desktop, AnkiMobile, AnkiDroid, and AnkiWeb. No add-on required.
              </p>
            </div>
          </li>
          <li class="grid grid-cols-[3rem_1fr] gap-6 py-7 sm:grid-cols-[4rem_1fr] sm:gap-8 sm:py-8">
            <span
              class="text-muted-foreground/70 font-mono text-sm tabular-nums sm:text-base"
              aria-hidden="true">02</span
            >
            <div>
              <h3 class="text-lg font-medium tracking-tight sm:text-xl">
                Print flashcards for offline study
              </h3>
              <p class="text-muted-foreground mt-2 leading-relaxed">
                Export a printable PDF, 2x4 grid, double-sided so the backs line up after folding.
                Long terms hyphenate cleanly. Useful for K-12 teachers, language learners, and
                anyone studying away from a screen.
              </p>
            </div>
          </li>
          <li class="grid grid-cols-[3rem_1fr] gap-6 py-7 sm:grid-cols-[4rem_1fr] sm:gap-8 sm:py-8">
            <span
              class="text-muted-foreground/70 font-mono text-sm tabular-nums sm:text-base"
              aria-hidden="true">03</span
            >
            <div>
              <h3 class="text-lg font-medium tracking-tight sm:text-xl">
                Move a Quizlet set into Knowt in one click
              </h3>
              <p class="text-muted-foreground mt-2 leading-relaxed">
                If you're studying inside Knowt, the import button uses your existing Knowt session
                to create a new flashcard set on your account. Title and description prefill from
                the Quizlet set. No 100-card cap, no copy-paste between tabs.
              </p>
            </div>
          </li>
          <li class="grid grid-cols-[3rem_1fr] gap-6 py-7 sm:grid-cols-[4rem_1fr] sm:gap-8 sm:py-8">
            <span
              class="text-muted-foreground/70 font-mono text-sm tabular-nums sm:text-base"
              aria-hidden="true">04</span
            >
            <div>
              <h3 class="text-lg font-medium tracking-tight sm:text-xl">
                Cramming under a deadline
              </h3>
              <p class="text-muted-foreground mt-2 leading-relaxed">
                Optional deadline mode adjusts deck options (desired retention, learn steps, max
                interval) for tight timelines. We've found it useful for exam prep under two weeks.
                Anecdotal, not science-backed. Beyond two weeks the values land at Anki defaults
                anyway, so it's not magic, just sensible presets.
              </p>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <hr class="border-foreground/10 mx-auto w-3/5" aria-hidden="true" />

    <!-- ══════════════ Compared fairly ══════════════ -->
    <section class="px-6 py-24 sm:py-28" use:reveal>
      <div class="mx-auto max-w-3xl">
        <div class="mb-10 max-w-xl">
          <span class="text-muted-foreground mb-3 block font-mono text-xs tracking-wider uppercase">
            If you've tried other tools
          </span>
          <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
            Different shape, not a takedown.
          </h2>
          <p class="text-muted-foreground mt-4 leading-relaxed">
            Other tools in this space are good at what they do. QuickCards is built differently.
            Here's the honest read so you can pick what fits.
          </p>
        </div>

        <div class="border-border divide-border divide-y rounded-lg border">
          <div class="space-y-2 p-6">
            <div class="flex items-baseline justify-between gap-4">
              <h3 class="text-base font-medium">Knowt's Quizlet importer</h3>
              <span class="text-muted-foreground/70 font-mono text-xs uppercase">
                Stay in Knowt
              </span>
            </div>
            <p class="text-muted-foreground text-sm leading-relaxed">
              Great if Knowt is where you study. Their extension imports cards into a new Knowt set,
              but on sets larger than 100 cards you have to remember to scroll and click "See more"
              first or it silently caps. Knowt-only output, no Anki, no PDF.
            </p>
          </div>
          <div class="space-y-2 p-6">
            <div class="flex items-baseline justify-between gap-4">
              <h3 class="text-base font-medium">Anki add-ons that fetch from Quizlet</h3>
              <span class="text-muted-foreground/70 font-mono text-xs uppercase">
                Anki desktop only
              </span>
            </div>
            <p class="text-muted-foreground text-sm leading-relaxed">
              Strong choice when they work. Recurring trouble: Quizlet's Cloudflare layer blocks
              their image and audio fetches periodically, and add-ons run on Anki desktop, not
              AnkiMobile or AnkiWeb. QuickCards rides your own browser session on the Quizlet tab,
              so there's nothing for Cloudflare to challenge.
            </p>
          </div>
          <div class="space-y-2 p-6">
            <div class="flex items-baseline justify-between gap-4">
              <h3 class="text-base font-medium">Quizlet's own export</h3>
              <span class="text-muted-foreground/70 font-mono text-xs uppercase">
                Sets you created
              </span>
            </div>
            <p class="text-muted-foreground text-sm leading-relaxed">
              Built in, but only works on sets you created yourself. If you've copied or saved
              someone else's set, the export option is gone. Plain text only, no images or audio.
            </p>
          </div>
        </div>
      </div>
    </section>

    <hr class="border-foreground/10 mx-auto w-3/5" aria-hidden="true" />

    <!-- ══════════════ Open source + Firefox ══════════════ -->
    <section class="px-6 py-20 sm:py-24" use:reveal>
      <div class="mx-auto max-w-3xl text-center">
        <Code2 class="text-primary mx-auto mb-4 size-6" />
        <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">Open source, MIT licensed</h2>
        <p class="text-muted-foreground mt-4 leading-relaxed">
          Every line of the extension is on
          <a
            href="https://github.com/ImGajeed76/quick-cards"
            class="text-foreground hover:text-primary underline-offset-4 hover:underline"
          >
            GitHub</a
          >. Inspect it, fork it, file an issue, send a PR. The build produces both a Chrome zip and
          a Firefox zip; the Chrome version lives in the Chrome Web Store, the Firefox version is
          sideload-only for now and a Firefox Add-ons listing is planned for the next major release.
        </p>
        <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button href={SITE_REPO} variant="outline" size="lg" class="h-11 gap-2 px-5 text-base">
            <Github class="size-4" />
            View on GitHub
          </Button>
          <Button
            href={`${SITE_REPO}/releases`}
            variant="ghost"
            size="lg"
            class="h-11 px-5 text-base"
          >
            Latest release
          </Button>
        </div>
      </div>
    </section>

    <hr class="border-foreground/10 mx-auto w-3/5" aria-hidden="true" />

    <!-- ══════════════ Closing CTA ══════════════ -->
    <section class="px-6 py-24 sm:py-28">
      <div class="mx-auto max-w-3xl text-center">
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
          Ready to get your Quizlet sets out?
        </h2>
        <p class="text-muted-foreground mt-4 text-lg leading-relaxed">
          Free, in your browser, open source. Install once, use it on every Quizlet tab.
        </p>
        <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button
            href={CWS_URL}
            onclick={() => trackInstallClick("extension-footer")}
            size="lg"
            class="group h-12 gap-2 px-6 text-base"
          >
            <Puzzle class="size-4" />
            Add to Chrome
            <ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
          <Button
            href={`${SITE_REPO}/tree/main/extension#sideload-manual-install`}
            variant="outline"
            size="lg"
            class="h-12 px-5 text-base"
          >
            Firefox / sideload
          </Button>
        </div>
      </div>
    </section>
  </main>

  <!-- ══════════════ Footer ══════════════ -->
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
        <a href={resolve("/knowt-alternative")} class="hover:text-foreground transition-colors">
          Coming from Knowt?
        </a>
        <a href={resolve("/privacy")} class="hover:text-foreground transition-colors">Privacy</a>
        <a
          href="https://github.com/ImGajeed76/quick-cards"
          class="hover:text-foreground transition-colors">GitHub</a
        >
        <a
          href="https://github.com/ImGajeed76/quick-cards/issues"
          class="hover:text-foreground transition-colors"
        >
          Report a bug
        </a>
      </div>
    </div>
  </footer>
</div>
