import { openDB, type IDBPDatabase, type DBSchema, type IDBPTransaction } from "idb";
import type { FlashcardSet } from "./types";

// ── DB schema ───────────────────────────────────────────

const DB_NAME = "quickcards";
const DB_VERSION = 1;
const SETS_STORE = "sets";
const MEDIA_STORE = "media";
const META_STORE = "meta";
const META_TOTAL_BYTES_KEY = "mediaTotalBytes";

/** Media cache cap. Eviction sweeps remove oldest entries until under cap. */
const MEDIA_CAP_BYTES = 500 * 1024 * 1024;

export interface CachedSet {
  setId: string;
  /** Quizlet's set.lastModified (unix seconds). Freshness watermark. */
  lastModified: number;
  data: FlashcardSet;
}

interface CachedMedia {
  url: string;
  bytes: Uint8Array;
  lastAccessed: number;
}

interface MetaEntry {
  key: string;
  value: number;
}

interface QuickCardsDB extends DBSchema {
  [SETS_STORE]: {
    key: string;
    value: CachedSet;
  };
  [MEDIA_STORE]: {
    key: string;
    value: CachedMedia;
    indexes: { byLastAccessed: number };
  };
  [META_STORE]: {
    key: string;
    value: MetaEntry;
  };
}

type RWTx = IDBPTransaction<QuickCardsDB, (typeof MEDIA_STORE | typeof META_STORE)[], "readwrite">;

let dbPromise: Promise<IDBPDatabase<QuickCardsDB>> | null = null;

function getDb(): Promise<IDBPDatabase<QuickCardsDB>> {
  if (!dbPromise) {
    dbPromise = openDB<QuickCardsDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(SETS_STORE)) {
          db.createObjectStore(SETS_STORE, { keyPath: "setId" });
        }
        if (!db.objectStoreNames.contains(MEDIA_STORE)) {
          const media = db.createObjectStore(MEDIA_STORE, { keyPath: "url" });
          media.createIndex("byLastAccessed", "lastAccessed");
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

// ── Sets ────────────────────────────────────────────────

export async function getCachedSet(setId: string): Promise<CachedSet | undefined> {
  try {
    const db = await getDb();
    return await db.get(SETS_STORE, setId);
  } catch (err) {
    console.warn("[QuickCards] getCachedSet failed:", err);
    return undefined;
  }
}

export async function putCachedSet(entry: CachedSet): Promise<void> {
  try {
    const db = await getDb();
    await db.put(SETS_STORE, entry);
  } catch (err) {
    console.warn("[QuickCards] putCachedSet failed:", err);
  }
}

// ── Media ───────────────────────────────────────────────

/**
 * Look up media bytes by URL. On hit, refreshes the entry's `lastAccessed`
 * timestamp so LRU eviction keeps hot media warm.
 */
export async function getCachedMedia(url: string): Promise<Uint8Array | undefined> {
  try {
    const db = await getDb();
    const entry = await db.get(MEDIA_STORE, url);
    if (!entry) return undefined;

    // Touch lastAccessed off the critical path. The bytes return immediately;
    // the timestamp write happens in the background.
    entry.lastAccessed = Date.now();
    void db.put(MEDIA_STORE, entry).catch(() => {
      // best-effort refresh
    });

    return entry.bytes;
  } catch (err) {
    console.warn("[QuickCards] getCachedMedia failed:", err);
    return undefined;
  }
}

/**
 * Store fetched media bytes. Replaces any existing entry for the same URL.
 * Updates the running `mediaTotalBytes` meta counter.
 */
export async function putCachedMedia(url: string, bytes: Uint8Array): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction([MEDIA_STORE, META_STORE], "readwrite");
    const existing = await tx.objectStore(MEDIA_STORE).get(url);
    const delta = bytes.byteLength - (existing?.bytes.byteLength ?? 0);
    await tx.objectStore(MEDIA_STORE).put({ url, bytes, lastAccessed: Date.now() });
    await bumpTotalBytes(tx, delta);
    await tx.done;
  } catch (err) {
    console.warn("[QuickCards] putCachedMedia failed:", err);
  }
}

/**
 * Evict oldest media entries until total size is under the cap. Call this
 * once after a batch of writes (e.g. at the end of `downloadMedia`).
 */
export async function enforceMediaCap(): Promise<void> {
  try {
    const db = await getDb();
    let total = await readTotalBytes(db);
    if (total <= MEDIA_CAP_BYTES) return;

    const tx = db.transaction([MEDIA_STORE, META_STORE], "readwrite");
    const idx = tx.objectStore(MEDIA_STORE).index("byLastAccessed");
    let cursor = await idx.openCursor();
    while (cursor && total > MEDIA_CAP_BYTES) {
      total -= cursor.value.bytes.byteLength;
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await writeTotalBytes(tx, Math.max(0, total));
    await tx.done;
  } catch (err) {
    console.warn("[QuickCards] enforceMediaCap failed:", err);
  }
}

// ── Meta bookkeeping ────────────────────────────────────

async function readTotalBytes(db: IDBPDatabase<QuickCardsDB>): Promise<number> {
  const entry = await db.get(META_STORE, META_TOTAL_BYTES_KEY);
  return entry?.value ?? 0;
}

async function bumpTotalBytes(tx: RWTx, delta: number): Promise<void> {
  const store = tx.objectStore(META_STORE);
  const entry = await store.get(META_TOTAL_BYTES_KEY);
  const next = Math.max(0, (entry?.value ?? 0) + delta);
  await store.put({ key: META_TOTAL_BYTES_KEY, value: next });
}

async function writeTotalBytes(tx: RWTx, value: number): Promise<void> {
  await tx.objectStore(META_STORE).put({ key: META_TOTAL_BYTES_KEY, value });
}
