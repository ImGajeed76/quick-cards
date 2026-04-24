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

/** Legacy blob download — no cancel detection. Used as fallback when the
 *  File System Access API isn't available (Firefox, Safari). */
function blobDownload(bytes: Data, filename: string, mimeType: string): void {
  const blob = new Blob([bytes as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = sanitizeFilename(filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Save via the File System Access API when available — the returned promise
 * resolves with `'ok'` only after the user accepts the save dialog, or
 * `'cancelled'` if they dismiss it. On Firefox/Safari, falls back to a blob
 * download and resolves `'ok'` immediately (no cancel detection possible there).
 *
 * The picker is opened BEFORE `getData()` runs so the (often cheap) data
 * generation happens while the user is still interacting with the dialog —
 * and we never compute the payload if they cancel.
 */
export async function saveFile(
  getData: () => Data | Promise<Data>,
  filename: string,
  mimeType: string,
): Promise<"ok" | "cancelled"> {
  const w = window as unknown as {
    showSaveFilePicker?: (opts: {
      suggestedName: string;
      types?: { description?: string; accept: Record<string, string[]> }[];
    }) => Promise<FileSystemFileHandle>;
  };

  if (typeof w.showSaveFilePicker !== "function") {
    const data = await getData();
    blobDownload(data, filename, mimeType);
    return "ok";
  }

  const ext = filename.match(/\.[^.]+$/)?.[0];
  let handle: FileSystemFileHandle;
  try {
    handle = await w.showSaveFilePicker({
      suggestedName: sanitizeFilename(filename),
      types: ext ? [{ accept: { [mimeType]: [ext] } }] : [],
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
    throw err;
  }

  const data = await getData();
  const writable = await handle.createWritable();
  await writable.write(data as FileSystemWriteChunkType);
  await writable.close();
  return "ok";
}
