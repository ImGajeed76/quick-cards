<script lang="ts">
  import "./layout.css";
  import { page } from "$app/state";
  import { SITE_URL, SITE_NAME } from "$lib/site";
  import { Toaster } from "$lib/components/ui/sonner";

  let { children } = $props();

  const canonical = $derived(`${SITE_URL}${page.url.pathname}`);
  const ogImage = `${SITE_URL}/og.png`;
</script>

<svelte:head>
  <!-- Favicons -->
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png" />
  <link rel="icon" type="image/png" sizes="128x128" href="/favicon-128.png" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

  <!-- Canonical URL — overridden per page if needed -->
  <link rel="canonical" href={canonical} />

  <!-- OG / Twitter defaults. Pages override og:title / og:description / twitter:* as needed. -->
  <meta property="og:site_name" content={SITE_NAME} />
  <meta property="og:locale" content="en_US" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content={canonical} />
  <meta property="og:image" content={ogImage} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="QuickCards. Export Cards, quick." />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content={ogImage} />
</svelte:head>

{@render children()}

<Toaster richColors closeButton position="bottom-right" />
