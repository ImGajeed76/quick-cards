import "fake-indexeddb/auto";
import { afterEach, describe, expect, test } from "bun:test";
import { createBlankPackage, createPackageFromFlashcardSet } from "./init";
import { loadPackage } from "./store/load";
import { _resetForTests } from "./store/db";

afterEach(async () => {
  await _resetForTests();
});

describe("createBlankPackage", () => {
  test("writes a package with one deck, one model, one config, no notes", async () => {
    const id = await createBlankPackage();
    const data = await loadPackage(id);

    expect(data).not.toBeNull();
    if (!data) return;

    expect(data.package.id).toBe(id);
    expect(Object.keys(data.decks)).toHaveLength(1);
    expect(Object.keys(data.notes)).toHaveLength(0);
    expect(Object.keys(data.models)).toHaveLength(1);
    expect(Object.keys(data.configs)).toHaveLength(1);

    const [deck] = Object.values(data.decks);
    const [model] = Object.values(data.models);
    const [config] = Object.values(data.configs);

    expect(deck.configId).toBe(config.id);
    expect(model.builtin).toBe("basicAndReversed");
    expect(config.source).toBe("default");
  });

  test("custom title flows through to package and root deck", async () => {
    const id = await createBlankPackage({ title: "My Deck" });
    const data = await loadPackage(id);
    if (!data) throw new Error("expected data");

    expect(data.package.title).toBe("My Deck");
    const [deck] = Object.values(data.decks);
    expect(deck.name).toBe("My Deck");
  });
});

describe("createPackageFromFlashcardSet", () => {
  test("converts each card to a note in the root deck", async () => {
    const id = await createPackageFromFlashcardSet({
      title: "French",
      description: "Chapter 1",
      cards: [
        { term: "bonjour", definition: "hello" },
        { term: "merci", definition: "thank you" },
      ],
    });
    const data = await loadPackage(id);
    if (!data) throw new Error("expected data");

    const [deck] = Object.values(data.decks);
    const sortedNotes = Object.values(data.notes).sort((a, b) => a.order - b.order);

    expect(data.package.title).toBe("French");
    expect(data.package.description).toBe("Chapter 1");
    expect(sortedNotes).toHaveLength(2);
    expect(sortedNotes[0].fields).toEqual(["bonjour", "hello"]);
    expect(sortedNotes[1].fields).toEqual(["merci", "thank you"]);
    expect(sortedNotes.every((n) => n.deckId === deck.id)).toBe(true);
  });

  test("falls back to a default title when set title is empty", async () => {
    const id = await createPackageFromFlashcardSet({
      title: "   ",
      description: "",
      cards: [{ term: "a", definition: "b" }],
    });
    const data = await loadPackage(id);
    if (!data) throw new Error("expected data");
    expect(data.package.title).toBe("Imported deck");
  });
});
