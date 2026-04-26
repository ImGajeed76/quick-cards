/**
 * Builder data model.
 *
 * All persisted records live in IndexedDB. Records reference each other by
 * string `Id` (UUID v4), independent of the numeric IDs ankipack assigns at
 * export time. This keeps the editor state simple and avoids ID collisions
 * across packages.
 */

export type Id = string;

// ============================================================================
// Package
// ============================================================================

export interface BuilderPackage {
  id: Id;
  title: string;
  description: string;
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// Deck
// ============================================================================

/**
 * A deadline expressed as an ISO date (YYYY-MM-DD). Days remaining are derived
 * relative to the user's local "today" at use time, not stored.
 */
export interface DeadlineSpec {
  date: string;
}

export interface BuilderDeck {
  id: Id;
  packageId: Id;
  parentDeckId: Id | null;
  name: string;
  /** HTML, shown in Anki's deck list. */
  description: string;
  configId: Id;
  /** Default note type for new cards added to this deck. */
  modelId: Id;
  /** Sort order among siblings sharing the same parentDeckId. */
  order: number;
  /** Last deadline picked for this deck. Drives the deadline-bar UI. */
  deadline: DeadlineSpec | null;
}

// ============================================================================
// Note
// ============================================================================

export interface BuilderNote {
  id: Id;
  packageId: Id;
  deckId: Id;
  modelId: Id;
  /** Field values in the same order as the model's fields. */
  fields: string[];
  tags: string[];
  /** Custom GUID. Auto-generated at export if absent. */
  guid?: string;
  /** Sort order within the deck. */
  order: number;
}

// ============================================================================
// Model (note type)
// ============================================================================

export type ModelBuiltin = "basic" | "basicAndReversed" | "basicTyping" | "cloze";

export interface BuilderField {
  name: string;
  sticky?: boolean;
  rtl?: boolean;
  fontName?: string;
  fontSize?: number;
  /** Placeholder text shown when the field is empty. */
  description?: string;
  plainText?: boolean;
}

export interface BuilderTemplate {
  name: string;
  questionFormat: string;
  answerFormat: string;
  questionFormatBrowser?: string;
  answerFormatBrowser?: string;
  browserFontName?: string;
  browserFontSize?: number;
  targetDeckId?: number;
}

export interface BuilderModel {
  id: Id;
  packageId: Id;
  name: string;
  type: "normal" | "cloze";
  css: string;
  sortFieldIndex: number;
  fields: BuilderField[];
  templates: BuilderTemplate[];
  latexPre?: string;
  latexPost?: string;
  latexSvg?: boolean;
  /**
   * When set, this model is one of our locked built-ins. Editing requires
   * "Duplicate to customize", which clones it with `builtin: null`.
   */
  builtin: ModelBuiltin | null;
}

// ============================================================================
// Config (DeckConfig / preset)
// ============================================================================

export type NewCardInsertOrder = "due" | "random";

export type NewCardGatherPriority =
  | "deck"
  | "deckThenRandom"
  | "lowestPosition"
  | "highestPosition"
  | "randomNotes"
  | "randomCards";

export type NewCardSortOrder =
  | "template"
  | "noSort"
  | "templateThenRandom"
  | "randomNoteThenTemplate"
  | "randomCard";

export type ReviewCardOrder =
  | "day"
  | "dayThenDeck"
  | "deckThenDay"
  | "intervalsAscending"
  | "intervalsDescending"
  | "easeAscending"
  | "easeDescending"
  | "retrievabilityAscending"
  | "retrievabilityDescending"
  | "relativeOverdueness"
  | "random"
  | "added"
  | "reverseAdded";

export type ReviewMix = "mixWithReviews" | "afterReviews" | "beforeReviews";
export type LeechAction = "suspend" | "tagOnly";

/**
 * Source of a config:
 * - `"default"`: never been customized and never had a deadline applied. The
 *   deadline picker overwrites it without asking.
 * - `"deadline"`: auto-generated from a `DeadlineSpec`. Picking a new deadline
 *   re-derives it silently.
 * - `"custom"`: user has hand-edited fields. The deadline picker must
 *   confirm before clobbering deliberate tweaks.
 */
export type ConfigSource = "default" | "deadline" | "custom";

export interface BuilderConfig {
  id: Id;
  packageId: Id;
  name: string;
  source: ConfigSource;
  /** Set when `source === "deadline"`. The spec used to derive the values. */
  generatedFromDeadline?: DeadlineSpec;

  // ---- Daily limits ----
  newPerDay: number;
  reviewsPerDay: number;

  // ---- Learning ----
  learnSteps: number[];
  relearnSteps: number[];
  graduatingIntervalGood: number;
  graduatingIntervalEasy: number;

  // ---- Intervals ----
  maximumReviewInterval: number;
  minimumLapseInterval: number;

  // ---- FSRS ----
  desiredRetention: number;
  fsrsParams: number[];
  historicalRetention: number;
  ignoreRevlogsBeforeDate: string;

  // ---- Card ordering ----
  newCardInsertOrder: NewCardInsertOrder;
  newCardGatherPriority: NewCardGatherPriority;
  newCardSortOrder: NewCardSortOrder;
  reviewOrder: ReviewCardOrder;
  newMix: ReviewMix;
  interdayLearningMix: ReviewMix;

  // ---- Leeches ----
  leechAction: LeechAction;
  leechThreshold: number;

  // ---- Burying ----
  buryNew: boolean;
  buryReviews: boolean;
  buryInterdayLearning: boolean;

  // ---- Legacy SM-2 multipliers (used when FSRS is off in Anki) ----
  initialEase: number;
  easyMultiplier: number;
  hardMultiplier: number;
  lapseMultiplier: number;
  intervalMultiplier: number;

  // ---- Audio / display ----
  disableAutoplay: boolean;
  capAnswerTimeToSecs: number;
  showTimer: boolean;
  stopTimerOnAnswer: boolean;
  secondsToShowQuestion: number;
  secondsToShowAnswer: number;
  waitForAudio: boolean;
  skipQuestionWhenReplayingAnswer: boolean;

  // ---- Easy days (per-weekday review load percentages) ----
  easyDaysPercentages: number[];
}

// ============================================================================
// Media
// ============================================================================

export interface BuilderMedia {
  id: Id;
  packageId: Id;
  /** The filename used inside the .apkg and referenced from card templates. */
  filename: string;
  mimeType: string;
  /** Size in bytes. Cached so we can show it without reading the blob. */
  size: number;
  blob: Blob;
}

// ============================================================================
// State (in-memory, hydrated from IDB)
// ============================================================================

export type Selection =
  | { kind: "none" }
  | { kind: "deck"; id: Id }
  | { kind: "model"; id: Id }
  | { kind: "config"; id: Id }
  | { kind: "media" }
  | { kind: "mediaItem"; id: Id };

/** Everything that gets persisted. */
export interface PackageData {
  package: BuilderPackage;
  decks: Record<Id, BuilderDeck>;
  notes: Record<Id, BuilderNote>;
  models: Record<Id, BuilderModel>;
  configs: Record<Id, BuilderConfig>;
  media: Record<Id, BuilderMedia>;
}

/** Full editor state. `selection` is undoable but not persisted. */
export interface PackageState {
  data: PackageData;
  selection: Selection;
}

// ============================================================================
// Quotas
// ============================================================================

export const MEDIA_PER_FILE_LIMIT = 10 * 1024 * 1024;
export const MEDIA_PER_PACKAGE_LIMIT = 200 * 1024 * 1024;
export const HISTORY_LIMIT = 500;
export const HISTORY_COALESCE_MS = 500;
export const AUTOSAVE_DEBOUNCE_MS = 250;
