import "fake-indexeddb/auto";
import { afterEach, describe, expect, test } from "bun:test";
import { _resetForTests } from "./db";
import { configs, decks, deletePackageCascade, media, models, notes, packages } from "./repos";
import type {
  BuilderConfig,
  BuilderDeck,
  BuilderMedia,
  BuilderModel,
  BuilderNote,
  BuilderPackage,
} from "../types";

afterEach(async () => {
  await _resetForTests();
});

function pkg(id = "p1"): BuilderPackage {
  return { id, title: "T", description: "", createdAt: 1, updatedAt: 1 };
}

function deck(id: string, packageId = "p1", configId = "c1"): BuilderDeck {
  return {
    id,
    packageId,
    parentDeckId: null,
    name: id,
    description: "",
    configId,
    modelId: "m1",
    order: 0,
    deadline: null,
  };
}

function note(id: string, packageId = "p1", deckId = "d1", modelId = "m1"): BuilderNote {
  return {
    id,
    packageId,
    deckId,
    modelId,
    fields: ["term", "def"],
    tags: [],
    order: 0,
  };
}

function model(id: string, packageId = "p1"): BuilderModel {
  return {
    id,
    packageId,
    name: "Basic",
    type: "normal",
    css: "",
    sortFieldIndex: 0,
    fields: [{ name: "Front" }, { name: "Back" }],
    templates: [{ name: "Card 1", questionFormat: "{{Front}}", answerFormat: "{{Back}}" }],
    builtin: "basic",
  };
}

function config(id: string, packageId = "p1"): BuilderConfig {
  return {
    id,
    packageId,
    name: "C",
    source: "default",
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

function mediaItem(id: string, packageId = "p1"): BuilderMedia {
  return {
    id,
    packageId,
    filename: `${id}.png`,
    mimeType: "image/png",
    size: 4,
    blob: new Blob([new Uint8Array([1, 2, 3, 4])], { type: "image/png" }),
  };
}

describe("packages", () => {
  test("put + get round-trip", async () => {
    await packages.put(pkg("p1"));
    const got = await packages.get("p1");
    expect(got?.title).toBe("T");
  });

  test("listAll returns newest-first", async () => {
    await packages.put({ ...pkg("p1"), updatedAt: 1 });
    await packages.put({ ...pkg("p2"), updatedAt: 2 });
    const all = await packages.listAll();
    expect(all.map((p) => p.id)).toEqual(["p2", "p1"]);
  });

  test("delete removes the record", async () => {
    await packages.put(pkg("p1"));
    await packages.delete("p1");
    expect(await packages.get("p1")).toBeUndefined();
  });
});

describe("collections (decks/notes/models/configs/media)", () => {
  test("listByPackage filters by packageId", async () => {
    await decks.put(deck("d1", "p1"));
    await decks.put(deck("d2", "p1"));
    await decks.put(deck("d3", "p2"));
    const p1 = await decks.listByPackage("p1");
    expect(p1.map((d) => d.id).sort()).toEqual(["d1", "d2"]);
  });

  test("notes.listByDeck filters by deckId", async () => {
    await notes.put(note("n1", "p1", "d1"));
    await notes.put(note("n2", "p1", "d1"));
    await notes.put(note("n3", "p1", "d2"));
    const d1 = await notes.listByDeck("d1");
    expect(d1.map((n) => n.id).sort()).toEqual(["n1", "n2"]);
  });

  test("putMany writes in one transaction", async () => {
    await notes.putMany([note("n1"), note("n2"), note("n3")]);
    const all = await notes.listByPackage("p1");
    expect(all).toHaveLength(3);
  });

  test("media stores blobs with their mimeType", async () => {
    await media.put(mediaItem("img1"));
    const got = await media.get("img1");
    expect(got?.mimeType).toBe("image/png");
    expect(got?.size).toBe(4);
  });
});

describe("deletePackageCascade", () => {
  test("removes the package and every record indexed by its id", async () => {
    await packages.put(pkg("p1"));
    await packages.put(pkg("p2"));
    await decks.put(deck("d1", "p1"));
    await decks.put(deck("d2", "p2"));
    await notes.put(note("n1", "p1"));
    await notes.put(note("n2", "p2"));
    await models.put(model("m1", "p1"));
    await configs.put(config("c1", "p1"));
    await media.put(mediaItem("med1", "p1"));

    await deletePackageCascade("p1");

    expect(await packages.get("p1")).toBeUndefined();
    expect(await decks.listByPackage("p1")).toEqual([]);
    expect(await notes.listByPackage("p1")).toEqual([]);
    expect(await models.listByPackage("p1")).toEqual([]);
    expect(await configs.listByPackage("p1")).toEqual([]);
    expect(await media.listByPackage("p1")).toEqual([]);

    // Other package untouched.
    expect(await packages.get("p2")).toBeDefined();
    expect(await decks.listByPackage("p2")).toHaveLength(1);
  });
});
