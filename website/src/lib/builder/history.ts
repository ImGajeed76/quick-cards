/**
 * Undo/redo for the builder.
 *
 * Each call to `mutate` produces a forward patch + inverse patch pair via
 * `mutative`'s `enablePatches`. Entries are stored in two stacks: `past` for
 * undo and `future` for redo. New mutations clear `future`.
 *
 * Rapid edits to the same logical target (e.g. typing in one card field) are
 * coalesced into a single entry as long as they share a `coalesceKey` and
 * happen within `HISTORY_COALESCE_MS`. This makes undo skip whole edit runs at
 * once instead of one keystroke at a time.
 *
 * Selection is part of the state, so undo/redo restores it for free.
 */

import { apply, create, type Patches } from "mutative";
import { HISTORY_COALESCE_MS, HISTORY_LIMIT } from "./types";

interface HistoryEntry {
  forward: Patches;
  inverse: Patches;
  description: string;
  coalesceKey: string | null;
  timestamp: number;
}

export interface HistoryAPI<T extends object> {
  /**
   * Apply `recipe` to a draft of `state`. Returns the new state and records the
   * change. If `coalesceKey` is supplied and matches the previous entry within
   * the coalesce window, the patches are folded into that entry.
   *
   * If `recipe` produces no changes, the original `state` is returned and the
   * history is left untouched.
   */
  mutate(state: T, recipe: (draft: T) => void, description: string, coalesceKey?: string): T;
  undo(state: T): T;
  redo(state: T): T;
  canUndo(): boolean;
  canRedo(): boolean;
  clear(): void;
  /** Most recent past entry's description, for "Undo: edit term" toasts. */
  lastDescription(): string | null;
  /** Most recent future entry's description, for redo toasts. */
  nextRedoDescription(): string | null;
  /** Test/debug: current stack sizes. */
  size(): { past: number; future: number };
}

export function createHistory<T extends object>(): HistoryAPI<T> {
  const past: HistoryEntry[] = [];
  const future: HistoryEntry[] = [];

  function mutate(
    state: T,
    recipe: (draft: T) => void,
    description: string,
    coalesceKey?: string,
  ): T {
    const [next, patches, inverse] = create(state, recipe, { enablePatches: true });

    if (patches.length === 0) {
      // No-op mutations don't touch history or invalidate redo; the user
      // didn't actually do anything.
      return state;
    }

    const now = Date.now();
    const last = past[past.length - 1];
    const canCoalesce =
      coalesceKey !== undefined &&
      last !== undefined &&
      last.coalesceKey === coalesceKey &&
      now - last.timestamp < HISTORY_COALESCE_MS;

    if (canCoalesce && last) {
      // Forward patches stack newest-last so they apply in order. Inverse
      // patches stack newest-first so undoing rewinds in reverse order.
      last.forward.push(...patches);
      last.inverse.unshift(...inverse);
      last.timestamp = now;
    } else {
      past.push({
        forward: patches,
        inverse,
        description,
        coalesceKey: coalesceKey ?? null,
        timestamp: now,
      });
      if (past.length > HISTORY_LIMIT) past.shift();
    }

    future.length = 0;
    return next as T;
  }

  function undo(state: T): T {
    const entry = past.pop();
    if (!entry) return state;
    future.push(entry);
    return apply(state, entry.inverse) as T;
  }

  function redo(state: T): T {
    const entry = future.pop();
    if (!entry) return state;
    past.push(entry);
    return apply(state, entry.forward) as T;
  }

  return {
    mutate,
    undo,
    redo,
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
    clear: () => {
      past.length = 0;
      future.length = 0;
    },
    lastDescription: () => past[past.length - 1]?.description ?? null,
    nextRedoDescription: () => future[future.length - 1]?.description ?? null,
    size: () => ({ past: past.length, future: future.length }),
  };
}
