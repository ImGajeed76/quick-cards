<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { ArrowLeft, Check, Puzzle, X } from "@lucide/svelte";
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
      q: "Is QuickCards free?",
      a: "Free. Open source (MIT licensed) on GitHub. No account needed.",
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
    {
      q: "What's the catch with QuickCards?",
      a: "None we can think of. QuickCards runs in your browser, so your cards never touch a server we control. No account, no upload, no ads. Source is on GitHub if you want to inspect it or fork it.",
    },
  ];

  // Slug for stable #anchors on each FAQ, so Google can surface "jump to"
  // sitelinks and users can deep-link to a specific question.
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
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
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

  // JSON-LD tag strings, built here because template literals inside @html
  // trip the svelte-eslint parser. The backslash escape on the close tag
  // stops the parser from treating the literal tokens as a second component
  // block (no effect at runtime).
  /* eslint-disable no-useless-escape */
  const faqJsonLdHtml = `<script type="application/ld+json">${JSON.stringify(faqJsonLd)}<\/script>`;
  const breadcrumbJsonLdHtml = `<script type="application/ld+json">${JSON.stringify(breadcrumbJsonLd)}<\/script>`;
  const appJsonLdHtml = `<script type="application/ld+json">${JSON.stringify(appJsonLd)}<\/script>`;
  /* eslint-enable no-useless-escape */

  function trackInstallClick() {
    track("Install CTA", { from: "knowt-alternative" });
  }
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <!-- eslint-disable svelte/no-at-html-tags -->
  {@html faqJsonLdHtml}
  {@html breadcrumbJsonLdHtml}
  {@html appJsonLdHtml}
</svelte:head>

<div class="mx-auto max-w-[720px] px-6 py-16 sm:py-20">
  <Button variant="ghost" size="sm" href="/" class="-ml-2.5">
    <ArrowLeft />
    Back
  </Button>

  <!-- Hero -->
  <header class="mt-12">
    <h1 class="text-4xl font-semibold tracking-tight sm:text-5xl">
      Knowt only imports 100 Quizlet cards.
      <span class="text-primary">Here's why, and what to do about it.</span>
    </h1>
    <p class="text-muted-foreground mt-6 text-[17px] leading-7">
      Knowt's Quizlet importer stops at 100 cards by default. There is a workaround inside Knowt
      (scroll all the way down, click 'See more', then import), and most people miss it.
      {SITE_NAME} skips the ritual: open your Quizlet set, click the QuickCards banner, send the whole
      thing into Knowt. Same Knowt account, no scroll-then-click, any size.
    </p>
  </header>

  <!-- The honest version of the cap, from the user's side -->
  <section use:reveal class="mt-20">
    <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">Does this sound familiar?</h2>
    <div class="text-muted-foreground mt-5 space-y-4 text-[15px] leading-7">
      <p>
        You import a 300-card Quizlet set into Knowt. 100 cards come across. No error, no warning,
        no "partial import" flag. You find out the rest are missing when a word you expected never
        shows up in review.
      </p>
      <p>
        Technically the cap is not fixed at 100. Knowt's help center documents the workaround:
        before triggering the import, you have to open the Quizlet set, scroll all the way to the
        bottom, click "See more", and only then run the importer. Most people miss that step, so the
        practical effect is the same as a hard cap.
      </p>
      <p>
        {SITE_NAME} reads the set a different way that does not depend on what the page has rendered,
        so the scroll-then-click step is unnecessary. Full set, regardless of size, into Knowt or into
        Anki, PDF, CSV, JSON, TXT.
      </p>
    </div>
    <figure class="mt-8">
      <img
        src="/screenshots/quickcards-widget.png"
        alt="QuickCards widget on a Quizlet set page"
        class="border-border w-full rounded-md border shadow-xl shadow-black/30"
        width="795"
        height="286"
        loading="lazy"
        decoding="async"
      />
      <figcaption class="text-muted-foreground mt-3 text-xs">
        The {SITE_NAME} widget appears on any Quizlet set.
      </figcaption>
    </figure>
  </section>

  <!-- Be fair: what Knowt is good at -->
  <section use:reveal class="mt-20">
    <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">When Knowt is the right call</h2>
    <div class="text-muted-foreground mt-5 space-y-4 text-[15px] leading-7">
      <p>
        QuickCards and Knowt are not the same shape and not really competing. Knowt is a free
        Quizlet-style study app with its own learn/test/match modes; QuickCards is a converter that
        gets your data out (or into Knowt) without changing where you study.
      </p>
      <p>
        If you want to keep studying in a Quizlet-shaped product without paying for Quizlet Plus,
        Knowt is a strong answer. The trade-offs are real (ads, an account is required) but for a
        lot of students it is the right pick. We use it ourselves for some sets.
      </p>
      <p>
        If you want your cards in Anki, on a printable PDF, in a CSV for a spreadsheet, or in Knowt
        without the scroll-then-click step, that is where {SITE_NAME} fits.
      </p>
    </div>
  </section>

  <!-- Comparison table -->
  <section use:reveal class="mt-20">
    <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">What's different</h2>
    <p class="text-muted-foreground mt-3 text-[15px] leading-7">
      Where the two paths actually diverge. Both are free, and both need a Knowt account if you want
      cards to end up in Knowt.
    </p>

    <div class="mt-6 overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="border-border border-b">
            <th class="text-muted-foreground w-[40%] py-3 pr-4 text-left font-medium"></th>
            <th class="text-primary py-3 pr-4 text-left font-semibold">
              {SITE_NAME}
            </th>
            <th class="text-foreground py-3 text-left font-semibold"> Knowt's Quizlet import </th>
          </tr>
        </thead>
        <tbody class="[&_tr]:border-border/60 [&_td]:py-3 [&_td]:pr-4 [&_tr]:border-b">
          <tr>
            <td class="text-muted-foreground">Cards per Quizlet set</td>
            <td class="font-medium">No limit, no extra steps</td>
            <td class="text-muted-foreground">100 by default; "See more" first to get the rest</td>
          </tr>
          <tr>
            <td class="text-muted-foreground">Merge multiple Quizlet sets</td>
            <td><Check class="text-primary size-4" aria-label="Yes" /></td>
            <td><X class="text-muted-foreground size-4" aria-label="No" /></td>
          </tr>
          <tr>
            <td class="text-muted-foreground">Account required</td>
            <td><X class="text-muted-foreground size-4" aria-label="No" /></td>
            <td>Knowt account (free)</td>
          </tr>
          <tr>
            <td class="text-muted-foreground">Export targets</td>
            <td>Knowt, Anki, PDF, CSV, JSON, TXT</td>
            <td class="text-muted-foreground">Knowt only</td>
          </tr>
          <tr>
            <td class="text-muted-foreground">Open source</td>
            <td><Check class="text-primary size-4" aria-label="Yes" /></td>
            <td><X class="text-muted-foreground size-4" aria-label="No" /></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- FAQ -->
  <section use:reveal class="mt-20">
    <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">Frequently asked questions</h2>
    <div class="divide-border border-border mt-6 divide-y rounded-lg border">
      {#each faqs as faq (faq.q)}
        <details id={slug(faq.q)} class="group">
          <summary
            class="text-foreground hover:text-primary flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-medium"
          >
            <h3 class="m-0 text-[15px] font-medium">{faq.q}</h3>
            <span
              class="text-muted-foreground transition-transform group-open:rotate-45"
              aria-hidden="true"
            >
              +
            </span>
          </summary>
          <div class="text-muted-foreground px-5 pt-0 pb-5 text-[15px] leading-7">
            {faq.a}
          </div>
        </details>
      {/each}
    </div>
  </section>

  <!-- Closing -->
  <section use:reveal class="mt-20">
    <p class="text-muted-foreground text-[15px] leading-7">
      One click from the Chrome Web Store. Source is on
      <a
        href="https://github.com/ImGajeed76/quick-cards"
        class="text-foreground hover:text-primary underline-offset-4 hover:underline"
      >
        GitHub
      </a>.
    </p>
    <Button href={CWS_URL} onclick={trackInstallClick} class="mt-5">
      <Puzzle />
      Install {SITE_NAME}
    </Button>
  </section>

  <!-- Related reading -->
  <section use:reveal class="mt-20">
    <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">More on what you can do</h2>
    <ul class="text-muted-foreground mt-5 space-y-3 text-[15px] leading-7">
      <li>
        <a
          href={resolve("/extension")}
          class="text-foreground hover:text-primary underline-offset-4 hover:underline"
        >
          Browser extension
        </a>: what the extension actually does on Quizlet pages, beyond the Knowt import.
      </li>
      <li>
        <a
          href={resolve("/tool")}
          class="text-foreground hover:text-primary underline-offset-4 hover:underline"
        >
          Web tool
        </a>: paste any flashcard data (CSV, ChatGPT output, vocab list) and convert without
        installing anything.
      </li>
      <li>
        <a
          href={resolve("/quizlet-to-anki")}
          class="text-foreground hover:text-primary underline-offset-4 hover:underline"
        >
          Quizlet to Anki guide
        </a>: when Anki, not Knowt, is where you actually want to study.
      </li>
    </ul>
  </section>

  <p class="text-muted-foreground mt-16 text-xs">
    QuickCards is an independent open-source project. Not affiliated with Knowt or Quizlet. Knowt
    and Quizlet are trademarks of their respective owners.
  </p>
</div>
