<script lang="ts">
  import Slide from "../Slide.svelte";

  let { data }: { data: { slug: string } } = $props();
</script>

<svelte:head>
  <title>Store screenshot: {data.slug}</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="page">
  <Slide slug={data.slug} />
</div>

<style>
  .page {
    background: var(--background);
    padding: 2rem;
    display: flex;
    justify-content: center;
  }
</style>
