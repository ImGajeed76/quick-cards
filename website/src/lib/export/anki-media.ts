import type { MediaEntry } from "./anki-fields";

export interface DownloadProgress {
  /** Phase: "download" while pulling media, "build" while sql.js is packing the .apkg. */
  phase: "download" | "build";
  /** Items completed so far in the current phase. */
  done: number;
  /** Total items in the current phase (0 in `build` phase). */
  total: number;
  /** How many items failed to download (skipped). */
  failed: number;
}

/**
 * Download every URL in parallel (capped concurrency), emit a progress event
 * after each completion, and return a filename → bytes map. Failed downloads
 * are silently skipped: the corresponding `[sound:...]` / `<img src="...">`
 * field in the apkg simply references a missing file, which Anki tolerates
 * (audio is silently no-op, broken image shows the alt placeholder).
 *
 * Concurrency is intentionally modest. Quizlet's CDNs are fast enough that 6
 * parallel fetches saturate the link without tripping rate-limit heuristics.
 */
export async function downloadMedia(
  entries: MediaEntry[],
  onProgress?: (progress: DownloadProgress) => void,
  concurrency = 6,
): Promise<Map<string, Uint8Array>> {
  const out = new Map<string, Uint8Array>();
  const total = entries.length;

  if (total === 0) {
    onProgress?.({ phase: "download", done: 0, total: 0, failed: 0 });
    return out;
  }

  let cursor = 0;
  let done = 0;
  let failed = 0;

  onProgress?.({ phase: "download", done: 0, total, failed: 0 });

  async function worker(): Promise<void> {
    while (cursor < total) {
      const entry = entries[cursor++];
      if (!entry) continue;
      const bytes = await fetchOne(entry.url);
      if (bytes) {
        out.set(entry.filename, bytes);
      } else {
        failed++;
      }
      done++;
      onProgress?.({ phase: "download", done, total, failed });
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, worker));
  return out;
}

async function fetchOne(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    // Network errors, CORS rejections, aborted requests — all treated as
    // skip. We never retry: a re-export will pick up the same URLs again.
    return null;
  }
}
