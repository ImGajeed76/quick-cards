/**
 * Load a complete package from IndexedDB into the in-memory `PackageData`
 * shape consumed by the builder UI.
 */

import type { Id, PackageData } from "../types";
import { configs, decks, media, models, notes, packages } from "./repos";

export async function loadPackage(packageId: Id): Promise<PackageData | null> {
  const pkg = await packages.get(packageId);
  if (!pkg) return null;

  const [d, n, m, c, med] = await Promise.all([
    decks.listByPackage(packageId),
    notes.listByPackage(packageId),
    models.listByPackage(packageId),
    configs.listByPackage(packageId),
    media.listByPackage(packageId),
  ]);

  return {
    package: pkg,
    decks: indexById(d),
    notes: indexById(n),
    models: indexById(m),
    configs: indexById(c),
    media: indexById(med),
  };
}

function indexById<T extends { id: Id }>(items: T[]): Record<Id, T> {
  const out: Record<Id, T> = {};
  for (const item of items) out[item.id] = item;
  return out;
}
