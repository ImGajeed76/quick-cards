<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { ArrowLeft, ArrowUpRight } from "@lucide/svelte";
  import { SITE_NAME, SITE_AUTHOR } from "$lib/site";

  const title = `Privacy Policy | ${SITE_NAME}`;
  const description = `What data ${SITE_NAME} touches and what we do (and don't do) with it.`;

  const LAST_UPDATED = "2026-04-28";

  // Verify these stay current. Knowt has moved its policy URL before.
  const QUIZLET_PRIVACY = "https://quizlet.com/privacy";
  const KNOWT_PRIVACY = "https://knowt.com/privacy";
  const VERCEL_PRIVACY = "https://vercel.com/legal/privacy-policy";
  const GITHUB_PRIVACY =
    "https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement";
  const PLAUSIBLE_HOME = "https://plausible.io/privacy-focused-web-analytics";

  const CONTACT_EMAIL = "quickcards@alias.oseifert.ch";
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
</svelte:head>

<div class="mx-auto max-w-[640px] px-6 py-16 sm:py-20">
  <Button variant="ghost" size="sm" href="/" class="-ml-2.5">
    <ArrowLeft />
    Back
  </Button>

  <h1 class="mt-12 text-3xl font-semibold tracking-tight">Privacy Policy</h1>
  <p class="text-muted-foreground mt-3 text-sm">Last updated: {LAST_UPDATED}</p>

  <p class="text-muted-foreground mt-8 text-[15px] leading-7">
    {SITE_NAME} is a Chrome extension and a companion website that export Quizlet flashcards or vocab
    lists to formats like PDF, Anki, TXT, CSV, JSON, or directly into Knowt. This page explains what
    data {SITE_NAME} touches and what we do (and don't do) with it.
  </p>

  <div class="border-border bg-card/50 mt-6 rounded-lg border p-5">
    <p class="text-foreground text-[15px] leading-7">
      <span class="font-medium">Short version.</span>
      {SITE_NAME} runs in your browser. We have no user accounts. We don't store your flashcards, your
      IP, or anything that identifies you. We collect a handful of anonymous usage counts so we know which
      features are worth keeping. The full list is below.
    </p>
  </div>

  <h2 class="mt-16 text-2xl font-semibold tracking-tight">Maintainer</h2>
  <p class="text-muted-foreground mt-3 text-[15px] leading-7">
    {SITE_NAME} is built by {SITE_AUTHOR} in Switzerland. For privacy questions, write to
    <a href="mailto:{CONTACT_EMAIL}" class="text-primary hover:underline">{CONTACT_EMAIL}</a>.
  </p>

  <h2 class="mt-12 text-2xl font-semibold tracking-tight">The browser extension</h2>

  <h3 class="text-foreground mt-8 text-lg font-medium">What stays on your machine</h3>
  <p class="text-muted-foreground mt-2 text-[15px] leading-7">
    The extension stores your separator preferences (the characters between term and definition, and
    between cards) in
    <code class="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.85em]"
      >chrome.storage.sync</code
    >. If you're signed into Chrome, that bucket is synced to your Google account by Chrome itself,
    the same way bookmarks are. We don't see it and we don't run a server. A short-lived flag in
    <code class="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.85em]"
      >chrome.storage.local</code
    >
    tells the popup which screen to open. That's all.
  </p>

  <h3 class="text-foreground mt-8 text-lg font-medium">Quizlet</h3>
  <p class="text-muted-foreground mt-2 text-[15px] leading-7">
    When you open a Quizlet set page, the extension fetches the set's cards from
    <code class="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.85em]"
      >quizlet.com</code
    >
    directly from your browser. The request goes out the same way it would if you loaded the page yourself,
    using whatever Quizlet cookies your browser already holds. If you're signed into Quizlet, Quizlet
    sees that account; if you're not, Quizlet sees an anonymous visitor. Either way, we never see those
    cookies and we never proxy the request through a server of ours. The cards land in your browser and
    don't leave it unless you explicitly export them. See
    <a
      href={QUIZLET_PRIVACY}
      class="text-primary inline-flex items-center gap-1 hover:underline"
      rel="noopener"
    >
      Quizlet's privacy policy
      <ArrowUpRight class="size-3.5" />
    </a>.
  </p>

  <h3 class="text-foreground mt-8 text-lg font-medium">Knowt import</h3>
  <p class="text-muted-foreground mt-2 text-[15px] leading-7">
    The Knowt import is opt-in: it only runs when you click the Knowt button. When you do, the
    extension reads the session cookie that Knowt has already set on your browser (so we don't ask
    you for any credentials), takes the access token out of it, and sends your set straight to
    Knowt's own GraphQL API. The token and the cards go to Knowt and Knowt only. We don't proxy,
    log, or store either. If you're not signed into Knowt, the extension shows a sign-in prompt and
    stops there. See
    <a
      href={KNOWT_PRIVACY}
      class="text-primary inline-flex items-center gap-1 hover:underline"
      rel="noopener"
    >
      Knowt's privacy policy
      <ArrowUpRight class="size-3.5" />
    </a>.
  </p>

  <h3 class="text-foreground mt-8 text-lg font-medium">Other exports</h3>
  <p class="text-muted-foreground mt-2 text-[15px] leading-7">
    PDF, Anki <code
      class="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.85em]">.apkg</code
    >, TXT, CSV, and JSON exports are generated locally and saved straight to your downloads folder.
    They never touch a server we control.
  </p>

  <h3 class="text-foreground mt-8 text-lg font-medium">Permissions</h3>
  <p class="text-muted-foreground mt-2 text-[15px] leading-7">
    Each Chrome permission the extension requests, and what it's used for:
  </p>
  <ul class="text-muted-foreground mt-4 space-y-3 text-[15px] leading-7">
    <li>
      <code class="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.85em]"
        >activeTab</code
      >
      and
      <code class="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.85em]"
        >tabs</code
      >: see the current Quizlet tab, and find any other Quizlet tabs you have open if you want to
      merge sets across them.
    </li>
    <li>
      <code class="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.85em]"
        >storage</code
      >: remember your separator preferences.
    </li>
    <li>
      <code class="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.85em]"
        >downloads</code
      >: save the export files you generate.
    </li>
    <li>
      <code class="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.85em]"
        >clipboardWrite</code
      >: copy cards to the clipboard when you click Copy.
    </li>
    <li>
      <code class="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.85em]"
        >cookies</code
      >: read Knowt's own session cookie when you trigger the Knowt import. Limited to
      <code class="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.85em]"
        >knowt.com</code
      >.
    </li>
    <li>
      Host access for <code
        class="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.85em]"
        >quizlet.com</code
      >,
      <code class="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.85em]"
        >knowt.com</code
      >, and Knowt's GraphQL endpoint on AWS AppSync. These are the only network destinations the
      extension reaches, beyond the analytics described below.
    </li>
  </ul>

  <h2 class="mt-16 text-2xl font-semibold tracking-tight">The website</h2>
  <p class="text-muted-foreground mt-3 text-[15px] leading-7">
    The website does the same things as the extension, but for vocab lists you paste in. All parsing
    and exporting happens in your browser. Nothing you paste is sent anywhere. The site is
    statically prerendered, has no login, and sets no tracking cookies. It's hosted on Vercel, see
    <a
      href={VERCEL_PRIVACY}
      class="text-primary inline-flex items-center gap-1 hover:underline"
      rel="noopener"
    >
      Vercel's privacy policy
      <ArrowUpRight class="size-3.5" />
    </a>
    for what their CDN does at the network layer.
  </p>

  <h2 class="mt-16 text-2xl font-semibold tracking-tight">Anonymous usage analytics</h2>
  <p class="text-muted-foreground mt-3 text-[15px] leading-7">
    We run a self-hosted
    <a
      href={PLAUSIBLE_HOME}
      class="text-primary inline-flex items-center gap-1 hover:underline"
      rel="noopener"
    >
      Plausible
      <ArrowUpRight class="size-3.5" />
    </a>
    instance. Plausible does not use cookies, does not track users across sites, and does not store IP
    addresses or device fingerprints. The full list of events the extension and website send:
  </p>
  <ul class="text-muted-foreground mt-4 space-y-2 text-[15px] leading-7">
    <li>
      Which export format was used (one of <code
        class="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.85em]">txt</code
      >,
      <code class="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.85em]">csv</code
      >,
      <code class="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.85em]"
        >json</code
      >,
      <code class="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.85em]"
        >pdf-list</code
      >,
      <code class="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.85em]"
        >pdf-cards</code
      >,
      <code class="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.85em]"
        >anki</code
      >,
      <code class="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.85em]"
        >copy</code
      >,
      <code class="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.85em]"
        >knowt</code
      >).
    </li>
    <li>Whether the merge feature was used and roughly how many sets were combined.</li>
    <li>
      The Anki deadline range (e.g. <code
        class="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.85em]"
        >8-14 days</code
      >).
    </li>
    <li>The outcome of a Knowt import (success, sign-in needed, or error).</li>
    <li>Page views and install-CTA clicks on the website.</li>
  </ul>
  <p class="text-muted-foreground mt-4 text-[15px] leading-7">
    That is the full list. We do not log card contents, set IDs, URLs you visit, search terms, or
    anything that identifies you. The data is used to decide which features are worth keeping. We
    don't sell it, share it, or use it for ads. Any standard ad blocker that recognises Plausible
    will silently drop the requests; the extension and website work normally either way.
  </p>

  <h2 class="mt-16 text-2xl font-semibold tracking-tight">GitHub</h2>
  <p class="text-muted-foreground mt-3 text-[15px] leading-7">
    The source code, releases, and bug tracker live on GitHub. The
    <code class="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.85em]"
      >/install</code
    >
    page on this site asks GitHub's public API for the latest release, so opening that page (or clicking
    through to download it) results in a direct request from your browser to GitHub. The same is true
    for visiting the repo or filing an issue. GitHub may log your IP for their own security purposes.
    See
    <a
      href={GITHUB_PRIVACY}
      class="text-primary inline-flex items-center gap-1 hover:underline"
      rel="noopener"
    >
      GitHub's privacy statement
      <ArrowUpRight class="size-3.5" />
    </a>. We don't proxy the request and we don't see your IP.
  </p>

  <h2 class="mt-16 text-2xl font-semibold tracking-tight">Your rights</h2>
  <p class="text-muted-foreground mt-3 text-[15px] leading-7">
    Under Swiss data protection law (FADP) and the EU GDPR you have the right to access, correct, or
    delete personal data we hold about you. We don't hold any. If you have a question about data we
    might have collected anyway, write to
    <a href="mailto:{CONTACT_EMAIL}" class="text-primary hover:underline">{CONTACT_EMAIL}</a> and we'll
    sort it out within 30 days.
  </p>

  <h2 class="mt-16 text-2xl font-semibold tracking-tight">Changes</h2>
  <p class="text-muted-foreground mt-3 text-[15px] leading-7">
    If this policy changes in any meaningful way, the date at the top of this page will move and the
    change will be visible in the public Git history of this site.
  </p>
</div>
