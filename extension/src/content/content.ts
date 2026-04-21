import type { Flashcard } from "../lib/types";

// ── Types ───────────────────────────────────────────────

interface StudiableItem {
  cardSides: Array<{
    media: Array<{
      plainText: string;
    }>;
  }>;
}

interface ScrapedData {
  title: string;
  description: string;
  cards: Flashcard[];
}

// ── Quizlet page detection ──────────────────────────────

/**
 * Check if this is a Quizlet set's main page (not a learning mode).
 * Main page URL patterns:
 *   quizlet.com/{id}/{slug}           — US/default
 *   quizlet.com/{cc}/{id}/{slug}      — international (e.g. /ch/, /de/, /fr/)
 * Learning modes are excluded:
 *   quizlet.com/{id}/{slug}/learn, /test, /match, /flashcards, etc.
 */
function isQuizletSetMainPage(): boolean {
  const path = window.location.pathname;
  // Optional 2-letter country code prefix, then /{numeric-id}/{slug}, no further segments
  const setPagePattern = /^\/(?:[a-z]{2}\/)?(\d+)\/[^/]+\/?$/;
  return setPagePattern.test(path);
}

/** Extract the numeric set ID from the current URL, or null if not on a set page. */
function getSetIdFromUrl(): string | null {
  const match = window.location.pathname.match(/^\/(?:[a-z]{2}\/)?(\d+)\/[^/]+\/?$/);
  return match?.[1] ?? null;
}

// ── API fetcher ─────────────────────────────────────────

const API_BASE = "https://quizlet.com/webapi/3.4";
const PER_PAGE = 200; // server max is 500, 200 is a safe default

/** Fetch all flashcards for a set via Quizlet's API, handling pagination. */
async function fetchCardsFromApi(setId: string): Promise<Flashcard[]> {
  const allCards: Flashcard[] = [];
  let page = 1;
  let pagingToken: string | undefined;

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
      const term = item.cardSides?.[0]?.media?.[0]?.plainText ?? "";
      const definition = item.cardSides?.[1]?.media?.[0]?.plainText ?? "";
      if (term || definition) {
        allCards.push({ term, definition });
      }
    }

    const paging = resp?.paging;
    const total: number = paging?.total ?? 0;

    // No more pages if we've collected everything or this page was short
    if (allCards.length >= total || items.length < PER_PAGE) break;

    pagingToken = paging?.token;
    page++;
  }

  return allCards;
}

/** Fetch set metadata (title, description) via Quizlet's API. */
async function fetchSetMetadata(setId: string): Promise<{ title: string; description: string }> {
  const res = await fetch(`${API_BASE}/sets/${setId}`);
  if (!res.ok) throw new Error(`Sets API returned ${res.status}`);

  const data = await res.json();
  const set = data?.responses?.[0]?.models?.set?.[0];
  return {
    title: set?.title ?? "Quizlet Set",
    description: set?.description ?? "",
  };
}

/** Primary method: fetch cards + metadata via Quizlet's web API. */
async function fetchViaApi(setId: string): Promise<ScrapedData | null> {
  try {
    const [cards, meta] = await Promise.all([
      fetchCardsFromApi(setId),
      fetchSetMetadata(setId),
    ]);
    if (cards.length === 0) return null;
    return { ...meta, cards };
  } catch (err) {
    console.warn("[QuickCards] API fetch failed, falling back to scraper:", err);
    return null;
  }
}

// ── Fallback: __NEXT_DATA__ scraper ─────────────────────

/**
 * Scrape flashcard data from Quizlet's embedded __NEXT_DATA__ JSON.
 * Used as a fallback when the API is unreachable (e.g. rate-limited).
 *
 * Structure:
 *   <script id="__NEXT_DATA__"> -> JSON.parse ->
 *     props.pageProps.dehydratedReduxStateKey -> JSON.parse (double-encoded) ->
 *       studyModesCommon.studiableData.studiableItems[] ->
 *         cardSides[0].media[0].plainText = term
 *         cardSides[1].media[0].plainText = definition
 *
 *   Title:       ...setPage.set.title
 *   Description: ...setPage.set.description
 */
function scrapeQuizletData(): ScrapedData | null {
  try {
    const scriptEl = document.getElementById("__NEXT_DATA__");
    if (!scriptEl?.textContent) return null;

    const nextData = JSON.parse(scriptEl.textContent);
    const reduxKey = nextData?.props?.pageProps?.dehydratedReduxStateKey;
    if (!reduxKey) return null;

    // dehydratedReduxStateKey is a JSON string within JSON — double-parse
    const reduxState = typeof reduxKey === "string" ? JSON.parse(reduxKey) : reduxKey;

    // Extract cards
    const items: StudiableItem[] | undefined =
      reduxState?.studyModesCommon?.studiableData?.studiableItems;

    if (!items || items.length === 0) return null;

    const cards: Flashcard[] = [];
    for (const item of items) {
      const term = item.cardSides?.[0]?.media?.[0]?.plainText ?? "";
      const definition = item.cardSides?.[1]?.media?.[0]?.plainText ?? "";
      if (term || definition) {
        cards.push({ term, definition });
      }
    }

    if (cards.length === 0) return null;

    const setInfo = reduxState?.setPage?.set;
    const title: string = setInfo?.title ?? "Quizlet Set";
    const description: string = setInfo?.description ?? "";

    return { title, description, cards };
  } catch (err) {
    console.error("[QuickCards] Failed to scrape Quizlet data:", err);
    return null;
  }
}

// ── Data loading (API first, scraper fallback) ──────────

let cachedData: ScrapedData | null = null;
let dataPromise: Promise<ScrapedData | null> | null = null;

/** Load data: try API first, fall back to __NEXT_DATA__ scraping. */
async function loadData(): Promise<ScrapedData | null> {
  if (cachedData) return cachedData;

  const setId = getSetIdFromUrl();
  if (!setId) return null;

  // Try API first
  const apiData = await fetchViaApi(setId);
  if (apiData) {
    cachedData = apiData;
    return cachedData;
  }

  // Fallback: scrape __NEXT_DATA__
  cachedData = scrapeQuizletData();
  return cachedData;
}

/** Get data, starting the fetch if not already in progress. */
function getData(): Promise<ScrapedData | null> {
  if (!dataPromise) {
    dataPromise = loadData();
  }
  return dataPromise;
}

// ── Message listener (for popup) ────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "getCards") {
    getData().then((data) => {
      if (data) {
        sendResponse({
          title: data.title,
          description: data.description,
          cards: data.cards,
        });
      } else {
        sendResponse({ cards: [] });
      }
    });
  }
  return true; // keep message channel open for async response
});

// ── Theme tokens (inline, since Tailwind isn't available on Quizlet) ─

const T = {
  card:              "oklch(0.21 0.006 285.885)",
  foreground:        "oklch(0.985 0 0)",
  muted:             "oklch(0.705 0.015 286.067)",
  border:            "oklch(1 0 0 / 10%)",
  primary:           "oklch(0.541 0.281 293.009)",
  primaryForeground: "oklch(0.969 0.016 293.756)",
  primaryMuted:      "oklch(0.541 0.281 293.009 / 0.2)",
  primaryHover:      "oklch(0.541 0.281 293.009 / 0.9)",
  accent:            "oklch(0.274 0.006 286.033)",
};

// Lucide "ellipsis" icon (inline SVG — can't use createIcons in content script)
const ELLIPSIS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>`;

// ── Floating banner (auto-inject on set pages) ──────────

function injectBanner(cardCount: number) {
  if (document.getElementById("quickcards-banner")) return;

  const banner = document.createElement("div");
  banner.id = "quickcards-banner";
  banner.setAttribute("style", `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 999999;
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid ${T.border};
    background: ${T.card};
    color: ${T.foreground};
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 0.3s ease, transform 0.3s ease;
  `);

  banner.innerHTML = `
    <span style="color: ${T.muted};">
      <strong style="color: ${T.foreground}; font-weight: 600; font-variant-numeric: tabular-nums;">${cardCount}</strong> cards
    </span>
    <div style="width: 1px; height: 16px; background: ${T.border};"></div>
    <button id="quickcards-copy" style="
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 32px;
      width: 72px;
      border-radius: 6px;
      border: none;
      background: ${T.primary};
      color: ${T.primaryForeground};
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
    ">Copy</button>
    <button id="quickcards-more" style="
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 32px;
      width: 32px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: ${T.muted};
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    ">${ELLIPSIS_SVG}</button>
  `;

  document.body.appendChild(banner);

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      banner.style.opacity = "1";
      banner.style.transform = "translateY(0)";
    });
  });

  // ── Copy button ───────────────────────────────────────

  const copyBtn = document.getElementById("quickcards-copy")!;

  copyBtn.addEventListener("mouseenter", () => {
    if (!copyBtn.hasAttribute("disabled")) {
      copyBtn.style.background = T.primaryHover;
    }
  });
  copyBtn.addEventListener("mouseleave", () => {
    if (!copyBtn.hasAttribute("disabled")) {
      copyBtn.style.background = T.primary;
    }
  });

  copyBtn.addEventListener("click", async () => {
    if (copyBtn.hasAttribute("disabled")) return;

    const data = await getData();
    if (!data?.cards.length) return;

    const text = data.cards
      .map((c: Flashcard) => `${c.term}\t${c.definition}`)
      .join("\n");
    await navigator.clipboard.writeText(text);

    copyBtn.textContent = "Copied";
    copyBtn.style.background = T.primaryMuted;
    copyBtn.style.color = T.primary;
    copyBtn.setAttribute("disabled", "");

    setTimeout(() => {
      copyBtn.textContent = "Copy";
      copyBtn.style.background = T.primary;
      copyBtn.style.color = T.primaryForeground;
      copyBtn.removeAttribute("disabled");
    }, 1500);
  });

  // ── "..." (more) button ───────────────────────────────

  const moreBtn = document.getElementById("quickcards-more")!;

  moreBtn.addEventListener("mouseenter", () => {
    moreBtn.style.background = T.accent;
    moreBtn.style.color = T.foreground;
  });
  moreBtn.addEventListener("mouseleave", () => {
    moreBtn.style.background = "transparent";
    moreBtn.style.color = T.muted;
  });

  moreBtn.addEventListener("click", () => {
    // Slide banner out
    banner.style.opacity = "0";
    banner.style.transform = "translateY(8px)";
    setTimeout(() => banner.remove(), 300);

    // Tell background to open the popup in export view
    chrome.runtime.sendMessage({ action: "openExportView" });
  });
}

// ── Init ─────────────────────────────────────────────────

if (isQuizletSetMainPage()) {
  getData().then((data) => {
    if (data && data.cards.length > 0) {
      injectBanner(data.cards.length);
    }
  });
}
