<script lang="ts">
  import CodeEditor from "./CodeEditor.svelte";
  import type { BuilderModel, Id } from "$lib/builder/types";

  interface Props {
    model: BuilderModel;
    onUpdateCss: (id: Id, css: string) => void;
  }

  let { model, onUpdateCss }: Props = $props();
  const isLocked = $derived(model.builtin !== null);
</script>

<section class="space-y-3">
  <div>
    <h3 class="text-sm font-medium">Card styling</h3>
    <p class="text-muted-foreground text-xs">CSS applied to all cards of this note type.</p>
  </div>

  {#if isLocked}
    <pre class="bg-muted/30 max-h-60 overflow-auto rounded-md border p-3 text-xs">{model.css}</pre>
  {:else}
    <CodeEditor
      value={model.css}
      onChange={(v) => onUpdateCss(model.id, v)}
      language="css"
      minHeightPx={140}
    />
  {/if}
</section>
