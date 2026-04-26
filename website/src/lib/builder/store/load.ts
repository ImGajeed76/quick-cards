/**
 * Load a complete package from IndexedDB into the in-memory `PackageData`
 * shape consumed by the builder UI.
 */

import type { BuilderDeck, BuilderModel, Id, PackageData } from "../types";
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

  // Backfill `modelId` on decks that pre-date the field. The fallback prefers
  // the package's basicAndReversed model and degrades to whatever's available.
  const reversed = m.find((model) => model.builtin === "basicAndReversed");
  const fallbackModelId = reversed?.id ?? m[0]?.id ?? "";
  for (const deck of d) {
    backfillDeckModel(deck, m, fallbackModelId);
  }

  return {
    package: pkg,
    decks: indexById(d),
    notes: indexById(n),
    models: indexById(m),
    configs: indexById(c),
    media: indexById(med),
  };
}

function backfillDeckModel(deck: BuilderDeck, packageModels: BuilderModel[], fallback: Id): void {
  // The TS type says required, but pre-migration data may lack the field.
  const current = (deck as { modelId?: Id }).modelId;
  if (current && packageModels.some((m) => m.id === current)) return;
  deck.modelId = fallback;
}

function indexById<T extends { id: Id }>(items: T[]): Record<Id, T> {
  const out: Record<Id, T> = {};
  for (const item of items) out[item.id] = item;
  return out;
}
