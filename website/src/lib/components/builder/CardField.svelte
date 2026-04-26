<script lang="ts">
  import { tick } from "svelte";
  import { EditorView, keymap } from "@codemirror/view";
  import { history, defaultKeymap, historyKeymap } from "@codemirror/commands";
  import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
  import { html } from "@codemirror/lang-html";
  import { ankiExtension, highlightAnki } from "$lib/builder/cm-anki";
  import type { BuilderMedia } from "$lib/builder/types";

  interface Props {
    value: string;
    onChange: (next: string) => void;
    media: BuilderMedia[];
    placeholder?: string;
    ariaLabel?: string;
    minHeightPx?: number;
    isLastFieldOfLastRow?: boolean;
    onTabOffEnd?: () => void;
    onBackspaceEmpty?: () => void;
  }

  let {
    value,
    onChange,
    media,
    placeholder,
    ariaLabel,
    minHeightPx = 24,
    isLastFieldOfLastRow = false,
    onTabOffEnd,
    onBackspaceEmpty,
  }: Props = $props();

  // ---- mode state --------------------------------------------------------
  // Static span by default; CodeMirror is mounted only on focus to keep
  // hundreds of card rows lightweight. Notion uses the same pattern.

  let active = $state(false);
  let editorContainer = $state<HTMLDivElement | null>(null);
  let view: EditorView | null = null;
  let blurTimer: ReturnType<typeof setTimeout> | null = null;

  // Latest media list, exposed to the editor's plugin via getCtx() so renames
  // and uploads propagate without a full editor rebuild.
  // svelte-ignore state_referenced_locally
  let mediaList = $state(media);
  $effect(() => {
    mediaList = media;
    if (view) view.dispatch({}); // poke the view so the plugin re-reads ctx
  });

  function buildContext() {
    const map: Record<string, BuilderMedia> = {};
    for (const m of mediaList) map[m.filename] = m;
    return { mediaByFilename: map };
  }

  async function activate(caretX?: number, caretY?: number): Promise<void> {
    if (active) return;
    active = true;
    await tick();
    if (!editorContainer) return;
    view = new EditorView({
      doc: value,
      parent: editorContainer,
      extensions: [
        history(),
        closeBrackets(),
        keymap.of([
          {
            key: "Tab",
            run: (cmView) => {
              const sel = cmView.state.selection.main;
              if (isLastFieldOfLastRow && sel.from === cmView.state.doc.length) {
                onTabOffEnd?.();
                return true;
              }
              const next = nextFocusable(cmView.contentDOM);
              if (next) {
                next.focus();
                return true;
              }
              return false;
            },
          },
          {
            key: "Shift-Tab",
            run: (cmView) => {
              const prev = prevFocusable(cmView.contentDOM);
              if (prev) {
                prev.focus();
                return true;
              }
              return false;
            },
          },
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        EditorView.domEventHandlers({
          keydown: (e, cmView) => {
            if (e.key === "Backspace" && !e.repeat && cmView.state.doc.length === 0) {
              onBackspaceEmpty?.();
              return true;
            }
            return false;
          },
          blur: () => {
            // Defer teardown so a click landing on a sibling popover (which
            // briefly steals focus) doesn't tear down the editor mid-action.
            scheduleDeactivate();
            return false;
          },
          focus: () => {
            cancelDeactivate();
            return false;
          },
        }),
        html({ matchClosingTags: false, autoCloseTags: false }),
        ankiExtension(buildContext),
        // Wrap long lines so a single long media token doesn't push the field
        // off the right edge. lineWrapping sets `white-space: pre-wrap`;
        // overflow-wrap below handles unbreakable tokens like long URLs.
        EditorView.lineWrapping,
        EditorView.updateListener.of((u) => {
          if (!u.docChanged) return;
          const next = u.state.doc.toString();
          if (next !== value) onChange(next);
        }),
        EditorView.theme({
          "&": {
            fontSize: "14px",
            backgroundColor: "transparent",
            color: "var(--color-foreground)",
            // Constrain width so wrapping kicks in at the field's edge,
            // not at the viewport's.
            maxWidth: "100%",
          },
          "&.cm-focused": { outline: "none" },
          ".cm-content": {
            padding: "4px 4px",
            minHeight: `${minHeightPx}px`,
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            caretColor: "var(--color-foreground)",
            overflowWrap: "anywhere",
            wordBreak: "break-word",
          },
          ".cm-line": { padding: "0" },
          ".cm-scroller": { overflowX: "hidden" },
          ".cm-anki-token": {
            color: "var(--color-primary)",
            backgroundColor: "color-mix(in oklab, var(--color-primary) 10%, transparent)",
            borderRadius: "3px",
            padding: "0 2px",
            fontWeight: "500",
          },
          ".cm-anki-image, .cm-anki-sound": {
            color: "var(--color-primary)",
            backgroundColor: "color-mix(in oklab, var(--color-primary) 8%, transparent)",
            borderRadius: "3px",
            padding: "0 2px",
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            fontSize: "13px",
          },
          ".cm-anki-latex": {
            color: "oklch(0.78 0.16 80)",
            backgroundColor: "oklch(0.78 0.16 80 / 0.10)",
            borderRadius: "3px",
            padding: "0 2px",
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            fontSize: "13px",
          },
          ".cm-anki-html": {
            color: "var(--color-muted-foreground)",
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            fontSize: "13px",
          },
          ".cm-anki-entity": {
            color: "var(--color-muted-foreground)",
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            fontSize: "13px",
          },
        }),
      ],
    });
    view.focus();
    if (caretX != null && caretY != null) {
      const pos = view.posAtCoords({ x: caretX, y: caretY });
      if (pos != null) view.dispatch({ selection: { anchor: pos } });
      else view.dispatch({ selection: { anchor: view.state.doc.length } });
    } else {
      view.dispatch({ selection: { anchor: view.state.doc.length } });
    }
  }

  function deactivate(): void {
    if (!active) return;
    view?.destroy();
    view = null;
    active = false;
  }

  function scheduleDeactivate(): void {
    cancelDeactivate();
    blurTimer = setTimeout(() => {
      blurTimer = null;
      deactivate();
    }, 200);
  }

  function cancelDeactivate(): void {
    if (blurTimer) {
      clearTimeout(blurTimer);
      blurTimer = null;
    }
  }

  function handleStaticMousedown(e: MouseEvent): void {
    e.preventDefault();
    void activate(e.clientX, e.clientY);
  }

  function handleStaticKeydown(e: KeyboardEvent): void {
    // Activate on most keys so typing immediately starts editing.
    if (e.key === "Tab" || e.key === "Escape") return;
    if (e.key === "Backspace" && !e.repeat && value === "") {
      onBackspaceEmpty?.();
      e.preventDefault();
      return;
    }
    if (e.key.length === 1 || e.key === "Enter" || e.key === "Backspace") {
      e.preventDefault();
      void activate().then(() => {
        // Forward the keystroke to the now-active editor.
        if (e.key === "Backspace") {
          view?.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: "" },
          });
        } else if (e.key === "Enter") {
          const sel = view?.state.selection.main;
          if (sel) view?.dispatch({ changes: { from: sel.from, to: sel.to, insert: "\n" } });
        } else {
          const sel = view?.state.selection.main;
          if (sel) view?.dispatch({ changes: { from: sel.from, to: sel.to, insert: e.key } });
        }
      });
    }
  }

  // Keep the editor's doc in sync when value changes externally (undo/redo
  // applied while the editor is mounted but unfocused).
  $effect(() => {
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    });
  });

  const segments = $derived(highlightAnki(value));
  const showPlaceholder = $derived(!active && value.length === 0);

  function nextFocusable(from: HTMLElement): HTMLElement | null {
    return findFocusable(from, 1);
  }
  function prevFocusable(from: HTMLElement): HTMLElement | null {
    return findFocusable(from, -1);
  }
  function findFocusable(from: HTMLElement, direction: 1 | -1): HTMLElement | null {
    const all = Array.from(
      document.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]',
      ),
    ).filter((el) => !el.hasAttribute("inert") && el.offsetParent !== null);
    const idx = all.indexOf(from);
    if (idx === -1) return null;
    return all[idx + direction] ?? null;
  }
</script>

<div class="cm-card-field-host w-full">
  {#if active}
    <div bind:this={editorContainer} class="cm-card-field"></div>
  {:else}
    <div
      role="textbox"
      tabindex="0"
      aria-label={ariaLabel}
      onmousedown={handleStaticMousedown}
      onfocus={() => activate()}
      onkeydown={handleStaticKeydown}
      class="cm-card-static focus-visible:bg-background/40 cursor-text rounded-sm bg-transparent px-1 py-1
        text-sm leading-snug break-words whitespace-pre-wrap outline-none"
      style="min-height: {minHeightPx}px"
    >
      {#if showPlaceholder}
        <span class="text-muted-foreground/60 select-none">{placeholder ?? ""}</span>
      {:else}
        {#each segments as seg, i (i)}
          {#if seg.cls}
            <span class={seg.cls}>{seg.text}</span>
          {:else}
            {seg.text}
          {/if}
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style>
  /* Mirror the CodeMirror token styling so static and active modes look
     identical for every highlighted class. */
  :global(.cm-card-field-host .cm-anki-token) {
    color: var(--color-primary);
    background-color: color-mix(in oklab, var(--color-primary) 10%, transparent);
    border-radius: 3px;
    padding: 0 2px;
    font-weight: 500;
  }
  :global(.cm-card-field-host .cm-anki-image),
  :global(.cm-card-field-host .cm-anki-sound) {
    color: var(--color-primary);
    background-color: color-mix(in oklab, var(--color-primary) 8%, transparent);
    border-radius: 3px;
    padding: 0 2px;
    font-family: ui-monospace, SFMono-Regular, monospace;
    font-size: 13px;
  }
  :global(.cm-card-field-host .cm-anki-latex) {
    color: oklch(0.78 0.16 80);
    background-color: oklch(0.78 0.16 80 / 0.1);
    border-radius: 3px;
    padding: 0 2px;
    font-family: ui-monospace, SFMono-Regular, monospace;
    font-size: 13px;
  }
  :global(.cm-card-field-host .cm-anki-html),
  :global(.cm-card-field-host .cm-anki-entity) {
    color: var(--color-muted-foreground);
    font-family: ui-monospace, SFMono-Regular, monospace;
    font-size: 13px;
  }
</style>
