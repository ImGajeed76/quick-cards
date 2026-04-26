/**
 * Convert a `PackageData` (the in-memory shape persisted to IDB) into an
 * `ankipack.Package` that can be written to disk as an `.apkg`.
 *
 * Construction order matters: configs first, models second, decks third
 * (passing config), then notes (passing model). Media files are read out of
 * the IDB-stored Blobs and added last.
 */

import {
  Deck,
  DeckConfig,
  Model,
  Note,
  Package,
  type DeckConfigOptions,
  type FieldDef,
  type ModelOptions,
  type NoteOptions,
  type TemplateDef,
} from "ankipack";
import type { BuilderConfig, BuilderDeck, BuilderModel, Id, PackageData } from "./types";

export async function buildAnkiPackageFromBuilder(data: PackageData): Promise<Package> {
  const pkg = new Package();

  const configMap = new Map<Id, DeckConfig>();
  for (const cfg of Object.values(data.configs)) {
    configMap.set(cfg.id, toAnkiConfig(cfg));
  }

  const modelMap = new Map<Id, Model>();
  for (const model of Object.values(data.models)) {
    modelMap.set(model.id, toAnkiModel(model));
  }

  const deckMap = new Map<Id, Deck>();
  for (const deck of Object.values(data.decks)) {
    const fullName = computeDeckPath(data.decks, deck.id);
    const config = configMap.get(deck.configId);
    const ankiDeck = new Deck({
      name: fullName || "Deck",
      description: deck.description || undefined,
      config,
    });
    deckMap.set(deck.id, ankiDeck);
    pkg.addDeck(ankiDeck);
  }

  for (const note of Object.values(data.notes)) {
    const model = modelMap.get(note.modelId);
    const deck = deckMap.get(note.deckId);
    if (!model || !deck) continue;
    const opts: NoteOptions = {
      model,
      fields: note.fields,
      tags: note.tags.length > 0 ? note.tags : undefined,
    };
    if (note.guid) opts.guid = note.guid;
    deck.addNote(new Note(opts));
  }

  for (const m of Object.values(data.media)) {
    const buffer = await m.blob.arrayBuffer();
    pkg.addMedia(m.filename, new Uint8Array(buffer));
  }

  return pkg;
}

// ---- helpers --------------------------------------------------------------

/**
 * Build the Anki-flavored deck name by joining the deck's ancestor chain with
 * `::` separators. Anki uses this string to render nesting in its UI.
 */
function computeDeckPath(decks: Record<Id, BuilderDeck>, leafId: Id): string {
  const segments: string[] = [];
  let cur: Id | null = leafId;
  while (cur) {
    const node: BuilderDeck | undefined = decks[cur];
    if (!node) break;
    segments.unshift(node.name || "Untitled");
    cur = node.parentDeckId;
  }
  return segments.join("::");
}

function toAnkiConfig(cfg: BuilderConfig): DeckConfig {
  const opts: DeckConfigOptions = {
    name: cfg.name,
    learnSteps: cfg.learnSteps,
    relearnSteps: cfg.relearnSteps,
    graduatingIntervalGood: cfg.graduatingIntervalGood,
    graduatingIntervalEasy: cfg.graduatingIntervalEasy,
    newPerDay: cfg.newPerDay,
    reviewsPerDay: cfg.reviewsPerDay,
    maximumReviewInterval: cfg.maximumReviewInterval,
    minimumLapseInterval: cfg.minimumLapseInterval,
    desiredRetention: cfg.desiredRetention,
    fsrsParams: cfg.fsrsParams,
    historicalRetention: cfg.historicalRetention,
    ignoreRevlogsBeforeDate: cfg.ignoreRevlogsBeforeDate,
    newCardInsertOrder: cfg.newCardInsertOrder,
    newCardGatherPriority: cfg.newCardGatherPriority,
    newCardSortOrder: cfg.newCardSortOrder,
    reviewOrder: cfg.reviewOrder,
    newMix: cfg.newMix,
    interdayLearningMix: cfg.interdayLearningMix,
    leechAction: cfg.leechAction,
    leechThreshold: cfg.leechThreshold,
    buryNew: cfg.buryNew,
    buryReviews: cfg.buryReviews,
    buryInterdayLearning: cfg.buryInterdayLearning,
    initialEase: cfg.initialEase,
    easyMultiplier: cfg.easyMultiplier,
    hardMultiplier: cfg.hardMultiplier,
    lapseMultiplier: cfg.lapseMultiplier,
    intervalMultiplier: cfg.intervalMultiplier,
    disableAutoplay: cfg.disableAutoplay,
    capAnswerTimeToSecs: cfg.capAnswerTimeToSecs,
    showTimer: cfg.showTimer,
    stopTimerOnAnswer: cfg.stopTimerOnAnswer,
    secondsToShowQuestion: cfg.secondsToShowQuestion,
    secondsToShowAnswer: cfg.secondsToShowAnswer,
    waitForAudio: cfg.waitForAudio,
    skipQuestionWhenReplayingAnswer: cfg.skipQuestionWhenReplayingAnswer,
    easyDaysPercentages: cfg.easyDaysPercentages,
  };
  return new DeckConfig(opts);
}

function toAnkiModel(model: BuilderModel): Model {
  const fields: FieldDef[] = model.fields.map((f) => ({
    name: f.name,
    sticky: f.sticky,
    rtl: f.rtl,
    fontName: f.fontName,
    fontSize: f.fontSize,
    description: f.description,
    plainText: f.plainText,
  }));
  const templates: TemplateDef[] = model.templates.map((t) => ({
    name: t.name,
    questionFormat: t.questionFormat,
    answerFormat: t.answerFormat,
    questionFormatBrowser: t.questionFormatBrowser,
    answerFormatBrowser: t.answerFormatBrowser,
    browserFontName: t.browserFontName,
    browserFontSize: t.browserFontSize,
    targetDeckId: t.targetDeckId,
  }));
  const opts: ModelOptions = {
    name: model.name,
    type: model.type,
    css: model.css,
    sortFieldIndex: model.sortFieldIndex,
    fields,
    templates,
    latexPre: model.latexPre,
    latexPost: model.latexPost,
    latexSvg: model.latexSvg,
  };
  return new Model(opts);
}
