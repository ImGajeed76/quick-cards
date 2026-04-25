/**
 * Factories for the built-in note types and the deadline-tuned scheduler
 * preset. The deadline tuner mirrors `src/lib/export/anki.ts` so existing
 * exports keep their behavior, but lives here so the builder doesn't depend on
 * the exporter.
 */

import type {
  BuilderConfig,
  BuilderModel,
  ConfigSource,
  DeadlineSpec,
  Id,
  ModelBuiltin,
} from "./types";

export function newId(): Id {
  return crypto.randomUUID();
}

// ============================================================================
// Built-in note types
// ============================================================================

interface BuiltinModelArgs {
  packageId: Id;
  variant: ModelBuiltin;
  /** Override the displayed name. Defaults to a friendly built-in label. */
  name?: string;
}

export function builtinModel(args: BuiltinModelArgs): BuilderModel {
  const id = newId();
  switch (args.variant) {
    case "basic":
      return {
        id,
        packageId: args.packageId,
        name: args.name ?? "Basic",
        type: "normal",
        css: defaultCardCss(),
        sortFieldIndex: 0,
        fields: [
          { name: "Front", description: "Front of the card" },
          { name: "Back", description: "Back of the card" },
        ],
        templates: [
          {
            name: "Card 1",
            questionFormat: "{{Front}}",
            answerFormat: '{{FrontSide}}\n\n<hr id="answer">\n\n{{Back}}',
          },
        ],
        builtin: "basic",
      };

    case "basicAndReversed":
      return {
        id,
        packageId: args.packageId,
        name: args.name ?? "Basic + Reversed",
        type: "normal",
        css: defaultCardCss(),
        sortFieldIndex: 0,
        fields: [
          { name: "Front", description: "Front of the card" },
          { name: "Back", description: "Back of the card" },
        ],
        templates: [
          {
            name: "Card 1",
            questionFormat: "{{Front}}",
            answerFormat: '{{FrontSide}}\n\n<hr id="answer">\n\n{{Back}}',
          },
          {
            name: "Card 2",
            questionFormat: "{{Back}}",
            answerFormat: '{{FrontSide}}\n\n<hr id="answer">\n\n{{Front}}',
          },
        ],
        builtin: "basicAndReversed",
      };

    case "basicTyping":
      return {
        id,
        packageId: args.packageId,
        name: args.name ?? "Basic (type the answer)",
        type: "normal",
        css: defaultCardCss(),
        sortFieldIndex: 0,
        fields: [
          { name: "Front", description: "Prompt" },
          { name: "Back", description: "Answer to type" },
        ],
        templates: [
          {
            name: "Card 1",
            questionFormat: "{{Front}}\n\n{{type:Back}}",
            answerFormat: '{{FrontSide}}\n\n<hr id="answer">\n\n{{type:Back}}',
          },
        ],
        builtin: "basicTyping",
      };

    case "cloze":
      return {
        id,
        packageId: args.packageId,
        name: args.name ?? "Cloze",
        type: "cloze",
        css: defaultCardCss(),
        sortFieldIndex: 0,
        fields: [
          { name: "Text", description: "Wrap parts in {{c1::...}} to hide them" },
          { name: "Back Extra", description: "Extra info shown on the back" },
        ],
        templates: [
          {
            name: "Cloze",
            questionFormat: "{{cloze:Text}}",
            answerFormat: "{{cloze:Text}}\n\n{{Back Extra}}",
          },
        ],
        builtin: "cloze",
      };
  }
}

function defaultCardCss(): string {
  // Anki's stock card stylesheet, kept minimal so users see clean cards by default.
  return [
    ".card {",
    "  font-family: arial;",
    "  font-size: 20px;",
    "  text-align: center;",
    "  color: black;",
    "  background-color: white;",
    "}",
  ].join("\n");
}

// ============================================================================
// Deadline-tuned config
// ============================================================================

interface DeadlineConfigArgs {
  packageId: Id;
  name: string;
  deadline: DeadlineSpec;
  /** Total card count in the deck, used as `newPerDay` so Anki doesn't throttle. */
  totalCards: number;
  /** Typing decks run at slightly lower desired retention. */
  isTyping?: boolean;
}

/**
 * Build a config tuned to a deadline. Intentionally mirrors the rules in
 * `src/lib/export/anki.ts:buildConfig` so behavior matches the existing
 * `/process` flow. If those heuristics ever change, update both call sites.
 */
export function deadlineTunedConfig(args: DeadlineConfigArgs): BuilderConfig {
  const days = Math.max(1, daysUntil(args.deadline));
  const baseDR = Math.min(0.95, Math.max(0.9, 0.9 + (14 - days) * 0.005));
  const desiredRetention = args.isTyping ? Math.max(0.8, baseDR - 0.05) : baseDR;

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

  return {
    ...defaultConfigShape(args.packageId, args.name, "deadline"),
    generatedFromDeadline: args.deadline,
    desiredRetention,
    learnSteps,
    graduatingIntervalGood,
    graduatingIntervalEasy,
    newPerDay: Math.max(1, args.totalCards),
    reviewsPerDay: 9999,
    maximumReviewInterval: days,
    buryNew: true,
    buryReviews: true,
    reviewOrder: "retrievabilityAscending",
    newMix: "mixWithReviews",
    leechAction: "tagOnly",
  };
}

/**
 * A neutral config equivalent to ankipack's documented defaults. Used for
 * fresh decks before the user picks a deadline or customizes anything.
 */
export function defaultConfig(args: { packageId: Id; name: string }): BuilderConfig {
  return defaultConfigShape(args.packageId, args.name, "default");
}

function defaultConfigShape(packageId: Id, name: string, source: ConfigSource): BuilderConfig {
  return {
    id: newId(),
    packageId,
    name,
    source,
    learnSteps: [1, 10],
    relearnSteps: [10],
    graduatingIntervalGood: 1,
    graduatingIntervalEasy: 4,
    newPerDay: 20,
    reviewsPerDay: 200,
    maximumReviewInterval: 36500,
    minimumLapseInterval: 1,
    desiredRetention: 0.9,
    fsrsParams: [],
    historicalRetention: 0.9,
    ignoreRevlogsBeforeDate: "",
    newCardInsertOrder: "due",
    newCardGatherPriority: "deck",
    newCardSortOrder: "template",
    reviewOrder: "day",
    newMix: "mixWithReviews",
    interdayLearningMix: "mixWithReviews",
    leechAction: "tagOnly",
    leechThreshold: 8,
    buryNew: false,
    buryReviews: false,
    buryInterdayLearning: false,
    initialEase: 2.5,
    easyMultiplier: 1.3,
    hardMultiplier: 1.2,
    lapseMultiplier: 0,
    intervalMultiplier: 1,
    disableAutoplay: false,
    capAnswerTimeToSecs: 60,
    showTimer: false,
    stopTimerOnAnswer: false,
    secondsToShowQuestion: 0,
    secondsToShowAnswer: 0,
    waitForAudio: true,
    skipQuestionWhenReplayingAnswer: false,
    easyDaysPercentages: [],
  };
}

/**
 * Days between today (local time) and the deadline date. May be zero or
 * negative if the deadline has passed; callers should clamp.
 */
export function daysUntil(deadline: DeadlineSpec): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseLocalDate(deadline.date);
  const ms = target.getTime() - today.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function parseLocalDate(iso: string): Date {
  // YYYY-MM-DD parsed in local time (not UTC) so deadline math respects the
  // user's clock, matching how the date picker presents it.
  const [y, m, d] = iso.split("-").map((n) => Number.parseInt(n, 10));
  return new Date(y, m - 1, d);
}
