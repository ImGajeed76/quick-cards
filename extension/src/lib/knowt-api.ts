// Knowt import — uses the user's existing Knowt session (cookies on knowt.com)
// to create a new flashcard set on their account via Knowt's AppSync GraphQL API.

import type { FlashcardSet } from "./types";

const ENDPOINT = "https://3gso5evnnzbr7l4ubazdtfa4wq.appsync-api.us-east-1.amazonaws.com/graphql";
const COGNITO_CLIENT_ID = "2nd76e1v5lva4r1nfi3vku56rj";
// Chunk size for BatchUpdateFlashcard. Keeps payloads small for very large sets.
const BATCH_SIZE = 100;

export type KnowtImportResult =
  | { ok: true; url: string }
  | { ok: false; needsAuth: true }
  | { ok: false; error: string };

// ── Auth ──────────────────────────────────────────────────

/** Find Knowt's Cognito ID token in cookies. Null if the user isn't signed in. */
async function getIdToken(): Promise<string | null> {
  const cookies = await chrome.cookies.getAll({ domain: "knowt.com" });
  const match = cookies.find(
    (c) => c.name.includes(COGNITO_CLIENT_ID) && c.name.endsWith(".idToken"),
  );
  if (!match) return null;
  try {
    return decodeURIComponent(match.value);
  } catch {
    return match.value;
  }
}

interface JwtPayload {
  "custom:ID"?: string;
  exp?: number;
}

function decodeJwt(token: string): JwtPayload {
  const payload = token.split(".")[1];
  if (!payload) throw new Error("Invalid JWT: missing payload segment");
  const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, "=");
  return JSON.parse(atob(padded));
}

function isExpired(payload: JwtPayload): boolean {
  return typeof payload.exp !== "number" || Date.now() >= payload.exp * 1000;
}

// ── GraphQL ───────────────────────────────────────────────

async function gql<T = unknown>(
  idToken: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { authorization: idToken, "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message ?? "GraphQL error");
  }
  return json.data;
}

const CREATE_SET = `
  mutation($input: CreateFlashcardSetInput!) {
    createFlashcardSetV2(input: $input) { item { flashcardSetId } }
  }`;

const BATCH_UPDATE = `
  mutation($input: FlashcardListInput!) {
    batchUpdateFlashcard(input: $input) { items { flashcardId } }
  }`;

// ── Content formatting ────────────────────────────────────

// Knowt stores term/definition as HTML. Plain text goes inside <p>, with
// HTML-special chars escaped and newlines mapped to <br>.
function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrapP(text: string): string {
  return `<p>${htmlEscape(text).replace(/\r?\n/g, "<br>")}</p>`;
}

// ── Public API ────────────────────────────────────────────

export async function importToKnowt(set: FlashcardSet): Promise<KnowtImportResult> {
  if (!set.cards?.length) return { ok: false, error: "No cards to import." };

  const idToken = await getIdToken();
  if (!idToken) return { ok: false, needsAuth: true };

  let userId: string;
  try {
    const payload = decodeJwt(idToken);
    if (isExpired(payload)) return { ok: false, needsAuth: true };
    if (!payload["custom:ID"]) throw new Error("missing custom:ID");
    userId = payload["custom:ID"];
  } catch {
    return { ok: false, needsAuth: true };
  }

  const setId = crypto.randomUUID();
  const cardIds = set.cards.map(() => crypto.randomUUID());
  const nowSec = Math.floor(Date.now() / 1000);
  const nowStr = String(nowSec);

  try {
    // Mutation 1: create the set + reserve card IDs. Title/description inline
    // (verified against Knowt's schema — skips their 2nd-step UpdateFlashcardSetV2).
    await gql(idToken, CREATE_SET, {
      input: {
        userId,
        flashcardSetId: setId,
        flashcards: cardIds.map((id) => ({ flashcardId: id })),
        position: 0,
        trash: false,
        draft: false,
        classPublic: false,
        sort: nowSec,
        created: nowSec,
        updated: nowSec,
        quizletUrl: "MANUAL_IMPORT",
        size: set.cards.length,
        public: false,
        password: null,
        title: set.title || "Untitled set",
        description: set.description || "",
      },
    });

    // Mutation 2: populate each card's term/definition. Chunked for large sets.
    const items = set.cards.map((card, i) => ({
      flashcardId: cardIds[i],
      flashcardSetId: setId,
      userId,
      term: wrapP(card.term),
      definition: wrapP(card.definition),
      trash: false,
      edited: true,
      disabled: false,
      quality: 5,
      created: nowStr,
      updated: nowStr,
    }));

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      await gql(idToken, BATCH_UPDATE, {
        input: { userId, items: items.slice(i, i + BATCH_SIZE) },
      });
    }

    return { ok: true, url: `https://knowt.com/flashcards/${setId}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
