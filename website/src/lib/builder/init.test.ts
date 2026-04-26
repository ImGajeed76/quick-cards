import "fake-indexeddb/auto";
import { afterEach, describe, expect, test } from "bun:test";
import { createBlankPackage, createPackageFromFlashcardSet } from "./init";
import { loadPackage } from "./store/load";
import { _resetForTests } from "./store/db";

afterEach(async () => {
  await _resetForTests();
});

describe("createBlankPackage", () => {
  test("seeds the package with all four built-in note types and a single default deck", async () => {
    const id = await createBlankPackage();
    const data = await loadPackage(id);

    expect(data).not.toBeNull();
    if (!data) return;

    expect(data.package.id).toBe(id);
    expect(Object.keys(data.decks)).toHaveLength(1);
    expect(Object.keys(data.notes)).toHaveLength(0);
    expect(Object.keys(data.models)).toHaveLength(4);
    expect(Object.keys(data.configs)).toHaveLength(1);

    const builtinSet = new Set(Object.values(data.models).map((m) => m.builtin));
    expect(builtinSet).toEqual(new Set(["basic", "basicAndReversed", "basicTyping", "cloze"]));

    const [deck] = Object.values(data.decks);
    const [config] = Object.values(data.configs);

    const reversed = Object.values(data.models).find((m) => m.builtin === "basicAndReversed");
    expect(deck.modelId).toBe(reversed?.id ?? "");
    expect(deck.configId).toBe(config.id);
    expect(config.source).toBe("default");
    expect(config.name.startsWith("QuickCards")).toBe(true);
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
