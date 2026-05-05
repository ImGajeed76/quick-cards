<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import Github from "$lib/components/icons/Github.svelte";
  import { reveal } from "$lib/actions/reveal";
  import { resolve } from "$app/paths";
  import {
    ArrowRight,
    ClipboardPaste,
    FileSpreadsheet,
    ChevronRight,
    Download,
  } from "@lucide/svelte";
  import { SITE_NAME, SITE_URL } from "$lib/site";

  const title = `CSV to Anki · ${SITE_NAME}`;
  const description =
    "Convert a CSV, TSV, Google Sheets paste, or Excel column pair to an Anki deck file (.apkg). No add-on, no manual column mapping, no encoding headaches. Free, no account, in your browser, open source.";

  const faq = [
    {
      q: "Do I need an Anki add-on?",
      a: "No. QuickCards builds the .apkg in your browser. You then double-click it into Anki desktop, AnkiMobile, AnkiDroid, or AnkiWeb. No add-on, no AnkiConnect, no command line.",
    },
    {
      q: "What CSV shapes does it accept?",
      a: "Two columns is the simplest case (term, definition). The parser also handles three-column shapes (term, definition, tags), quoted CSV, semicolons as separators (common in European exports), tab-separated (TSV), and trailing-comma stragglers. If a header row is present, it is detected and skipped.",
    },
    {
      q: "What about accents, kanji, emoji?",
      a: "Pasting works because the data is already decoded by your browser. The resulting .apkg is UTF-8 throughout. The classic problem with Anki's built-in CSV import (Excel saving Latin-1 instead of UTF-8 on macOS, then accents breaking on import) does not apply because there is no save-to-disk-then-reload step.",
    },
    {
      q: "Can I include images or audio?",
      a: "Pasted text-only CSVs cannot carry media. The same is true of Anki's built-in CSV import: media is referenced by filename and the user must place files in the collection.media folder by hand. If your data is from Quizlet, the QuickCards browser extension handles media end-to-end.",
    },
    {
      q: "What about Anki's built-in CSV import? When does that work?",
      a: "It works when your data is well-shaped, you do not need to skip columns, and your file is reliably UTF-8. The Anki 2.1.55 change made it 'Keep content of unmapped fields when importing CSV' by default, which broke a lot of workflows where users had been deliberately leaving fields unmapped to skip junk columns. AnkiMobile on iOS 18 specifically refuses to let users select a CSV file from inside the app at all. QuickCards sidesteps these by handling the conversion entirely in the browser before the file ever lands on disk.",
    },
    {
      q: "Can I share the converted set with classmates?",
      a: "Yes. Either share the .apkg file directly (it imports the same on every Anki client), or copy the QuickCards URL after parsing. The URL contains the full set, lz-string compressed, and reproduces the same export on the other side.",
    },
    {
      q: "Is QuickCards free?",
      a: "Yes. Free, open source (MIT licensed), no account, in your browser. Source on GitHub.",
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
  <link rel="canonical" href={`${SITE_URL}/csv-to-anki`} />
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
        <Button size="sm" href={resolve("/tool")} class="gap-2">
          Open the tool
          <ArrowRight class="size-4" />
        </Button>
      </div>
    </nav>
  </header>

  <main class="flex-grow">
    <article class="px-6 py-16 sm:py-24">
      <div class="mx-auto max-w-3xl">
        <span
          class="text-muted-foreground mb-4 inline-block font-mono text-xs tracking-wider uppercase"
        >
          Guide · CSV to Anki
        </span>
        <h1
          class="text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl"
        >
          Convert <span class="text-primary">CSV to Anki</span>, no add-on.
        </h1>
        <p class="text-muted-foreground mt-6 text-lg leading-relaxed">
          You have a list of cards in a spreadsheet (Google Sheets, Excel, Numbers, a downloaded CSV
          from somewhere) and you want them as an Anki deck file (.apkg). Paste, check, save. That
          is it.
        </p>
        <div class="mt-8 flex flex-wrap items-center gap-3">
          <Button href={resolve("/tool")} size="lg" class="group h-12 gap-2 px-6 text-base">
            <ClipboardPaste class="size-4" />
            Open the web tool
            <ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
        <p class="text-muted-foreground/80 mt-6 font-mono text-xs tracking-wide">
          Free &nbsp;·&nbsp; No account &nbsp;·&nbsp; No upload &nbsp;·&nbsp; Open source
        </p>
      </div>
    </article>

    <hr class="border-foreground/10 mx-auto w-3/5" aria-hidden="true" />

    <!-- ══════════════ How it goes ══════════════ -->
    <section class="px-6 py-20 sm:py-24" use:reveal>
      <div class="mx-auto max-w-3xl">
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">From spreadsheet to deck.</h2>
        <p class="text-muted-foreground mt-4 leading-relaxed">
          The shortest reliable path is to copy two columns out of your spreadsheet and paste them
          into the QuickCards tool. The parser detects the separator (tab, comma, semicolon), skips
          the header row if present, and produces a card list you can verify before any download
          runs.
        </p>
        <ol class="mt-10 space-y-8">
          <li class="flex gap-5">
            <div
              class="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md"
            >
              <FileSpreadsheet class="size-4" />
            </div>
            <div>
              <div class="text-foreground font-medium">Select two columns in your spreadsheet</div>
              <p class="text-muted-foreground mt-1 leading-relaxed">
                Term column on the left, definition column on the right. A header row is fine, the
                parser detects and skips it. Copy with Cmd+C / Ctrl+C.
              </p>
            </div>
          </li>
          <li class="flex gap-5">
            <div
              class="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md"
            >
              <ClipboardPaste class="size-4" />
            </div>
            <div>
              <div class="text-foreground font-medium">Paste into the QuickCards tool</div>
              <p class="text-muted-foreground mt-1 leading-relaxed">
                Open the tool, paste, hit Continue. You see the parsed cards with a count before any
                download runs. If something looks wrong (wrong column, wrong separator), fix it and
                paste again.
              </p>
            </div>
          </li>
          <li class="flex gap-5">
            <div
              class="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md"
            >
              <Download class="size-4" />
            </div>
            <div>
              <div class="text-foreground font-medium">Pick Anki, download, import</div>
              <p class="text-muted-foreground mt-1 leading-relaxed">
                The .apkg builds in your browser. Open it with Anki on any client (desktop,
                AnkiMobile, AnkiDroid, AnkiWeb). Optional: turn on deadline mode if you have an exam
                under two weeks away.
              </p>
            </div>
          </li>
        </ol>
        <div class="mt-10">
          <Button href={resolve("/tool")} size="lg" class="h-11 gap-2 px-5 text-base">
            <ClipboardPaste class="size-4" />
            Open the tool
          </Button>
        </div>
      </div>
    </section>

    <hr class="border-foreground/10 mx-auto w-3/5" aria-hidden="true" />

    <!-- ══════════════ Why this beats the obvious alternative ══════════════ -->
    <section class="px-6 py-20 sm:py-24" use:reveal>
      <div class="mx-auto max-w-3xl">
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
          Why not just use Anki's CSV import?
        </h2>
        <p class="text-muted-foreground mt-4 leading-relaxed">
          You can. It is built in. It also confuses people regularly. The friction shows up at
          predictable points:
        </p>
        <ul class="text-muted-foreground/90 mt-6 space-y-3 leading-relaxed">
          <li class="flex gap-3">
            <ChevronRight class="text-primary mt-1 size-4 shrink-0" />
            <span>
              <strong class="text-foreground">Encoding.</strong> Excel on macOS often saves CSVs as Latin-1
              by default, which then breaks accented characters when Anki reads them as UTF-8.
            </span>
          </li>
          <li class="flex gap-3">
            <ChevronRight class="text-primary mt-1 size-4 shrink-0" />
            <span>
              <strong class="text-foreground">Field mapping.</strong> Anki 2.1.55 changed the default
              to keep unmapped fields, breaking workflows that relied on leaving columns unmapped to skip
              junk data.
            </span>
          </li>
          <li class="flex gap-3">
            <ChevronRight class="text-primary mt-1 size-4 shrink-0" />
            <span>
              <strong class="text-foreground">Mobile.</strong> AnkiMobile on iOS 18 cannot select a CSV
              from inside the app. AnkiDroid handles it but with manual file-system steps.
            </span>
          </li>
          <li class="flex gap-3">
            <ChevronRight class="text-primary mt-1 size-4 shrink-0" />
            <span>
              <strong class="text-foreground">Note types.</strong> Anki picks Basic by default. If you
              wanted a custom note type, you have to map fields manually each time.
            </span>
          </li>
        </ul>
        <p class="text-muted-foreground mt-6 leading-relaxed">
          QuickCards skips all of that by handling the conversion in your browser before the file
          touches disk. The .apkg lands ready to import on any Anki client without further
          configuration.
        </p>
      </div>
    </section>

    <hr class="border-foreground/10 mx-auto w-3/5" aria-hidden="true" />

    <!-- ══════════════ FAQ ══════════════ -->
    <section class="px-6 py-20 sm:py-24" use:reveal>
      <div class="mx-auto max-w-3xl">
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">Frequently asked.</h2>
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
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">Try it now.</h2>
        <p class="text-muted-foreground mt-4 text-lg leading-relaxed">
          Paste your data, see the parsed cards, save the .apkg.
        </p>
        <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button href={resolve("/tool")} size="lg" class="group h-12 gap-2 px-6 text-base">
            <ClipboardPaste class="size-4" />
            Open the tool
            <ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
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
        <a href={resolve("/tool")} class="hover:text-foreground transition-colors">Tool</a>
        <a href={resolve("/extension")} class="hover:text-foreground transition-colors">Extension</a
        >
        <a href={resolve("/quizlet-to-anki")} class="hover:text-foreground transition-colors">
          Quizlet to Anki
        </a>
        <a
          href={resolve("/chatgpt-flashcards-to-anki")}
          class="hover:text-foreground transition-colors"
        >
          ChatGPT to Anki
        </a>
        <a href={resolve("/privacy")} class="hover:text-foreground transition-colors">Privacy</a>
      </div>
    </div>
  </footer>
</div>
