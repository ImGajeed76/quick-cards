/**
 * Action helpers grouped by domain. Each helper builds a `mutate` recipe so
 * the page just calls `actions.deck.add()` etc. without knowing how state is
 * shaped or how undo is recorded.
 *
 * The factory takes the page's `mutate` function so a single shared history
 * stack handles every change.
 */

import type { BuilderConfig, DeadlineSpec, Id, PackageState } from "./types";
import { MEDIA_PER_FILE_LIMIT, MEDIA_PER_PACKAGE_LIMIT } from "./types";
import { newId, builtinModel, deadlineTunedConfig, defaultConfig } from "./defaults";

/**
 * Keys on `BuilderConfig` that the user may edit through the preset editor.
 * Excludes identity (id, packageId, name, source, generatedFromDeadline) which
 * have dedicated actions or shouldn't change during normal editing.
 */
export type ConfigUpdatableKey = Exclude<
  keyof BuilderConfig,
  "id" | "packageId" | "name" | "source" | "generatedFromDeadline"
>;
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
    /**
     * Apply a deadline to one or more decks. Each affected deck gets its own
     * deadline-tuned config (sized by its own note count) and its previous
     * config is cleaned up if no other deck still references it.
     */
    setDeadline(deckIds: Id[], deadline: DeadlineSpec): void;
    /**
     * Set the default note type for cards added to this deck. Existing notes
     * keep their own modelId; only future cards adopt the new type.
     */
    setNoteType(deckId: Id, modelId: Id): void;
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
    /** Add a tag (lowercased, deduped). */
    addTag(noteId: Id, tag: string): void;
    removeTag(noteId: Id, tag: string): void;
  };
  media: {
    select(id: Id): void;
    /**
     * Add a file as media. Returns the new id, or throws an Error with a
     * user-readable message when the per-file or per-package quota is
     * exceeded. The filename inside the package is auto-uniqued so duplicates
     * don't collide.
     */
    add(file: File): Promise<Id>;
    delete(id: Id): void;
    rename(id: Id, filename: string): void;
  };
  config: {
    select(id: Id): void;
    add(): Id;
    /** Refuses if any deck still references the config. */
    delete(id: Id): void;
    rename(id: Id, name: string): void;
    /**
     * Update one config field at runtime. Any edit flips `source` to
     * `"custom"` so the deadline picker knows to confirm before overwriting.
     * Coalesced per (configId, fieldKey).
     */
    updateField<K extends ConfigUpdatableKey>(id: Id, key: K, value: BuilderConfig[K]): void;
    /** Set which deck uses which preset. */
    setForDeck(deckId: Id, configId: Id): void;
  };
  model: {
    select(id: Id): void;
    /** Create a blank custom note type. Returns the new id so callers can focus it. */
    addCustom(): Id;
    /** Duplicate a built-in into an editable custom model. */
    duplicateBuiltin(sourceId: Id): Id;
    /**
     * Delete a custom model. Refuses to delete built-ins or models still in
     * use by any note (caller should check usage and prompt first).
     */
    delete(id: Id): void;
    rename(id: Id, name: string): void;
    /** Append a new field; pads existing notes with an empty string at the end. */
    addField(modelId: Id, name: string): void;
    renameField(modelId: Id, fieldIndex: number, name: string): void;
    /** Remove a field; trims existing notes' values at that index. */
    removeField(modelId: Id, fieldIndex: number): void;
    /** Move a field up or down; reorders existing notes' values to match. */
    moveField(modelId: Id, fieldIndex: number, direction: "up" | "down"): void;
    /** Update one optional attribute of a field. */
    updateFieldOption<
      K extends "description" | "sticky" | "rtl" | "plainText" | "fontName" | "fontSize",
    >(
      modelId: Id,
      fieldIndex: number,
      key: K,
      value: K extends "description" | "fontName"
        ? string
        : K extends "fontSize"
          ? number
          : boolean,
    ): void;
    /** Update LaTeX preamble / postamble / SVG flag on the model. */
    updateLatex(
      modelId: Id,
      key: "latexPre" | "latexPost" | "latexSvg",
      value: string | boolean,
    ): void;
    /** Append a new template (only valid on non-cloze models). */
    addTemplate(modelId: Id, name: string): void;
    removeTemplate(modelId: Id, templateIndex: number): void;
    renameTemplate(modelId: Id, templateIndex: number, name: string): void;
    /** Update either the question or answer side of a template. Coalesced. */
    updateTemplate(
      modelId: Id,
      templateIndex: number,
      side: "question" | "answer",
      value: string,
    ): void;
    /** Replace the model's CSS. Coalesced. */
    updateCss(modelId: Id, css: string): void;
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

      setNoteType(deckId, modelId) {
        mutate((draft) => {
          const deck = draft.data.decks[deckId];
          const model = draft.data.models[modelId];
          if (!deck || !model) return;
          if (deck.modelId === modelId) return;
          deck.modelId = modelId;
        }, "Set deck note type");
      },

      setDeadline(deckIds, deadline) {
        if (deckIds.length === 0) return;
        mutate(
          (draft) => {
            for (const deckId of deckIds) {
              const deck = draft.data.decks[deckId];
              if (!deck) continue;
              const totalCards = Object.values(draft.data.notes).filter(
                (n) => n.deckId === deckId,
              ).length;

              const newConfig = deadlineTunedConfig({
                packageId: draft.data.package.id,
                name: `${deck.name || "Deck"} (deadline)`,
                deadline,
                totalCards,
              });

              const oldConfigId = deck.configId;
              draft.data.configs[newConfig.id] = newConfig;
              deck.configId = newConfig.id;
              deck.deadline = deadline;

              const stillReferenced = Object.values(draft.data.decks).some(
                (d) => d.configId === oldConfigId,
              );
              if (!stillReferenced && draft.data.configs[oldConfigId]) {
                Reflect.deleteProperty(draft.data.configs, oldConfigId);
              }
            }
          },
          deckIds.length === 1 ? "Set deadline" : `Set deadline for ${deckIds.length} decks`,
        );
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
              modelId: typingModelId,
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

      addTag(noteId, tag) {
        const normalized = tag.trim().toLowerCase().replace(/\s+/g, "-");
        if (!normalized) return;
        mutate((draft) => {
          const note = draft.data.notes[noteId];
          if (!note) return;
          if (note.tags.includes(normalized)) return;
          note.tags.push(normalized);
          note.tags.sort();
        }, "Add tag");
      },

      removeTag(noteId, tag) {
        mutate((draft) => {
          const note = draft.data.notes[noteId];
          if (!note) return;
          const idx = note.tags.indexOf(tag);
          if (idx === -1) return;
          note.tags.splice(idx, 1);
        }, "Remove tag");
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
    media: {
      select(id) {
        mutate((draft) => {
          if (!draft.data.media[id]) return;
          draft.selection = { kind: "mediaItem", id };
        }, "Select media");
      },

      async add(file) {
        if (file.size > MEDIA_PER_FILE_LIMIT) {
          throw new Error(
            `"${file.name}" is ${formatBytes(file.size)}. The per-file limit is ${formatBytes(MEDIA_PER_FILE_LIMIT)}.`,
          );
        }
        // Read the blob into a fresh Blob so the IDB-stored copy is detached
        // from any incoming File reference (which may be revoked later).
        const buffer = await file.arrayBuffer();
        const blob = new Blob([buffer], { type: file.type || "application/octet-stream" });
        const id = newId();
        // We need a synchronous mutate after the async read; assemble outside
        // and apply inside.
        const desiredFilename = file.name || "file";
        let savedFilename = desiredFilename;
        mutate((draft) => {
          const total = Object.values(draft.data.media).reduce((sum, m) => sum + m.size, 0);
          if (total + blob.size > MEDIA_PER_PACKAGE_LIMIT) {
            // Throwing inside mutate would leave history half-applied; instead
            // we abort by leaving the recipe a no-op and signal through the
            // closed-over savedFilename. Caller checks the returned id.
            savedFilename = "";
            return;
          }
          savedFilename = uniqueFilename(draft, desiredFilename);
          draft.data.media[id] = {
            id,
            packageId: draft.data.package.id,
            filename: savedFilename,
            mimeType: blob.type,
            size: blob.size,
            blob,
          };
        }, "Add media");
        if (!savedFilename) {
          throw new Error(
            `Adding "${desiredFilename}" would exceed the ${formatBytes(MEDIA_PER_PACKAGE_LIMIT)} package limit.`,
          );
        }
        return id;
      },

      delete(id) {
        mutate((draft) => {
          const m = draft.data.media[id];
          if (!m) return;
          // Refuse if any note references this filename (defensive; UI prompts).
          const ref = m.filename;
          const used = Object.values(draft.data.notes).some((n) =>
            n.fields.some((f) => f.includes(ref)),
          );
          if (used) return;
          Reflect.deleteProperty(draft.data.media, id);
        }, "Delete media");
      },

      rename(id, filename) {
        const trimmed = filename.trim();
        if (!trimmed) return;
        mutate((draft) => {
          const m = draft.data.media[id];
          if (!m) return;
          const next = uniqueFilename(draft, trimmed, id);
          // Rewrite references in note fields so card templates keep working.
          const old = m.filename;
          if (old !== next) {
            for (const note of Object.values(draft.data.notes)) {
              for (let i = 0; i < note.fields.length; i++) {
                if (note.fields[i].includes(old)) {
                  note.fields[i] = note.fields[i].split(old).join(next);
                }
              }
            }
            m.filename = next;
          }
        }, "Rename media");
      },
    },
    config: {
      select(id) {
        mutate((draft) => {
          if (!draft.data.configs[id]) return;
          draft.selection = { kind: "config", id };
        }, "Select preset");
      },

      add() {
        const cfg = defaultConfig({ packageId: "", name: "New preset" });
        const id = cfg.id;
        mutate((draft) => {
          // Use the live package id from the draft, not the placeholder above.
          draft.data.configs[id] = { ...cfg, packageId: draft.data.package.id };
          draft.selection = { kind: "config", id };
        }, "Add preset");
        return id;
      },

      delete(id) {
        mutate((draft) => {
          const inUse = Object.values(draft.data.decks).some((d) => d.configId === id);
          if (inUse) return;
          if (!draft.data.configs[id]) return;
          Reflect.deleteProperty(draft.data.configs, id);
          if (draft.selection.kind === "config" && draft.selection.id === id) {
            draft.selection = { kind: "none" };
          }
        }, "Delete preset");
      },

      rename(id, name) {
        const trimmed = name.trim();
        if (!trimmed) return;
        mutate(
          (draft) => {
            const cfg = draft.data.configs[id];
            if (!cfg) return;
            cfg.name = trimmed;
          },
          "Rename preset",
          `rename-config-${id}`,
        );
      },

      updateField(id, key, value) {
        mutate(
          (draft) => {
            const cfg = draft.data.configs[id];
            if (!cfg) return;
            if (cfg[key] === value) return;
            // Cast through unknown because the discriminated key narrowing
            // doesn't propagate to the assignment target.
            (cfg as unknown as Record<string, unknown>)[key as string] = value as unknown;
            // The first edit promotes the preset to "custom" so the deadline
            // picker confirms before regenerating.
            if (cfg.source !== "custom") cfg.source = "custom";
          },
          "Edit preset",
          `config-${id}-${String(key)}`,
        );
      },

      setForDeck(deckId, configId) {
        mutate((draft) => {
          const deck = draft.data.decks[deckId];
          const cfg = draft.data.configs[configId];
          if (!deck || !cfg) return;
          if (deck.configId === configId) return;
          const oldConfigId = deck.configId;
          deck.configId = configId;
          // Clean up if the previous config was orphaned.
          const stillReferenced = Object.values(draft.data.decks).some(
            (d) => d.configId === oldConfigId,
          );
          if (!stillReferenced && draft.data.configs[oldConfigId]) {
            Reflect.deleteProperty(draft.data.configs, oldConfigId);
          }
        }, "Set deck preset");
      },
    },
    model: {
      select(id) {
        mutate((draft) => {
          if (!draft.data.models[id]) return;
          draft.selection = { kind: "model", id };
        }, "Select note type");
      },

      addCustom() {
        const id = newId();
        mutate((draft) => {
          draft.data.models[id] = {
            id,
            packageId: draft.data.package.id,
            name: "New note type",
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
            builtin: null,
          };
          draft.selection = { kind: "model", id };
        }, "Add note type");
        return id;
      },

      duplicateBuiltin(sourceId) {
        const id = newId();
        mutate((draft) => {
          const source = draft.data.models[sourceId];
          if (!source || source.builtin === null) return;
          draft.data.models[id] = {
            ...source,
            id,
            name: `${source.name} (copy)`,
            // Deep-copy collections so future edits don't bleed into the built-in.
            fields: source.fields.map((f) => ({ ...f })),
            templates: source.templates.map((t) => ({ ...t })),
            builtin: null,
          };
          draft.selection = { kind: "model", id };
        }, "Duplicate note type");
        return id;
      },

      delete(id) {
        mutate((draft) => {
          const model = draft.data.models[id];
          if (!model) return;
          if (model.builtin !== null) return; // Built-ins are locked.
          const inUse = Object.values(draft.data.notes).some((n) => n.modelId === id);
          if (inUse) return; // Caller should have prompted; defensive guard.
          Reflect.deleteProperty(draft.data.models, id);
          if (draft.selection.kind === "model" && draft.selection.id === id) {
            draft.selection = { kind: "none" };
          }
        }, "Delete note type");
      },

      rename(id, name) {
        const trimmed = name.trim();
        if (!trimmed) return;
        mutate(
          (draft) => {
            const model = draft.data.models[id];
            if (!model || model.builtin !== null) return;
            model.name = trimmed;
          },
          "Rename note type",
          `rename-model-${id}`,
        );
      },

      addField(modelId, name) {
        const trimmed = name.trim() || "Field";
        mutate((draft) => {
          const model = draft.data.models[modelId];
          if (!model || model.builtin !== null) return;
          model.fields.push({ name: trimmed });
          for (const note of Object.values(draft.data.notes)) {
            if (note.modelId === modelId) note.fields.push("");
          }
        }, "Add field");
      },

      renameField(modelId, fieldIndex, name) {
        const trimmed = name.trim();
        if (!trimmed) return;
        mutate(
          (draft) => {
            const model = draft.data.models[modelId];
            if (!model || model.builtin !== null) return;
            const field = model.fields[fieldIndex];
            if (!field) return;
            field.name = trimmed;
          },
          "Rename field",
          `field-${modelId}-${fieldIndex}-name`,
        );
      },

      removeField(modelId, fieldIndex) {
        mutate((draft) => {
          const model = draft.data.models[modelId];
          if (!model || model.builtin !== null) return;
          if (model.fields.length <= 1) return; // Always keep at least one field.
          model.fields.splice(fieldIndex, 1);
          if (model.sortFieldIndex >= model.fields.length) {
            model.sortFieldIndex = 0;
          }
          for (const note of Object.values(draft.data.notes)) {
            if (note.modelId === modelId) note.fields.splice(fieldIndex, 1);
          }
        }, "Remove field");
      },

      updateFieldOption(modelId, fieldIndex, key, value) {
        mutate(
          (draft) => {
            const model = draft.data.models[modelId];
            if (!model || model.builtin !== null) return;
            const field = model.fields[fieldIndex];
            if (!field) return;
            (field as unknown as Record<string, unknown>)[key] = value;
          },
          "Edit field option",
          `field-${modelId}-${fieldIndex}-${key}`,
        );
      },

      updateLatex(modelId, key, value) {
        mutate(
          (draft) => {
            const model = draft.data.models[modelId];
            if (!model || model.builtin !== null) return;
            (model as unknown as Record<string, unknown>)[key] = value;
          },
          "Edit LaTeX",
          `model-${modelId}-${key}`,
        );
      },

      moveField(modelId, fieldIndex, direction) {
        mutate((draft) => {
          const model = draft.data.models[modelId];
          if (!model || model.builtin !== null) return;
          const target = direction === "up" ? fieldIndex - 1 : fieldIndex + 1;
          if (target < 0 || target >= model.fields.length) return;
          const tmp = model.fields[fieldIndex];
          model.fields[fieldIndex] = model.fields[target];
          model.fields[target] = tmp;
          for (const note of Object.values(draft.data.notes)) {
            if (note.modelId !== modelId) continue;
            const tmpVal = note.fields[fieldIndex] ?? "";
            note.fields[fieldIndex] = note.fields[target] ?? "";
            note.fields[target] = tmpVal;
          }
        }, "Reorder field");
      },

      addTemplate(modelId, name) {
        const trimmed = name.trim() || `Card ${0}`;
        mutate((draft) => {
          const model = draft.data.models[modelId];
          if (!model || model.builtin !== null) return;
          if (model.type === "cloze") return; // Cloze models always have one template.
          const next = model.templates.length + 1;
          model.templates.push({
            name: trimmed === "Card 0" ? `Card ${next}` : trimmed,
            questionFormat: "{{Front}}",
            answerFormat: '{{FrontSide}}\n\n<hr id="answer">\n\n{{Back}}',
          });
        }, "Add template");
      },

      removeTemplate(modelId, templateIndex) {
        mutate((draft) => {
          const model = draft.data.models[modelId];
          if (!model || model.builtin !== null) return;
          if (model.templates.length <= 1) return; // Always keep one template.
          model.templates.splice(templateIndex, 1);
        }, "Remove template");
      },

      renameTemplate(modelId, templateIndex, name) {
        const trimmed = name.trim();
        if (!trimmed) return;
        mutate(
          (draft) => {
            const model = draft.data.models[modelId];
            if (!model || model.builtin !== null) return;
            const template = model.templates[templateIndex];
            if (!template) return;
            template.name = trimmed;
          },
          "Rename template",
          `template-${modelId}-${templateIndex}-name`,
        );
      },

      updateTemplate(modelId, templateIndex, side, value) {
        mutate(
          (draft) => {
            const model = draft.data.models[modelId];
            if (!model || model.builtin !== null) return;
            const template = model.templates[templateIndex];
            if (!template) return;
            if (side === "question") {
              if (template.questionFormat === value) return;
              template.questionFormat = value;
            } else {
              if (template.answerFormat === value) return;
              template.answerFormat = value;
            }
          },
          "Edit template",
          `template-${modelId}-${templateIndex}-${side}`,
        );
      },

      updateCss(modelId, css) {
        mutate(
          (draft) => {
            const model = draft.data.models[modelId];
            if (!model || model.builtin !== null) return;
            if (model.css === css) return;
            model.css = css;
          },
          "Edit card styling",
          `model-${modelId}-css`,
        );
      },
    },
  };
}

// Re-export the same default CSS the builtins use so addCustom matches their
// look out of the box. Kept inline to avoid a separate import path.
function defaultCardCss(): string {
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

function nextNoteOrder(draft: PackageState, deckId: Id): number {
  const siblings = Object.values(draft.data.notes).filter((n) => n.deckId === deckId);
  if (siblings.length === 0) return 0;
  return Math.max(...siblings.map((n) => n.order)) + 1;
}

function pickModelForDeck(draft: PackageState, deckId: Id): Id {
  // The deck's default model wins. Falls back to whatever existing notes use,
  // then to the package's basicAndReversed, then to any model.
  const deck = draft.data.decks[deckId];
  if (deck?.modelId && draft.data.models[deck.modelId]) return deck.modelId;
  const existingNote = Object.values(draft.data.notes).find((n) => n.deckId === deckId);
  if (existingNote) return existingNote.modelId;
  const reversed = Object.values(draft.data.models).find((m) => m.builtin === "basicAndReversed");
  if (reversed) return reversed.id;
  const any = Object.values(draft.data.models)[0];
  if (any) return any.id;
  throw new Error("Package has no models. Cannot add a note.");
}

function uniqueFilename(draft: PackageState, desired: string, ignoreId?: Id): string {
  const taken = new Set(
    Object.values(draft.data.media)
      .filter((m) => m.id !== ignoreId)
      .map((m) => m.filename),
  );
  if (!taken.has(desired)) return desired;
  const dot = desired.lastIndexOf(".");
  const stem = dot > 0 ? desired.slice(0, dot) : desired;
  const ext = dot > 0 ? desired.slice(dot) : "";
  let n = 2;
  while (taken.has(`${stem}-${n}${ext}`)) n += 1;
  return `${stem}-${n}${ext}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
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
  // Default to the parent's note type if there is one, otherwise the
  // package's basicAndReversed model, otherwise any model.
  const fallbackModelId = pickDefaultDeckModel(draft, parentId);
  draft.data.decks[id] = {
    id,
    packageId: draft.data.package.id,
    parentDeckId: parentId,
    name: "New deck",
    description: "",
    configId: fallbackConfigId,
    modelId: fallbackModelId,
    order,
    deadline: null,
  };
  draft.selection = { kind: "deck", id };
}

function pickDefaultDeckModel(draft: PackageState, parentId: Id | null): Id {
  if (parentId) {
    const parent = draft.data.decks[parentId];
    if (parent?.modelId) return parent.modelId;
  }
  const reversed = Object.values(draft.data.models).find((m) => m.builtin === "basicAndReversed");
  if (reversed) return reversed.id;
  const any = Object.values(draft.data.models)[0];
  if (any) return any.id;
  return "";
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
