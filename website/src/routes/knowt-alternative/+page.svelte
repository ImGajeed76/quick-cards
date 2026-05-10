<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Accordion from "$lib/components/ui/accordion";
  import Github from "$lib/components/icons/Github.svelte";
  import { ArrowRight, Puzzle, Settings, Maximize2, MoreHorizontal } from "@lucide/svelte";
  import { resolve } from "$app/paths";
  import { SITE_NAME, SITE_URL, CWS_URL } from "$lib/site";
  import { track } from "$lib/analytics";
  import { reveal } from "$lib/actions/reveal";

  const title = `Knowt Only Imports 100 Quizlet Cards? Here's the Fix`;
  const description = `Knowt's Quizlet importer caps at 100 cards per set. If your set is larger, the rest don't come across. QuickCards has no such cap. Free, open-source, one click into Knowt.`;

  // FAQ content is rendered twice: once as visible <details> entries, once as
  // FAQPage JSON-LD so Google can surface rich snippets. Both must match.
  const faqs: { q: string; a: string }[] = [
    {
      q: "Why does Knowt only import 100 Quizlet cards?",
      a: "Technically it does not, but the default behavior caps at 100 unless you remember to scroll to the bottom of the Quizlet set and click 'See more' before triggering the import. Knowt's own help center confirms this. Most users do not know about that step, which is why the perception is widespread that the limit is fixed at 100. QuickCards uses a different fetch path that does not depend on the page being scrolled, so it gets the whole set without the See-more dance.",
    },
    {
      q: "How can I import more than 100 cards from Quizlet to Knowt?",
      a: "Two paths. Either scroll all the way down on the Quizlet set, click 'See more', and only then run Knowt's importer. Or install the QuickCards extension, open the Quizlet set, and use the widget that appears on the page to send the whole thing into Knowt. The QuickCards path skips the manual scroll step entirely.",
    },
    {
      q: "Can I merge multiple Quizlet sets into one Knowt set?",
      a: "Yes, with QuickCards. Open each set in its own tab and QuickCards offers to merge them into a single deck before export, with optional deduplication. Useful when a teacher splits a semester's vocab across weekly sets. Knowt's own importer is one-set-at-a-time.",
    },
    {
      q: "Is QuickCards free, and what's the catch?",
      a: "Free, open source (MIT licensed) on GitHub. No account needed for the converter itself; you only sign into Knowt if you want cards to land there. QuickCards runs in your browser, so your cards never touch a server we control. No upload, no ads.",
    },
    {
      q: "Does QuickCards work with Anki too?",
      a: "Yes. QuickCards exports Anki deck files (.apkg). There's an optional deadline mode that presets deck options for tight timelines (anecdotal, useful under two weeks, not science-backed). It also exports CSV, JSON, TXT, a print-ready flashcards PDF, and a vocab-list PDF.",
    },
    {
      q: "Do I need a Quizlet login?",
      a: "Only if the set itself is private. For public sets, QuickCards fetches the same data you'd see while signed out. It doesn't automate logins or touch anything behind your Quizlet account.",
    },
    {
      q: "Is Knowt still worth using?",
      a: "Yes, depending on how you study. Knowt is a strong choice if you want a free Quizlet-shaped study experience without paying for Quizlet Plus. The trade-offs versus Quizlet are real (ads, more aggressive than some users like) but for a lot of students it is the right answer. QuickCards is for the moment when you specifically need your data out, in a different format, or imported into Knowt without the scroll-then-click ritual.",
    },
  ];

  function slug(s: string): string {
    return s
      .toLowerCase()
      .replace(/['"?]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Knowt alternative",
        item: `${SITE_URL}/knowt-alternative`,
      },
    ],
  };

  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BrowserApplication",
    operatingSystem: "Chrome, Edge, Brave, Opera",
    url: SITE_URL,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  /* eslint-disable no-useless-escape */
  const faqJsonLdHtml = `<script type="application/ld+json">${JSON.stringify(faqJsonLd)}<\/script>`;
  const breadcrumbJsonLdHtml = `<script type="application/ld+json">${JSON.stringify(breadcrumbJsonLd)}<\/script>`;
  const appJsonLdHtml = `<script type="application/ld+json">${JSON.stringify(appJsonLd)}<\/script>`;
  /* eslint-enable no-useless-escape */

  function trackInstallClick(source: string): void {
    track("Install CTA click", { source });
  }

  // Card content for the data-loss visualization. Knowt's stack holds
  // the first 6 (basic terms that survive the 100-card cap). QuickCards
  // holds those 6 plus 12 more advanced terms that only exist in the
  // full deck. The user can hover-skim the QuickCards stack and see
  // the terms a Knowt user would never have got.
  const knowtCards = [
    { term: "ATP", def: "Cell's energy currency" },
    { term: "Cell", def: "Basic unit of life" },
    { term: "DNA", def: "Genetic blueprint" },
    { term: "Enzyme", def: "Reaction catalyst" },
    { term: "Gene", def: "DNA segment" },
    { term: "Mitosis", def: "Cell division" },
  ];
  const qcCards = [
    ...knowtCards,
    { term: "Nucleolus", def: "Ribosome assembly" },
    { term: "Osmosis", def: "Water across membrane" },
    { term: "Photolysis", def: "Split water with light" },
    { term: "Phylogeny", def: "Evolutionary tree" },
    { term: "Plasmid", def: "Circular DNA" },
    { term: "Ploidy", def: "Chromosome count" },
    { term: "Polymerase", def: "DNA-copying enzyme" },
    { term: "Ribosome", def: "Protein factory" },
    { term: "Substrate", def: "Enzyme target" },
    { term: "Telophase", def: "Late mitosis stage" },
    { term: "Vacuole", def: "Storage organelle" },
    { term: "Zygote", def: "Fertilized cell" },
  ];

  // Mouse-tracked ripple effect for the card stacks. Cursor Y drives a
  // gaussian-falloff displacement: cards near the cursor's Y push
  // outward (up or down depending on which side of the cursor they're
  // on), cards far from the cursor stay put. Reads as "skimming the
  // pile with a thumb". Each stack has its own state.
  let knowtCursorY = $state<number | null>(null);
  let qcCursorY = $state<number | null>(null);

  function onStackMove(e: MouseEvent, target: "knowt" | "qc"): void {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    if (target === "knowt") knowtCursorY = y;
    else qcCursorY = y;
  }

  function onStackLeave(target: "knowt" | "qc"): void {
    if (target === "knowt") knowtCursorY = null;
    else qcCursorY = null;
  }

  // baselineY is the card's resting Y position relative to the
  // container's bottom (negative because translateY moves up).
  function rippleOffset(baselineY: number, cursorY: number | null, containerH: number): number {
    if (cursorY === null) return 0;
    const cursorFromBottom = -(containerH - cursorY);
    const distance = baselineY - cursorFromBottom;
    const sigma = 28;
    const maxOffset = 30;
    const gaussian = Math.exp(-(distance * distance) / (2 * sigma * sigma));
    return Math.sign(distance) * gaussian * maxOffset;
  }
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <link rel="canonical" href={`${SITE_URL}/knowt-alternative`} />
  <!-- eslint-disable svelte/no-at-html-tags -->
  {@html faqJsonLdHtml}
  {@html breadcrumbJsonLdHtml}
  {@html appJsonLdHtml}
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
          onclick={() => trackInstallClick("knowt-header")}
          class="gap-2"
        >
          Add to Chrome
          <ArrowRight class="size-4" />
        </Button>
      </div>
    </nav>
  </header>

  <main class="flex-grow">
    <!-- ════════ Hero ════════
       Long-form content page (SEO landing). Narrow reading column for
       prose, but the hero gets the standard headline + accent + a tight
       data-loss visualization that makes "you lose two-thirds of your
       set" land in a glance. -->
    <section class="relative overflow-hidden px-6 pt-12 pb-16 sm:pt-16 sm:pb-20">
      <div
        aria-hidden="true"
        class="bg-primary pointer-events-none absolute -top-32 left-1/2 -z-10 h-[440px] w-[680px] -translate-x-1/2 rounded-full opacity-15 blur-[140px]"
      ></div>

      <div
        class="relative z-10 mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14"
      >
        <div>
          <h1
            class="text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl"
          >
            Knowt only imports 100 Quizlet cards.
            <span class="text-primary">Here's the fix.</span>
          </h1>
          <p class="text-muted-foreground mt-6 max-w-xl text-base leading-relaxed sm:text-lg">
            The fix inside Knowt is to scroll the Quizlet set to the bottom, click "See more", then
            run the importer. {SITE_NAME} skips the ritual: open the set, click the QuickCards banner,
            send the whole thing into Knowt. Any size.
          </p>

          <div class="mt-8 flex flex-wrap items-center gap-3">
            <Button
              href={CWS_URL}
              onclick={() => trackInstallClick("knowt-hero")}
              size="lg"
              class="group h-12 gap-2 px-6 text-base"
            >
              <Puzzle class="size-4" />
              Add to Chrome
              <ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Button
              href={resolve("/quizlet-to-anki")}
              variant="outline"
              size="lg"
              class="h-12 px-5"
            >
              Quizlet to Anki guide
            </Button>
          </div>
          <p class="text-muted-foreground/80 mt-6 font-mono text-xs tracking-wide">
            Free &nbsp;·&nbsp; No account &nbsp;·&nbsp; Open source
          </p>
        </div>

        <!-- Data-loss visualization. Two physical-feeling stacks of
             flashcards sharing a baseline. Each silhouette card is an
             outline rectangle (3:2 aspect); the topmost card on each
             stack is a specimen with term + divider + def. The two
             specimens are DIFFERENT cards from the same source set: the
             Knowt one is an early term that survived the 100-card cap,
             the QuickCards one is a later term that only exists in the
             full deck. Concrete demonstration of what's missing.

             Mouse-tracked ripple: as the cursor moves over a stack, the
             cards near its Y position spread outward via gaussian-
             falloff displacement, like skimming a pile with a thumb.
             Each stack tracks its cursor independently so they ripple
             on their own. -->
        <div class="grid grid-cols-2 items-end gap-8 perspective-[900px] sm:gap-12">
          <!-- Knowt stack: 6 basic terms (the ones that survive the cap). -->
          <div class="flex flex-col items-center gap-5">
            <div
              class="relative h-48 w-[120px]"
              style="transform: rotateX(-14deg); transform-style: preserve-3d;"
              onmousemove={(e) => onStackMove(e, "knowt")}
              onmouseleave={() => onStackLeave("knowt")}
              role="presentation"
            >
              {#each knowtCards as card, i (card.term)}
                {@const baseY = -i * 6}
                {@const ripple = rippleOffset(baseY, knowtCursorY, 192)}
                <div
                  class="border-border bg-card absolute inset-x-0 bottom-0 flex aspect-[3/2] flex-col items-center justify-center rounded-md border p-2 shadow-md shadow-black/30 transition-transform duration-200 ease-out"
                  style={`transform: translateY(${(baseY + ripple).toFixed(2)}px) translateX(${(Math.sin(i * 1.7) * 4).toFixed(2)}px) rotate(${(Math.sin(i * 2.3) * 2.5).toFixed(2)}deg);`}
                >
                  <div class="text-foreground text-[10px] leading-tight font-semibold">
                    {card.term}
                  </div>
                  <div class="bg-border/60 my-1 h-px w-3/4"></div>
                  <div class="text-muted-foreground text-center text-[7px] leading-tight">
                    {card.def}
                  </div>
                </div>
              {/each}
            </div>
            <div class="text-center">
              <div class="text-foreground text-2xl font-semibold tabular-nums">100</div>
              <div
                class="text-muted-foreground/70 mt-1 font-mono text-[10px] tracking-wider uppercase"
              >
                Knowt
              </div>
            </div>
          </div>

          <!-- QuickCards stack: 18 cards. The first 6 mirror Knowt's;
               the next 12 are advanced terms only present in the full
               deck. Hover-skim reveals what Knowt would have lost. -->
          <div class="flex flex-col items-center gap-5">
            <div
              class="relative h-48 w-[120px]"
              style="transform: rotateX(-14deg); transform-style: preserve-3d;"
              onmousemove={(e) => onStackMove(e, "qc")}
              onmouseleave={() => onStackLeave("qc")}
              role="presentation"
            >
              {#each qcCards as card, i (card.term)}
                {@const baseY = -i * 6}
                {@const ripple = rippleOffset(baseY, qcCursorY, 192)}
                <div
                  class="border-border bg-card absolute inset-x-0 bottom-0 flex aspect-[3/2] flex-col items-center justify-center rounded-md border p-2 shadow-md shadow-black/30 transition-transform duration-200 ease-out"
                  style={`transform: translateY(${(baseY + ripple).toFixed(2)}px) translateX(${(Math.sin(i * 1.7) * 4).toFixed(2)}px) rotate(${(Math.sin(i * 2.3) * 2.5).toFixed(2)}deg);`}
                >
                  <div class="text-foreground text-[10px] leading-tight font-semibold">
                    {card.term}
                  </div>
                  <div class="bg-border/60 my-1 h-px w-3/4"></div>
                  <div class="text-muted-foreground text-center text-[7px] leading-tight">
                    {card.def}
                  </div>
                </div>
              {/each}
            </div>
            <div class="text-center">
              <div class="text-foreground text-2xl font-semibold tabular-nums">300</div>
              <div
                class="text-muted-foreground/70 mt-1 font-mono text-[10px] tracking-wider uppercase"
              >
                QuickCards
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ════════ The user's experience of the cap ════════ -->
    <section use:reveal class="px-6 py-16 sm:py-20">
      <div class="mx-auto max-w-[720px]">
        <span class="text-muted-foreground mb-3 block font-mono text-xs tracking-wider uppercase">
          The cap
        </span>
        <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">Does this sound familiar?</h2>
        <div class="text-muted-foreground mt-5 space-y-4 text-[15px] leading-7">
          <p>
            You import a 300-card Quizlet set into Knowt. 100 cards come across. No error, no
            warning, no "partial import" flag. You find out the rest are missing when a word you
            expected never shows up in review.
          </p>
          <p>
            Technically the cap is not fixed at 100. Knowt's help center documents the workaround:
            before triggering the import, you have to open the Quizlet set, scroll all the way to
            the bottom, click "See more", and only then run the importer. Most people miss that
            step, so the practical effect is the same as a hard cap.
          </p>
          <p>
            {SITE_NAME} reads the set a different way that does not depend on what the page has rendered,
            so the scroll-then-click step is unnecessary. Full set, regardless of size, into Knowt or
            into Anki, PDF, CSV, JSON, TXT.
          </p>
        </div>
        <!-- Inline mockup faithful to the actual screenshot we used to
             ship: a cropped corner of a study-app set page. Top-left
             shows the bottom-right corner of a partial UI element
             extending off-frame, plus a row of free-floating icon
             controls and a short divider. The QuickCards floating
             banner sits in the bottom-right exactly where it would on
             a real page (faithful to extension/src/content/content.ts).
             Abstract enough to avoid brand replicas. -->
        <figure class="mt-8">
          <div
            class="border-border relative h-[280px] overflow-hidden rounded-md border bg-[#0E1029] shadow-xl shadow-black/30"
          >
            <!-- Partial card preview extending off the top-left edge -->
            <div
              aria-hidden="true"
              class="absolute -top-10 -left-10 h-28 w-40 rounded-2xl bg-[#2A2F4A]"
            ></div>

            <!-- Free-floating icon row + cut-off primary dot to the left -->
            <div class="absolute top-[120px] left-1 flex items-center gap-3 text-white/65">
              <span aria-hidden="true" class="bg-primary -ml-2 size-3 shrink-0 rounded-full"></span>
              <Settings class="size-5" />
              <Maximize2 class="size-5" />
            </div>

            <!-- Short divider, left side only -->
            <div
              aria-hidden="true"
              class="absolute top-[160px] left-0 h-px w-[110px] bg-white/15"
            ></div>

            <!-- The actual floating banner. Faithful to
                 extension/src/content/content.ts: horizontal pill,
                 "{N} cards" + 1px divider + Copy button (primary) +
                 ··· button. Bottom-right, 24/24 from edges. -->
            <div class="absolute right-6 bottom-6">
              <div
                class="border-border/70 bg-card text-foreground inline-flex items-center gap-3 rounded-lg border px-4 py-2 shadow-lg shadow-black/40"
              >
                <span class="text-muted-foreground text-xs">
                  <span class="text-foreground font-semibold tabular-nums">145</span> cards
                </span>
                <span class="bg-border/70 h-3.5 w-px"></span>
                <span
                  class="bg-primary text-primary-foreground rounded-md px-3 py-1 text-xs font-medium"
                >
                  Copy
                </span>
                <span
                  class="text-muted-foreground flex size-6 items-center justify-center rounded-md"
                >
                  <MoreHorizontal class="size-3.5" />
                </span>
              </div>
            </div>
          </div>
          <figcaption class="text-muted-foreground mt-3 text-xs">
            The {SITE_NAME} widget appears on any Quizlet set.
          </figcaption>
        </figure>
      </div>
    </section>

    <!-- ════════ Fair framing: Knowt is a real choice ════════ -->
    <section use:reveal class="px-6 py-16 sm:py-20">
      <div class="mx-auto max-w-[720px]">
        <span class="text-muted-foreground mb-3 block font-mono text-xs tracking-wider uppercase">
          The fair side
        </span>
        <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">
          When Knowt is the right call
        </h2>
        <div class="text-muted-foreground mt-5 space-y-4 text-[15px] leading-7">
          <p>
            QuickCards and Knowt are not the same shape and not really competing. Knowt is a free
            Quizlet-style study app with its own learn/test/match modes; QuickCards is a converter
            that gets your data out (or into Knowt) without changing where you study.
          </p>
          <p>
            If you want to keep studying in a Quizlet-shaped product without paying for Quizlet
            Plus, Knowt is a strong answer. The trade-offs are real (ads, an account is required)
            but for a lot of students it is the right pick. We use it ourselves for some sets.
          </p>
          <p>
            If you want your cards in Anki, on a printable PDF, in a CSV for a spreadsheet, or in
            Knowt without the scroll-then-click step, that is where {SITE_NAME} fits.
          </p>
        </div>
      </div>
    </section>

    <!-- ════════ Side-by-side scoreboard ════════
       Replaces a flat HTML comparison table with two profile-style
       columns: each path gets its own card, with the same labelled
       facts stacked vertically inside. The QuickCards column gets a
       subtle primary-tinted left border + slightly elevated bg so the
       eye reads it as the foregrounded path, without crossing into
       Knowt-bashing territory. -->
    <section use:reveal class="px-6 py-16 sm:py-20">
      <div class="mx-auto max-w-[720px]">
        <span class="text-muted-foreground mb-3 block font-mono text-xs tracking-wider uppercase">
          Side by side
        </span>
        <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">What's different</h2>
        <p class="text-muted-foreground mt-3 text-[15px] leading-7">
          Where the two paths actually diverge. Both are free, and both need a Knowt account if you
          want cards to end up in Knowt.
        </p>

        <div class="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-5">
          <!-- QuickCards column -->
          <div
            class="border-primary/40 bg-card relative rounded-lg border border-l-2 p-6 shadow-md shadow-black/20"
          >
            <div class="text-primary mb-5 text-sm font-semibold tracking-tight">
              {SITE_NAME}
            </div>
            <dl class="space-y-4">
              <div>
                <dt
                  class="text-muted-foreground/70 mb-1 font-mono text-[10px] tracking-wider uppercase"
                >
                  Cards per set
                </dt>
                <dd class="text-foreground text-sm leading-snug font-medium">
                  No limit, no extra steps
                </dd>
              </div>
              <div>
                <dt
                  class="text-muted-foreground/70 mb-1 font-mono text-[10px] tracking-wider uppercase"
                >
                  Merge multiple sets
                </dt>
                <dd class="text-foreground text-sm leading-snug font-medium">
                  Yes, with optional dedupe
                </dd>
              </div>
              <div>
                <dt
                  class="text-muted-foreground/70 mb-1 font-mono text-[10px] tracking-wider uppercase"
                >
                  Account
                </dt>
                <dd class="text-foreground text-sm leading-snug font-medium">
                  None for QuickCards itself; Knowt sign-in only when sending into Knowt
                </dd>
              </div>
              <div>
                <dt
                  class="text-muted-foreground/70 mb-1 font-mono text-[10px] tracking-wider uppercase"
                >
                  Output
                </dt>
                <dd class="text-foreground text-sm leading-snug font-medium">
                  Knowt, Anki, PDF, CSV, JSON, TXT
                </dd>
              </div>
            </dl>
          </div>

          <!-- Knowt column -->
          <div class="border-border bg-card/50 relative rounded-lg border p-6">
            <div class="text-foreground/85 mb-5 text-sm font-semibold tracking-tight">
              Knowt's Quizlet import
            </div>
            <dl class="space-y-4">
              <div>
                <dt
                  class="text-muted-foreground/70 mb-1 font-mono text-[10px] tracking-wider uppercase"
                >
                  Cards per set
                </dt>
                <dd class="text-muted-foreground text-sm leading-snug">
                  100 by default; "See more" first to get the rest
                </dd>
              </div>
              <div>
                <dt
                  class="text-muted-foreground/70 mb-1 font-mono text-[10px] tracking-wider uppercase"
                >
                  Merge multiple sets
                </dt>
                <dd class="text-muted-foreground text-sm leading-snug">One set at a time</dd>
              </div>
              <div>
                <dt
                  class="text-muted-foreground/70 mb-1 font-mono text-[10px] tracking-wider uppercase"
                >
                  Account
                </dt>
                <dd class="text-muted-foreground text-sm leading-snug">Knowt account (free)</dd>
              </div>
              <div>
                <dt
                  class="text-muted-foreground/70 mb-1 font-mono text-[10px] tracking-wider uppercase"
                >
                  Output
                </dt>
                <dd class="text-muted-foreground text-sm leading-snug">Knowt only</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>

    <!-- ════════ FAQ ════════ -->
    <section use:reveal class="px-6 py-16 sm:py-20">
      <div class="mx-auto max-w-[720px]">
        <span class="text-muted-foreground mb-3 block font-mono text-xs tracking-wider uppercase">
          FAQ
        </span>
        <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">
          Frequently asked questions
        </h2>
        <Accordion.Root
          type="multiple"
          class="border-border divide-border mt-6 divide-y rounded-lg border"
        >
          {#each faqs as faq (faq.q)}
            <Accordion.Item value={slug(faq.q)} id={slug(faq.q)} class="border-b-0">
              <Accordion.Trigger
                class="px-5 py-4 text-left text-[15px] font-medium hover:no-underline"
              >
                {faq.q}
              </Accordion.Trigger>
              <Accordion.Content class="text-muted-foreground px-5 pb-5 text-[15px] leading-7">
                {faq.a}
              </Accordion.Content>
            </Accordion.Item>
          {/each}
        </Accordion.Root>
      </div>
    </section>

    <!-- ════════ Closing CTA ════════ -->
    <section class="px-6 py-20 sm:py-24">
      <div class="mx-auto max-w-3xl text-center">
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
          Send the whole set into Knowt.
        </h2>
        <p class="text-muted-foreground mt-4 text-base leading-relaxed">
          Or skip Knowt entirely. Anki, PDF, CSV, JSON, TXT, your call.
        </p>
        <div class="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button
            href={CWS_URL}
            onclick={() => trackInstallClick("knowt-footer")}
            size="lg"
            class="group h-12 gap-2 px-6 text-base"
          >
            <Puzzle class="size-4" />
            Add to Chrome
            <ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
        <div
          class="text-muted-foreground/70 mt-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs"
        >
          <a
            href={resolve("/extension")}
            class="hover:text-foreground underline-offset-2 hover:underline"
          >
            Extension
          </a>
          <span>·</span>
          <a
            href={resolve("/tool")}
            class="hover:text-foreground underline-offset-2 hover:underline"
          >
            Web tool
          </a>
          <span>·</span>
          <a
            href={resolve("/quizlet-to-anki")}
            class="hover:text-foreground underline-offset-2 hover:underline"
          >
            Quizlet to Anki
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

  <p
    class="text-muted-foreground/70 mx-auto max-w-[720px] px-6 pb-10 text-center text-xs leading-relaxed"
  >
    QuickCards is an independent open-source project. Not affiliated with Knowt or Quizlet. Knowt
    and Quizlet are trademarks of their respective owners.
  </p>
</div>
