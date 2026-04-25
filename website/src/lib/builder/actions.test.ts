import { describe, expect, test } from "bun:test";
import { createActions } from "./actions";
import { createHistory } from "./history";
import { builtinModel, defaultConfig } from "./defaults";
import type { BuilderDeck, BuilderNote, PackageState } from "./types";

const PKG = "pkg";

function buildState(args: { decks: BuilderDeck[]; notes: BuilderNote[] }): PackageState {
  const model = builtinModel({ packageId: PKG, variant: "basicAndReversed" });
  const config = defaultConfig({ packageId: PKG, name: "Default" });
  return {
    data: {
      package: { id: PKG, title: "Test", description: "", createdAt: 0, updatedAt: 0 },
      decks: Object.fromEntries(
        args.decks.map((d) => [d.id, { ...d, configId: config.id, packageId: PKG }]),
      ),
      notes: Object.fromEntries(
        args.notes.map((n) => [n.id, { ...n, modelId: model.id, packageId: PKG }]),
      ),
      models: { [model.id]: model },
      configs: { [config.id]: config },
      media: {},
    },
    selection: { kind: "none" },
  };
}

function deck(id: string, parent: string | null = null, order = 0): BuilderDeck {
  return {
    id,
    packageId: PKG,
    parentDeckId: parent,
    name: id,
    description: "",
    configId: "",
    order,
    deadline: null,
  };
}

function note(id: string, deckId: string, term = "T", def = "D"): BuilderNote {
  return {
    id,
    packageId: PKG,
    deckId,
    modelId: "",
    fields: [term, def],
    tags: [],
    order: 0,
  };
}

interface TestContext {
  actions: ReturnType<typeof createActions>;
  undo(): void;
  readonly state: PackageState;
}

function setup(initial: PackageState): TestContext {
  let state = initial;
  const history = createHistory<PackageState>();
  const actions = createActions((recipe, desc, key) => {
    state = history.mutate(state, recipe, desc, key);
  });
  return {
    actions,
    undo() {
      state = history.undo(state);
    },
    get state() {
      return state;
    },
  };
}

describe("deck.delete", () => {
  test("cascades subtree (deck + descendants + their notes)", () => {
    const ctx = setup(
      buildState({
        decks: [deck("a"), deck("a1", "a"), deck("a1x", "a1"), deck("b", null, 1)],
        notes: [note("n1", "a"), note("n2", "a1"), note("n3", "a1x"), note("n4", "b")],
      }),
    );
    ctx.actions.deck.delete("a");
    expect(Object.keys(ctx.state.data.decks).sort()).toEqual(["b"]);
    expect(Object.keys(ctx.state.data.notes).sort()).toEqual(["n4"]);
  });

  test("undo restores everything", () => {
    const ctx = setup(
      buildState({
        decks: [deck("a"), deck("a1", "a")],
        notes: [note("n1", "a"), note("n2", "a1")],
      }),
    );
    ctx.actions.deck.delete("a");
    expect(Object.keys(ctx.state.data.decks)).toHaveLength(0);

    ctx.undo();
    expect(Object.keys(ctx.state.data.decks).sort()).toEqual(["a", "a1"]);
    expect(Object.keys(ctx.state.data.notes).sort()).toEqual(["n1", "n2"]);
  });

  test("clears selection if the deleted deck was selected", () => {
    const ctx = setup(buildState({ decks: [deck("a"), deck("b", null, 1)], notes: [] }));
    ctx.actions.deck.select("a");
    ctx.actions.deck.delete("a");
    expect(ctx.state.selection).toEqual({ kind: "deck", id: "b" });
  });
});

describe("deck.duplicateAsWriting", () => {
  test("Term -> Def keeps fields in order", () => {
    const ctx = setup(
      buildState({
        decks: [deck("a")],
        notes: [note("n1", "a", "bonjour", "hello"), note("n2", "a", "merci", "thanks")],
      }),
    );

    ctx.actions.deck.duplicateAsWriting("a", "termDef");

    const newDeck = Object.values(ctx.state.data.decks).find((d) => d.id !== "a");
    if (!newDeck) throw new Error("expected new deck");
    expect(newDeck.name).toContain("Term");

    const newNotes = Object.values(ctx.state.data.notes)
      .filter((n) => n.deckId === newDeck.id)
      .sort((a, b) => a.order - b.order);
    expect(newNotes.map((n) => n.fields)).toEqual([
      ["bonjour", "hello"],
      ["merci", "thanks"],
    ]);

    // Original deck untouched.
    expect(Object.values(ctx.state.data.notes).filter((n) => n.deckId === "a")).toHaveLength(2);
  });

  test("Def -> Term swaps fields", () => {
    const ctx = setup(
      buildState({
        decks: [deck("a")],
        notes: [note("n1", "a", "bonjour", "hello")],
      }),
    );

    ctx.actions.deck.duplicateAsWriting("a", "defTerm");

    const newDeck = Object.values(ctx.state.data.decks).find((d) => d.id !== "a");
    if (!newDeck) throw new Error("expected new deck");
    const newNote = Object.values(ctx.state.data.notes).find((n) => n.deckId === newDeck.id);
    if (!newNote) throw new Error("expected new note");
    expect(newNote.fields).toEqual(["hello", "bonjour"]);
  });

  test("'both' creates two writing decks", () => {
    const ctx = setup(
      buildState({
        decks: [deck("a")],
        notes: [note("n1", "a", "x", "y")],
      }),
    );

    ctx.actions.deck.duplicateAsWriting("a", "both");

    const allDecks = Object.values(ctx.state.data.decks);
    expect(allDecks).toHaveLength(3);
    const writingDecks = allDecks.filter((d) => d.id !== "a");
    expect(writingDecks).toHaveLength(2);
    const suffixSet = new Set(writingDecks.map((d) => d.name));
    expect(suffixSet.size).toBe(2);
  });

  test("reuses an existing basicTyping model across duplications", () => {
    const ctx = setup(buildState({ decks: [deck("a")], notes: [note("n1", "a")] }));

    ctx.actions.deck.duplicateAsWriting("a", "termDef");
    ctx.actions.deck.duplicateAsWriting("a", "defTerm");

    const typingModels = Object.values(ctx.state.data.models).filter(
      (m) => m.builtin === "basicTyping",
    );
    expect(typingModels).toHaveLength(1);
  });

  test("noop when the deck is not eligible", () => {
    const ctx = setup(
      buildState({
        decks: [deck("a"), deck("a1", "a")],
        notes: [note("n1", "a")],
      }),
    );
    // 'a' has a child, so it isn't simple.
    const before = Object.keys(ctx.state.data.decks).length;
    ctx.actions.deck.duplicateAsWriting("a", "termDef");
    expect(Object.keys(ctx.state.data.decks).length).toBe(before);
  });
});

describe("deck.move via actions", () => {
  test("moves a deck inside another", () => {
    const ctx = setup(
      buildState({
        decks: [deck("a"), deck("b", null, 1), deck("c", null, 2)],
        notes: [],
      }),
    );

    ctx.actions.deck.move("c", "a", "inside");
    expect(ctx.state.data.decks.c.parentDeckId).toBe("a");
  });

  test("undo reverts a move", () => {
    const ctx = setup(
      buildState({
        decks: [deck("a"), deck("b", null, 1)],
        notes: [],
      }),
    );

    ctx.actions.deck.move("b", "a", "inside");
    expect(ctx.state.data.decks.b.parentDeckId).toBe("a");
    ctx.undo();
    expect(ctx.state.data.decks.b.parentDeckId).toBeNull();
  });
});
