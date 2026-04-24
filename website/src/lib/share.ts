import LZString from "lz-string";
import type { FlashcardSet } from "$lib/export/types";
import type { QuizletSetRef } from "$lib/parse";

// What gets encoded into the `?d=…` URL param. Deliberately narrow —
// we only carry the payload needed to show the process view.
export type SharePayload =
  | { kind: "vocab"; set: FlashcardSet }
  | { kind: "quizlet"; sets: QuizletSetRef[] };

export function encodePayload(payload: SharePayload): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload));
}

export function decodePayload(encoded: string): SharePayload | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const parsed = JSON.parse(json) as SharePayload;
    if (parsed.kind === "vocab" && parsed.set?.cards?.length) return parsed;
    if (parsed.kind === "quizlet" && parsed.sets?.length) return parsed;
    return null;
  } catch {
    return null;
  }
}
