<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import Github from "$lib/components/icons/Github.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import { reveal } from "$lib/actions/reveal";
  import { resolve } from "$app/paths";
  import {
    ArrowRight,
    ClipboardPaste,
    Sparkles,
    Copy,
    Check,
    ArrowDown,
    Code2,
  } from "@lucide/svelte";
  import { SITE_NAME, SITE_URL } from "$lib/site";

  const title = `ChatGPT flashcards to Anki · ${SITE_NAME}`;
  const description =
    "Convert ChatGPT, Claude, Gemini, or DeepSeek flashcard output to an Anki deck file (.apkg). Ask any model for a CSV codeblock and paste it in. No cleanup, no add-on. Free, no account, in your browser, open source.";

  // Educational template shown on the page. The {COUNT} / {TOPIC}
  // placeholders teach the user how to parameterize. Asks for CSV
  // because: (a) every modern parser handles it, (b) less likely to
  // wrap in commentary than Markdown, (c) easier for the user to spot-
  // check than JSON.
  const promptTemplate = `You are an Anki card writer. Make {COUNT} flashcards on {TOPIC}.

Output a CSV codeblock with two columns: term and definition.
- First line: term,definition
- One card per line
- Use double quotes around any field that contains a comma
- No introduction, no notes, no other text, just the codeblock.`;

  // Concrete pre-filled version used by the "Try in ..." buttons. URL
  // openers like ChatGPT and Perplexity auto-submit the prompt on
  // landing, so placeholders would be sent as literal text and the
  // model would produce nonsense. The default is a demonstration; users
  // can edit count/topic in the chat once it lands.
  const tryItPrompt = `You are an Anki card writer. Make 10 flashcards on cell biology.

Output a CSV codeblock with two columns: term and definition.
- First line: term,definition
- One card per line
- Use double quotes around any field that contains a comma
- No introduction, no notes, no other text, just the codeblock.`;

  const tryItChatGPT = `https://chatgpt.com/?q=${encodeURIComponent(tryItPrompt)}`;
  const tryItPerplexity = `https://www.perplexity.ai/?q=${encodeURIComponent(tryItPrompt)}`;

  // Hero chat-mockup CSV. Plain version is what the codeblock copy
  // button puts on the clipboard. The HTML version (tinted commas, term
  // column in foreground, def column in muted-foreground) renders the
  // visible code. Safe {@html} since content is hardcoded by us, no
  // user input.
  const heroCsvPlain = `term,definition
Photosynthesis,Plants convert sunlight into chemical energy.
Mitosis,Cell division producing two identical cells.
Osmosis,Water diffuses across a semipermeable membrane.
Cytoplasm,Gel filling a cell.`;

  const heroCsvHtml = `<span class="text-muted-foreground/70">term</span><span class="text-primary/70">,</span><span class="text-muted-foreground/70">definition</span>
<span class="text-foreground">Photosynthesis</span><span class="text-primary/70">,</span><span class="text-muted-foreground">Plants convert sunlight into chemical energy.</span>
<span class="text-foreground">Mitosis</span><span class="text-primary/70">,</span><span class="text-muted-foreground">Cell division producing two identical cells.</span>
<span class="text-foreground">Osmosis</span><span class="text-primary/70">,</span><span class="text-muted-foreground">Water diffuses across a semipermeable membrane.</span>
<span class="text-foreground">Cytoplasm</span><span class="text-primary/70">,</span><span class="text-muted-foreground">Gel filling a cell.</span>`;

  let heroCsvCopied = $state(false);

  async function copyHeroCsv(): Promise<void> {
    try {
      await navigator.clipboard.writeText(heroCsvPlain);
      heroCsvCopied = true;
      setTimeout(() => (heroCsvCopied = false), 1500);
    } catch {
      // clipboard may be blocked; user can select manually
    }
  }

  let copied = $state(false);

  async function copyPrompt(): Promise<void> {
    try {
      await navigator.clipboard.writeText(promptTemplate);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      // clipboard may be blocked; user can select manually
    }
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What format should I ask the model for?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "A CSV codeblock with two columns (term, definition) is the cleanest. The parser also handles JSON arrays, Markdown tables, TSV, and plain dash-separated vocab lists.",
        },
      },
      {
        "@type": "Question",
        name: "Does it work with Claude, Gemini, Perplexity, and DeepSeek?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. The parser cares about the shape of the output, not the model. Any model that can produce a CSV codeblock works.",
        },
      },
      {
        "@type": "Question",
        name: "Will the model's mistakes show up in my deck?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, the same way they would if you pasted manually. QuickCards is a converter, not a fact-checker. Spot-check the parsed cards before saving the .apkg.",
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
        name: "ChatGPT flashcards to Anki",
        item: `${SITE_URL}/chatgpt-flashcards-to-anki`,
      },
    ],
  };
  /* eslint-disable no-useless-escape */
  const faqJsonLdHtml = `<script type="application/ld+json">${JSON.stringify(faqJsonLd)}<\/script>`;
  const breadcrumbJsonLdHtml = `<script type="application/ld+json">${JSON.stringify(breadcrumbJsonLd)}<\/script>`;
  /* eslint-enable no-useless-escape */
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <link rel="canonical" href={`${SITE_URL}/chatgpt-flashcards-to-anki`} />
  <!-- eslint-disable svelte/no-at-html-tags -->
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
    <!-- ════════ Hero: faux chat session as the centerpiece ════════
       Two chat bubbles followed by a "→ paste this into QuickCards" handoff.
       The visual itself communicates the workflow in one glance. -->
    <section class="relative overflow-hidden px-4 pt-12 pb-16 sm:px-6 sm:pt-16 sm:pb-20">
      <div
        aria-hidden="true"
        class="bg-primary pointer-events-none absolute -top-32 right-1/4 -z-10 h-[440px] w-[680px] rounded-full opacity-15 blur-[140px]"
      ></div>

      <div class="relative z-10 mx-auto max-w-5xl">
        <div class="mx-auto mb-10 max-w-2xl text-center">
          <h1
            class="text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl"
          >
            ChatGPT in,<br /><span class="text-primary">Anki out.</span>
          </h1>
          <p
            class="text-muted-foreground mx-auto mt-5 max-w-xl text-base leading-relaxed sm:text-lg"
          >
            Ask a model for flashcards, paste the reply, get an Anki deck file (.apkg). Works with
            ChatGPT, Claude, and Gemini.
          </p>
        </div>

        <!-- Hero mockup: just the model's CSV response and the QuickCards
             output pill. Dropped the chat-bubble wrappers, avatars, user
             prompt bubble, and action-button row, since they were each
             working hard for very little. The codeblock IS the response;
             the spatial relationship (codeblock → arrow → pill) carries
             the workflow without explicit "copy + paste" hand-holding. -->
        <div class="mx-auto max-w-xl">
          <!-- Model CSV codeblock. Copy icon is a real button that puts
               the plain CSV (no styling) on the clipboard. -->
          <div use:reveal>
            <div
              class="border-border/60 bg-card overflow-hidden rounded-lg border font-mono text-[12px] leading-relaxed shadow-xl shadow-black/30"
            >
              <div class="border-border/50 flex items-center justify-between border-b px-3 py-1.5">
                <div
                  class="text-muted-foreground/80 flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase"
                >
                  <Code2 class="size-3" />
                  csv
                </div>
                <button
                  type="button"
                  onclick={copyHeroCsv}
                  aria-label={heroCsvCopied ? "Copied" : "Copy CSV"}
                  class="text-muted-foreground/60 hover:text-foreground cursor-pointer transition-colors"
                >
                  {#if heroCsvCopied}
                    <Check class="size-3" />
                  {:else}
                    <Copy class="size-3" />
                  {/if}
                </button>
              </div>
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              <pre class="m-0 overflow-x-auto p-3">{@html heroCsvHtml}</pre>
            </div>
          </div>

          <!-- Single arrow handoff -->
          <div
            use:reveal={{ delay: 120 }}
            class="text-muted-foreground/50 my-3 flex justify-center"
          >
            <ArrowDown class="size-4" />
          </div>

          <!-- Output: outlined filename badge. Quiet enough that the
               primary-filled "Try it now" CTA below stays the loudest
               primary moment in the section. -->
          <div use:reveal={{ delay: 200 }} class="flex justify-center">
            <div
              class="border-border/70 bg-card text-foreground/85 inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-xs"
            >
              <ArrowDown class="text-primary size-3" />
              cards.apkg
            </div>
          </div>
        </div>

        <!-- CTA -->
        <div class="mt-12 flex flex-col items-center text-center">
          <Button href={resolve("/tool")} size="lg" class="group h-12 gap-2 px-6 text-base">
            <ClipboardPaste class="size-4" />
            Try it now
            <ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
          <p class="text-muted-foreground/80 mt-5 font-mono text-xs tracking-wide">
            Free &nbsp;·&nbsp; No account &nbsp;·&nbsp; Nothing uploaded &nbsp;·&nbsp; Open source
          </p>
        </div>
      </div>
    </section>

    <!-- ════════ The prompt as a real artifact ════════
       This is the page's deliverable. Big code block with a working copy
       button + "Try in <model>" launchers that pre-load the prompt with
       a concrete default into the chat of the user's choice. -->
    <section class="px-6 py-24 sm:py-32" use:reveal>
      <div class="mx-auto max-w-3xl">
        <div class="mb-8 flex items-baseline justify-between gap-4">
          <div>
            <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">A prompt that works.</h2>
            <p class="text-muted-foreground mt-2 text-sm leading-relaxed">
              Any model that can output CSV. Replace
              <code class="bg-muted text-foreground/80 rounded px-1 py-0.5 font-mono text-xs"
                >{"{COUNT}"}</code
              >
              and
              <code class="bg-muted text-foreground/80 rounded px-1 py-0.5 font-mono text-xs"
                >{"{TOPIC}"}</code
              >, paste the reply into QuickCards.
            </p>
          </div>
          <Button onclick={copyPrompt} size="sm" variant="outline" class="shrink-0 gap-1.5">
            {#if copied}
              <Check class="size-3.5" />
              Copied
            {:else}
              <Copy class="size-3.5" />
              Copy
            {/if}
          </Button>
        </div>

        <div
          class="border-border bg-card overflow-hidden rounded-lg border shadow-xl shadow-black/30"
        >
          <div
            class="border-border/60 bg-muted/30 text-muted-foreground/70 flex items-center justify-between gap-2 border-b px-4 py-2 font-mono text-[10px] tracking-wider uppercase"
          >
            <span>Prompt template</span>
            <span class="text-muted-foreground/50">{promptTemplate.length} chars</span>
          </div>
          <pre
            class="text-foreground/90 m-0 overflow-x-auto p-5 font-mono text-[13px] leading-relaxed whitespace-pre-wrap">{promptTemplate}</pre>
        </div>

        <!-- Try-in launchers. URL-prefilled prompt with a concrete
             default (10 cards on cell biology) since both ChatGPT and
             Perplexity auto-submit on landing. -->
        <div class="mt-5 flex flex-wrap items-center gap-2">
          <span
            class="text-muted-foreground/70 mr-1 font-mono text-[10px] tracking-wider uppercase"
          >
            Try a demo
          </span>
          <Button
            href={tryItChatGPT}
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
            variant="outline"
            class="gap-1.5"
          >
            <Sparkles class="size-3.5" />
            ChatGPT
          </Button>
          <Button
            href={tryItPerplexity}
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
            variant="outline"
            class="gap-1.5"
          >
            <Sparkles class="size-3.5" />
            Perplexity
          </Button>
        </div>
      </div>
    </section>

    <!-- ════════ Closing CTA ════════ -->
    <section class="px-6 py-24 sm:py-32">
      <div class="mx-auto max-w-3xl text-center">
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">Skip the cleanup step.</h2>
        <p class="text-muted-foreground mt-4 text-base leading-relaxed">
          Any AI's CSV output in, Anki deck file out. No spreadsheet detour.
        </p>
        <div class="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button href={resolve("/tool")} size="lg" class="group h-12 gap-2 px-6 text-base">
            <ClipboardPaste class="size-4" />
            Open the tool
            <ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
        <div
          class="text-muted-foreground/70 mt-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs"
        >
          <a
            href={resolve("/csv-to-anki")}
            class="hover:text-foreground underline-offset-2 hover:underline"
          >
            CSV to Anki
          </a>
          <span>·</span>
          <a
            href={resolve("/quizlet-to-anki")}
            class="hover:text-foreground underline-offset-2 hover:underline"
          >
            Quizlet to Anki
          </a>
          <span>·</span>
          <a
            href={resolve("/print-flashcards-from-quizlet")}
            class="hover:text-foreground underline-offset-2 hover:underline"
          >
            Print flashcards
          </a>
        </div>
      </div>
    </section>
  </main>

  <SiteFooter />
</div>
