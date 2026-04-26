<script lang="ts">
  import { Label } from "$lib/components/ui/label";
  import type { Snippet } from "svelte";

  interface Props {
    label: string;
    /** Brief help shown below the input. */
    help?: string;
    htmlFor?: string;
    children: Snippet;
  }

  let { label, help, htmlFor, children }: Props = $props();
</script>

<div class="space-y-1.5">
  <Label class="text-foreground text-sm" for={htmlFor}>{label}</Label>
  {@render children()}
  {#if help}
    <p class="text-muted-foreground text-xs">{help}</p>
  {/if}
</div>
