/**
 * Action helpers grouped by domain. Each helper builds a `mutate` recipe so
 * the page just calls `actions.deck.add()` etc. without knowing how state is
 * shaped or how undo is recorded.
 *
 * The factory takes the page's `mutate` function so a single shared history
 * stack handles every change.
 */

import type { Id, PackageState } from "./types";
import { newId, builtinModel } from "./defaults";
import {
  collectSubtreeIds,
  isSimpleFlashcardDeck,
  moveDeck as moveDeckInPlace,
  repackSiblingOrder,
  type DropPosition,
} from "./deck-tree";

type Recipe = (draft: PackageState) => void;
export type Mutate = (recipe: Recipe, description: string, coalesceKey?: string) => void;

export interface BuilderActions {
  package: {
    setTitle(next: string): void;
  };
  deck: {
    select(id: Id): void;
    addRoot(): void;
    addUnder(parentId: Id): void;
    rename(id: Id, name: string): void;
    delete(id: Id): void;
    move(source: Id, target: Id, position: DropPosition): void;
    duplicateAsWriting(sourceId: Id, direction: "termDef" | "defTerm" | "both"): void;
  };
  note: {
    /** Append a new empty note to the deck. Returns the new id so callers can focus it. */
    add(deckId: Id, fields?: string[]): Id;
    updateField(noteId: Id, fieldIndex: number, value: string): void;
    delete(noteId: Id): void;
    deleteMany(noteIds: Id[]): void;
    /** Duplicate `noteId` as a sibling positioned right after it. Returns the new id. */
    duplicate(noteId: Id): Id;
    move(source: Id, target: Id, position: "before" | "after"): void;
    /** Move notes to a different deck (bulk). */
    moveToDeck(noteIds: Id[], targetDeckId: Id): void;
  };
}

export function createActions(mutate: Mutate): BuilderActions {
  return {
    package: {
      setTitle(next) {
        mutate(
          (draft) => {
            draft.data.package.title = next;
          },
          "Rename package",
          "package-title",
        );
      },
    },
    deck: {
      select(id) {
        mutate((draft) => {
          draft.selection = { kind: "deck", id };
        }, "Select deck");
      },

      addRoot() {
        mutate((draft) => addDeckIn(draft, null), "Add deck");
      },

      addUnder(parentId) {
        mutate((draft) => addDeckIn(draft, parentId), "Add subdeck");
      },

      rename(id, name) {
        const trimmed = name.trim();
        if (!trimmed) return;
        mutate(
          (draft) => {
            const deck = draft.data.decks[id];
            if (deck) deck.name = trimmed;
          },
          "Rename deck",
          `rename-deck-${id}`,
        );
      },

      delete(id) {
        mutate((draft) => {
          const ids = collectSubtreeIds(draft.data.decks, id);
          if (ids.length === 0) return;
          const oldParent = draft.data.decks[id]?.parentDeckId ?? null;
          for (const did of ids) {
            Reflect.deleteProperty(draft.data.decks, did);
          }
          for (const note of Object.values(draft.data.notes)) {
            if (ids.includes(note.deckId)) {
              Reflect.deleteProperty(draft.data.notes, note.id);
            }
          }
          repackSiblingOrder(draft.data.decks, oldParent);
          if (draft.selection.kind === "deck" && ids.includes(draft.selection.id)) {
            const next = Object.values(draft.data.decks).sort((a, b) => a.order - b.order)[0];
            draft.selection = next ? { kind: "deck", id: next.id } : { kind: "none" };
          }
        }, "Delete deck");
      },

      move(source, target, position) {
        mutate((draft) => {
          moveDeckInPlace({ decks: draft.data.decks, source, target, position });
        }, "Move deck");
      },

      duplicateAsWriting(sourceId, direction): void {
        mutate((draft) => {
          const source = draft.data.decks[sourceId];
          if (!source) return;
          const eligible = isSimpleFlashcardDeck({
            deck: source,
            decks: draft.data.decks,
            notes: draft.data.notes,
            models: draft.data.models,
          });
          if (!eligible) return;

          const typingModelId = ensureTypingModel(draft);
          const variants: { suffix: string; swap: boolean }[] = [];
          if (direction === "termDef" || direction === "both") {
            variants.push({ suffix: "Type Term → Def", swap: false });
          }
          if (direction === "defTerm" || direction === "both") {
            variants.push({ suffix: "Type Def → Term", swap: true });
          }

          const sourceNotes = Object.values(draft.data.notes)
            .filter((n) => n.deckId === sourceId)
            .sort((a, b) => a.order - b.order);

          const parentId = source.parentDeckId;
          // Append new decks immediately after source among siblings.
          const baseOrder = source.order;
          // Shift later siblings to make room for the new decks.
          const shiftBy = variants.length;
          for (const d of Object.values(draft.data.decks)) {
            if (d.parentDeckId === parentId && d.order > baseOrder) {
              d.order += shiftBy;
            }
          }

          variants.forEach((v, i) => {
            const newDeckId = newId();
            draft.data.decks[newDeckId] = {
              id: newDeckId,
              packageId: source.packageId,
              parentDeckId: parentId,
              name: `${source.name} (${v.suffix})`,
              description: source.description,
              configId: source.configId,
              order: baseOrder + 1 + i,
              deadline: source.deadline,
            };
            sourceNotes.forEach((n, j) => {
              const noteId = newId();
              const fields = v.swap ? [n.fields[1] ?? "", n.fields[0] ?? ""] : [...n.fields];
              draft.data.notes[noteId] = {
                id: noteId,
                packageId: source.packageId,
                deckId: newDeckId,
                modelId: typingModelId,
                fields,
                tags: [...n.tags],
                order: j,
              };
            });
          });
        }, "Duplicate as writing deck");
      },
    },
    note: {
      add(deckId, fields) {
        const id = newId();
        mutate((draft) => {
          const deck = draft.data.decks[deckId];
          if (!deck) return;
          const modelId = pickModelForDeck(draft, deckId);
          const order = nextNoteOrder(draft, deckId);
          const fieldCount = draft.data.models[modelId]?.fields.length ?? 2;
          const initial = fields ?? Array.from({ length: fieldCount }, () => "");
          // Pad/trim to model's field count.
          const padded = Array.from({ length: fieldCount }, (_, i) => initial[i] ?? "");
          draft.data.notes[id] = {
            id,
            packageId: draft.data.package.id,
            deckId,
            modelId,
            fields: padded,
            tags: [],
            order,
          };
        }, "Add card");
        return id;
      },

      updateField(noteId, fieldIndex, value) {
        mutate(
          (draft) => {
            const note = draft.data.notes[noteId];
            if (!note) return;
            if (note.fields[fieldIndex] === value) return;
            note.fields[fieldIndex] = value;
          },
          "Edit card",
          `field-${noteId}-${fieldIndex}`,
        );
      },

      delete(noteId) {
        mutate((draft) => {
          if (!draft.data.notes[noteId]) return;
          const deckId = draft.data.notes[noteId].deckId;
          Reflect.deleteProperty(draft.data.notes, noteId);
          repackNoteOrder(draft, deckId);
        }, "Delete card");
      },

      deleteMany(noteIds) {
        if (noteIds.length === 0) return;
        mutate((draft) => {
          const affectedDecks = new Set<Id>();
          for (const id of noteIds) {
            const n = draft.data.notes[id];
            if (!n) continue;
            affectedDecks.add(n.deckId);
            Reflect.deleteProperty(draft.data.notes, id);
          }
          for (const did of affectedDecks) repackNoteOrder(draft, did);
        }, `Delete ${noteIds.length} cards`);
      },

      duplicate(noteId) {
        const newNoteId = newId();
        mutate((draft) => {
          const source = draft.data.notes[noteId];
          if (!source) return;
          // Insert immediately after source: shift later siblings.
          for (const n of Object.values(draft.data.notes)) {
            if (n.deckId === source.deckId && n.order > source.order) n.order += 1;
          }
          draft.data.notes[newNoteId] = {
            id: newNoteId,
            packageId: source.packageId,
            deckId: source.deckId,
            modelId: source.modelId,
            fields: [...source.fields],
            tags: [...source.tags],
            order: source.order + 1,
          };
        }, "Duplicate card");
        return newNoteId;
      },

      move(source, target, position) {
        mutate((draft) => {
          const src = draft.data.notes[source];
          const tgt = draft.data.notes[target];
          if (!src || !tgt || source === target) return;
          if (src.deckId !== tgt.deckId) return; // reorder is intra-deck only
          const newOrder = position === "before" ? tgt.order : tgt.order + 1;
          for (const n of Object.values(draft.data.notes)) {
            if (n.deckId === src.deckId && n.id !== source && n.order >= newOrder) {
              n.order += 1;
            }
          }
          src.order = newOrder;
          repackNoteOrder(draft, src.deckId);
        }, "Reorder card");
      },

      moveToDeck(noteIds, targetDeckId) {
        if (noteIds.length === 0) return;
        mutate((draft) => {
          if (!draft.data.decks[targetDeckId]) return;
          const fromDecks = new Set<Id>();
          let appendOrder = nextNoteOrder(draft, targetDeckId);
          for (const id of noteIds) {
            const n = draft.data.notes[id];
            if (!n || n.deckId === targetDeckId) continue;
            fromDecks.add(n.deckId);
            n.deckId = targetDeckId;
            n.order = appendOrder++;
          }
          for (const did of fromDecks) repackNoteOrder(draft, did);
          repackNoteOrder(draft, targetDeckId);
        }, `Move ${noteIds.length} cards`);
      },
    },
  };
}

function nextNoteOrder(draft: PackageState, deckId: Id): number {
  const siblings = Object.values(draft.data.notes).filter((n) => n.deckId === deckId);
  if (siblings.length === 0) return 0;
  return Math.max(...siblings.map((n) => n.order)) + 1;
}

function pickModelForDeck(draft: PackageState, deckId: Id): Id {
  // Prefer the model already used in this deck so adding cards keeps shape.
  // Falls back to the first basicAndReversed model in the package, or any model.
  const existingNote = Object.values(draft.data.notes).find((n) => n.deckId === deckId);
  if (existingNote) return existingNote.modelId;
  const reversed = Object.values(draft.data.models).find((m) => m.builtin === "basicAndReversed");
  if (reversed) return reversed.id;
  const any = Object.values(draft.data.models)[0];
  if (any) return any.id;
  throw new Error("Package has no models. Cannot add a note.");
}

function repackNoteOrder(draft: PackageState, deckId: Id): void {
  const list = Object.values(draft.data.notes)
    .filter((n) => n.deckId === deckId)
    .sort((a, b) => a.order - b.order);
  list.forEach((n, i) => {
    n.order = i;
  });
}

// ---- internal helpers -----------------------------------------------------

function addDeckIn(draft: PackageState, parentId: Id | null): void {
  const id = newId();
  const siblings = Object.values(draft.data.decks).filter((d) => d.parentDeckId === parentId);
  const order = siblings.length === 0 ? 0 : Math.max(...siblings.map((d) => d.order)) + 1;
  // Reuse the package's first config so new decks have scheduling out of the
  // box. The user can swap to a custom preset later from deck options.
  const fallbackConfigId = Object.values(draft.data.configs)[0]?.id ?? "";
  draft.data.decks[id] = {
    id,
    packageId: draft.data.package.id,
    parentDeckId: parentId,
    name: "New deck",
    description: "",
    configId: fallbackConfigId,
    order,
    deadline: null,
  };
  draft.selection = { kind: "deck", id };
}

/**
 * Find or create a basicTyping model in the package. Reuses an existing one if
 * the user already has it (so duplicating multiple times doesn't bloat the
 * model list).
 */
function ensureTypingModel(draft: PackageState): Id {
  const existing = Object.values(draft.data.models).find((m) => m.builtin === "basicTyping");
  if (existing) return existing.id;
  const model = builtinModel({ packageId: draft.data.package.id, variant: "basicTyping" });
  draft.data.models[model.id] = model;
  return model.id;
}
