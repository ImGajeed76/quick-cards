import { describe, expect, test } from "bun:test";
import {
  buildDeckForest,
  collectSubtreeIds,
  flattenIds,
  isDescendantOrSelf,
  isSimpleFlashcardDeck,
  moveDeck,
  repackSiblingOrder,
} from "./deck-tree";
import type { BuilderDeck, BuilderNote, Id } from "./types";

function deck(id: string, parent: Id | null, order: number, name = id): BuilderDeck {
  return {
    id,
    packageId: "p",
    parentDeckId: parent,
    name,
    description: "",
    configId: "c",
    modelId: "m",
    order,
    deadline: null,
  };
}

function note(id: string, deckId: string, modelId = "m"): BuilderNote {
  return { id, packageId: "p", deckId, modelId, fields: ["a", "b"], tags: [], order: 0 };
}

function record<T extends { id: Id }>(items: T[]): Record<Id, T> {
  return Object.fromEntries(items.map((i) => [i.id, i]));
}

describe("buildDeckForest", () => {
  test("groups roots and children by parent and order", () => {
    const decks = record([
      deck("a", null, 0),
      deck("b", null, 1),
      deck("a1", "a", 0),
      deck("a2", "a", 1),
      deck("a1x", "a1", 0),
    ]);
    const forest = buildDeckForest({ decks, notes: {} });

    expect(forest.map((n) => n.deck.id)).toEqual(["a", "b"]);
    expect(forest[0].children.map((n) => n.deck.id)).toEqual(["a1", "a2"]);
    expect(forest[0].children[0].children.map((n) => n.deck.id)).toEqual(["a1x"]);
    expect(forest[0].depth).toBe(0);
    expect(forest[0].children[0].depth).toBe(1);
    expect(forest[0].children[0].children[0].depth).toBe(2);
  });

  test("note counts roll up as totalNoteCount on ancestors", () => {
    const decks = record([deck("a", null, 0), deck("a1", "a", 0)]);
    const notes = record([note("n1", "a"), note("n2", "a1"), note("n3", "a1")]);

    const forest = buildDeckForest({ decks, notes });
    expect(forest[0].noteCount).toBe(1);
    expect(forest[0].totalNoteCount).toBe(3);
    expect(forest[0].children[0].noteCount).toBe(2);
  });
});

describe("flattenIds", () => {
  test("returns ids in pre-order traversal", () => {
    const decks = record([deck("a", null, 0), deck("a1", "a", 0), deck("b", null, 1)]);
    const forest = buildDeckForest({ decks, notes: {} });
    expect(flattenIds(forest)).toEqual(["a", "a1", "b"]);
  });
});

describe("isDescendantOrSelf", () => {
  test("walks parent chain", () => {
    const decks = record([deck("a", null, 0), deck("b", "a", 0), deck("c", "b", 0)]);
    expect(isDescendantOrSelf(decks, "c", "a")).toBe(true);
    expect(isDescendantOrSelf(decks, "a", "a")).toBe(true);
    expect(isDescendantOrSelf(decks, "a", "c")).toBe(false);
  });
});

describe("repackSiblingOrder", () => {
  test("normalizes sibling orders to a 0-based contiguous sequence", () => {
    const decks = record([
      deck("a", null, 5),
      deck("b", null, 12),
      deck("c", null, 0),
      deck("nested", "a", 0),
    ]);
    repackSiblingOrder(decks, null);
    const sorted = Object.values(decks)
      .filter((d) => d.parentDeckId === null)
      .sort((x, y) => x.order - y.order)
      .map((d) => d.id);
    expect(sorted).toEqual(["c", "a", "b"]);
    expect(decks.c.order).toBe(0);
    expect(decks.a.order).toBe(1);
    expect(decks.b.order).toBe(2);
    // Other parents untouched.
    expect(decks.nested.order).toBe(0);
  });
});

describe("moveDeck", () => {
  test("moves a deck to be a sibling above target", () => {
    const decks = record([deck("a", null, 0), deck("b", null, 1), deck("c", null, 2)]);
    const ok = moveDeck({ decks, source: "c", target: "a", position: "before" });
    expect(ok).toBe(true);
    const ordered = Object.values(decks)
      .sort((x, y) => x.order - y.order)
      .map((d) => d.id);
    expect(ordered).toEqual(["c", "a", "b"]);
  });

  test("moves a deck inside another as last child", () => {
    const decks = record([deck("a", null, 0), deck("b", null, 1), deck("a1", "a", 0)]);
    const ok = moveDeck({ decks, source: "b", target: "a", position: "inside" });
    expect(ok).toBe(true);
    expect(decks.b.parentDeckId).toBe("a");
    expect(decks.b.order).toBe(1);
  });

  test("rejects nesting a deck inside its own descendant", () => {
    const decks = record([deck("a", null, 0), deck("b", "a", 0), deck("c", "b", 0)]);
    const ok = moveDeck({ decks, source: "a", target: "c", position: "inside" });
    expect(ok).toBe(false);
    expect(decks.a.parentDeckId).toBeNull();
  });

  test("rejects moving a deck onto itself", () => {
    const decks = record([deck("a", null, 0)]);
    expect(moveDeck({ decks, source: "a", target: "a", position: "after" })).toBe(false);
  });
});

describe("collectSubtreeIds", () => {
  test("returns the deck and all descendants", () => {
    const decks = record([
      deck("a", null, 0),
      deck("a1", "a", 0),
      deck("a1x", "a1", 0),
      deck("a2", "a", 1),
      deck("b", null, 1),
    ]);
    const ids = collectSubtreeIds(decks, "a").sort();
    expect(ids).toEqual(["a", "a1", "a1x", "a2"]);
  });
});

describe("isSimpleFlashcardDeck", () => {
  const models = record([
    { id: "m1", builtin: "basicAndReversed" as const },
    { id: "m2", builtin: null as null },
  ]);

  test("true for leaf decks with notes all using basicAndReversed", () => {
    const decks = record([deck("a", null, 0)]);
    const notes = record([note("n1", "a", "m1"), note("n2", "a", "m1")]);
    expect(isSimpleFlashcardDeck({ deck: decks.a, decks, notes, models })).toBe("m1");
  });

  test("false when the deck has children", () => {
    const decks = record([deck("a", null, 0), deck("a1", "a", 0)]);
    const notes = record([note("n1", "a", "m1")]);
    expect(isSimpleFlashcardDeck({ deck: decks.a, decks, notes, models })).toBeNull();
  });

  test("false when notes mix models", () => {
    const decks = record([deck("a", null, 0)]);
    const notes = record([note("n1", "a", "m1"), note("n2", "a", "m2")]);
    expect(isSimpleFlashcardDeck({ deck: decks.a, decks, notes, models })).toBeNull();
  });

  test("false when the model is not basicAndReversed", () => {
    const decks = record([deck("a", null, 0)]);
    const notes = record([note("n1", "a", "m2")]);
    expect(isSimpleFlashcardDeck({ deck: decks.a, decks, notes, models })).toBeNull();
  });

  test("false when the deck has no notes", () => {
    const decks = record([deck("a", null, 0)]);
    expect(isSimpleFlashcardDeck({ deck: decks.a, decks, notes: {}, models })).toBeNull();
  });
});
