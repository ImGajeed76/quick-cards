// IndexedDB-backed persistence for flashcard sets, keyed by short URL-safe
// IDs. /tool writes a set on continue, /process reads by ID, edits update
// in place. Sharing is decoupled: the share button compresses the set
// into a URL payload (see share.ts) which the receiver decodes and saves
// to their own IndexedDB under a fresh ID.
//
// Schema is intentionally minimal. New optional fields can be added to
// FlashcardSet / Flashcard later without breaking persisted data, since
// JSON deserialisation just ignores unknown fields and produces them as
// undefined when read.

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { nanoid } from "nanoid";
import type { FlashcardSet } from "$lib/export/types";

const DB_NAME = "quickcards";
// Bump DB_VERSION whenever the schema changes. The upgrade handler is
// idempotent: it creates any missing stores up to the current version,
// so users on older DB versions catch up without losing data.
const DB_VERSION = 2;
const STORE_SETS = "sets";
const ID_LENGTH = 10;

interface QuickCardsDB extends DBSchema {
  [STORE_SETS]: {
    key: string;
    value: FlashcardSet;
  };
}

let dbPromise: Promise<IDBPDatabase<QuickCardsDB>> | null = null;

function getDB(): Promise<IDBPDatabase<QuickCardsDB>> {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available"));
  }
  dbPromise = openDB<QuickCardsDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_SETS)) {
        db.createObjectStore(STORE_SETS, { keyPath: "id" });
      }
    },
  });
  return dbPromise;
}

/** Generate a short URL-safe ID. nanoid's default alphabet is URL-safe. */
export function generateSetId(): string {
  return nanoid(ID_LENGTH);
}

/** Heuristic: short alphanumeric/-/_ string suggests a set ID, longer
 *  blobs are legacy lz-string URL payloads. */
export function looksLikeSetId(s: string): boolean {
  return /^[A-Za-z0-9_-]{6,16}$/.test(s);
}

export async function saveSet(set: FlashcardSet): Promise<void> {
  const db = await getDB();
  // Strip Svelte $state proxies (and anything else non-clonable) by
  // JSON round-tripping. IndexedDB uses structured clone internally and
  // refuses to write proxies.
  const plain = JSON.parse(JSON.stringify(set)) as FlashcardSet;
  plain.updatedAt = Date.now();
  await db.put(STORE_SETS, plain);
}

export async function loadSet(id: string): Promise<FlashcardSet | null> {
  const db = await getDB();
  return (await db.get(STORE_SETS, id)) ?? null;
}

export async function deleteSet(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_SETS, id);
}
