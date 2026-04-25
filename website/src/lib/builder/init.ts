/**
 * Create new packages and write them to IndexedDB.
 *
 * Two entry points:
 * - `createBlankPackage()` for the "Start blank" button
 * - `createPackageFromFlashcardSet()` for paste / extension handoff / share-link import
 *
 * Both return the new package's id so the caller can route to `/build/[id]`.
 */

import type { FlashcardSet } from "$lib/export/types";
import { builtinModel, defaultConfig, newId } from "./defaults";
import {
  configs as configRepo,
  decks as deckRepo,
  models as modelRepo,
  notes as noteRepo,
  packages as packageRepo,
} from "./store/repos";
import type {
  BuilderConfig,
  BuilderDeck,
  BuilderModel,
  BuilderNote,
  BuilderPackage,
  Id,
} from "./types";

interface BlankArgs {
  title?: string;
}

export async function createBlankPackage(args: BlankArgs = {}): Promise<Id> {
  const now = Date.now();
  const pkg: BuilderPackage = {
    id: newId(),
    title: args.title ?? "Untitled deck",
    description: "",
    createdAt: now,
    updatedAt: now,
  };
  const model = builtinModel({ packageId: pkg.id, variant: "basicAndReversed" });
  const config = defaultConfig({ packageId: pkg.id, name: "Default" });
  const deck: BuilderDeck = {
    id: newId(),
    packageId: pkg.id,
    parentDeckId: null,
    name: pkg.title,
    description: "",
    configId: config.id,
    order: 0,
    deadline: null,
  };
  await writeAll(pkg, [deck], [], [model], [config]);
  return pkg.id;
}

export async function createPackageFromFlashcardSet(set: FlashcardSet): Promise<Id> {
  const now = Date.now();
  const title = set.title.trim() || "Imported deck";
  const pkg: BuilderPackage = {
    id: newId(),
    title,
    description: set.description ?? "",
    createdAt: now,
    updatedAt: now,
  };
  const model = builtinModel({ packageId: pkg.id, variant: "basicAndReversed" });
  const config = defaultConfig({ packageId: pkg.id, name: "Default" });
  const deck: BuilderDeck = {
    id: newId(),
    packageId: pkg.id,
    parentDeckId: null,
    name: title,
    description: "",
    configId: config.id,
    order: 0,
    deadline: null,
  };
  const notes: BuilderNote[] = set.cards.map((card, index) => ({
    id: newId(),
    packageId: pkg.id,
    deckId: deck.id,
    modelId: model.id,
    fields: [card.term, card.definition],
    tags: [],
    order: index,
  }));

  await writeAll(pkg, [deck], notes, [model], [config]);
  return pkg.id;
}

async function writeAll(
  pkg: BuilderPackage,
  decks: BuilderDeck[],
  notes: BuilderNote[],
  models: BuilderModel[],
  configs: BuilderConfig[],
): Promise<void> {
  await Promise.all([
    packageRepo.put(pkg),
    deckRepo.putMany(decks),
    noteRepo.putMany(notes),
    ...models.map((m) => modelRepo.put(m)),
    ...configs.map((c) => configRepo.put(c)),
  ]);
}
