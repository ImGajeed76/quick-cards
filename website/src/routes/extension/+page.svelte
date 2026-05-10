<script lang="ts">
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import Github from "$lib/components/icons/Github.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import { reveal } from "$lib/actions/reveal";
  import { track } from "$lib/analytics";
  import { resolve } from "$app/paths";
  import { ArrowRight, Puzzle, MoreHorizontal, Play, Lock } from "@lucide/svelte";
  import { SITE_NAME, SITE_URL, CWS_URL, SITE_REPO } from "$lib/site";

  let { data } = $props();

  const title = `${SITE_NAME} extension · One-click Quizlet to Anki, PDF, CSV, JSON, Knowt`;
  const description =
    "Browser extension that runs on any Quizlet set page. One click and the set is yours: Anki deck file (.apkg) with images and audio bundled, printable PDF, CSV, JSON, TXT, or directly into your Knowt account. Free, no account, open source.";

  function trackInstallClick(source: string): void {
    track("Install CTA click", { source });
  }

  // svelte-ignore state_referenced_locally
  let displayStars = $state<number | null>(data.stars);

  onMount(() => {
    const initial = data.stars;
    if (initial === null || initial < 4) return;
    displayStars = 0;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number): void => {
      const t = Math.min((now - start) / 700, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      displayStars = Math.round(initial * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  function formatStars(n: number): string {
    if (n < 1000) return String(n);
    return (Math.round((n / 1000) * 10) / 10).toString().replace(/\.0$/, "") + "k";
  }

  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${SITE_NAME} (extension)`,
    applicationCategory: "BrowserApplication",
    operatingSystem: "Chrome, Edge, Brave, Opera, Firefox (sideload)",
    url: `${SITE_URL}/extension`,
    description,
    installUrl: CWS_URL,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    sameAs: [SITE_REPO, CWS_URL],
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does the extension work without a Quizlet account?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes for public sets. The extension reads what your browser has already rendered. For private sets, sign in to Quizlet first and the extension reads them too.",
        },
      },
      {
        "@type": "Question",
        name: "Does the .apkg include images and audio?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Images, user-recorded audio, and Quizlet's TTS bundle into the .apkg. CSV imports drop these by design; QuickCards keeps them.",
        },
      },
      {
        "@type": "Question",
        name: "Will the .apkg work on mobile and AnkiWeb?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. The .apkg imports the same on Anki desktop, AnkiMobile (iOS), AnkiDroid, and AnkiWeb.",
        },
      },
      {
        "@type": "Question",
        name: "Is QuickCards available for Firefox?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes via sideload from the GitHub releases. Chrome, Edge, Brave, and Opera install directly from the Chrome Web Store.",
        },
      },
      {
        "@type": "Question",
        name: "Is QuickCards open source?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. MIT licensed, source on GitHub. Runs entirely in your browser, no account, no upload.",
        },
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
        name: "Extension",
        item: `${SITE_URL}/extension`,
      },
    ],
  };
  /* eslint-disable no-useless-escape */
  const appJsonLdHtml = `<script type="application/ld+json">${JSON.stringify(appJsonLd)}<\/script>`;
  const faqJsonLdHtml = `<script type="application/ld+json">${JSON.stringify(faqJsonLd)}<\/script>`;
  const breadcrumbJsonLdHtml = `<script type="application/ld+json">${JSON.stringify(breadcrumbJsonLd)}<\/script>`;
  /* eslint-enable no-useless-escape */

  const tileTints = [
    "from-violet-500/30 to-violet-700/10",
    "from-cyan-400/30 to-cyan-700/10",
    "from-rose-400/30 to-amber-500/10",
    "from-blue-400/30 to-indigo-700/10",
    "from-emerald-400/30 to-cyan-700/10",
    "from-amber-400/30 to-rose-500/10",
  ] as const;
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <link rel="canonical" href={`${SITE_URL}/extension`} />
  <link rel="preconnect" href="https://api.github.com" crossorigin="anonymous" />
  <!-- eslint-disable svelte/no-at-html-tags -->
  {@html appJsonLdHtml}
  {@html faqJsonLdHtml}
  {@html breadcrumbJsonLdHtml}
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
          {#if displayStars !== null}
            <span class="text-sm tabular-nums">{formatStars(displayStars)}</span>
          {:else}
            <span class="hidden sm:inline">GitHub</span>
          {/if}
        </Button>
        <Button
          size="sm"
          href={CWS_URL}
          onclick={() => trackInstallClick("ext-header")}
          class="gap-2"
        >
          Add to Chrome
          <ArrowRight class="size-4" />
        </Button>
      </div>
    </nav>
  </header>

  <main class="flex-grow">
    <!-- ════════ Hero: same flashcard-app silhouette twice ════════
       Two identical generic-flashcard-app silhouettes side by side. The
       only difference: the right one has the QuickCards floating banner
       overlaid at the bottom right, faithful to the actual content-script
       UI (horizontal pill, "{N} cards" + Copy + ··· ). The visual itself
       carries the entire pitch: same tab, this one extra thing. -->
    <section class="relative overflow-hidden px-4 pt-12 pb-20 sm:px-6 sm:pt-16 sm:pb-24">
      <div
        aria-hidden="true"
        class="bg-primary pointer-events-none absolute -top-40 left-1/2 -z-10 h-[480px] w-[760px] -translate-x-1/2 rounded-full opacity-15 blur-[160px]"
      ></div>

      <div class="relative z-10 mx-auto max-w-4xl">
        <div class="mx-auto mb-12 max-w-2xl text-center">
          <h1 class="text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl md:text-6xl">
            Same tab.<br /><span class="text-primary">One extra thing.</span>
          </h1>
          <p
            class="text-muted-foreground mx-auto mt-5 max-w-xl text-base leading-relaxed sm:text-lg"
          >
            Browser extension. Lives only on your flashcard tab. Click it, get an Anki deck file
            (.apkg), printable PDF, CSV, JSON, or send to Knowt. Free, open source, no account.
          </p>
        </div>

        <!-- Twin silhouettes -->
        <div class="grid items-end gap-4 sm:grid-cols-2 sm:gap-5">
          <!-- Without QuickCards. Labeled subtle. -->
          <div class="relative">
            <div
              class="text-muted-foreground/70 mb-3 px-1 font-mono text-[10px] tracking-wider uppercase"
            >
              Without it
            </div>
            <div
              class="border-border/60 overflow-hidden rounded-lg border shadow-xl shadow-black/40"
            >
              <!-- Window chrome -->
              <div class="border-border/40 border-b px-3 py-2">
                <div class="flex gap-1.5">
                  <span class="size-2 rounded-full bg-red-500/70"></span>
                  <span class="size-2 rounded-full bg-yellow-500/70"></span>
                  <span class="size-2 rounded-full bg-green-500/70"></span>
                </div>
              </div>
              <!-- Generic flashcard-app silhouette -->
              <div class="bg-[#0E1029] p-4">
                <div class="mb-4 flex items-center justify-between">
                  <div class="h-3 w-32 rounded bg-white/15"></div>
                  <div class="h-3 w-12 rounded bg-white/10"></div>
                </div>
                <div class="mb-3 grid grid-cols-3 gap-1.5">
                  {#each tileTints as tint, i (i)}
                    <div
                      class="flex items-center gap-2 rounded-md bg-[#171A36] px-2 py-1.5 text-[10px]"
                    >
                      <span class={`size-3 shrink-0 rounded bg-gradient-to-br ${tint}`}></span>
                      <span class="h-1.5 w-10 rounded bg-white/15"></span>
                    </div>
                  {/each}
                </div>
                <div class="flex h-24 items-center justify-center rounded-md bg-[#13162E]">
                  <div class="h-2.5 w-2/3 rounded bg-white/30"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- With QuickCards. Same silhouette + the actual banner. -->
          <div class="relative">
            <div class="text-primary/90 mb-3 px-1 font-mono text-[10px] tracking-wider uppercase">
              With QuickCards
            </div>
            <div
              class="border-border/60 ring-primary/20 shadow-primary/10 overflow-hidden rounded-lg border shadow-2xl ring-1"
            >
              <div class="border-border/40 border-b px-3 py-2">
                <div class="flex gap-1.5">
                  <span class="size-2 rounded-full bg-red-500/70"></span>
                  <span class="size-2 rounded-full bg-yellow-500/70"></span>
                  <span class="size-2 rounded-full bg-green-500/70"></span>
                </div>
              </div>
              <div class="relative bg-[#0E1029] p-4">
                <div class="mb-4 flex items-center justify-between">
                  <div class="h-3 w-32 rounded bg-white/15"></div>
                  <div class="h-3 w-12 rounded bg-white/10"></div>
                </div>
                <div class="mb-3 grid grid-cols-3 gap-1.5">
                  {#each tileTints as tint, i (i)}
                    <div
                      class="flex items-center gap-2 rounded-md bg-[#171A36] px-2 py-1.5 text-[10px]"
                    >
                      <span class={`size-3 shrink-0 rounded bg-gradient-to-br ${tint}`}></span>
                      <span class="h-1.5 w-10 rounded bg-white/15"></span>
                    </div>
                  {/each}
                </div>
                <div class="flex h-24 items-center justify-center rounded-md bg-[#13162E]">
                  <div class="h-2.5 w-2/3 rounded bg-white/30"></div>
                </div>

                <!-- The actual floating banner. Faithful to
                     extension/src/content/content.ts: horizontal pill,
                     "<N> cards" + 1px divider + Copy button (primary) +
                     32x32 ··· button. Internal proportions kept at the
                     real extension's sizing; the whole banner is scaled
                     down via CSS scale anchored to bottom-right so it
                     reads as small inside the silhouette without losing
                     the real-extension look. -->
                <div class="absolute right-3 bottom-3 origin-bottom-right scale-65">
                  <div
                    class="border-border/70 bg-card text-foreground inline-flex items-center gap-3 rounded-lg border px-4 py-2 shadow-lg shadow-black/40"
                  >
                    <span class="text-muted-foreground text-xs">
                      <span class="text-foreground font-semibold tabular-nums">37</span> cards
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
            </div>
          </div>
        </div>

        <div class="mt-12 flex flex-col items-center text-center">
          <Button
            href={CWS_URL}
            onclick={() => trackInstallClick("ext-hero")}
            size="lg"
            class="h-12 gap-2 px-6 text-base"
          >
            <Puzzle class="size-4" />
            Add to Chrome
          </Button>
          <div
            class="text-muted-foreground/80 mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-xs"
          >
            <span>Free</span>
            <span>·</span>
            <span>No account</span>
            <span>·</span>
            <span>Open source</span>
            <span>·</span>
            <a
              href="https://github.com/ImGajeed76/quick-cards/tree/main/extension#sideload-manual-install"
              class="hover:text-foreground underline-offset-2 hover:underline"
            >
              Firefox? Sideload
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- ════════ The actual differentiator ════════
       Manifesto-style. Four short claims with primary-colored opening
       qualifiers, each its own line. Reads as overheard not as prose. -->
    <section class="px-6 py-24 sm:py-32" use:reveal>
      <div class="mx-auto max-w-4xl">
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
          Reads any set you can see.
        </h2>
        <ul class="divide-border/50 mt-8 divide-y text-[17px] leading-relaxed">
          <!-- Even unowned: faux set menu with Export struck through. -->
          <li class="grid gap-4 py-6 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center sm:gap-8">
            <div class="border-border/60 bg-card overflow-hidden rounded-md border shadow-sm">
              <div class="border-border/30 text-foreground/85 border-b px-2.5 py-1 text-[10px]">
                Edit
              </div>
              <div
                class="border-border/30 text-muted-foreground/40 border-b px-2.5 py-1 text-[10px] line-through"
              >
                Export
              </div>
              <div class="text-foreground/85 px-2.5 py-1 text-[10px]">Print</div>
            </div>
            <div class="flex flex-col gap-1.5">
              <span class="text-primary font-mono text-xs tracking-wider uppercase">
                Even unowned
              </span>
              <span class="text-muted-foreground">
                Teacher's sets, friend's sets, copies, anything rendered in your tab. Quizlet's own
                export gives up; this doesn't.
              </span>
            </div>
          </li>

          <!-- With media: mini Anki card. Image-band on top reads as
               "media included", centered term below, divider, then a
               TTS pill (matches the AnkiCardsPreview visual language).
               Drops the truncated "cell div" def to reduce density at
               this scale. -->
          <li class="grid gap-4 py-6 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center sm:gap-8">
            <div
              class="border-border/60 bg-card flex flex-col items-center gap-1.5 rounded-md border p-2.5 shadow-sm"
            >
              <div
                class="h-10 w-full rounded bg-gradient-to-br from-violet-500/55 via-cyan-500/45 to-rose-500/45"
              ></div>
              <div class="text-foreground text-[11px] leading-none font-semibold">Mitose</div>
              <div class="bg-border/70 h-px w-3/4"></div>
              <span
                class="text-muted-foreground/70 flex size-3.5 items-center justify-center rounded-full bg-white/5"
              >
                <Play class="size-1.5 fill-current" />
              </span>
            </div>
            <div class="flex flex-col gap-1.5">
              <span class="text-primary font-mono text-xs tracking-wider uppercase">
                With media
              </span>
              <span class="text-muted-foreground">
                Images, user audio, and TTS bundle into the .apkg. CSV imports drop these; we don't.
              </span>
            </div>
          </li>

          <!-- Same origin: tiny browser window with quizlet.com in the
               URL bar plus skeleton page hints below. Reads as "we live
               inside this tab", which is the architectural point. -->
          <li class="grid gap-4 py-6 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center sm:gap-8">
            <div class="border-border/60 bg-card overflow-hidden rounded-md border shadow-sm">
              <div class="border-border/40 flex items-center gap-1.5 border-b px-2 py-1.5">
                <span class="size-1.5 rounded-full bg-red-500/70"></span>
                <span class="size-1.5 rounded-full bg-yellow-500/70"></span>
                <span class="size-1.5 rounded-full bg-green-500/70"></span>
                <div
                  class="bg-muted/50 ml-1 inline-flex flex-1 items-center gap-1 rounded-sm px-1.5 py-0.5"
                >
                  <Lock class="text-muted-foreground/70 size-2 shrink-0" />
                  <span class="text-foreground/80 truncate font-mono text-[8px]">quizlet.com</span>
                </div>
              </div>
              <div class="space-y-1 p-2">
                <div class="bg-muted-foreground/30 h-1 w-3/4 rounded"></div>
                <div class="bg-muted-foreground/20 h-1 w-1/2 rounded"></div>
                <div class="bg-muted-foreground/20 h-1 w-2/3 rounded"></div>
                <div class="bg-muted-foreground/15 h-1 w-1/3 rounded"></div>
              </div>
            </div>
            <div class="flex flex-col gap-1.5">
              <span class="text-primary font-mono text-xs tracking-wider uppercase">
                Same origin
              </span>
              <span class="text-muted-foreground">
                Runs on the page, so its fetches go out from quizlet.com with the user's real
                session. Cloudflare sees same-origin traffic and treats it accordingly.
              </span>
            </div>
          </li>

          <!-- Every client: 2x2 grid of Anki platforms. -->
          <li class="grid gap-4 py-6 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center sm:gap-8">
            <div class="grid grid-cols-2 gap-1">
              {#each ["desktop", "iOS", "droid", "web"] as label, i (i)}
                <div
                  class="border-border/60 bg-card flex items-center gap-1.5 rounded border px-1.5 py-1 font-mono text-[9px] shadow-sm"
                >
                  <span class="bg-primary/70 size-1 shrink-0 rounded-full"></span>
                  <span class="text-muted-foreground tracking-wider uppercase">{label}</span>
                </div>
              {/each}
            </div>
            <div class="flex flex-col gap-1.5">
              <span class="text-primary font-mono text-xs tracking-wider uppercase">
                Every client
              </span>
              <span class="text-muted-foreground">
                The .apkg you download imports the same on desktop, AnkiMobile, AnkiDroid, and
                AnkiWeb. Email it, AirDrop it, share it.
              </span>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <!-- ════════ Closing ════════ -->
    <section class="px-6 py-24 sm:py-32">
      <div class="mx-auto flex max-w-3xl flex-col items-center text-center">
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
          Get it once, use it on every tab.
        </h2>
        <p class="text-muted-foreground mt-4 max-w-md text-sm leading-relaxed">
          Installs in about 10 seconds. Lives only on quizlet.com pages. No data leaves your
          browser.
        </p>
        <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button
            href={CWS_URL}
            onclick={() => trackInstallClick("ext-footer")}
            size="lg"
            class="h-12 gap-2 px-6 text-base"
          >
            <Puzzle class="size-4" />
            Add to Chrome
          </Button>
          <Button
            href="https://github.com/ImGajeed76/quick-cards/tree/main/extension#sideload-manual-install"
            variant="outline"
            size="lg"
            class="h-12 px-5 text-base"
          >
            Firefox / sideload
          </Button>
        </div>
        <div class="text-muted-foreground/70 mt-8 text-xs">
          Open source, MIT licensed.
          <a
            href="https://github.com/ImGajeed76/quick-cards"
            class="text-foreground hover:text-primary ml-0.5 underline-offset-2 hover:underline"
          >
            View on GitHub</a
          >
          ·
          <a
            href={resolve("/quizlet-to-anki")}
            class="text-foreground hover:text-primary ml-0.5 underline-offset-2 hover:underline"
          >
            Quizlet to Anki guide
          </a>
        </div>
      </div>
    </section>
  </main>

  <SiteFooter />
</div>
