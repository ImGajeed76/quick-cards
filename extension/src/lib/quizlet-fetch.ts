import type { Flashcard, FlashcardSet } from "./types";
import {
  applyLangsToCard,
  extractCardFromItem,
  normalizeLangCode,
  type StudiableItem,
} from "./quizlet-parse";
import { getCachedSet, putCachedSet } from "./cache";

const API_BASE = "https://quizlet.com/webapi/3.4";
const PER_PAGE = 500;

interface SetObject {
  title: string;
  description: string;
  wordLang: string | null;
  defLang: string | null;
  thumbnailUrl?: string;
  lastModified: number;
}

async function fetchSetObject(setId: string): Promise<SetObject> {
  const res = await fetch(`${API_BASE}/sets/${setId}`);
  if (!res.ok) throw new Error(`Sets API returned ${res.status}`);
  const data = await res.json();
  const s = data?.responses?.[0]?.models?.set?.[0];
  if (!s) throw new Error("Sets API returned no set object");
  return {
    title: s.title ?? "Quizlet Set",
    description: s.description ?? "",
    wordLang: normalizeLangCode(s.wordLang),
    defLang: normalizeLangCode(s.defLang),
    thumbnailUrl: s._thumbnailUrl ?? undefined,
    lastModified: typeof s.lastModified === "number" ? s.lastModified : 0,
  };
}

async function fetchCardsFromApi(setId: string): Promise<Flashcard[]> {
  const allCards: Flashcard[] = [];
  let page = 1;
  let pagingToken: string | undefined;

  // Quizlet enforces a paging-token chain: page N requires the token returned
  // by page N-1. This loop stays sequential.
  while (true) {
    const params = new URLSearchParams({
      "filters[studiableContainerId]": setId,
      "filters[studiableContainerType]": "1",
      perPage: String(PER_PAGE),
      page: String(page),
    });
    if (pagingToken) params.set("pagingToken", pagingToken);

    const res = await fetch(`${API_BASE}/studiable-item-documents?${params}`);
    if (!res.ok) throw new Error(`API returned ${res.status}`);

    const data = await res.json();
    const resp = data?.responses?.[0];
    const items: StudiableItem[] = resp?.models?.studiableItem ?? [];

    for (const item of items) {
      const card = extractCardFromItem(item);
      if (card) allCards.push(card);
    }

    const paging = resp?.paging;
    const total: number = paging?.total ?? 0;

    if (allCards.length >= total || items.length < PER_PAGE) break;

    pagingToken = paging?.token;
    page++;
  }

  return allCards;
}

/**
 * Fetch a Quizlet set, normalized for export. Returns a complete FlashcardSet
 * with TTS URLs corrected against the set's wordLang/defLang. Results are
 * cached in IndexedDB and reused on subsequent loads when the set's
 * lastModified watermark matches.
 *
 * Failure model: if the set object call fails, we serve cached data
 * regardless of age. If the cards call fails after a successful set call,
 * same fallback. Returns null only when there's no cache and the API is
 * unreachable, or when the set has zero cards.
 */
export async function fetchSetWithCache(setId: string): Promise<FlashcardSet | null> {
  let setObj: SetObject;
  try {
    setObj = await fetchSetObject(setId);
  } catch (err) {
    console.warn("[QuickCards] /sets fetch failed, falling back to cache:", err);
    const cached = await getCachedSet(setId);
    return cached?.data ?? null;
  }

  const cached = await getCachedSet(setId);
  if (cached && cached.lastModified === setObj.lastModified) {
    return cached.data;
  }

  let cards: Flashcard[];
  try {
    cards = await fetchCardsFromApi(setId);
  } catch (err) {
    console.warn("[QuickCards] cards fetch failed, falling back to cache:", err);
    return cached?.data ?? null;
  }
  if (cards.length === 0) return null;

  for (const card of cards) {
    applyLangsToCard(card, setObj.wordLang, setObj.defLang);
  }

  const set: FlashcardSet = {
    title: setObj.title,
    description: setObj.description,
    cards,
    ...(setObj.wordLang ? { wordLang: setObj.wordLang } : {}),
    ...(setObj.defLang ? { defLang: setObj.defLang } : {}),
    ...(setObj.thumbnailUrl ? { thumbnailUrl: setObj.thumbnailUrl } : {}),
  };

  await putCachedSet({ setId, lastModified: setObj.lastModified, data: set });

  return set;
}
