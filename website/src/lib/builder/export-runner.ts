/**
 * Glue between the pure builder→anki converter and browser side effects:
 * lazy-loads sql.js, triggers downloads, copies share links.
 *
 * Lives separately from `export.ts` so the converter stays unit-testable
 * without touching the DOM.
 */

import { getSQL } from "$lib/export/sql";
import { encodePayload } from "$lib/share";
import { formatCards, toCsv } from "$lib/export/formatting";
import type { FlashcardSet } from "$lib/export/types";
import { buildAnkiPackageFromBuilder } from "./export";
import type { PackageData } from "./types";

export async function downloadApkg(data: PackageData): Promise<void> {
  const SQL = await getSQL();
  const pkg = await buildAnkiPackageFromBuilder(data);
  const bytes = await pkg.toUint8Array(SQL);
  triggerBytesDownload(bytes, filenameFor(data.package.title, "apkg"), "application/zip");
}

export function downloadJson(data: PackageData): void {
  const json = JSON.stringify(toJsonShape(data), null, 2);
  triggerTextDownload(json, filenameFor(data.package.title, "json"), "application/json");
}

export function downloadCsv(data: PackageData): void {
  triggerTextDownload(
    toCsv(toFlashcardSet(data)),
    filenameFor(data.package.title, "csv"),
    "text/csv",
  );
}

export function downloadTxt(data: PackageData): void {
  triggerTextDownload(
    formatCards(toFlashcardSet(data), "\t", "\n"),
    filenameFor(data.package.title, "txt"),
    "text/plain",
  );
}

/**
 * Encode the package's first deck as a vocab share payload. Returns the
 * shareable URL or `null` if the URL would be too long; callers should fall
 * back to sessionStorage in that case.
 */
export function shareUrl(data: PackageData, origin: string, pathname: string): string | null {
  const cards = collectFlashcards(data);
  const encoded = encodePayload({
    kind: "vocab",
    set: {
      title: data.package.title,
      description: data.package.description,
      cards,
    },
  });
  const url = `${origin}${pathname}?d=${encoded}`;
  // Browsers handle ~32k URLs reliably. Beyond that, fall back to
  // `?d=local` + sessionStorage.
  if (url.length > 32_000) return null;
  return url;
}

export function shareUrlViaSessionStorage(
  data: PackageData,
  origin: string,
  pathname: string,
): string {
  const cards = collectFlashcards(data);
  const encoded = encodePayload({
    kind: "vocab",
    set: {
      title: data.package.title,
      description: data.package.description,
      cards,
    },
  });
  sessionStorage.setItem("quickcards:payload", encoded);
  return `${origin}${pathname}?d=local`;
}

// ---- helpers --------------------------------------------------------------

function triggerTextDownload(content: string, filename: string, mime: string): void {
  download(new Blob([content], { type: mime }), filename);
}

function triggerBytesDownload(bytes: Uint8Array, filename: string, mime: string): void {
  // Re-wrap into a fresh ArrayBuffer-backed view so Blob doesn't reject it
  // when its source is typed as ArrayBuffer | SharedArrayBuffer.
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  download(new Blob([copy.buffer], { type: mime }), filename);
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function filenameFor(title: string, ext: string): string {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "deck";
  return `${slug}.${ext}`;
}

function collectFlashcards(data: PackageData): { term: string; definition: string }[] {
  return Object.values(data.notes)
    .sort((a, b) => a.order - b.order)
    .map((n) => ({ term: n.fields[0] ?? "", definition: n.fields[1] ?? "" }));
}

function toFlashcardSet(data: PackageData): FlashcardSet {
  return {
    title: data.package.title,
    description: data.package.description,
    cards: collectFlashcards(data),
  };
}

function toJsonShape(data: PackageData): FlashcardSet {
  return toFlashcardSet(data);
}
