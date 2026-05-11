import type { CardSideMedia, Flashcard } from "./types";

/**
 * Field order for the QuickCards v1 / QuickCards Typing v1 notetypes.
 * Indices here must match the `fields` array in `anki-export.ts`.
 */
export const FIELD_NAMES = [
  "Term",
  "Definition",
  "TermImage",
  "TermAudio",
  "TermTTS",
  "TermLang",
  "DefinitionImage",
  "DefinitionAudio",
  "DefinitionTTS",
  "DefinitionLang",
  "AddReverse",
  "QuizletId",
] as const;

export interface MediaEntry {
  url: string;
  filename: string;
}

/**
 * Tracks every distinct media URL referenced by the deck and assigns each one
 * a stable, deterministic filename. The exporter feeds these to the
 * downloader, then attaches the resulting bytes to the `.apkg` package.
 */
export class MediaIndex {
  private byUrl = new Map<string, string>();

  add(url: string, ext: string): string {
    const existing = this.byUrl.get(url);
    if (existing) return existing;
    const filename = `${hashName(url)}.${ext}`;
    this.byUrl.set(url, filename);
    return filename;
  }

  entries(): MediaEntry[] {
    return [...this.byUrl.entries()].map(([url, filename]) => ({ url, filename }));
  }

  size(): number {
    return this.byUrl.size;
  }
}

export interface SetLangs {
  /** Authoritative term-side language (set.wordLang). Falls back to media.languageCode. */
  wordLang?: string;
  /** Authoritative definition-side language (set.defLang). */
  defLang?: string;
}

/**
 * Map a Flashcard onto the 12-field array QuickCards v1 expects. Every Note
 * passes through here so the field layout stays in lock-step with FIELD_NAMES.
 *
 * Per-media `languageCode` is unreliable on some Quizlet sets (every side
 * tagged "en" even when the text is non-Latin). When the caller supplies
 * set-level wordLang/defLang, prefer those over the per-media value.
 */
export function flashcardToFields(
  card: Flashcard,
  media: MediaIndex,
  langs: SetLangs = {},
): string[] {
  const t = card.termMedia ?? {};
  const d = card.definitionMedia ?? {};
  return [
    /*  0 Term            */ card.term,
    /*  1 Definition      */ card.definition,
    /*  2 TermImage       */ formatImage(t.image, media),
    /*  3 TermAudio       */ formatSound(t.audio, media),
    /*  4 TermTTS         */ formatSound(t.tts, media),
    /*  5 TermLang        */ langs.wordLang ?? t.language ?? "",
    /*  6 DefinitionImage */ formatImage(d.image, media),
    /*  7 DefinitionAudio */ formatSound(d.audio, media),
    /*  8 DefinitionTTS   */ formatSound(d.tts, media),
    /*  9 DefinitionLang  */ langs.defLang ?? d.language ?? "",
    /* 10 AddReverse      */ "1",
    /* 11 QuizletId       */ card.quizletId ?? "",
  ];
}

function formatImage(url: string | undefined, media: MediaIndex): string {
  if (!url) return "";
  return `<img src="${media.add(url, imageExt(url))}">`;
}

function formatSound(url: string | undefined, media: MediaIndex): string {
  if (!url) return "";
  return `[sound:${media.add(url, "mp3")}]`;
}

function imageExt(url: string): string {
  const match = url.match(/\.(jpe?g|png|gif|webp)(?:$|\?)/i);
  const ext = match?.[1]?.toLowerCase() ?? "jpg";
  return ext === "jpeg" ? "jpg" : ext;
}

/**
 * 32-bit FNV-1a hash, hex-encoded. Synchronous, dependency-free, runs in any
 * JS environment. We only need a stable filename per URL (no security
 * properties), so 8 hex chars give us ~4 billion buckets which is plenty.
 *
 * @param input string to hash, typically a media URL
 */
export function hashName(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Read-only view of the field set; useful in tests.
 */
export type CardSideMediaSnapshot = CardSideMedia;
