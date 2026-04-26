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
    modelId: "",
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

// ---- note actions ---------------------------------------------------------

describe("note.add", () => {
  test("creates an empty note in the deck and returns its id", () => {
    const ctx = setup(buildState({ decks: [deck("a")], notes: [] }));
    const id = ctx.actions.note.add("a");
    const created = ctx.state.data.notes[id];
    expect(created).toBeDefined();
    expect(created.deckId).toBe("a");
    expect(created.fields).toEqual(["", ""]);
    expect(created.order).toBe(0);
  });

  test("appends at end (max order + 1)", () => {
    const ctx = setup(
      buildState({
        decks: [deck("a")],
        notes: [
          { ...note("n1", "a"), order: 0 },
          { ...note("n2", "a"), order: 1 },
        ],
      }),
    );
    const id = ctx.actions.note.add("a");
    expect(ctx.state.data.notes[id].order).toBe(2);
  });

  test("uses the model already present in the deck", () => {
    const ctx = setup(
      buildState({
        decks: [deck("a")],
        notes: [note("n1", "a")],
      }),
    );
    const existingModelId = ctx.state.data.notes.n1.modelId;
    const id = ctx.actions.note.add("a");
    expect(ctx.state.data.notes[id].modelId).toBe(existingModelId);
  });
});

describe("note.updateField", () => {
  test("sets the field value", () => {
    const ctx = setup(buildState({ decks: [deck("a")], notes: [note("n1", "a", "old", "def")] }));
    ctx.actions.note.updateField("n1", 0, "new");
    expect(ctx.state.data.notes.n1.fields[0]).toBe("new");
  });

  test("noop when value unchanged (no history entry)", () => {
    const ctx = setup(buildState({ decks: [deck("a")], notes: [note("n1", "a", "x", "y")] }));
    const before = ctx.state.data.notes.n1;
    ctx.actions.note.updateField("n1", 0, "x");
    // Same reference because mutate returned early on no-op (mutative produced no patches).
    expect(ctx.state.data.notes.n1).toBe(before);
  });
});

describe("note.delete / deleteMany", () => {
  test("removes the note and repacks orders", () => {
    const ctx = setup(
      buildState({
        decks: [deck("a")],
        notes: [
          { ...note("n1", "a"), order: 0 },
          { ...note("n2", "a"), order: 1 },
          { ...note("n3", "a"), order: 2 },
        ],
      }),
    );
    ctx.actions.note.delete("n2");
    expect(Object.keys(ctx.state.data.notes).sort()).toEqual(["n1", "n3"]);
    expect(ctx.state.data.notes.n1.order).toBe(0);
    expect(ctx.state.data.notes.n3.order).toBe(1);
  });

  test("deleteMany removes multiple and repacks each affected deck", () => {
    const ctx = setup(
      buildState({
        decks: [deck("a"), deck("b", null, 1)],
        notes: [
          { ...note("n1", "a"), order: 0 },
          { ...note("n2", "a"), order: 1 },
          { ...note("n3", "b"), order: 0 },
          { ...note("n4", "b"), order: 1 },
        ],
      }),
    );
    ctx.actions.note.deleteMany(["n1", "n3"]);
    expect(Object.keys(ctx.state.data.notes).sort()).toEqual(["n2", "n4"]);
    expect(ctx.state.data.notes.n2.order).toBe(0);
    expect(ctx.state.data.notes.n4.order).toBe(0);
  });
});

describe("note.duplicate", () => {
  test("inserts a copy directly after the source", () => {
    const ctx = setup(
      buildState({
        decks: [deck("a")],
        notes: [
          { ...note("n1", "a", "alpha", "AAA"), order: 0 },
          { ...note("n2", "a", "beta", "BBB"), order: 1 },
        ],
      }),
    );
    const newId_ = ctx.actions.note.duplicate("n1");
    expect(ctx.state.data.notes[newId_].fields).toEqual(["alpha", "AAA"]);
    expect(ctx.state.data.notes[newId_].order).toBe(1);
    expect(ctx.state.data.notes.n2.order).toBe(2);
  });
});

describe("note.move", () => {
  test("moves a note above another within the same deck", () => {
    const ctx = setup(
      buildState({
        decks: [deck("a")],
        notes: [
          { ...note("n1", "a"), order: 0 },
          { ...note("n2", "a"), order: 1 },
          { ...note("n3", "a"), order: 2 },
        ],
      }),
    );
    ctx.actions.note.move("n3", "n1", "before");
    expect(
      Object.values(ctx.state.data.notes)
        .sort((a, b) => a.order - b.order)
        .map((n) => n.id),
    ).toEqual(["n3", "n1", "n2"]);
  });
});

describe("deck.setDeadline", () => {
  function todayPlus(days: number): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  test("creates a deadline-sourced config and replaces the deck's configId", () => {
    const ctx = setup(buildState({ decks: [deck("a")], notes: [note("n1", "a")] }));
    const oldConfigId = ctx.state.data.decks.a.configId;

    ctx.actions.deck.setDeadline(["a"], { date: todayPlus(10) });

    const newConfigId = ctx.state.data.decks.a.configId;
    expect(newConfigId).not.toBe(oldConfigId);

    const newConfig = ctx.state.data.configs[newConfigId];
    expect(newConfig.source).toBe("deadline");
    expect(newConfig.generatedFromDeadline?.date).toBe(todayPlus(10));

    expect(ctx.state.data.decks.a.deadline?.date).toBe(todayPlus(10));
  });

  test("deletes the previous config when no other deck references it", () => {
    const ctx = setup(buildState({ decks: [deck("a")], notes: [] }));
    const oldConfigId = ctx.state.data.decks.a.configId;

    ctx.actions.deck.setDeadline(["a"], { date: todayPlus(5) });

    expect(ctx.state.data.configs[oldConfigId]).toBeUndefined();
  });

  test("keeps the previous config if another deck still references it", () => {
    const ctx = setup(buildState({ decks: [deck("a"), deck("b", null, 1)], notes: [] }));
    // 'b' uses the same default config as 'a' from the test fixture.
    const sharedConfigId = ctx.state.data.decks.a.configId;

    ctx.actions.deck.setDeadline(["a"], { date: todayPlus(7) });

    expect(ctx.state.data.configs[sharedConfigId]).toBeDefined();
    expect(ctx.state.data.decks.b.configId).toBe(sharedConfigId);
    expect(ctx.state.data.decks.a.configId).not.toBe(sharedConfigId);
  });

  test("Apply-to-all generates one config per deck (independent newPerDay)", () => {
    const ctx = setup(
      buildState({
        decks: [deck("a"), deck("b", null, 1)],
        notes: [note("n1", "a"), note("n2", "a"), note("n3", "a"), note("n4", "b")],
      }),
    );

    ctx.actions.deck.setDeadline(["a", "b"], { date: todayPlus(10) });

    const aCfg = ctx.state.data.configs[ctx.state.data.decks.a.configId];
    const bCfg = ctx.state.data.configs[ctx.state.data.decks.b.configId];
    expect(aCfg.newPerDay).toBe(3);
    expect(bCfg.newPerDay).toBe(1);
    expect(aCfg.id).not.toBe(bCfg.id);
  });

  test("undo reverts deck.configId, deck.deadline, and the config record", () => {
    const ctx = setup(buildState({ decks: [deck("a")], notes: [note("n1", "a")] }));
    const oldConfigId = ctx.state.data.decks.a.configId;

    ctx.actions.deck.setDeadline(["a"], { date: todayPlus(10) });
    ctx.undo();

    expect(ctx.state.data.decks.a.configId).toBe(oldConfigId);
    expect(ctx.state.data.decks.a.deadline).toBeNull();
    expect(ctx.state.data.configs[oldConfigId]).toBeDefined();
  });
});

// ---- model actions --------------------------------------------------------

describe("model.addCustom + duplicateBuiltin", () => {
  test("addCustom creates a normal model with Front/Back fields", () => {
    const ctx = setup(buildState({ decks: [deck("a")], notes: [] }));
    const id = ctx.actions.model.addCustom();
    const m = ctx.state.data.models[id];
    expect(m.builtin).toBeNull();
    expect(m.type).toBe("normal");
    expect(m.fields.map((f) => f.name)).toEqual(["Front", "Back"]);
    expect(m.templates).toHaveLength(1);
  });

  test("duplicateBuiltin clones a built-in into a custom copy", () => {
    const ctx = setup(buildState({ decks: [deck("a")], notes: [] }));
    const builtinId = Object.values(ctx.state.data.models)[0].id;
    const newCustomId = ctx.actions.model.duplicateBuiltin(builtinId);
    const cloned = ctx.state.data.models[newCustomId];
    expect(cloned.builtin).toBeNull();
    expect(cloned.name).toContain("(copy)");
    expect(cloned.fields).not.toBe(ctx.state.data.models[builtinId].fields);
  });

  test("duplicateBuiltin refuses to duplicate a custom model", () => {
    const ctx = setup(buildState({ decks: [deck("a")], notes: [] }));
    const customId = ctx.actions.model.addCustom();
    const before = Object.keys(ctx.state.data.models).length;
    ctx.actions.model.duplicateBuiltin(customId);
    expect(Object.keys(ctx.state.data.models).length).toBe(before);
  });
});

describe("model field actions", () => {
  test("addField appends to the model and pads matching notes", () => {
    const ctx = setup(buildState({ decks: [deck("a")], notes: [note("n1", "a", "T", "D")] }));
    const customId = ctx.actions.model.addCustom();
    // Reassign the existing note to the custom model so padding is observable.
    const noteId = "n1";
    ctx.state.data.notes[noteId].modelId = customId;

    ctx.actions.model.addField(customId, "Tags");
    expect(ctx.state.data.models[customId].fields.map((f) => f.name)).toEqual([
      "Front",
      "Back",
      "Tags",
    ]);
    expect(ctx.state.data.notes[noteId].fields).toHaveLength(3);
    expect(ctx.state.data.notes[noteId].fields[2]).toBe("");
  });

  test("removeField trims notes' values at that index", () => {
    const ctx = setup(buildState({ decks: [deck("a")], notes: [] }));
    const customId = ctx.actions.model.addCustom();
    ctx.actions.model.addField(customId, "Tags");
    const noteId = ctx.actions.note.add("a");
    ctx.state.data.notes[noteId].modelId = customId;
    ctx.state.data.notes[noteId].fields = ["a", "b", "c"];

    ctx.actions.model.removeField(customId, 1);
    expect(ctx.state.data.models[customId].fields.map((f) => f.name)).toEqual(["Front", "Tags"]);
    expect(ctx.state.data.notes[noteId].fields).toEqual(["a", "c"]);
  });

  test("removeField refuses when only one field remains", () => {
    const ctx = setup(buildState({ decks: [deck("a")], notes: [] }));
    const customId = ctx.actions.model.addCustom();
    ctx.actions.model.removeField(customId, 0); // 2 -> 1
    ctx.actions.model.removeField(customId, 0); // would go to 0, refused
    expect(ctx.state.data.models[customId].fields).toHaveLength(1);
  });

  test("moveField swaps and reorders matching notes' values", () => {
    const ctx = setup(buildState({ decks: [deck("a")], notes: [] }));
    const customId = ctx.actions.model.addCustom();
    const noteId = ctx.actions.note.add("a");
    ctx.state.data.notes[noteId].modelId = customId;
    ctx.state.data.notes[noteId].fields = ["front", "back"];

    ctx.actions.model.moveField(customId, 0, "down");
    expect(ctx.state.data.models[customId].fields.map((f) => f.name)).toEqual(["Back", "Front"]);
    expect(ctx.state.data.notes[noteId].fields).toEqual(["back", "front"]);
  });

  test("field actions noop on built-ins", () => {
    const ctx = setup(buildState({ decks: [deck("a")], notes: [] }));
    const builtinId = (
      Object.values(ctx.state.data.models).find((m) => m.builtin !== null) ?? { id: "" }
    ).id;
    const before = ctx.state.data.models[builtinId].fields.length;
    ctx.actions.model.addField(builtinId, "Hack");
    ctx.actions.model.removeField(builtinId, 0);
    ctx.actions.model.renameField(builtinId, 0, "X");
    expect(ctx.state.data.models[builtinId].fields).toHaveLength(before);
  });
});

describe("model.delete", () => {
  test("removes a custom model with no notes", () => {
    const ctx = setup(buildState({ decks: [deck("a")], notes: [] }));
    const id = ctx.actions.model.addCustom();
    ctx.actions.model.delete(id);
    expect(ctx.state.data.models[id]).toBeUndefined();
  });

  test("refuses to delete a model in use", () => {
    const ctx = setup(buildState({ decks: [deck("a")], notes: [] }));
    const id = ctx.actions.model.addCustom();
    const noteId = ctx.actions.note.add("a");
    ctx.state.data.notes[noteId].modelId = id;
    ctx.actions.model.delete(id);
    expect(ctx.state.data.models[id]).toBeDefined();
  });

  test("refuses to delete built-ins", () => {
    const ctx = setup(buildState({ decks: [deck("a")], notes: [] }));
    const builtinId = (
      Object.values(ctx.state.data.models).find((m) => m.builtin !== null) ?? { id: "" }
    ).id;
    ctx.actions.model.delete(builtinId);
    expect(ctx.state.data.models[builtinId]).toBeDefined();
  });
});

// ---- config actions -------------------------------------------------------

describe("config actions", () => {
  test("add creates a default-source preset and selects it", () => {
    const ctx = setup(buildState({ decks: [deck("a")], notes: [] }));
    const id = ctx.actions.config.add();
    expect(ctx.state.data.configs[id].source).toBe("default");
    expect(ctx.state.selection).toEqual({ kind: "config", id });
  });

  test("updateField flips source to custom on first edit", () => {
    const ctx = setup(buildState({ decks: [deck("a")], notes: [] }));
    const id = ctx.actions.config.add();
    expect(ctx.state.data.configs[id].source).toBe("default");
    ctx.actions.config.updateField(id, "newPerDay", 50);
    expect(ctx.state.data.configs[id].source).toBe("custom");
    expect(ctx.state.data.configs[id].newPerDay).toBe(50);
  });

  test("updateField is a no-op when value is unchanged", () => {
    const ctx = setup(buildState({ decks: [deck("a")], notes: [] }));
    const id = ctx.actions.config.add();
    const before = ctx.state.data.configs[id];
    ctx.actions.config.updateField(id, "newPerDay", before.newPerDay);
    expect(ctx.state.data.configs[id]).toBe(before);
  });

  test("delete refuses when the preset is in use", () => {
    const ctx = setup(buildState({ decks: [deck("a")], notes: [] }));
    const inUseId = ctx.state.data.decks.a.configId;
    ctx.actions.config.delete(inUseId);
    expect(ctx.state.data.configs[inUseId]).toBeDefined();
  });

  test("setForDeck switches the deck's config and prunes the orphan", () => {
    const ctx = setup(buildState({ decks: [deck("a")], notes: [] }));
    const oldConfigId = ctx.state.data.decks.a.configId;
    const newId_ = ctx.actions.config.add();

    ctx.actions.config.setForDeck("a", newId_);
    expect(ctx.state.data.decks.a.configId).toBe(newId_);
    expect(ctx.state.data.configs[oldConfigId]).toBeUndefined();
  });

  test("setForDeck keeps the previous config if other decks still reference it", () => {
    const ctx = setup(buildState({ decks: [deck("a"), deck("b", null, 1)], notes: [] }));
    const sharedConfigId = ctx.state.data.decks.a.configId;
    const newId_ = ctx.actions.config.add();
    ctx.actions.config.setForDeck("a", newId_);
    expect(ctx.state.data.configs[sharedConfigId]).toBeDefined();
  });
});

describe("note.addTag / removeTag", () => {
  test("normalizes tag (lowercase, dash for spaces) and dedupes", () => {
    const ctx = setup(buildState({ decks: [deck("a")], notes: [note("n1", "a")] }));
    ctx.actions.note.addTag("n1", "Chapter 1");
    ctx.actions.note.addTag("n1", "chapter-1"); // duplicate
    expect(ctx.state.data.notes.n1.tags).toEqual(["chapter-1"]);
  });

  test("removeTag drops the tag", () => {
    const ctx = setup(buildState({ decks: [deck("a")], notes: [note("n1", "a")] }));
    ctx.actions.note.addTag("n1", "x");
    ctx.actions.note.addTag("n1", "y");
    ctx.actions.note.removeTag("n1", "x");
    expect(ctx.state.data.notes.n1.tags).toEqual(["y"]);
  });

  test("removeTag is a noop on missing tags", () => {
    const ctx = setup(buildState({ decks: [deck("a")], notes: [note("n1", "a")] }));
    const before = ctx.state.data.notes.n1;
    ctx.actions.note.removeTag("n1", "doesnt-exist");
    expect(ctx.state.data.notes.n1).toBe(before);
  });
});

describe("note.moveToDeck", () => {
  test("relocates notes to another deck and repacks both", () => {
    const ctx = setup(
      buildState({
        decks: [deck("a"), deck("b", null, 1)],
        notes: [
          { ...note("n1", "a"), order: 0 },
          { ...note("n2", "a"), order: 1 },
          { ...note("n3", "b"), order: 0 },
        ],
      }),
    );
    ctx.actions.note.moveToDeck(["n1"], "b");
    expect(ctx.state.data.notes.n1.deckId).toBe("b");
    expect(ctx.state.data.notes.n2.order).toBe(0);
    const inB = Object.values(ctx.state.data.notes)
      .filter((n) => n.deckId === "b")
      .sort((a, b) => a.order - b.order)
      .map((n) => n.id);
    expect(inB).toEqual(["n3", "n1"]);
  });
});
