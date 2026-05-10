import LZString from "lz-string";
import type { FlashcardSet } from "$lib/export/types";
import type { QuizletSetRef } from "$lib/parse";

// `SharePayload` covers the two transient payloads we encode into URL
// params for handoff between pages. Saved (persisted) sets live in
// IndexedDB (see storage.ts) and are referenced by short ID; this type
// is for the share-link path (?s=...) and the legacy `?d=<lz-string>`
// URLs that may still be in the wild.
export type SharePayload =
  | { kind: "vocab"; set: FlashcardSet }
  | { kind: "quizlet"; sets: QuizletSetRef[] };

// ---- Legacy: lz-string-compressed payload for ?d=<blob> URLs --------------

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

// ---- Share link: brotli (with gzip fallback) + base64url ------------------
//
// Used by the Share button. The blob lives in the URL fragment (#s=<blob>)
// so Vercel never sees it: that means no 14 KB header limit and no entry
// in any access log. Only the browser handles the URL.
//
// We encode with brotli for ~10% smaller URLs vs gzip on real flashcard
// data. CompressionStream('br') is supported in Chrome 124+ (Apr 2024),
// Firefox 127+ (Jun 2024), and Safari 17.4+. We fall back to gzip if the
// browser refuses brotli.
//
// Decoding tries brotli first, then gzip. Old gzip-encoded share links
// (the previous ?s= param format) still decode unchanged.

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "==".slice((s.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function streamToBytes(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

// CompressionStream('br') support is checked at call time; older browsers
// throw a TypeError when given an unknown algorithm. We catch and fall
// back to gzip so the share button always produces a working URL.
async function compress(input: Uint8Array, algo: "br" | "gzip"): Promise<Uint8Array> {
  // The CompressionStream constructor type union doesn't include "br" in
  // some lib.dom versions even though it's supported at runtime. Cast at
  // the boundary; behaviour is correct in supporting browsers.
  const stream = new Blob([input as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream(algo as CompressionFormat));
  return streamToBytes(stream);
}

async function decompress(input: Uint8Array, algo: "br" | "gzip"): Promise<Uint8Array> {
  const stream = new Blob([input as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream(algo as CompressionFormat));
  return streamToBytes(stream);
}

export async function encodeShareLink(payload: SharePayload): Promise<string> {
  const json = JSON.stringify(payload);
  const input = new TextEncoder().encode(json);
  let bytes: Uint8Array;
  try {
    bytes = await compress(input, "br");
  } catch {
    bytes = await compress(input, "gzip");
  }
  return bytesToBase64Url(bytes);
}

export async function decodeShareLink(encoded: string): Promise<SharePayload | null> {
  const bytes = (() => {
    try {
      return base64UrlToBytes(encoded);
    } catch {
      return null;
    }
  })();
  if (!bytes) return null;

  // Try brotli first (the new default). Fall back to gzip for URLs that
  // were encoded before this change, or by a browser that lacked brotli.
  for (const algo of ["br", "gzip"] as const) {
    try {
      const decompressed = await decompress(bytes, algo);
      const json = new TextDecoder().decode(decompressed);
      const parsed = JSON.parse(json) as SharePayload;
      if (parsed.kind === "vocab" && parsed.set?.cards?.length) return parsed;
      if (parsed.kind === "quizlet" && parsed.sets?.length) return parsed;
    } catch {
      // try the next algorithm
    }
  }
  return null;
}
