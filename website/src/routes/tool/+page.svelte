<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Textarea } from "$lib/components/ui/textarea";
  import Github from "$lib/components/icons/Github.svelte";
  import { reveal } from "$lib/actions/reveal";
  import { track } from "$lib/analytics";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import {
    ArrowRight,
    ChevronRight,
    Layers,
    FileText,
    FileSpreadsheet,
    FileJson,
    FileType,
    Sparkles,
    Link2,
    Code2,
    ShieldCheck,
    Wand2,
    ClipboardPaste,
    Eye,
    Download,
  } from "@lucide/svelte";
  import { parseInput } from "$lib/parse";
  import { encodePayload, type SharePayload } from "$lib/share";
  import { SITE_NAME, SITE_URL, CWS_URL } from "$lib/site";

  const title = `${SITE_NAME} tool · Convert flashcard data to Anki, PDF, CSV, JSON`;
  const description =
    "Paste a vocab list, CSV, TSV, JSON, Markdown table, or ChatGPT output. Get an Anki deck file (.apkg), printable PDF flashcards, vocab list PDF, CSV, JSON, or TXT. Free, no account, in your browser, open source.";

  let value = $state("");
  let error = $state<string | null>(null);
  const canContinue = $derived(value.trim().length > 0);
  const SHARE_URL_MAX = 8000;
  const placeholder = `term\tdefinition\nterm\tdefinition\n…\n\nor JSON, CSV, Markdown table, vocab list. The parser figures it out.`;

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

    let payload: SharePayload;
    if (result.kind === "vocab") {
      payload = {
        kind: "vocab",
        set: { title: "", description: "", cards: result.pairs },
      };
    } else if (result.kind === "quizlet") {
      payload = { kind: "quizlet", sets: result.sets };
    } else if (result.kind === "unknown") {
      error = result.reason;
      return;
    } else {
      error = "Paste something first.";
      return;
    }

    const encoded = encodePayload(payload);
    if (encoded.length > SHARE_URL_MAX) {
      sessionStorage.setItem("quickcards:payload", JSON.stringify(payload));
      // eslint-disable-next-line svelte/no-navigation-without-resolve
      await goto(resolve("/process") + "?d=local");
    } else {
      // eslint-disable-next-line svelte/no-navigation-without-resolve
      await goto(resolve("/process") + `?d=${encoded}`);
    }
  }

  // SoftwareApplication schema specifically for the web tool surface.
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
      "Export to Anki .apkg with optional deadline-mode preset",
      "Export to printable PDF flashcards (2x4 double-sided)",
      "Export to PDF vocab list, CSV, JSON, TXT",
      "Runs entirely in the browser, no upload",
      "Shareable URLs encode the full set",
      "Free and open source under MIT",
    ],
  };
  /* eslint-disable no-useless-escape */
  const appJsonLdHtml = `<script type="application/ld+json">${JSON.stringify(appJsonLd)}<\/script>`;
  /* eslint-enable no-useless-escape */

  const inputFormats = [
    "Vocab lists",
    "CSV",
    "TSV",
    "JSON",
    "JSON Lines",
    "Markdown tables",
    "TOML",
    "ChatGPT / Claude output",
  ];

  const outputs = [
    {
      icon: Layers,
      name: "Anki",
      desc: "Anki deck file (.apkg). Optional deadline-mode preset for short timelines.",
    },
    {
      icon: FileText,
      name: "PDF flashcards",
      desc: "2x4 grid, double-sided. Backs mirror so they line up after folding.",
    },
    {
      icon: FileText,
      name: "PDF vocab list",
      desc: "Two-column table. Auto-wraps long terms, paginates cleanly.",
    },
    {
      icon: FileSpreadsheet,
      name: "CSV",
      desc: "Open in Excel, Google Sheets, Numbers. Configurable separators.",
    },
    {
      icon: FileJson,
      name: "JSON",
      desc: "Structured data with title and cards array. Easy to feed into other tools.",
    },
    {
      icon: FileType,
      name: "TXT",
      desc: "Plain text. Pick the term-definition and card separators that suit you.",
    },
  ];

  const steps = [
    {
      n: "01",
      icon: ClipboardPaste,
      title: "Paste anything",
      description:
        "Drop in a vocab list, a CSV, a JSON, a Markdown table, a ChatGPT response. The parser figures it out.",
    },
    {
      n: "02",
      icon: Eye,
      title: "Check the cards",
      description:
        "QuickCards shows you the parsed cards before any download runs. No silent truncation, no surprises.",
    },
    {
      n: "03",
      icon: Download,
      title: "Save the file",
      description:
        "Pick a format, hit download. The file is built locally, your browser saves it. Done.",
    },
  ];

  const differentiators = [
    {
      icon: ShieldCheck,
      title: "Runs in your browser",
      description:
        "No server, no account, no upload. The whole conversion happens client-side, your data never leaves the tab.",
    },
    {
      icon: Link2,
      title: "Shareable URLs",
      description:
        "The URL holds the full set, compressed with lz-string. Send it to a study partner and the same export reproduces on their side.",
    },
    {
      icon: Wand2,
      title: "15+ separator styles auto-detected",
      description:
        "Tab, comma, dash, colon, em dash, double newlines, paired lines, and the rest. If a human can read it, the parser usually can too.",
    },
    {
      icon: Code2,
      title: "Open source, MIT licensed",
      description:
        "Every line on GitHub. Inspect the parser, fork it, send a PR if your favorite format isn't supported yet.",
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
  <link rel="canonical" href={`${SITE_URL}/tool`} />
  <!-- eslint-disable svelte/no-at-html-tags -->
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
    <!-- ══════════════ Hero with paste box ══════════════ -->
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
        class="relative z-10 mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14"
      >
        <div>
          <span
            class="text-muted-foreground mb-4 inline-block font-mono text-xs tracking-wider uppercase"
          >
            Web tool · No install
          </span>
          <h1
            class="text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl"
          >
            Convert flashcard data to <span class="text-primary">Anki, PDF, CSV, and more.</span>
          </h1>
          <p class="text-muted-foreground mt-6 max-w-xl text-lg leading-relaxed">
            Paste a vocab list, a CSV, a JSON, a Markdown table, or whatever ChatGPT spat out. Get
            an Anki deck file (.apkg), printable PDF flashcards, CSV, JSON, or TXT. Free, no
            account, runs in your browser.
          </p>

          <p class="text-muted-foreground/80 mt-6 font-mono text-xs tracking-wide">
            Free &nbsp;·&nbsp; No account &nbsp;·&nbsp; Open source &nbsp;·&nbsp; Nothing uploaded
          </p>
        </div>

        <div class="lg:pt-2">
          <label
            for="tool-paste"
            class="text-muted-foreground mb-3 block font-mono text-xs tracking-wider uppercase"
          >
            Paste your data
          </label>
          <div
            class="border-input bg-card focus-within:border-ring focus-within:ring-ring/50 flex flex-col gap-2 rounded-lg border p-2 shadow-2xl shadow-black/30 transition-[color,box-shadow] focus-within:ring-3"
          >
            <Textarea
              id="tool-paste"
              bind:value
              onkeydown={onKeydown}
              rows={10}
              {placeholder}
              spellcheck="false"
              autocapitalize="off"
              autocomplete="off"
              data-gramm="false"
              data-gramm_editor="false"
              data-enable-grammarly="false"
              class="min-h-40 resize-y rounded-none border-0 bg-transparent px-2 py-1.5 font-mono text-sm leading-6 shadow-none focus-visible:border-0 focus-visible:ring-0"
            />
            <div class="flex items-center justify-between gap-2 px-1 pb-1">
              <span class="text-muted-foreground text-xs">
                <kbd class="bg-muted rounded px-1.5 py-0.5 font-mono text-[10px]">⌘</kbd>
                <span aria-hidden="true">+</span>
                <kbd class="bg-muted rounded px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd>
                to convert
              </span>
              <Button onclick={handleContinue} disabled={!canContinue} class="gap-1.5">
                Continue
                <ChevronRight class="size-4" />
              </Button>
            </div>
          </div>
          {#if error}
            <p class="text-muted-foreground mt-3 text-sm">{error}</p>
          {/if}
        </div>
      </div>
    </section>

    <hr class="border-foreground/10 mx-auto w-3/5" aria-hidden="true" />

    <!-- ══════════════ Input formats strip ══════════════ -->
    <section class="px-6 py-20 sm:py-24" use:reveal>
      <div class="mx-auto max-w-4xl">
        <div class="mb-10 max-w-2xl">
          <span class="text-muted-foreground mb-3 block font-mono text-xs tracking-wider uppercase">
            What you can paste
          </span>
          <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
            Anything that looks like a list of cards.
          </h2>
          <p class="text-muted-foreground mt-4 leading-relaxed">
            The parser auto-detects 15+ separator styles, several JSON shapes, JSON Lines, CSV, TSV,
            Markdown tables, and TOML. If a human can read it as cards, the parser usually can too.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          {#each inputFormats as f (f)}
            <span
              class="border-border bg-card/40 text-foreground rounded-md border px-3 py-1.5 font-mono text-xs"
            >
              {f}
            </span>
          {/each}
          <span class="text-muted-foreground/70 px-2 py-1.5 font-mono text-xs italic">
            and the variants in between
          </span>
        </div>
      </div>
    </section>

    <hr class="border-foreground/10 mx-auto w-3/5" aria-hidden="true" />

    <!-- ══════════════ Output formats grid ══════════════ -->
    <section class="px-6 py-24 sm:py-32" use:reveal>
      <div class="mx-auto max-w-5xl">
        <div class="mb-12 max-w-2xl">
          <span class="text-muted-foreground mb-3 block font-mono text-xs tracking-wider uppercase">
            What comes out
          </span>
          <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
            Six export targets, picked at the end.
          </h2>
          <p class="text-muted-foreground mt-4 leading-relaxed">
            Same paste, different downloads. Decide after you've seen the parsed cards, not before.
          </p>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {#each outputs as o (o.name)}
            {@const Icon = o.icon}
            <div
              class="border-border bg-card/30 hover:bg-card/50 flex flex-col gap-3 rounded-lg border p-6 transition-colors"
            >
              <Icon class="text-primary size-5 shrink-0" />
              <h3 class="text-base font-medium">{o.name}</h3>
              <p class="text-muted-foreground text-sm leading-relaxed">{o.desc}</p>
            </div>
          {/each}
        </div>
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
          <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">Paste. Check. Export.</h2>
          <p class="text-muted-foreground mt-4 max-w-xl">
            Three steps from raw data to a finished file. No setup, no command line, no Anki add-on.
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

    <!-- ══════════════ Why people use it ══════════════ -->
    <section class="px-6 py-24 sm:py-32" use:reveal>
      <div class="mx-auto max-w-4xl">
        <div class="mb-14 flex flex-col items-center text-center">
          <span class="text-muted-foreground mb-3 font-mono text-xs tracking-wider uppercase">
            Why people use it
          </span>
          <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
            Honest design choices, not features.
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
            What people convert
          </span>
          <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
            Same paste box, different starting point.
          </h2>
        </div>

        <ul class="border-foreground/10 divide-foreground/10 divide-y border-y">
          <li class="grid grid-cols-[3rem_1fr] gap-6 py-7 sm:grid-cols-[4rem_1fr] sm:gap-8 sm:py-8">
            <span
              class="text-muted-foreground/70 font-mono text-sm tabular-nums sm:text-base"
              aria-hidden="true">01</span
            >
            <div>
              <h3 class="text-lg font-medium tracking-tight sm:text-xl">
                CSV or spreadsheet to Anki
              </h3>
              <p class="text-muted-foreground mt-2 leading-relaxed">
                Copy a column pair from Google Sheets or Excel, paste here, get an Anki deck file
                (.apkg). No add-on, no manual column mapping, no encoding headaches.
                <a
                  href={resolve("/csv-to-anki")}
                  class="text-primary hover:text-primary/80 ml-1 inline-flex items-center gap-1 underline-offset-4 hover:underline"
                >
                  Read the guide
                  <ChevronRight class="size-3.5" />
                </a>
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
                ChatGPT or Claude output to Anki
              </h3>
              <p class="text-muted-foreground mt-2 leading-relaxed">
                Ask a model for flashcards, get back a Markdown table or numbered list, paste it
                here. The parser handles the table syntax so you don't have to clean it by hand.
                <a
                  href={resolve("/chatgpt-flashcards-to-anki")}
                  class="text-primary hover:text-primary/80 ml-1 inline-flex items-center gap-1 underline-offset-4 hover:underline"
                >
                  Read the guide
                  <ChevronRight class="size-3.5" />
                </a>
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
                Vocab list to printable PDF
              </h3>
              <p class="text-muted-foreground mt-2 leading-relaxed">
                Paste a list of word-definition pairs, get a 2x4 double-sided printable PDF. Backs
                mirror so they line up after folding. Long terms hyphenate at syllable boundaries
                instead of breaking mid-word.
                <a
                  href={resolve("/print-flashcards-from-quizlet")}
                  class="text-primary hover:text-primary/80 ml-1 inline-flex items-center gap-1 underline-offset-4 hover:underline"
                >
                  Read the guide
                  <ChevronRight class="size-3.5" />
                </a>
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
                Cramming with a deadline
              </h3>
              <p class="text-muted-foreground mt-2 leading-relaxed">
                Optional deadline mode adjusts deck options (desired retention, learn steps, max
                interval) for tight timelines. Useful for exam prep under two weeks. Anecdotal, not
                science-backed. Past two weeks the values land at Anki defaults anyway.
              </p>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <hr class="border-foreground/10 mx-auto w-3/5" aria-hidden="true" />

    <!-- ══════════════ See also ══════════════ -->
    <section class="px-6 py-20 sm:py-24" use:reveal>
      <div class="mx-auto max-w-3xl">
        <div class="mb-8 max-w-xl">
          <span class="text-muted-foreground mb-3 block font-mono text-xs tracking-wider uppercase">
            Related
          </span>
          <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">
            Coming from a specific place?
          </h2>
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <a
            href={resolve("/quizlet-to-anki")}
            class="border-border bg-card/30 hover:bg-card/60 hover:border-primary/40 group flex items-start justify-between gap-4 rounded-lg border p-5 transition-colors"
          >
            <div>
              <div class="font-medium">Quizlet to Anki</div>
              <div class="text-muted-foreground mt-1 text-sm">
                Use the extension. Or paste the exported text here.
              </div>
            </div>
            <ChevronRight
              class="text-muted-foreground/50 group-hover:text-primary size-4 shrink-0 transition-colors"
            />
          </a>
          <a
            href={resolve("/csv-to-anki")}
            class="border-border bg-card/30 hover:bg-card/60 hover:border-primary/40 group flex items-start justify-between gap-4 rounded-lg border p-5 transition-colors"
          >
            <div>
              <div class="font-medium">CSV to Anki</div>
              <div class="text-muted-foreground mt-1 text-sm">
                Spreadsheets, Google Sheets, Excel. No add-on, no mapping.
              </div>
            </div>
            <ChevronRight
              class="text-muted-foreground/50 group-hover:text-primary size-4 shrink-0 transition-colors"
            />
          </a>
          <a
            href={resolve("/chatgpt-flashcards-to-anki")}
            class="border-border bg-card/30 hover:bg-card/60 hover:border-primary/40 group flex items-start justify-between gap-4 rounded-lg border p-5 transition-colors"
          >
            <div>
              <div class="font-medium">ChatGPT flashcards to Anki</div>
              <div class="text-muted-foreground mt-1 text-sm">
                Markdown tables, numbered lists, JSON arrays. Paste and convert.
              </div>
            </div>
            <ChevronRight
              class="text-muted-foreground/50 group-hover:text-primary size-4 shrink-0 transition-colors"
            />
          </a>
          <a
            href={resolve("/knowt-alternative")}
            class="border-border bg-card/30 hover:bg-card/60 hover:border-primary/40 group flex items-start justify-between gap-4 rounded-lg border p-5 transition-colors"
          >
            <div>
              <div class="font-medium">Knowt alternative</div>
              <div class="text-muted-foreground mt-1 text-sm">
                What QuickCards does that Knowt doesn't, and vice versa.
              </div>
            </div>
            <ChevronRight
              class="text-muted-foreground/50 group-hover:text-primary size-4 shrink-0 transition-colors"
            />
          </a>
        </div>
      </div>
    </section>

    <hr class="border-foreground/10 mx-auto w-3/5" aria-hidden="true" />

    <!-- ══════════════ Closing nudge ══════════════ -->
    <section class="px-6 py-20 sm:py-24">
      <div class="mx-auto flex max-w-3xl flex-col items-center text-center">
        <Sparkles class="text-primary mb-3 size-5" />
        <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">On Quizlet specifically?</h2>
        <p class="text-muted-foreground mt-4 max-w-xl leading-relaxed">
          The browser extension runs directly on quizlet.com pages. It can fetch any set you can see
          (including teacher's sets), bundle images and audio into the .apkg, and import straight
          into Knowt with one click.
        </p>
        <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button href={resolve("/extension")} size="lg" class="h-11 gap-2 px-5 text-base">
            See the extension
            <ArrowRight class="size-4" />
          </Button>
          <Button href={CWS_URL} variant="outline" size="lg" class="h-11 px-5 text-base">
            Add to Chrome
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
        <a href={resolve("/extension")} class="hover:text-foreground transition-colors">Extension</a
        >
        <a href={resolve("/knowt-alternative")} class="hover:text-foreground transition-colors">
          Coming from Knowt?
        </a>
        <a href={resolve("/privacy")} class="hover:text-foreground transition-colors">Privacy</a>
        <a
          href="https://github.com/ImGajeed76/quick-cards"
          class="hover:text-foreground transition-colors">GitHub</a
        >
      </div>
    </div>
  </footer>
</div>
