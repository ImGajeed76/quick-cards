import { Package, Deck, DeckConfig, Model, Note } from "ankipack";
import type { SqlJsStatic } from "sql.js";
import type { FlashcardSet } from "./types";

// Build a DeckConfig tuned to the remaining deadline.
// - `days`: days until the user needs to know the set (>= 1)
// - `totalCards`: used as newPerDay so Anki doesn't throttle intro of new cards
// - `isTyping`: typing decks run with slightly lower desired retention
function buildConfig(
  days: number,
  totalCards: number,
  isTyping: boolean,
  name: string,
): DeckConfig {
  const baseDR = Math.min(0.95, Math.max(0.9, 0.9 + (14 - days) * 0.005));
  const desiredRetention = isTyping ? Math.max(0.8, baseDR - 0.05) : baseDR;

  let learnSteps: number[];
  let graduatingIntervalGood: number;
  let graduatingIntervalEasy: number;
  if (days <= 4) {
    learnSteps = [1, 5, 10, 30, 60];
    graduatingIntervalGood = 1;
    graduatingIntervalEasy = 2;
  } else if (days <= 7) {
    learnSteps = [1, 5, 10, 30];
    graduatingIntervalGood = 1;
    graduatingIntervalEasy = 2;
  } else {
    learnSteps = [1, 10];
    graduatingIntervalGood = 1;
    graduatingIntervalEasy = 4;
  }

  return new DeckConfig({
    name,
    desiredRetention,
    learnSteps,
    graduatingIntervalGood,
    graduatingIntervalEasy,
    newPerDay: Math.max(1, totalCards),
    reviewsPerDay: 9999,
    maximumReviewInterval: days,
    buryNew: true,
    buryReviews: true,
    reviewOrder: "retrievabilityAscending",
    newMix: "mixWithReviews",
    leechAction: "tagOnly",
  });
}

export interface AnkiExportOptions {
  set: FlashcardSet;
  days: number;
  SQL: SqlJsStatic; // sql.js module, initialized by the caller
}

/**
 * Build an .apkg with three decks:
 *   - Flashcards (Basic + reversed)
 *   - Typing Term → Def
 *   - Typing Def → Term
 *
 * Typing decks are siblings (not subdecks) so they don't appear when studying the main deck.
 */
export async function buildAnkiPackage(opts: AnkiExportOptions): Promise<Uint8Array> {
  const { set, days, SQL } = opts;
  const title = set.title || "QuickCards";
  const totalCards = set.cards.length;

  const pkg = new Package();

  // Preset names include title + days so repeated exports don't overwrite each other in Anki.
  const flashcardPresetName = `QuickCards · ${title} (${days}d)`;
  const typingPresetName = `QuickCards · ${title} (${days}d, typing)`;

  // Main flashcard deck (both directions via basicAndReversed)
  const flashcardModel = Model.basicAndReversed();
  const flashcardConfig = buildConfig(days, totalCards, false, flashcardPresetName);
  const flashcardDeck = new Deck({
    name: title,
    config: flashcardConfig,
  });
  for (const card of set.cards) {
    flashcardDeck.addNote(
      new Note({
        model: flashcardModel,
        fields: [card.term, card.definition],
      }),
    );
  }
  pkg.addDeck(flashcardDeck);

  // Typing decks share one config — same settings, slightly lower DR.
  const typingModel = Model.basicTyping();
  const typingConfig = buildConfig(days, totalCards, true, typingPresetName);

  const typingTermDef = new Deck({
    name: `${title} (Type Term → Def)`,
    config: typingConfig,
  });
  for (const card of set.cards) {
    typingTermDef.addNote(
      new Note({
        model: typingModel,
        fields: [card.term, card.definition],
      }),
    );
  }
  pkg.addDeck(typingTermDef);

  const typingDefTerm = new Deck({
    name: `${title} (Type Def → Term)`,
    config: typingConfig,
  });
  for (const card of set.cards) {
    typingDefTerm.addNote(
      new Note({
        model: typingModel,
        fields: [card.definition, card.term],
      }),
    );
  }
  pkg.addDeck(typingDefTerm);

  return pkg.toUint8Array(SQL);
}
