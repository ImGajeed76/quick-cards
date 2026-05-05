<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import Github from "$lib/components/icons/Github.svelte";
  import { reveal } from "$lib/actions/reveal";
  import { track } from "$lib/analytics";
  import { resolve } from "$app/paths";
  import { ArrowRight, Puzzle, ClipboardPaste, Download, ChevronRight } from "@lucide/svelte";
  import { SITE_NAME, SITE_URL, CWS_URL } from "$lib/site";

  const title = `Convert Quizlet to Anki · ${SITE_NAME}`;
  const description =
    "Three ways to convert a Quizlet set to an Anki deck file (.apkg): the QuickCards browser extension (recommended, with images and audio), the QuickCards web tool (no install), or Quizlet's built-in export (limited to sets you created). Free, no account, open source.";

  function trackInstallClick(source: string): void {
    track("Install CTA click", { source });
  }

  const faq = [
    {
      q: "Can I convert a Quizlet set I didn't create?",
      a: "Yes, with the QuickCards extension. Quizlet's own export only works on sets you created yourself, but the extension reads any set you can open in your browser, including a teacher's set, a friend's set, or a set you copied. If you only have the exported text, paste it into the web tool.",
    },
    {
      q: "Will the images and audio come through to Anki?",
      a: "With the extension, yes. Images, user-recorded audio, and Quizlet's TTS audio bundle into the .apkg file so cards work offline. The web tool produces a text-only deck because pasted data does not include media. Anki's built-in CSV import also drops media unless you copy each file into the collection.media folder by hand.",
    },
    {
      q: "Do I need to install an Anki add-on?",
      a: "No. QuickCards builds the .apkg in your browser. You just open Anki and double-click the file (or use File, Import). It works the same on Anki desktop, AnkiMobile, AnkiDroid, and AnkiWeb.",
    },
    {
      q: "What about the deadline mode? Does it actually help?",
      a: "It is an optional toggle on the Anki export step. It adjusts deck options (desired retention, learn steps, max interval) for tight timelines. Anecdotal, not science-backed. Useful in our experience for cramming under two weeks. Past two weeks the values land at Anki defaults anyway, so it is not magic, just sensible presets. Fine to leave it off.",
    },
    {
      q: "Why not just use Quizlet's built-in export?",
      a: "Two reasons. One, it only works for sets you created yourself, so a teacher's set is off-limits. Two, it is text-only, no images or audio, and the output is a single block of text with custom separators that often gets crammed into a single Excel cell on paste.",
    },
    {
      q: "What about the Anki add-on that fetches from Quizlet?",
      a: "Strong choice when it works. The recurring trouble is that Quizlet's Cloudflare layer blocks its image and audio fetches periodically, and add-ons run on Anki desktop, not AnkiMobile or AnkiWeb. QuickCards rides your own browser session on the Quizlet tab, so there is nothing for Cloudflare to challenge.",
    },
    {
      q: "Is QuickCards free?",
      a: "Yes. Free, open source (MIT licensed), no account, runs in your browser. Source on GitHub.",
    },
  ];

  // FAQPage JSON-LD for rich-result eligibility on this page.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to convert a Quizlet set to an Anki deck",
    description:
      "Step-by-step: install the QuickCards browser extension, open a Quizlet set, click the QuickCards banner, choose Anki, save the .apkg, import into Anki.",
    totalTime: "PT2M",
    step: [
      {
        "@type": "HowToStep",
        name: "Install QuickCards",
        text: "Add the QuickCards browser extension from the Chrome Web Store, or sideload the release ZIP for Firefox.",
      },
      {
        "@type": "HowToStep",
        name: "Open the Quizlet set",
        text: "Navigate to the Quizlet set page in your browser. A small QuickCards banner appears at the bottom of the page with the card count.",
      },
      {
        "@type": "HowToStep",
        name: "Choose Anki",
        text: "Click the QuickCards banner, pick Anki .apkg as the export target. Optional: turn on deadline mode if you have an exam under two weeks away.",
      },
      {
        "@type": "HowToStep",
        name: "Import into Anki",
        text: "Open the downloaded .apkg with Anki (desktop, AnkiMobile, AnkiDroid, or AnkiWeb).",
      },
    ],
  };

  /* eslint-disable no-useless-escape */
  const faqJsonLdHtml = `<script type="application/ld+json">${JSON.stringify(faqJsonLd)}<\/script>`;
  const articleJsonLdHtml = `<script type="application/ld+json">${JSON.stringify(articleJsonLd)}<\/script>`;
  /* eslint-enable no-useless-escape */
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <link rel="canonical" href={`${SITE_URL}/quizlet-to-anki`} />
  <!-- eslint-disable svelte/no-at-html-tags -->
  {@html faqJsonLdHtml}
  {@html articleJsonLdHtml}
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
          onclick={() => trackInstallClick("q2a-header")}
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
    <article class="px-6 py-16 sm:py-24">
      <div class="mx-auto max-w-3xl">
        <span
          class="text-muted-foreground mb-4 inline-block font-mono text-xs tracking-wider uppercase"
        >
          Guide · Quizlet to Anki
        </span>
        <h1
          class="text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl"
        >
          Convert <span class="text-primary">Quizlet to Anki.</span>
        </h1>
        <p class="text-muted-foreground mt-6 text-lg leading-relaxed">
          You have a Quizlet set, you want it as an Anki deck file (.apkg), with images and audio
          intact, and you do not want to install an add-on or sign up for anything. Three ways to do
          it, depending on what you have and where you study.
        </p>

        <div class="mt-8 flex flex-wrap items-center gap-3">
          <Button
            href={CWS_URL}
            onclick={() => trackInstallClick("q2a-hero")}
            size="lg"
            class="group h-12 gap-2 px-6 text-base"
          >
            <Puzzle class="size-4" />
            Add to Chrome
            <ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
          <Button href={resolve("/tool")} variant="outline" size="lg" class="h-12 px-5 text-base">
            No install? Use the web tool
          </Button>
        </div>
        <p class="text-muted-foreground/80 mt-6 font-mono text-xs tracking-wide">
          Free &nbsp;·&nbsp; No account &nbsp;·&nbsp; Open source
        </p>
      </div>
    </article>

    <hr class="border-foreground/10 mx-auto w-3/5" aria-hidden="true" />

    <!-- ══════════════ Three ways ══════════════ -->
    <section class="px-6 py-20 sm:py-24" use:reveal>
      <div class="mx-auto max-w-3xl">
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">Three ways to do it.</h2>
        <p class="text-muted-foreground mt-4 leading-relaxed">
          Pick whichever fits your situation. The first option is what we recommend for most people
          because it carries images and audio across.
        </p>

        <div class="mt-12 space-y-12">
          <!-- Method 1: extension -->
          <div>
            <div class="mb-3 flex items-center gap-3">
              <span class="text-muted-foreground/70 font-mono text-sm tabular-nums">01</span>
              <span
                class="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 font-mono text-[10px] tracking-wider uppercase"
              >
                Recommended
              </span>
            </div>
            <h3 class="text-xl font-semibold tracking-tight sm:text-2xl">
              QuickCards browser extension
            </h3>
            <p class="text-muted-foreground mt-3 leading-relaxed">
              Add it to Chrome (or sideload it on Firefox), open the Quizlet set, click the
              QuickCards banner, pick Anki. The .apkg downloads with images and audio bundled in,
              ready to double-click into Anki desktop, AnkiMobile, AnkiDroid, or AnkiWeb. Works on
              any set you can open in your browser, including teacher's sets that Quizlet's own
              export blocks.
            </p>
            <ul
              class="text-muted-foreground/90 mt-4 list-inside list-disc space-y-1.5 pl-2 text-sm leading-relaxed"
            >
              <li>Bundles images, user audio, and Quizlet's TTS into the .apkg</li>
              <li>Works on sets you didn't create</li>
              <li>Optionally merges multiple open Quizlet tabs into one deck</li>
              <li>No Anki add-on required, works the same on every Anki client</li>
            </ul>
            <div class="mt-6 flex flex-wrap items-center gap-3">
              <Button href={CWS_URL} onclick={() => trackInstallClick("q2a-method1")} class="gap-2">
                <Puzzle class="size-4" />
                Add to Chrome
              </Button>
              <Button href={resolve("/extension")} variant="ghost" class="gap-2">
                Read more
                <ChevronRight class="size-4" />
              </Button>
            </div>
          </div>

          <!-- Method 2: web tool -->
          <div>
            <div class="mb-3 flex items-center gap-3">
              <span class="text-muted-foreground/70 font-mono text-sm tabular-nums">02</span>
              <span
                class="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 font-mono text-[10px] tracking-wider uppercase"
              >
                No install
              </span>
            </div>
            <h3 class="text-xl font-semibold tracking-tight sm:text-2xl">
              QuickCards web tool, paste mode
            </h3>
            <p class="text-muted-foreground mt-3 leading-relaxed">
              If you cannot install browser extensions (locked-down school computer, mobile browser,
              Safari without extensions enabled), the web tool accepts pasted text. Use Quizlet's
              built-in Export feature to copy the set as text (only works on sets you created
              yourself), paste it into QuickCards, get the .apkg. Text-only, no images or audio, but
              no install needed.
            </p>
            <div class="mt-6 flex flex-wrap items-center gap-3">
              <Button href={resolve("/tool")} class="gap-2">
                <ClipboardPaste class="size-4" />
                Open the web tool
              </Button>
            </div>
          </div>

          <!-- Method 3: Quizlet's own export -->
          <div>
            <div class="mb-3 flex items-center gap-3">
              <span class="text-muted-foreground/70 font-mono text-sm tabular-nums">03</span>
              <span
                class="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 font-mono text-[10px] tracking-wider uppercase"
              >
                Limited
              </span>
            </div>
            <h3 class="text-xl font-semibold tracking-tight sm:text-2xl">
              Quizlet's built-in export, then Anki's CSV import
            </h3>
            <p class="text-muted-foreground mt-3 leading-relaxed">
              The path Quizlet officially supports. Open your set, choose Export, copy the text,
              save it as a .csv or .tsv, then import the file into Anki. Works fine for sets you
              created yourself with no media, but breaks for the common cases: sets you copied or
              saved from someone else (export option is gone), sets with images or audio (text
              only), and sets with unusual characters (Excel re-encodes UTF-8 weirdly on macOS).
              Listed for completeness; reach for one of the first two options if you can.
            </p>
          </div>
        </div>
      </div>
    </section>

    <hr class="border-foreground/10 mx-auto w-3/5" aria-hidden="true" />

    <!-- ══════════════ Quick steps ══════════════ -->
    <section class="px-6 py-20 sm:py-24" use:reveal>
      <div class="mx-auto max-w-3xl">
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
          Two-minute walkthrough (extension).
        </h2>
        <ol class="mt-10 space-y-8">
          <li class="flex gap-5">
            <div
              class="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md"
            >
              <Puzzle class="size-4" />
            </div>
            <div>
              <div class="text-foreground font-medium">Install the extension</div>
              <p class="text-muted-foreground mt-1 leading-relaxed">
                <a
                  href="https://chromewebstore.google.com/detail/quickcards/kjbjdolelcchfcmainniifnpkgikjfkc"
                  onclick={() => trackInstallClick("q2a-step1")}
                  class="text-foreground hover:text-primary underline-offset-4 hover:underline"
                >
                  Add to Chrome from the Chrome Web Store</a
                >. Or sideload the release ZIP if you are on Firefox.
              </p>
            </div>
          </li>
          <li class="flex gap-5">
            <div
              class="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md"
            >
              <ChevronRight class="size-4" />
            </div>
            <div>
              <div class="text-foreground font-medium">Open the Quizlet set in your browser</div>
              <p class="text-muted-foreground mt-1 leading-relaxed">
                A small QuickCards banner appears at the bottom right with the card count. If you
                are signed in, you can also see private sets your account has access to.
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
              <div class="text-foreground font-medium">Click Anki, save the file, import</div>
              <p class="text-muted-foreground mt-1 leading-relaxed">
                Open the .apkg with Anki on whichever device you study on. The cards land with
                images, audio, and Quizlet's TTS already bundled in.
              </p>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <hr class="border-foreground/10 mx-auto w-3/5" aria-hidden="true" />

    <!-- ══════════════ FAQ ══════════════ -->
    <section class="px-6 py-20 sm:py-24" use:reveal>
      <div class="mx-auto max-w-3xl">
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
          Questions people actually ask.
        </h2>
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
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">Ready to convert?</h2>
        <p class="text-muted-foreground mt-4 text-lg leading-relaxed">
          The extension is the fastest path. The web tool is the no-install fallback. Both are free,
          open source, run in your browser.
        </p>
        <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button
            href={CWS_URL}
            onclick={() => trackInstallClick("q2a-footer")}
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
        <a href={resolve("/knowt-alternative")} class="hover:text-foreground transition-colors">
          Coming from Knowt?
        </a>
        <a href={resolve("/privacy")} class="hover:text-foreground transition-colors">Privacy</a>
      </div>
    </div>
  </footer>
</div>
