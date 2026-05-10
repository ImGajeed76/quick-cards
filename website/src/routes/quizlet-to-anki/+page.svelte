<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { HoverCard, HoverCardTrigger, HoverCardContent } from "$lib/components/ui/hover-card";
  import Github from "$lib/components/icons/Github.svelte";
  import { reveal } from "$lib/actions/reveal";
  import { track } from "$lib/analytics";
  import { resolve } from "$app/paths";
  import {
    ArrowRight,
    Puzzle,
    ChevronRight,
    ClipboardPaste,
    Image as ImageIcon,
    Play,
    Pencil,
    BookPlus,
    Copy as CopyIcon,
    Printer,
    GitMerge,
    Download,
    Code2,
    Trash2,
    Info,
  } from "@lucide/svelte";
  import { SITE_NAME, SITE_URL, CWS_URL } from "$lib/site";

  const title = `Convert Quizlet to Anki · ${SITE_NAME}`;
  const description =
    "How to convert a Quizlet set to an Anki deck file (.apkg) with images and audio. Browser extension, web tool, or Quizlet's export, depending on your situation. Free, no account, open source.";

  function trackInstallClick(source: string): void {
    track("Install CTA click", { source });
  }

  // Reader-mood prompts. Each one anchors a section below. Phrasing matches
  // what real users actually say in r/Anki and AnkiForums threads, so this
  // page does not read like a feature list, it reads like a reply.
  const moods = [
    {
      id: "exam",
      quote: "I have an exam tomorrow.",
      lede: "Forget the perfect setup. Get the cards into Anki, drill, sleep.",
    },
    {
      id: "teacher-set",
      quote: "It's a teacher's set. I can't export.",
      lede: "Quizlet's own export is locked to creators. You don't need it.",
    },
    {
      id: "addon-broke",
      quote: "The Anki addon keeps breaking.",
      lede: "Cloudflare keeps tripping it. There's a way around.",
    },
    {
      id: "media",
      quote: "I want the images and audio.",
      lede: "They're in the .apkg. No collection.media folder dance.",
    },
  ] as const;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: moods.map((m) => ({
      "@type": "Question",
      name: m.quote,
      acceptedAnswer: { "@type": "Answer", text: m.lede },
    })),
  };
  const howtoJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Convert a Quizlet set to an Anki deck",
    description:
      "Install the QuickCards browser extension, open the Quizlet set, click the QuickCards banner, choose Anki, save the .apkg, import into Anki on any client.",
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
        text: "The QuickCards banner appears at the bottom of the set page with the card count.",
      },
      {
        "@type": "HowToStep",
        name: "Choose Anki",
        text: "One click. Images and audio bundle into the .apkg.",
      },
      {
        "@type": "HowToStep",
        name: "Import into Anki",
        text: "Open the .apkg with Anki on desktop, AnkiMobile, AnkiDroid, or AnkiWeb.",
      },
    ],
  };
  /* eslint-disable no-useless-escape */
  const faqJsonLdHtml = `<script type="application/ld+json">${JSON.stringify(faqJsonLd)}<\/script>`;
  const howtoJsonLdHtml = `<script type="application/ld+json">${JSON.stringify(howtoJsonLd)}<\/script>`;
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
  {@html howtoJsonLdHtml}
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
    <!-- ════════ Hero + mood tiles ════════
       The page opens by inviting the reader to pick the line that sounds
       like them. Each tile anchors a section below. Visual treatment: a
       large primary-color opening quote on the left, the user's voice in
       the middle, an arrow on the right. Reads like overheard speech, not
       like another feature card grid. -->
    <section class="relative overflow-hidden px-4 pt-12 pb-12 sm:px-6 sm:pt-16 sm:pb-14">
      <div
        aria-hidden="true"
        class="bg-primary pointer-events-none absolute -top-32 left-1/2 -z-10 h-[420px] w-[680px] -translate-x-1/2 rounded-full opacity-15 blur-[140px]"
      ></div>

      <div class="mx-auto max-w-3xl">
        <div class="mb-8 text-center">
          <h1
            class="text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl"
          >
            Convert <span class="text-primary">Quizlet to Anki.</span>
          </h1>
          <p
            class="text-muted-foreground mx-auto mt-5 max-w-xl text-base leading-relaxed sm:text-lg"
          >
            Pick the line that sounds like you. Each one is a different way out.
          </p>
        </div>

        <div class="space-y-3">
          {#each moods as m, i (m.id)}
            <a
              href={`#${m.id}`}
              use:reveal={{ delay: i * 60 }}
              class="border-border hover:bg-card/80 hover:border-primary/40 group flex items-center gap-4 rounded-lg border p-4 transition-colors sm:gap-5 sm:p-5"
            >
              <span
                aria-hidden="true"
                class="text-primary/70 group-hover:text-primary -mt-2 font-serif text-5xl leading-none transition-colors sm:text-6xl"
              >
                "
              </span>
              <div class="flex-1">
                <div class="text-foreground text-base font-medium sm:text-lg">{m.quote}</div>
                <div class="text-muted-foreground mt-0.5 text-sm">{m.lede}</div>
              </div>
              <ChevronRight
                class="text-muted-foreground/50 group-hover:text-primary size-4 shrink-0 transition-colors"
              />
            </a>
          {/each}
        </div>
      </div>
    </section>

    <!-- ════════ Section: Exam tomorrow ════════
       Two-column: text left, vertical timing-stack right.
       (LRLR pattern: section 1 = text-left.) -->
    <section id="exam" class="scroll-mt-20 px-6 py-20 sm:py-28" use:reveal>
      <div class="mx-auto grid max-w-5xl items-start gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
        <div>
          <div class="mb-6 flex items-center gap-3">
            <span class="text-primary font-mono text-xs tracking-wider uppercase">
              01 · exam tomorrow
            </span>
            <span class="bg-border/60 h-px w-12"></span>
          </div>
          <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">
            Cards in Anki in under a minute.
          </h2>
          <p class="text-muted-foreground mt-4 leading-relaxed">
            Add the
            <a
              href="https://chromewebstore.google.com/detail/quickcards/kjbjdolelcchfcmainniifnpkgikjfkc"
              onclick={() => trackInstallClick("q2a-exam")}
              class="text-foreground hover:text-primary underline-offset-2 hover:underline"
            >
              QuickCards extension</a
            >
            to Chrome. Open your Quizlet set. Click the banner. Pick Anki. Open the .apkg with Anki on
            whatever device you'll study on. You're now drilling.
          </p>
          <div class="mt-7 flex flex-wrap gap-3">
            <Button href={CWS_URL} onclick={() => trackInstallClick("q2a-exam-cta")}>
              <Puzzle class="size-4" />
              Add to Chrome
            </Button>
            <Button href={resolve("/extension")} variant="ghost">
              More about the extension
              <ChevronRight class="size-4" />
            </Button>
          </div>
        </div>

        <!-- Vertical timing breakdown. Each step on its own line with a
             monospace timing pill. -->
        <div class="border-border max-w-xs rounded-lg border p-4 sm:p-5 lg:max-w-none">
          <div class="text-muted-foreground/70 mb-3 font-mono text-[10px] tracking-wider uppercase">
            estimated · start to finish
          </div>
          <div class="divide-border/50 divide-y">
            {#each [{ step: "Install extension", t: "~10s" }, { step: "Open Quizlet, export", t: "~20s" }, { step: "Open .apkg in Anki", t: "~10s" }] as row, i (row.step)}
              <div class="flex items-center gap-3 py-2.5">
                <span class="text-primary/70 font-mono text-[10px] tabular-nums">
                  0{i + 1}
                </span>
                <span class="text-foreground/85 flex-1 text-sm">{row.step}</span>
                <span
                  class="text-muted-foreground bg-muted/40 rounded px-2 py-0.5 font-mono text-[11px] tabular-nums"
                >
                  {row.t}
                </span>
              </div>
            {/each}
            <div class="flex items-center gap-3 pt-3">
              <span class="text-primary font-mono text-[10px] tabular-nums">≈</span>
              <span class="text-foreground flex-1 text-sm font-medium">Total</span>
              <span
                class="text-primary bg-primary/10 rounded px-2 py-0.5 font-mono text-[11px] tabular-nums"
              >
                under 1 min
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ════════ Section: Teacher's set ════════
       Two-column: menu mockup LEFT, text RIGHT.
       (LRLR pattern: section 2 = visual-left.) -->
    <section id="teacher-set" class="scroll-mt-20 px-6 py-20 sm:py-28" use:reveal>
      <div class="mx-auto grid max-w-5xl items-start gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
        <!-- Inline mockup: a generic "set menu" patterned after how flashcard
             apps usually structure their dropdown. Export struck through as a
             visual shorthand for "you can't" on a teacher's set. -->
        <div class="order-2 lg:order-1">
          <div
            class="border-border max-w-xs overflow-hidden rounded-lg border shadow-lg lg:mx-auto"
          >
            <div
              class="border-border/50 text-muted-foreground/70 border-b px-3 py-1.5 font-mono text-[10px] tracking-wider uppercase"
            >
              teacher's set · menu
            </div>
            <ul class="text-sm">
              {#each [{ icon: Pencil, label: "Edit" }, { icon: BookPlus, label: "Add to course" }, { icon: CopyIcon, label: "Copy set" }, { icon: Printer, label: "Print" }, { icon: GitMerge, label: "Merge" }, { icon: Download, label: "Export", strike: true }, { icon: Code2, label: "Embed" }, { icon: Trash2, label: "Delete", danger: true }] as item (item.label)}
                {@const Icon = item.icon}
                <li
                  class={[
                    "flex items-center gap-3 px-3 py-2",
                    item.strike && "text-muted-foreground/50 line-through decoration-1",
                    item.danger && !item.strike && "text-rose-400/80",
                    !item.strike && !item.danger && "text-foreground/85",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <Icon class="size-4 shrink-0" />
                  <span>{item.label}</span>
                </li>
              {/each}
            </ul>
          </div>
        </div>

        <div class="order-1 lg:order-2">
          <div class="mb-6 flex items-center gap-3">
            <span class="text-primary font-mono text-xs tracking-wider uppercase">
              02 · teacher's set
            </span>
            <span class="bg-border/60 h-px w-12"></span>
          </div>
          <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">
            Quizlet's export is locked to creators. You don't need it.
          </h2>
          <p class="text-muted-foreground mt-4 leading-relaxed">
            Since the rules tightened, Quizlet only lets you export sets you created yourself. Saved
            a teacher's set? Copied a friend's set? The Export option is gone.
          </p>
          <p class="text-muted-foreground mt-4 leading-relaxed">
            QuickCards reads any set your browser can render. Including teacher's sets.
          </p>
          <div class="mt-7">
            <Button href={CWS_URL} onclick={() => trackInstallClick("q2a-teacher-cta")}>
              <Puzzle class="size-4" />
              Add to Chrome
            </Button>
          </div>
        </div>
      </div>
    </section>

    <!-- ════════ Section: Addon keeps breaking ════════
       Two-column: text LEFT, 403/200 stack RIGHT (vertical, narrow column).
       (LRLR pattern: section 3 = text-left.) -->
    <section id="addon-broke" class="scroll-mt-20 px-6 py-20 sm:py-28" use:reveal>
      <div class="mx-auto grid max-w-5xl items-start gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
        <div>
          <div class="mb-6 flex items-center gap-3">
            <span class="text-primary font-mono text-xs tracking-wider uppercase">
              03 · the add-on path
            </span>
            <span class="bg-border/60 h-px w-12"></span>
          </div>
          <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">
            Quizlet talking to Quizlet.
          </h2>
          <p class="text-muted-foreground mt-4 leading-relaxed">
            The established Anki add-on for Quizlet runs from outside the browser. Its requests go
            out cross-origin, without the user's session attached, and Cloudflare's bot mitigation
            sometimes challenges them on images and audio. The common workaround, unchecking audio
            download, gets you a deck without the audio.
          </p>
          <p class="text-muted-foreground mt-4 leading-relaxed">
            QuickCards runs as a browser extension on the Quizlet page. Its fetches go out from
            quizlet.com with the user's real session attached, so Cloudflare sees same-origin
            traffic and treats it accordingly. Quizlet talking to Quizlet, essentially.
          </p>
        </div>

        <!-- Architectural-symptom visual. Two stacked rows: the friction
             that comes with fetching from outside the browser, then the
             friction-free route via in-tab session. Neutral titles, no
             attack on any specific project. -->
        <div>
          <div class="border-border overflow-hidden rounded-lg border">
            <div
              class="text-muted-foreground/70 border-border/50 flex items-center justify-between border-b px-4 py-2 font-mono text-[10px] tracking-wider uppercase"
            >
              <span>external fetch · rough spots</span>
              <span class="text-muted-foreground/60">3</span>
            </div>
            <ul class="divide-border/40 divide-y text-sm">
              {#each [{ title: "Cloudflare verification on image fetch", note: "intermittent" }, { title: "Audio sometimes missing on large sets", note: "throttled" }, { title: "Re-patches after Quizlet front-end updates", note: "maintenance" }] as item (item.title)}
                <li class="flex items-start gap-3 px-4 py-3">
                  <span class="bg-muted-foreground/40 mt-1 inline-block size-2 rounded-full"></span>
                  <div class="min-w-0 flex-1">
                    <div class="text-foreground/90 truncate text-[13px]">{item.title}</div>
                    <div class="text-muted-foreground/70 mt-0.5 font-mono text-[10px]">
                      {item.note}
                    </div>
                  </div>
                </li>
              {/each}
            </ul>
          </div>

          <div class="text-muted-foreground/40 my-3 text-center font-mono text-[10px]">
            ↓ in-tab session, none of the above
          </div>

          <div
            class="border-primary/30 bg-primary/5 flex items-center justify-between gap-3 rounded-lg border px-4 py-3"
          >
            <div class="flex items-center gap-2.5">
              <span class="bg-primary inline-block size-2 rounded-full"></span>
              <span class="text-foreground/90 text-[13px] font-medium">QuickCards</span>
            </div>
            <span
              class="text-primary bg-primary/10 rounded px-2 py-0.5 font-mono text-[11px] tabular-nums"
            >
              clean path
            </span>
          </div>

          <div class="mt-3 flex justify-end">
            <HoverCard openDelay={120}>
              <HoverCardTrigger
                class="text-muted-foreground/70 hover:text-foreground inline-flex items-center gap-1.5 text-xs underline-offset-2 hover:underline"
              >
                <Info class="size-3" />
                about this comparison
              </HoverCardTrigger>
              <HoverCardContent class="w-80 text-xs leading-relaxed">
                <p class="text-muted-foreground">
                  Illustrative, not real issue titles. The established Anki path is
                  <a
                    href="https://github.com/sviatoslav-lebediev/anki-quizlet-importer-extended"
                    class="text-foreground hover:text-primary underline-offset-2 hover:underline"
                  >
                    anki-quizlet-importer-extended
                  </a>
                  , well-built and actively maintained. It runs as a desktop add-on; QuickCards runs as
                  a browser extension on the page. Same destination, different architecture.
                </p>
              </HoverCardContent>
            </HoverCard>
          </div>
        </div>
      </div>
    </section>

    <!-- ════════ Section: Media in deck ════════
       Two-column: Anki-style card mockup LEFT (on desktop), text RIGHT.
       (LRLR pattern: section 4 = visual-left.) On mobile the text reads
       first, mockup follows. -->
    <section id="media" class="scroll-mt-20 px-6 py-20 sm:py-28" use:reveal>
      <div class="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
        <!-- Anki-style card mockup. Stacked siblings behind for deck feel. -->
        <div class="relative order-2 mx-auto w-full max-w-sm lg:order-1">
          <div
            aria-hidden="true"
            class="border-border bg-background absolute inset-0 -translate-x-2 translate-y-2 -rotate-3 rounded-xl border opacity-60"
          ></div>
          <div
            aria-hidden="true"
            class="border-border bg-background absolute inset-0 translate-x-1.5 -translate-y-1.5 rotate-2 rounded-xl border opacity-80"
          ></div>
          <div
            class="border-border bg-background relative flex flex-col items-center rounded-xl border px-5 py-6 shadow-2xl shadow-black/40"
          >
            <!-- Image area. Gradient placeholder; abstract, on-brand. -->
            <div
              class="flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-emerald-700/35 via-amber-500/25 to-rose-500/25"
            >
              <ImageIcon class="size-6 text-white/30" />
            </div>

            <!-- Front term + TTS triangle -->
            <div class="text-foreground mt-5 text-lg font-semibold">Photosynthesis</div>
            <span
              class="text-muted-foreground/70 mt-1.5 flex size-5 items-center justify-center rounded-full bg-white/5"
            >
              <Play class="size-2 fill-current" />
            </span>

            <!-- Divider -->
            <div class="border-border/60 my-4 w-3/4 border-t"></div>

            <!-- Back + TTS triangle -->
            <div class="text-muted-foreground text-center text-sm leading-relaxed">
              Plants convert sunlight into chemical energy.
            </div>
            <span
              class="text-muted-foreground/70 mt-1.5 flex size-5 items-center justify-center rounded-full bg-white/5"
            >
              <Play class="size-2 fill-current" />
            </span>
          </div>
        </div>

        <!-- Text column on the right (lg). Appears first on mobile so the
             section reads top-down naturally. -->
        <div class="order-1 lg:order-2">
          <div class="mb-6 flex items-center gap-3">
            <span class="text-primary font-mono text-xs tracking-wider uppercase">
              04 · media intact
            </span>
            <span class="bg-border/60 h-px w-12"></span>
          </div>
          <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">
            Image, audio, TTS bundled into the .apkg.
          </h2>
          <p class="text-muted-foreground mt-4 leading-relaxed">
            CSV imports drop media unless you copy each file into Anki's collection.media folder by
            hand. We don't do that. The .apkg is self-contained. Email it, AirDrop it, share it.
            Imports the same on every Anki client.
          </p>
          <div
            class="text-muted-foreground/70 mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px]"
          >
            <span>Images</span>
            <span>·</span>
            <span>User audio</span>
            <span>·</span>
            <span>Quizlet TTS</span>
            <span>·</span>
            <span>all in the .apkg</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ════════ Closing: comparison + CTA ════════
       One short, fair comparison block at the very end (not the focus of
       the page, just a parking spot for users who want it), then closing
       CTA. Compresses the previous "three methods" section. -->
    <section class="px-6 py-24 sm:py-32">
      <div class="mx-auto max-w-3xl">
        <div class="mb-8 max-w-xl">
          <span class="text-muted-foreground mb-3 block font-mono text-xs tracking-wider uppercase">
            If you want options
          </span>
          <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">
            Three paths, fairly compared.
          </h2>
        </div>
        <div class="border-border divide-border divide-y rounded-lg border">
          <div class="space-y-1.5 p-5">
            <div class="flex items-baseline justify-between gap-3">
              <h3 class="text-sm font-medium">QuickCards extension</h3>
              <span class="text-primary/80 font-mono text-[10px] uppercase">recommended</span>
            </div>
            <p class="text-muted-foreground text-sm leading-relaxed">
              On any Quizlet tab, with images and audio bundled. No add-on, multi-set merge built
              in.
            </p>
          </div>
          <div class="space-y-1.5 p-5">
            <div class="flex items-baseline justify-between gap-3">
              <h3 class="text-sm font-medium">
                <a
                  href="https://github.com/sviatoslav-lebediev/anki-quizlet-importer-extended"
                  class="hover:text-primary underline-offset-2 hover:underline"
                >
                  anki-quizlet-importer-extended
                </a>
                <span class="text-muted-foreground/80">(Anki add-on)</span>
              </h3>
              <span class="text-muted-foreground/70 font-mono text-[10px] uppercase">
                older path
              </span>
            </div>
            <p class="text-muted-foreground text-sm leading-relaxed">
              Established and maintained. Desktop add-on, more setup, occasional Cloudflare friction
              on media.
            </p>
          </div>
          <div class="space-y-1.5 p-5">
            <div class="flex items-baseline justify-between gap-3">
              <h3 class="text-sm font-medium">Quizlet's own export + Anki CSV import</h3>
              <span class="text-muted-foreground/70 font-mono text-[10px] uppercase">
                if it works
              </span>
            </div>
            <p class="text-muted-foreground text-sm leading-relaxed">
              Built in. Only on sets you created, plain text only, encoding gotchas on macOS.
            </p>
          </div>
        </div>

        <div class="mt-12 text-center">
          <h3 class="text-3xl font-semibold tracking-tight sm:text-4xl">Ready to convert?</h3>
          <div class="mt-7 flex flex-wrap items-center justify-center gap-3">
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
              <ClipboardPaste class="size-4" />
              Web tool instead
            </Button>
          </div>
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
          Knowt?
        </a>
        <a href={resolve("/privacy")} class="hover:text-foreground transition-colors">Privacy</a>
      </div>
    </div>
  </footer>
</div>
