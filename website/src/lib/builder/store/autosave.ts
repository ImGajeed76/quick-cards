/**
 * Debounced writer that pushes in-memory `PackageData` mutations back to
 * IndexedDB.
 *
 * Strategy: per-record reference comparison. mutative shares structure across
 * draft mutations, so any record whose reference changed between saves was
 * touched and needs to be written; anything else can be skipped. Removed
 * records are detected by key presence.
 *
 * Note: cross-tab editing is not synced. If the same package is opened in two
 * tabs, the last writer wins. This is a known V1 limitation.
 */

import { AUTOSAVE_DEBOUNCE_MS, type Id, type PackageData } from "../types";
import { configs, decks, media, models, notes, packages } from "./repos";

export interface AutosaveAPI {
  /** Queue a save. Resets the debounce timer if called repeatedly. */
  schedule(data: PackageData): void;
  /** Force any pending save to flush immediately. */
  flush(): Promise<void>;
  /** Cancel any pending save and tear down the timer. */
  dispose(): void;
}

export function createAutosave(): AutosaveAPI {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: PackageData | null = null;
  let lastSaved: PackageData | null = null;
  let inflight: Promise<void> | null = null;

  async function persist(data: PackageData): Promise<void> {
    const stamped: PackageData = {
      ...data,
      package: { ...data.package, updatedAt: Date.now() },
    };

    await Promise.all([
      packages.put(stamped.package),
      syncCollection(stamped.decks, lastSaved?.decks, decks),
      syncCollection(stamped.notes, lastSaved?.notes, notes),
      syncCollection(stamped.models, lastSaved?.models, models),
      syncCollection(stamped.configs, lastSaved?.configs, configs),
      syncCollection(stamped.media, lastSaved?.media, media),
    ]);

    lastSaved = stamped;
  }

  function schedule(data: PackageData): void {
    pending = data;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      const toSave = pending;
      pending = null;
      if (!toSave) return;
      inflight = persist(toSave).catch((err) => {
        console.error("[autosave] failed", err);
      });
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  async function flush(): Promise<void> {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      const toSave = pending;
      pending = null;
      if (toSave) inflight = persist(toSave);
    }
    if (inflight) await inflight;
  }

  function dispose(): void {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    pending = null;
  }

  return { schedule, flush, dispose };
}

interface RepoLike<T> {
  put(value: T): Promise<void>;
  delete(id: Id): Promise<void>;
}

async function syncCollection<T>(
  current: Record<Id, T>,
  previous: Record<Id, T> | undefined,
  repo: RepoLike<T>,
): Promise<void> {
  const writes: Promise<void>[] = [];

  for (const [id, value] of Object.entries(current)) {
    if (!previous || previous[id] !== value) {
      writes.push(repo.put(value));
    }
  }

  if (previous) {
    for (const id of Object.keys(previous)) {
      if (!(id in current)) {
        writes.push(repo.delete(id));
      }
    }
  }

  await Promise.all(writes);
}
