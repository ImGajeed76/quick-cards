<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import Github from "$lib/components/icons/Github.svelte";
  import { reveal } from "$lib/actions/reveal";
  import { resolve } from "$app/paths";
  import { ArrowRight, ClipboardPaste, ChevronRight, Play } from "@lucide/svelte";
  import { SITE_NAME, SITE_URL } from "$lib/site";

  const title = `CSV to Anki · ${SITE_NAME}`;
  const description =
    "Convert a CSV, TSV, Google Sheets paste, or Excel column pair to an Anki deck file (.apkg). No add-on, no field mapping, no encoding headaches. Free, no account, in your browser, open source.";

  // Faux spreadsheet contents. The first SELECTED_COUNT rows are styled
  // as a selected range (violet outline + tinted bg). The trailing
  // unselected row(s) keep the selection outline away from the
  // spreadsheet's rounded outer corners and read as "this is part of a
  // bigger document, the user only selected the top rows."
  const sheet = [
    { term: "Photosynthesis", def: "Plants convert sunlight to energy" },
    { term: "Mitosis", def: "Cell divides into two identical cells" },
    { term: "Osmosis", def: "Water moves across a membrane" },
    { term: "Ribosome", def: "Synthesizes proteins from mRNA" },
    { term: "Cytoplasm", def: "Gel-like substance filling a cell" },
  ];
  const SELECTED_COUNT = 4;

  // The selection outline is drawn as a single absolute overlay element
  // that sits above the cells in z-order. This way the gray inter-row
  // and inter-column gridlines stay visible inside the selection, and
  // the violet outline renders unbroken on top of them.
  let rowRefs = $state<(HTMLDivElement | undefined)[]>([]);
  const selectionStyle = $derived.by(() => {
    const first = rowRefs[0];
    const last = rowRefs[SELECTED_COUNT - 1];
    if (!first || !last) return "display: none;";
    const top = first.offsetTop;
    const height = last.offsetTop + last.offsetHeight - top;
    return `top: ${top}px; height: ${height}px;`;
  });

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Do I need an Anki add-on?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. QuickCards builds the .apkg in your browser. Double-click it into Anki on any client.",
        },
      },
      {
        "@type": "Question",
        name: "What about accents and special characters?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Pasting works because the data is already decoded by your browser. The classic Excel-saves-Latin-1 problem doesn't apply, since there's no save-to-disk-then-reload step.",
        },
      },
      {
        "@type": "Question",
        name: "Can I include images or audio?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Pasted CSV is text-only. The QuickCards browser extension on Quizlet handles media end-to-end if your data is from there.",
        },
      },
    ],
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
    <!-- ════════ Hero: spreadsheet → cards split ════════
       Faux spreadsheet on the left, faux Anki card stack on the right, an
       arrow-with-label between them. The visual itself shows the workflow.
       Headline sits centered above. -->
    <section class="relative overflow-hidden px-4 pt-12 pb-16 sm:px-6 sm:pt-16 sm:pb-20">
      <div
        aria-hidden="true"
        class="bg-primary pointer-events-none absolute -top-32 left-1/2 -z-10 h-[460px] w-[760px] -translate-x-1/2 rounded-full opacity-15 blur-[150px]"
      ></div>

      <div class="relative z-10 mx-auto max-w-6xl">
        <div class="mx-auto mb-12 max-w-2xl text-center">
          <h1
            class="text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl"
          >
            CSV to <span class="text-primary">Anki,</span> no add-on.
          </h1>
          <p
            class="text-muted-foreground mx-auto mt-5 max-w-xl text-base leading-relaxed sm:text-lg"
          >
            Copy two columns out of a spreadsheet, paste into QuickCards, get an Anki deck file
            (.apkg). No field mapping, no encoding gotchas, no add-on.
          </p>
        </div>

        <!-- Centerpiece split: faux spreadsheet + arrow + faux Anki cards -->
        <div class="grid items-center gap-6 sm:gap-2 lg:grid-cols-[1fr_auto_1fr] lg:gap-4">
          <!-- Faux spreadsheet, mimicking Sheets/Excel. mx-auto + max-w
               so both side blocks center in their 1fr columns and the
               PASTE pill sits with equal visual whitespace on each side. -->
          <div use:reveal class="mx-auto w-full max-w-md">
            <div
              class="border-border/70 relative overflow-hidden rounded-lg border shadow-2xl shadow-black/40"
            >
              <!-- App-bar -->
              <div class="border-border/50 bg-muted/30 flex items-center gap-2 border-b px-3 py-2">
                <div class="flex gap-1">
                  <span class="size-2.5 rounded-full bg-red-500/70"></span>
                  <span class="size-2.5 rounded-full bg-yellow-500/70"></span>
                  <span class="size-2.5 rounded-full bg-green-500/70"></span>
                </div>
                <span
                  class="text-muted-foreground/80 ml-2 font-mono text-[10px] tracking-wider uppercase"
                >
                  vocab.csv
                </span>
              </div>
              <!-- Column headers (A B) -->
              <div
                class="border-border/40 bg-muted/20 text-muted-foreground/70 grid grid-cols-[28px_1fr_1fr] border-b font-mono text-[10px]"
              >
                <div class="border-border/40 border-r py-1.5 text-center"></div>
                <div class="border-border/40 border-r py-1.5 text-center font-medium">A</div>
                <div class="py-1.5 text-center font-medium">B</div>
              </div>
              <!-- Header row (the labels) -->
              <div
                class="border-border/40 grid grid-cols-[28px_1fr_1fr] border-b text-xs font-medium"
              >
                <div
                  class="bg-muted/20 text-muted-foreground/70 border-border/40 border-r py-1.5 text-center font-mono text-[10px]"
                >
                  1
                </div>
                <div class="border-border/40 text-foreground/90 border-r px-2.5 py-1.5">term</div>
                <div class="text-foreground/90 px-2.5 py-1.5">definition</div>
              </div>
              <!-- Data rows. The gray inter-row and inter-column
                   gridlines are restored on cells; the violet selection
                   outline is drawn separately as an absolute overlay
                   below, which sits above the cells in z-order so the
                   outline stays continuous. -->
              {#each sheet as row, i (row.term)}
                {@const isSelected = i < SELECTED_COUNT}
                <div
                  bind:this={rowRefs[i]}
                  class={[
                    "grid grid-cols-[28px_1fr_1fr] text-xs",
                    i < sheet.length - 1 && "border-border/30 border-b",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div
                    class="bg-muted/20 text-muted-foreground/70 border-border/40 border-r py-1.5 text-center font-mono text-[10px]"
                  >
                    {i + 2}
                  </div>
                  <div
                    class={[
                      "border-border/40 text-foreground/85 truncate border-r px-2.5 py-1.5",
                      isSelected && "bg-primary/5",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {row.term}
                  </div>
                  <div
                    class={[
                      "text-muted-foreground truncate px-2.5 py-1.5",
                      isSelected && "bg-primary/5",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {row.def}
                  </div>
                </div>
              {/each}

              <!-- Selection outline. Single absolute element drawn over
                   the selected data area at z-10 so the violet rectangle
                   sits ON TOP of the cells' gray gridlines instead of
                   fighting with them at every cell boundary. Position is
                   computed in JS from the first/last selected row refs
                   so it stays accurate across font sizes and zoom. -->
              <div
                aria-hidden="true"
                class="border-primary/60 pointer-events-none absolute right-0 left-[28px] z-10 border-2"
                style={selectionStyle}
              ></div>
            </div>
            <div class="text-muted-foreground/70 mt-3 text-center text-xs">
              Select two columns. Cmd / Ctrl + C.
            </div>
          </div>

          <!-- Center arrow with label. One pill across all breakpoints. -->
          <div use:reveal={{ delay: 120 }} class="flex justify-center">
            <div
              class="border-border bg-card text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] tracking-wider uppercase shadow-md"
            >
              Paste
              <ArrowRight class="text-primary size-3" />
            </div>
          </div>

          <!-- Anki card mockup. Same visual language as the rest of the
               site: one foreground card with term + divider + def, two
               muted cards stacked behind for the deck-file feel. The
               foreground card content matches the spreadsheet's first
               row, so the eye couples "this row → that card" directly. -->
          <div use:reveal={{ delay: 240 }} class="relative mx-auto w-full max-w-sm">
            <div class="relative flex h-64 w-full items-center justify-center">
              <div class="relative h-52 w-full">
                <div
                  aria-hidden="true"
                  class="border-border bg-card absolute inset-0 -translate-x-2 translate-y-2 -rotate-6 rounded-lg border"
                ></div>
                <div
                  aria-hidden="true"
                  class="border-border bg-card absolute inset-0 translate-x-1 -translate-y-1 rotate-3 rounded-lg border"
                ></div>
                <div
                  class="border-border bg-card relative flex h-full flex-col items-center justify-center rounded-lg border p-6 text-center shadow-2xl shadow-black/40"
                >
                  <div class="text-foreground text-lg leading-tight font-semibold sm:text-xl">
                    {sheet[0].term}
                  </div>
                  <span
                    aria-hidden="true"
                    class="text-muted-foreground/70 mt-2 flex size-4 items-center justify-center rounded-full bg-white/5"
                  >
                    <Play class="size-2 fill-current" />
                  </span>
                  <div class="bg-border/60 my-4 h-px w-3/4"></div>
                  <div class="text-muted-foreground text-sm leading-snug">
                    {sheet[0].def}
                  </div>
                  <span
                    aria-hidden="true"
                    class="text-muted-foreground/70 mt-2 flex size-4 items-center justify-center rounded-full bg-white/5"
                  >
                    <Play class="size-2 fill-current" />
                  </span>
                </div>
              </div>
            </div>
            <div class="text-muted-foreground/70 mt-3 text-center text-xs">
              vocab.apkg · double-click into Anki, any client.
            </div>
          </div>
        </div>

        <div class="mt-12 flex flex-col items-center text-center">
          <Button href={resolve("/tool")} size="lg" class="group h-12 gap-2 px-6 text-base">
            <ClipboardPaste class="size-4" />
            Open the tool
            <ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
          <p class="text-muted-foreground/80 mt-5 font-mono text-xs tracking-wide">
            Free &nbsp;·&nbsp; No account &nbsp;·&nbsp; No upload &nbsp;·&nbsp; Open source
          </p>
        </div>
      </div>
    </section>

    <!-- ════════ What you can paste ════════
       Six format tiles, each with a tiny code preview of the input shape
       the parser accepts. Frames the page around capability instead of
       contrast: the user sees their own format and feels "yes, that
       works." No Anki-bashing, no version-attribution risk. -->
    <section class="px-6 py-24 sm:py-32" use:reveal>
      <div class="mx-auto max-w-5xl">
        <div class="mb-12 max-w-xl">
          <span class="text-muted-foreground mb-3 block font-mono text-xs tracking-wider uppercase">
            What you can paste
          </span>
          <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
            If it looks like cards, it works.
          </h2>
          <p class="text-muted-foreground mt-3 text-[15px] leading-relaxed">
            The parser auto-detects the shape. Pick whatever's already in your clipboard.
          </p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <!-- CSV -->
          <div class="border-border flex flex-col gap-3 rounded-lg border p-5">
            <div class="text-muted-foreground/70 font-mono text-[10px] tracking-wider uppercase">
              CSV
            </div>
            <pre
              class="border-border/60 bg-card text-foreground/90 m-0 overflow-hidden rounded-md border p-3 font-mono text-[10.5px] leading-relaxed">term,definition
café,coffee shop
piña,pineapple
manzana,apple</pre>
          </div>

          <!-- TSV / spreadsheet copy -->
          <div class="border-border flex flex-col gap-3 rounded-lg border p-5">
            <div class="text-muted-foreground/70 font-mono text-[10px] tracking-wider uppercase">
              TSV / spreadsheet copy
            </div>
            <pre
              class="border-border/60 bg-card text-foreground/90 m-0 overflow-hidden rounded-md border p-3 font-mono text-[10.5px] leading-relaxed">term	definition
café	coffee shop
piña	pineapple
manzana	apple</pre>
          </div>

          <!-- Markdown table -->
          <div class="border-border flex flex-col gap-3 rounded-lg border p-5">
            <div class="text-muted-foreground/70 font-mono text-[10px] tracking-wider uppercase">
              Markdown table
            </div>
            <pre
              class="border-border/60 bg-card text-foreground/90 m-0 overflow-hidden rounded-md border p-3 font-mono text-[10.5px] leading-relaxed">| Term | Definition  |
| ---- | ----------- |
| café | coffee shop |
| piña | pineapple   |</pre>
          </div>

          <!-- JSON. Wrapped in a template-literal expression so Svelte
               doesn't try to interpret the JSON's braces as expressions.
               The fade lives on the INNER pre (not on the bordered card)
               so the card border stays sharp; only the text content
               fades at the right. -->
          <div class="border-border flex flex-col gap-3 rounded-lg border p-5">
            <div class="text-muted-foreground/70 font-mono text-[10px] tracking-wider uppercase">
              JSON
            </div>
            <div class="border-border/60 bg-card overflow-hidden rounded-md border">
              <pre
                style="mask-image: linear-gradient(to right, black 88%, transparent); -webkit-mask-image: linear-gradient(to right, black 88%, transparent);"
                class="text-foreground/90 m-0 p-3 font-mono text-[10.5px] leading-relaxed">{`[
  {"term": "café", "definition": "coffee shop"},
  {"term": "piña", "definition": "pineapple"}
]`}</pre>
            </div>
          </div>

          <!-- Vocab list (dash-separated) -->
          <div class="border-border flex flex-col gap-3 rounded-lg border p-5">
            <div class="text-muted-foreground/70 font-mono text-[10px] tracking-wider uppercase">
              Vocab list
            </div>
            <pre
              class="border-border/60 bg-card text-foreground/90 m-0 overflow-hidden rounded-md border p-3 font-mono text-[10.5px] leading-relaxed">café - coffee shop
piña - pineapple
manzana - apple
agua - water</pre>
          </div>

          <!-- Key = value (TOML-ish) -->
          <div class="border-border flex flex-col gap-3 rounded-lg border p-5">
            <div class="text-muted-foreground/70 font-mono text-[10px] tracking-wider uppercase">
              Key = value
            </div>
            <pre
              class="border-border/60 bg-card text-foreground/90 m-0 overflow-hidden rounded-md border p-3 font-mono text-[10.5px] leading-relaxed">café = "coffee shop"
piña = "pineapple"
manzana = "apple"
agua = "water"</pre>
          </div>
        </div>

        <p class="text-muted-foreground/85 mt-10 max-w-2xl text-[15px] leading-relaxed">
          Whatever you paste, the output is a standard .apkg. Open it on Anki desktop, AnkiMobile,
          AnkiDroid, or AnkiWeb.
        </p>
      </div>
    </section>

    <!-- ════════ Closing CTA ════════ -->
    <section class="px-6 py-20 sm:py-24">
      <div class="mx-auto max-w-3xl text-center">
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">Try your data.</h2>
        <p class="text-muted-foreground mt-3 text-base leading-relaxed">
          Paste, see the parsed cards, save the .apkg.
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
            href={resolve("/chatgpt-flashcards-to-anki")}
            class="hover:text-foreground underline-offset-2 hover:underline"
          >
            ChatGPT to Anki
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
          <ChevronRight class="size-3" />
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
        <a href={resolve("/privacy")} class="hover:text-foreground transition-colors">Privacy</a>
        <a
          href="https://github.com/ImGajeed76/quick-cards"
          class="hover:text-foreground transition-colors">GitHub</a
        >
      </div>
    </div>
  </footer>
</div>
