<script lang="ts">
  import { onMount } from "svelte";
  import { EditorView, basicSetup } from "codemirror";
  import { EditorState, Compartment } from "@codemirror/state";
  import { html } from "@codemirror/lang-html";
  import { css } from "@codemirror/lang-css";
  import { oneDark } from "@codemirror/theme-one-dark";

  interface Props {
    value: string;
    onChange: (next: string) => void;
    language?: "html" | "css";
    /** Pixel-height of the editor surface; default ~5 lines. */
    minHeightPx?: number;
    placeholder?: string;
  }

  let { value, onChange, language = "html", minHeightPx = 96 }: Props = $props();

  let container = $state<HTMLDivElement | null>(null);
  let view: EditorView | null = null;

  // mutative-driven state replacements (undo/redo) need to push into CM.
  // Tracked in an effect that runs whenever `value` changes externally.

  onMount(() => {
    const langCompartment = new Compartment();
    view = new EditorView({
      doc: value,
      parent: container ?? undefined,
      extensions: [
        basicSetup,
        oneDark,
        langCompartment.of(language === "html" ? html() : css()),
        EditorView.theme({
          "&": { fontSize: "13px" },
          ".cm-scroller": { fontFamily: "ui-monospace, SFMono-Regular, monospace" },
          "&.cm-focused": { outline: "none" },
          ".cm-content": { minHeight: `${minHeightPx}px` },
        }),
        EditorView.updateListener.of((u) => {
          if (!u.docChanged) return;
          const next = u.state.doc.toString();
          // Re-entrancy guard: ignore when our own external sync caused this.
          if (next !== value) onChange(next);
        }),
      ],
    });
    return () => view?.destroy();
  });

  $effect(() => {
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    });
  });

  // Avoid an unused-import warning if Compartment isn't referenced after build.
  void EditorState;
</script>

<div
  bind:this={container}
  class="border-input bg-background overflow-hidden rounded-md border"
></div>
