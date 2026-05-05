<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import Github from "$lib/components/icons/Github.svelte";
  import { reveal } from "$lib/actions/reveal";
  import { resolve } from "$app/paths";
  import { ArrowRight, ClipboardPaste, Sparkles } from "@lucide/svelte";
  import { SITE_NAME, SITE_URL } from "$lib/site";

  const title = `ChatGPT flashcards to Anki · ${SITE_NAME}`;
  const description =
    "Convert ChatGPT, Claude, or Gemini flashcard output to an Anki deck file (.apkg). Paste a Markdown table, a numbered list, or a JSON array. No cleanup, no add-on. Free, no account, in your browser, open source.";

  const faq = [
    {
      q: "What format should I ask the model for?",
      a: "Whatever it gives you naturally tends to work. Markdown tables are most common from ChatGPT and Claude and the parser handles them directly. Numbered lists with bold Front/Back labels work too. JSON arrays of objects work as long as the keys are something obvious like term/definition or front/back. If your model returns multiple formats in one reply, paste only the table or list portion.",
    },
    {
      q: "Does it work with Claude and Gemini, not just ChatGPT?",
      a: "Yes. The parser cares about the shape of the output, not which model produced it. Claude tends to default to Markdown tables. Gemini varies but Markdown tables and numbered lists are common. Local models via Ollama or LM Studio behave the same way.",
    },
    {
      q: "What if the model adds extra columns or context columns?",
      a: "Two-column tables (term, definition) are the cleanest. Three columns are also fine, the third is treated as supplemental and added to the back of the card. If the model produces something elaborate (front, hint, back, mnemonic), trim to two columns before pasting, or paste it and use the cards-preview step on QuickCards to spot anything weird before downloading.",
    },
    {
      q: "Will the model's mistakes show up in my deck?",
      a: "Yes, the same way they would if you pasted into Anki manually. QuickCards is a converter, not a fact-checker. Spot-check the cards in the preview step before saving the .apkg. Models hallucinate; review what you study.",
    },
    {
      q: "Why not just have the model output CSV directly?",
      a: "You can ask. The trouble is models often add code-block fences (```csv … ```), inconsistent quoting, or a header row in disguise. Markdown tables are visually clearer for the model to render and easier for the parser to handle reliably. CSV from a model also works in QuickCards but is less consistent.",
    },
    {
      q: "Can I paste a long conversation, not just the cards?",
      a: "It is better to paste only the table or list. The parser is designed to recognize structured data, not to extract cards from prose. Copy from where the table starts to where it ends.",
    },
    {
      q: "What about images the model wants to attach?",
      a: "Models do not actually attach images, they reference them with placeholders. The pasted-text path cannot carry media. If you need images bundled into the .apkg, that requires the QuickCards browser extension on a source that has them (a Quizlet set), not chat output.",
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

  const examplePrompt = `You are an Anki card writer. Make ${"<count>"} flashcards on ${"<topic>"}.
Output a Markdown table with two columns: Front and Back.
Front is concise (a term, a question, or a cloze prompt).
Back is the answer in one sentence.
No introduction, no notes, just the table.`;
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
          Guide · ChatGPT flashcards to Anki
        </span>
        <h1
          class="text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl"
        >
          ChatGPT flashcards to <span class="text-primary">Anki, in one paste.</span>
        </h1>
        <p class="text-muted-foreground mt-6 text-lg leading-relaxed">
          Ask a model for flashcards, get back a Markdown table or numbered list, paste it into
          QuickCards, get an Anki deck file (.apkg). Same flow for Claude and Gemini. The parser
          handles the table syntax so you do not have to clean it by hand.
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

    <!-- ══════════════ Why this is finicky elsewhere ══════════════ -->
    <section class="px-6 py-20 sm:py-24" use:reveal>
      <div class="mx-auto max-w-3xl">
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
          The Markdown table problem.
        </h2>
        <p class="text-muted-foreground mt-4 leading-relaxed">
          ChatGPT and Claude default to Markdown tables when asked for flashcards. Tables look clean
          in chat. They are also a pain to import: Anki's CSV importer needs comma- or tab-separated
          input, not pipes. Most people end up either deleting the leading and trailing pipes by
          hand, dropping the separator row (the one with dashes), and saving as CSV; or pasting into
          Excel, fighting the auto-formatting, exporting CSV, importing into Anki, and hoping the
          encoding survives.
        </p>
        <p class="text-muted-foreground mt-4 leading-relaxed">
          QuickCards reads Markdown tables directly. Paste, see your cards, download the .apkg. That
          is the whole loop.
        </p>
      </div>
    </section>

    <hr class="border-foreground/10 mx-auto w-3/5" aria-hidden="true" />

    <!-- ══════════════ A prompt that works ══════════════ -->
    <section class="px-6 py-20 sm:py-24" use:reveal>
      <div class="mx-auto max-w-3xl">
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">A prompt that works.</h2>
        <p class="text-muted-foreground mt-4 leading-relaxed">
          Replace the placeholders with your topic and card count. Paste the model's reply straight
          into QuickCards. Works on ChatGPT, Claude, Gemini, and most local models.
        </p>
        <div class="border-border bg-card/40 mt-8 rounded-lg border p-5">
          <pre
            class="overflow-x-auto font-mono text-sm leading-relaxed whitespace-pre-wrap">{examplePrompt}</pre>
        </div>
        <p class="text-muted-foreground mt-6 text-sm leading-relaxed">
          The "no introduction, no notes, just the table" line matters. Without it, models sometimes
          wrap the table in commentary that the parser will silently include as cards. Easy to fix
          in the preview step but easier to avoid.
        </p>
      </div>
    </section>

    <hr class="border-foreground/10 mx-auto w-3/5" aria-hidden="true" />

    <!-- ══════════════ Steps ══════════════ -->
    <section class="px-6 py-20 sm:py-24" use:reveal>
      <div class="mx-auto max-w-3xl">
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">Three quick steps.</h2>
        <ol class="mt-10 space-y-8">
          <li class="flex gap-5">
            <div
              class="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md"
            >
              <Sparkles class="size-4" />
            </div>
            <div>
              <div class="text-foreground font-medium">Generate cards</div>
              <p class="text-muted-foreground mt-1 leading-relaxed">
                Use the prompt above (or your own). Copy the model's reply, the whole table.
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
              <div class="text-foreground font-medium">Paste into QuickCards</div>
              <p class="text-muted-foreground mt-1 leading-relaxed">
                <a
                  href={resolve("/tool")}
                  class="text-foreground hover:text-primary underline-offset-4 hover:underline"
                  >Open the tool</a
                >, paste, hit Continue. Spot-check the parsed cards. If the model added explanation
                rows, deselect them or regenerate with a stricter prompt.
              </p>
            </div>
          </li>
          <li class="flex gap-5">
            <div
              class="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md"
            >
              <ArrowRight class="size-4" />
            </div>
            <div>
              <div class="text-foreground font-medium">Save Anki deck file (.apkg)</div>
              <p class="text-muted-foreground mt-1 leading-relaxed">
                Pick Anki, save, double-click into Anki on whichever device you study on.
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

    <!-- ══════════════ FAQ ══════════════ -->
    <section class="px-6 py-20 sm:py-24" use:reveal>
      <div class="mx-auto max-w-3xl">
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">Common questions.</h2>
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
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">Skip the cleanup step.</h2>
        <p class="text-muted-foreground mt-4 text-lg leading-relaxed">
          Markdown table in, Anki deck file out. No spreadsheet detour.
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
        <a href={resolve("/csv-to-anki")} class="hover:text-foreground transition-colors">
          CSV to Anki
        </a>
        <a href={resolve("/quizlet-to-anki")} class="hover:text-foreground transition-colors">
          Quizlet to Anki
        </a>
        <a href={resolve("/privacy")} class="hover:text-foreground transition-colors">Privacy</a>
      </div>
    </div>
  </footer>
</div>
