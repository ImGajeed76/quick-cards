// Background service worker for QuickCards
// Handles all file downloads and PDF generation.
// Downloads MUST happen here — blob URLs created in the popup crash the browser
// because the popup's lifecycle is too short / unstable for chrome.downloads.

import { generateFlashcardsPDF } from "../lib/pdf-flashcards";
import { generateListPDF } from "../lib/pdf-list";
import type { Flashcard, FlashcardSet } from "../lib/types";

// ── Quizlet API helpers ─────────────────────────────────

const API_BASE = "https://quizlet.com/webapi/3.4";
const PER_PAGE = 200;

interface StudiableItem {
  cardSides: Array<{
    media: Array<{ plainText: string }>;
  }>;
}

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

// ── Message handler ─────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "generatePDF") {
    handlePDFGeneration(message.type, message.set)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true; // keep channel open for async response
  }

  if (message.action === "downloadFile") {
    handleFileDownload(message.content, message.filename, message.mimeType)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message.action === "openExportView") {
    // Set flag so popup opens directly on the export screen, then open it.
    chrome.storage.local.set({ openExportView: true });
    chrome.action.openPopup().catch(() => {
      // openPopup() may not be available in all Chrome versions (< 127).
      // The flag is still set, so next manual popup open will go to export.
    });
    return false;
  }

  if (message.action === "fetchSet") {
    const setId: string = message.setId;
    Promise.all([fetchCardsFromApi(setId), fetchSetMetadata(setId)])
      .then(([cards, meta]) => {
        sendResponse({ ok: true, set: { ...meta, cards } });
      })
      .catch((err) => {
        sendResponse({ ok: false, error: String(err) });
      });
    return true;
  }
});

// ── File download (TXT, CSV, JSON) ──────────────────────

async function handleFileDownload(
  content: string,
  filename: string,
  mimeType: string,
) {
  // Encode content as a data URL — avoids blob URLs entirely.
  // Base64 is used because content may contain newlines, commas, unicode, etc.
  const base64 = btoa(unescape(encodeURIComponent(content)));
  const dataUrl = `data:${mimeType};base64,${base64}`;

  await chrome.downloads.download({
    url: dataUrl,
    filename: sanitizeFilename(filename),
    saveAs: true,
  });
}

// ── PDF generation + download ───────────────────────────

async function handlePDFGeneration(type: "list" | "cards", set: FlashcardSet) {
  let doc;
  let filename: string;

  if (type === "list") {
    doc = generateListPDF(set);
    filename = `${set.title || "vocabulary"}-list.pdf`;
  } else {
    doc = generateFlashcardsPDF(set);
    filename = `${set.title || "flashcards"}-cards.pdf`;
  }

  // Get PDF as a data URI (base64) — no blob URLs needed
  const dataUri = doc.output("datauristring");

  await chrome.downloads.download({
    url: dataUri,
    filename: sanitizeFilename(filename),
    saveAs: true,
  });
}

// ── Helpers ─────────────────────────────────────────────

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9\-_.]/gi, "_").slice(0, 200);
}
