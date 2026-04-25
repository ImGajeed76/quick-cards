/**
 * IndexedDB schema and connection for the builder.
 *
 * Schema version 1 lays down one object store per record type. Each non-package
 * store is indexed by `packageId` so loading or deleting an entire package is a
 * single `getAllFromIndex` per store.
 *
 * Future schema changes go in the `upgrade()` switch by adding new versions.
 * Never mutate an existing version's branch; always extend forward.
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  BuilderConfig,
  BuilderDeck,
  BuilderMedia,
  BuilderModel,
  BuilderNote,
  BuilderPackage,
} from "../types";

const DB_NAME = "quickcards";
const DB_VERSION = 1;

export interface QuickCardsDB extends DBSchema {
  packages: {
    key: string;
    value: BuilderPackage;
    indexes: { byUpdatedAt: number };
  };
  decks: {
    key: string;
    value: BuilderDeck;
    indexes: { byPackage: string };
  };
  notes: {
    key: string;
    value: BuilderNote;
    indexes: { byPackage: string; byDeck: string };
  };
  models: {
    key: string;
    value: BuilderModel;
    indexes: { byPackage: string };
  };
  configs: {
    key: string;
    value: BuilderConfig;
    indexes: { byPackage: string };
  };
  media: {
    key: string;
    value: BuilderMedia;
    indexes: { byPackage: string };
  };
}

export type DB = IDBPDatabase<QuickCardsDB>;

let dbPromise: Promise<DB> | null = null;

export function getDB(): Promise<DB> {
  if (!dbPromise) {
    dbPromise = openDB<QuickCardsDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const packages = db.createObjectStore("packages", { keyPath: "id" });
          packages.createIndex("byUpdatedAt", "updatedAt");

          const decks = db.createObjectStore("decks", { keyPath: "id" });
          decks.createIndex("byPackage", "packageId");

          const notes = db.createObjectStore("notes", { keyPath: "id" });
          notes.createIndex("byPackage", "packageId");
          notes.createIndex("byDeck", "deckId");

          const models = db.createObjectStore("models", { keyPath: "id" });
          models.createIndex("byPackage", "packageId");

          const configs = db.createObjectStore("configs", { keyPath: "id" });
          configs.createIndex("byPackage", "packageId");

          const media = db.createObjectStore("media", { keyPath: "id" });
          media.createIndex("byPackage", "packageId");
        }
      },
    });
  }
  return dbPromise;
}

/** Drop all data. Test-only escape hatch; never call from app code. */
export async function _resetForTests(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}
