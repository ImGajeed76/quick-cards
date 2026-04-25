/**
 * CRUD wrappers for each object store. Thin layer over `idb`'s typed methods,
 * grouped by store so callers can write `decks.put(...)` etc.
 *
 * The wrappers are written explicitly per store rather than via a generic
 * factory because `idb`'s overloads require the literal store-name type at
 * each call site; a generic helper widens it to a union and breaks inference.
 */

import type {
  BuilderConfig,
  BuilderDeck,
  BuilderMedia,
  BuilderModel,
  BuilderNote,
  BuilderPackage,
  Id,
} from "../types";
import { getDB } from "./db";

// ----- packages ------------------------------------------------------------

export const packages = {
  async get(id: Id): Promise<BuilderPackage | undefined> {
    const db = await getDB();
    return db.get("packages", id);
  },
  async put(value: BuilderPackage): Promise<void> {
    const db = await getDB();
    await db.put("packages", value);
  },
  async delete(id: Id): Promise<void> {
    const db = await getDB();
    await db.delete("packages", id);
  },
  /** Newest first by `updatedAt`. */
  async listAll(): Promise<BuilderPackage[]> {
    const db = await getDB();
    const all = await db.getAllFromIndex("packages", "byUpdatedAt");
    return all.reverse();
  },
};

// ----- decks --------------------------------------------------------------

export const decks = {
  async get(id: Id): Promise<BuilderDeck | undefined> {
    const db = await getDB();
    return db.get("decks", id);
  },
  async put(value: BuilderDeck): Promise<void> {
    const db = await getDB();
    await db.put("decks", value);
  },
  async putMany(values: BuilderDeck[]): Promise<void> {
    if (values.length === 0) return;
    const db = await getDB();
    const tx = db.transaction("decks", "readwrite");
    await Promise.all([...values.map((v) => tx.store.put(v)), tx.done]);
  },
  async delete(id: Id): Promise<void> {
    const db = await getDB();
    await db.delete("decks", id);
  },
  async listByPackage(packageId: Id): Promise<BuilderDeck[]> {
    const db = await getDB();
    return db.getAllFromIndex("decks", "byPackage", packageId);
  },
  async countByPackage(packageId: Id): Promise<number> {
    const db = await getDB();
    return db.countFromIndex("decks", "byPackage", packageId);
  },
};

// ----- notes --------------------------------------------------------------

export const notes = {
  async get(id: Id): Promise<BuilderNote | undefined> {
    const db = await getDB();
    return db.get("notes", id);
  },
  async put(value: BuilderNote): Promise<void> {
    const db = await getDB();
    await db.put("notes", value);
  },
  async putMany(values: BuilderNote[]): Promise<void> {
    if (values.length === 0) return;
    const db = await getDB();
    const tx = db.transaction("notes", "readwrite");
    await Promise.all([...values.map((v) => tx.store.put(v)), tx.done]);
  },
  async delete(id: Id): Promise<void> {
    const db = await getDB();
    await db.delete("notes", id);
  },
  async deleteMany(ids: Id[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getDB();
    const tx = db.transaction("notes", "readwrite");
    await Promise.all([...ids.map((id) => tx.store.delete(id)), tx.done]);
  },
  async listByPackage(packageId: Id): Promise<BuilderNote[]> {
    const db = await getDB();
    return db.getAllFromIndex("notes", "byPackage", packageId);
  },
  async listByDeck(deckId: Id): Promise<BuilderNote[]> {
    const db = await getDB();
    return db.getAllFromIndex("notes", "byDeck", deckId);
  },
  async countByPackage(packageId: Id): Promise<number> {
    const db = await getDB();
    return db.countFromIndex("notes", "byPackage", packageId);
  },
};

// ----- models -------------------------------------------------------------

export const models = {
  async get(id: Id): Promise<BuilderModel | undefined> {
    const db = await getDB();
    return db.get("models", id);
  },
  async put(value: BuilderModel): Promise<void> {
    const db = await getDB();
    await db.put("models", value);
  },
  async delete(id: Id): Promise<void> {
    const db = await getDB();
    await db.delete("models", id);
  },
  async listByPackage(packageId: Id): Promise<BuilderModel[]> {
    const db = await getDB();
    return db.getAllFromIndex("models", "byPackage", packageId);
  },
};

// ----- configs ------------------------------------------------------------

export const configs = {
  async get(id: Id): Promise<BuilderConfig | undefined> {
    const db = await getDB();
    return db.get("configs", id);
  },
  async put(value: BuilderConfig): Promise<void> {
    const db = await getDB();
    await db.put("configs", value);
  },
  async delete(id: Id): Promise<void> {
    const db = await getDB();
    await db.delete("configs", id);
  },
  async listByPackage(packageId: Id): Promise<BuilderConfig[]> {
    const db = await getDB();
    return db.getAllFromIndex("configs", "byPackage", packageId);
  },
};

// ----- media --------------------------------------------------------------

export const media = {
  async get(id: Id): Promise<BuilderMedia | undefined> {
    const db = await getDB();
    return db.get("media", id);
  },
  async put(value: BuilderMedia): Promise<void> {
    const db = await getDB();
    await db.put("media", value);
  },
  async delete(id: Id): Promise<void> {
    const db = await getDB();
    await db.delete("media", id);
  },
  async listByPackage(packageId: Id): Promise<BuilderMedia[]> {
    const db = await getDB();
    return db.getAllFromIndex("media", "byPackage", packageId);
  },
};

// ----- cascade -----------------------------------------------------------

/**
 * Atomically delete a package and every record that belongs to it. Wraps all
 * stores in one transaction so a partial failure leaves nothing behind.
 */
export async function deletePackageCascade(packageId: Id): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    ["packages", "decks", "notes", "models", "configs", "media"] as const,
    "readwrite",
  );

  const childStores = ["decks", "notes", "models", "configs", "media"] as const;
  await tx.objectStore("packages").delete(packageId);
  await Promise.all(
    childStores.map(async (name) => {
      const store = tx.objectStore(name);
      const keys = await store.index("byPackage").getAllKeys(packageId);
      await Promise.all(keys.map((k) => store.delete(k)));
    }),
  );

  await tx.done;
}
