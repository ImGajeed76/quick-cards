/**
 * Create new packages and write them to IndexedDB.
 *
 * Two entry points:
 * - `createBlankPackage()` for the "Start blank" button
 * - `createPackageFromFlashcardSet()` for paste / extension handoff / share-link import
 *
 * Both seed the package with all four built-in note types so the user can
 * switch a deck to any of them without first having to "Duplicate to
 * customize." The default scheduler preset is named after the package so it
 * never collides with the user's existing Anki "Default" preset on import
 * (ankipack also guarantees its config id is never 1, which is the id Anki
 * uses for the user's own default).
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
  ModelBuiltin,
} from "./types";

const ALL_BUILTINS: ModelBuiltin[] = ["basic", "basicAndReversed", "basicTyping", "cloze"];

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
  const models = ALL_BUILTINS.map((variant) => builtinModel({ packageId: pkg.id, variant }));
  const defaultModel = models.find((m) => m.builtin === "basicAndReversed") ?? models[0];
  const config = defaultConfig({ packageId: pkg.id, name: defaultPresetName(pkg.title) });
  const deck: BuilderDeck = {
    id: newId(),
    packageId: pkg.id,
    parentDeckId: null,
    name: pkg.title,
    description: "",
    configId: config.id,
    modelId: defaultModel.id,
    order: 0,
    deadline: null,
  };
  await writeAll(pkg, [deck], [], models, [config]);
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
  const models = ALL_BUILTINS.map((variant) => builtinModel({ packageId: pkg.id, variant }));
  const defaultModel = models.find((m) => m.builtin === "basicAndReversed") ?? models[0];
  const config = defaultConfig({ packageId: pkg.id, name: defaultPresetName(title) });
  const deck: BuilderDeck = {
    id: newId(),
    packageId: pkg.id,
    parentDeckId: null,
    name: title,
    description: "",
    configId: config.id,
    modelId: defaultModel.id,
    order: 0,
    deadline: null,
  };
  const notes: BuilderNote[] = set.cards.map((card, index) => ({
    id: newId(),
    packageId: pkg.id,
    deckId: deck.id,
    modelId: defaultModel.id,
    fields: [card.term, card.definition],
    tags: [],
    order: index,
  }));

  await writeAll(pkg, [deck], notes, models, [config]);
  return pkg.id;
}

/**
 * Prefix the preset name with "QuickCards" so users can tell it apart from
 * Anki's own "Default" preset after importing. The package title gives them a
 * second hint when several QuickCards decks are imported.
 */
function defaultPresetName(packageTitle: string): string {
  const trimmed = packageTitle.trim();
  return trimmed ? `QuickCards · ${trimmed}` : "QuickCards preset";
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
