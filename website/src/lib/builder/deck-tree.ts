/**
 * Pure helpers for working with the deck tree.
 *
 * Decks live in a flat record keyed by id. Parent/child links come from
 * `parentDeckId` and sibling order from `order`. We never store the tree
 * structurally; it's reconstructed here on demand so mutations only need to
 * touch the affected nodes.
 */

import type { BuilderDeck, BuilderNote, Id } from "./types";

export interface DeckNode {
  deck: BuilderDeck;
  children: DeckNode[];
  /** Number of notes in this deck (not counting descendants). */
  noteCount: number;
  /** Total number of notes in this deck and all descendants. */
  totalNoteCount: number;
  depth: number;
}

interface BuildArgs {
  decks: Record<Id, BuilderDeck>;
  notes: Record<Id, BuilderNote>;
}

/**
 * Build the deck forest. Roots are decks with `parentDeckId === null`,
 * sorted by `order` then by `name` for stability.
 */
export function buildDeckForest(args: BuildArgs): DeckNode[] {
  const noteCounts: Record<Id, number> = {};
  for (const note of Object.values(args.notes)) {
    noteCounts[note.deckId] = (noteCounts[note.deckId] ?? 0) + 1;
  }

  const childrenByParent: Record<string, BuilderDeck[]> = {};
  for (const deck of Object.values(args.decks)) {
    const key = deck.parentDeckId ?? "__root__";
    (childrenByParent[key] ??= []).push(deck);
  }
  for (const list of Object.values(childrenByParent)) {
    list.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  }

  function build(deck: BuilderDeck, depth: number): DeckNode {
    const own = noteCounts[deck.id] ?? 0;
    const children = (childrenByParent[deck.id] ?? []).map((d) => build(d, depth + 1));
    const total = own + children.reduce((sum, c) => sum + c.totalNoteCount, 0);
    return { deck, children, noteCount: own, totalNoteCount: total, depth };
  }

  return (childrenByParent.__root__ ?? []).map((d) => build(d, 0));
}

/** Walk the forest and return ids in pre-order traversal. */
export function flattenIds(forest: DeckNode[]): Id[] {
  const out: Id[] = [];
  function walk(node: DeckNode): void {
    out.push(node.deck.id);
    node.children.forEach(walk);
  }
  forest.forEach(walk);
  return out;
}

/** Test if `candidate` is a descendant of `ancestor` (or the same deck). */
export function isDescendantOrSelf(
  decks: Record<Id, BuilderDeck>,
  candidate: Id,
  ancestor: Id,
): boolean {
  let cur: Id | null = candidate;
  while (cur) {
    if (cur === ancestor) return true;
    cur = decks[cur]?.parentDeckId ?? null;
  }
  return false;
}

/**
 * Repack `order` values [0, 1, 2, ...] for all siblings of one parent.
 * Mutates the provided record in place. Operates only on decks that already
 * share `parentId`; insertion of moved decks is the caller's responsibility.
 */
export function repackSiblingOrder(decks: Record<Id, BuilderDeck>, parentId: Id | null): void {
  const siblings = Object.values(decks).filter((d) => d.parentDeckId === parentId);
  siblings.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  siblings.forEach((d, i) => {
    d.order = i;
  });
}

export type DropPosition = "before" | "after" | "inside";

interface MoveArgs {
  decks: Record<Id, BuilderDeck>;
  source: Id;
  target: Id;
  position: DropPosition;
}

/**
 * Move `source` relative to `target`. Returns true if the move happened, false
 * if it was rejected (e.g. would create a cycle).
 *
 * Caller must invoke this inside a `mutate` recipe so changes participate in
 * undo. The operation mutates the decks record in place.
 */
export function moveDeck(args: MoveArgs): boolean {
  const { decks, source, target, position } = args;
  if (source === target) return false;

  const src = decks[source];
  const tgt = decks[target];
  if (!src || !tgt) return false;

  // Reject moves that would nest a deck inside itself.
  if (position === "inside" && isDescendantOrSelf(decks, target, source)) return false;
  if ((position === "before" || position === "after") && tgt.parentDeckId === source) {
    return false;
  }
  // Sibling moves where the source already sits adjacent to target are no-ops.
  // (We let them through; repackSiblingOrder normalizes the result.)

  const oldParent = src.parentDeckId;
  let newParent: Id | null;
  let newOrder: number;

  if (position === "inside") {
    newParent = target;
    const childCount = Object.values(decks).filter((d) => d.parentDeckId === target).length;
    newOrder = childCount;
  } else {
    newParent = tgt.parentDeckId;
    newOrder = position === "before" ? tgt.order : tgt.order + 1;
    // Shift siblings to make room.
    for (const d of Object.values(decks)) {
      if (d.parentDeckId === newParent && d.id !== source && d.order >= newOrder) {
        d.order += 1;
      }
    }
  }

  src.parentDeckId = newParent;
  src.order = newOrder;

  // Repack both the old and new parent siblings to keep orders contiguous.
  repackSiblingOrder(decks, oldParent);
  if (oldParent !== newParent) repackSiblingOrder(decks, newParent);
  return true;
}

/**
 * Collect the deck and every descendant id. Used when deleting a subtree.
 */
export function collectSubtreeIds(decks: Record<Id, BuilderDeck>, root: Id): Id[] {
  const out: Id[] = [];
  const queue: Id[] = [root];
  while (queue.length > 0) {
    const id = queue.shift();
    if (!id || !decks[id]) continue;
    out.push(id);
    for (const d of Object.values(decks)) {
      if (d.parentDeckId === id) queue.push(d.id);
    }
  }
  return out;
}

/**
 * A deck is "simple" (eligible for "duplicate as writing deck") when:
 * - it has no child decks
 * - all its notes use the same model
 * - that model is the built-in Basic+Reversed (so we know the field semantics)
 *
 * Returns the qualifying model id when true, null otherwise.
 */
export function isSimpleFlashcardDeck(args: {
  deck: BuilderDeck;
  decks: Record<Id, BuilderDeck>;
  notes: Record<Id, BuilderNote>;
  models: Record<Id, { id: Id; builtin: string | null }>;
}): Id | null {
  const hasChild = Object.values(args.decks).some((d) => d.parentDeckId === args.deck.id);
  if (hasChild) return null;

  const deckNotes = Object.values(args.notes).filter((n) => n.deckId === args.deck.id);
  if (deckNotes.length === 0) return null;

  const modelIds = new Set(deckNotes.map((n) => n.modelId));
  if (modelIds.size !== 1) return null;

  const modelId = [...modelIds][0];
  const model = args.models[modelId];
  if (!model) return null;
  if (model.builtin !== "basicAndReversed") return null;
  return modelId;
}
