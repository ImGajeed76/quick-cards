<script lang="ts">
  import { page } from "$app/state";
  import { resolve } from "$app/paths";
  import { SLUGS } from "./Slide.svelte";

  let { children } = $props();

  const previewPath = resolve("/dev/store-screenshot/preview");
  const isPreview = $derived(page.url.pathname === previewPath);
</script>

<nav class="devnav">
  {#each SLUGS as s (s)}
    {@const href = resolve(`/dev/store-screenshot/${s}`)}
    <a {href} class:current={page.url.pathname === href}>{s}</a>
  {/each}
  <span class="sep" aria-hidden="true"></span>
  <a href={previewPath} class:current={isPreview}>preview</a>
  {#if !isPreview}
    <span class="hint">
      Capture <code>[data-slide]</code> via DevTools, Capture node screenshot.
    </span>
  {/if}
</nav>

{@render children()}

<style>
  .devnav {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex-wrap: wrap;
    padding: 1rem 1.5rem;
    background: var(--card);
    border-bottom: 1px solid var(--border);
    font-size: 0.875rem;
    color: var(--muted-foreground);
  }
  .devnav a {
    padding: 0.25rem 0.625rem;
    border-radius: 0.375rem;
    color: var(--muted-foreground);
    text-decoration: none;
    transition: background 150ms ease;
  }
  .devnav a:hover {
    background: var(--muted);
    color: var(--foreground);
  }
  .devnav a.current {
    background: var(--primary);
    color: var(--primary-foreground);
  }
  .sep {
    width: 1px;
    height: 20px;
    background: var(--border);
    margin: 0 0.25rem;
  }
  .hint {
    margin-left: auto;
    font-size: 0.8125rem;
  }
  code {
    background: var(--muted);
    color: var(--foreground);
    padding: 0.0625rem 0.3125rem;
    border-radius: 0.25rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.85em;
  }
</style>
