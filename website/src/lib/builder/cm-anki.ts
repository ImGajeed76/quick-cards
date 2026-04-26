/**
 * CodeMirror extensions and a static tokenizer for the Anki-flavored card
 * editor.
 *
 * Highlighted token classes (kept identical between the static display span
 * and the active CodeMirror editor):
 *
 * - `cm-anki-image`  `<img ... src="..." ...>`
 * - `cm-anki-sound`  `[sound:filename]`
 * - `cm-anki-token`  `{{...}}` Anki template tokens (fields, type:, hint:,
 *                    cloze:, tts ...:, kana:, furigana:, FrontSide, Tags,
 *                    Deck, Subdeck, Card, Type, CardFlag, cN::text,
 *                    cN::text::hint, #section, /section, ^inverse, !comment)
 * - `cm-anki-latex`  `[latex]...[/latex]`, `[$$...$$]`, `[$...$]`,
 *                    `\(...\)`, `\[...\]` (MathJax + Anki LaTeX delimiters)
 * - `cm-anki-html`   any other HTML tag (`<b>`, `<i>`, `<u>`, `<br>`,
 *                    `<div>`, `<span>`, etc.)
 * - `cm-anki-entity` HTML entities (`&nbsp;`, `&amp;`, `&#39;`, `&#x2014;`)
 *
 * Autocomplete:
 * - Inside `src="..."`  → suggests media filenames
 * - Inside `[sound:...` → suggests media filenames
 *
 * The underlying text remains raw Anki HTML so import/export round-trips
 * with no parser layer.
 */

import { autocompletion, type CompletionContext } from "@codemirror/autocomplete";
import { RangeSetBuilder, type Extension } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import type { BuilderMedia } from "./types";

// One mega-regex with named groups so matches come back in document order
// AND we know which kind they are without re-testing. Alternative order
// matters: more specific patterns (image, sound) sit before the generic
// `<html-tag>` fallback so they win at the same starting position.
const TOKEN_RE = new RegExp(
  [
    /(?<image><img\b[^>]*\bsrc="[^"]*"[^>]*>)/.source,
    /(?<sound>\[sound:[^\]]+\])/.source,
    // Anki [latex]...[/latex], MathJax display [$$..$$] and inline [$..$],
    // plus `\(...\)` and `\[...\]` which Anki/MathJax accept.
    /(?<latex>\[latex\][\s\S]*?\[\/latex\]|\[\$\$[\s\S]*?\$\$\]|\[\$[\s\S]*?\$\]|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/
      .source,
    /(?<token>\{\{[^}]*\}\})/.source,
    /(?<html><\/?[a-zA-Z][^>]*>)/.source,
    /(?<entity>&(?:[a-zA-Z][a-zA-Z0-9]*|#\d+|#x[0-9a-fA-F]+);)/.source,
  ].join("|"),
  "g",
);

function classFor(groups: Record<string, string | undefined> | undefined): string | null {
  if (!groups) return null;
  if (groups.image) return "cm-anki-image";
  if (groups.sound) return "cm-anki-sound";
  if (groups.latex) return "cm-anki-latex";
  if (groups.token) return "cm-anki-token";
  if (groups.html) return "cm-anki-html";
  if (groups.entity) return "cm-anki-entity";
  return null;
}

interface AnkiContext {
  /** Lookup by filename from the package's media library. */
  mediaByFilename: Record<string, BuilderMedia>;
}

function decorationsFor(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to);
    TOKEN_RE.lastIndex = 0;
    for (let m = TOKEN_RE.exec(text); m; m = TOKEN_RE.exec(text)) {
      const cls = classFor(m.groups);
      if (!cls) continue;
      const start = from + m.index;
      const end = start + m[0].length;
      builder.add(start, end, Decoration.mark({ class: cls }));
    }
  }
  return builder.finish();
}

export function ankiExtension(getCtx: () => AnkiContext): Extension {
  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = decorationsFor(view);
      }
      update(u: ViewUpdate): void {
        if (u.docChanged || u.viewportChanged) {
          this.decorations = decorationsFor(u.view);
        }
      }
    },
    {
      decorations: (v) => v.decorations,
    },
  );

  const completions = autocompletion({
    override: [(c) => mediaCompletionsFor(c, getCtx())],
    activateOnTyping: true,
  });

  return [plugin, completions];
}

interface MediaCompletionResult {
  from: number;
  options: { label: string; type: string }[];
  validFor: RegExp;
}

function mediaCompletionsFor(
  context: CompletionContext,
  ctx: AnkiContext,
): MediaCompletionResult | null {
  const before = context.matchBefore(/(?:src="|\[sound:)([^"\]]*)/);
  if (!before) return null;
  const triggerEnd = before.text.startsWith('src="')
    ? before.from + 5
    : before.from + "[sound:".length;
  const options = Object.keys(ctx.mediaByFilename).map((filename) => ({
    label: filename,
    type: filename.match(/\.(png|jpe?g|gif|webp|svg)$/i) ? "constant" : "variable",
  }));
  return {
    from: triggerEnd,
    options,
    validFor: /^[^"\]]*$/,
  };
}

// ---- shared static highlighter ------------------------------------------

export interface HighlightSegment {
  text: string;
  cls: string | null;
}

/**
 * Tokenize a string into highlighted segments using the same patterns as the
 * editor extension. Used by CardField's static display mode so unfocused
 * fields render the exact same colored tokens without paying for an editor.
 */
export function highlightAnki(value: string): HighlightSegment[] {
  if (!value) return [];
  const segments: HighlightSegment[] = [];
  let cursor = 0;
  TOKEN_RE.lastIndex = 0;
  for (let m = TOKEN_RE.exec(value); m; m = TOKEN_RE.exec(value)) {
    const cls = classFor(m.groups);
    if (!cls) continue;
    const start = m.index;
    const end = start + m[0].length;
    if (start > cursor) segments.push({ text: value.slice(cursor, start), cls: null });
    segments.push({ text: value.slice(start, end), cls });
    cursor = end;
  }
  if (cursor < value.length) segments.push({ text: value.slice(cursor), cls: null });
  return segments;
}
