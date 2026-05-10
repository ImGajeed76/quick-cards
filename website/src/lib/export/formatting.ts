import type { FlashcardSet } from "./types";

export const TERM_SEP_MAP: Record<string, string> = {
  Tab: "\t",
  ",": ",",
  ":": ":",
  "→": "→",
};

export const CARD_SEP_MAP: Record<string, string> = {
  Newline: "\n",
  "Double newline": "\n\n",
  ";": ";",
};

export const TERM_SEP_PRESETS = Object.keys(TERM_SEP_MAP);
export const CARD_SEP_PRESETS = Object.keys(CARD_SEP_MAP);

export function resolveTermSep(value: string): string {
  return TERM_SEP_MAP[value] ?? value;
}

export function resolveCardSep(value: string): string {
  return CARD_SEP_MAP[value] ?? value;
}

function sanitize(text: string): string {
  return text
    .replace(/\r?\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function formatCards(set: FlashcardSet, termSep: string, cardSep: string): string {
  return set.cards
    .map((c) => `${sanitize(c.term)}${termSep}${sanitize(c.definition)}`)
    .join(cardSep);
}

export function toCsv(set: FlashcardSet): string {
  const rows = set.cards.map((c) => {
    const term = `"${c.term.replace(/"/g, '""')}"`;
    const def = `"${c.definition.replace(/"/g, '""')}"`;
    return `${term},${def}`;
  });
  return `term,definition\n${rows.join("\n")}`;
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9\-_.]/gi, "_").slice(0, 200);
}

type Data = ArrayBuffer | ArrayBufferView | Uint8Array | string;

/**
 * Save a file via the standard anchor-click download path. The browser's
 * own download manager handles it, the file lands in the user's downloads
 * folder, and it shows up in the browser's downloads bar / chip. No
 * native save dialog. Returns immediately after triggering the download;
 * "cancelled" is never produced (the browser doesn't surface that).
 */
export async function saveFile(
  getData: () => Data | Promise<Data>,
  filename: string,
  mimeType: string,
): Promise<"ok" | "cancelled"> {
  const data = await getData();
  const blob = new Blob([data as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = sanitizeFilename(filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "ok";
}
