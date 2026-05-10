<script lang="ts">
  // Shared footer for every user-facing page. Single source of truth for
  // the footer link set, ordering, and trademark disclaimer. Self-links
  // and the Home link on the homepage itself are filtered out at render.
  //
  // The page-specific landing pages (/quizlet-to-anki, /csv-to-anki,
  // etc.) used to each render their own footer with slightly different
  // link sets, which leaked link equity unevenly. This component fixes
  // that without forcing every page to maintain the link list by hand.
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { SITE_AUTHOR, SITE_REPO } from "$lib/site";

  const path = $derived(page.url.pathname);

  const links = [
    { href: "/", label: "Home" },
    { href: "/extension", label: "Extension" },
    { href: "/tool", label: "Tool" },
    { href: "/quizlet-to-anki", label: "Quizlet to Anki" },
    { href: "/csv-to-anki", label: "CSV to Anki" },
    { href: "/chatgpt-flashcards-to-anki", label: "ChatGPT to Anki" },
    { href: "/print-flashcards-from-quizlet", label: "Print flashcards" },
    { href: "/knowt-alternative", label: "Knowt comparison" },
    { href: "/privacy", label: "Privacy" },
  ] as const;

  const visibleLinks = $derived(links.filter((l) => l.href !== path));
</script>

<footer class="border-foreground/10 border-t">
  <div
    class="text-muted-foreground mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm lg:flex-row lg:items-start"
  >
    <div>
      Made by
      <a href="https://oseifert.ch" class="text-foreground hover:text-primary transition-colors">
        {SITE_AUTHOR}
      </a>
      · MIT licensed.
    </div>
    <div class="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 lg:justify-end">
      {#each visibleLinks as link (link.href)}
        <a href={resolve(link.href)} class="hover:text-foreground transition-colors">
          {link.label}
        </a>
      {/each}
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external URL -->
      <a href={SITE_REPO} class="hover:text-foreground transition-colors">GitHub</a>
    </div>
  </div>
</footer>

<p
  class="text-muted-foreground/70 mx-auto max-w-xl px-6 pb-10 text-center text-xs leading-relaxed text-pretty"
>
  QuickCards is an independent open-source project, not affiliated with Quizlet, Anki, Knowt, or any
  other product mentioned. All trademarks belong to their respective owners.
</p>
