import Alpine from "@alpinejs/csp";
import collapse from "@alpinejs/collapse";
import type { Flashcard, FlashcardSet } from "../lib/types";

// Separator value mappings
const TERM_SEP_MAP: Record<string, string> = {
  Tab: "\t",
  ",": ",",
  ":": ":",
  "\u2192": "\u2192",
};

const CARD_SEP_MAP: Record<string, string> = {
  Newline: "\n",
  "Double newline": "\n\n",
  ";": ";",
};

// Shared state
let originalSet: FlashcardSet | null = null; // the current tab's set (never mutated)
let exportSet: FlashcardSet | null = null;   // the set used for export (may be merged)
let termSepValue = "Tab";
let cardSepValue = "Newline";

// ── Helpers ──────────────────────────────────────────────

function getTermSeparator(): string {
  return TERM_SEP_MAP[termSepValue] ?? termSepValue;
}

function getCardSeparator(): string {
  return CARD_SEP_MAP[cardSepValue] ?? cardSepValue;
}

function sanitize(text: string): string {
  // Replace embedded newlines with a space so they don't collide with card separators
  return text.replace(/\r?\n/g, " ").replace(/\s{2,}/g, " ").trim();
}

function formatCards(): string {
  if (!exportSet) return "";
  const ts = getTermSeparator();
  const cs = getCardSeparator();
  return exportSet.cards
    .map((c) => `${sanitize(c.term)}${ts}${sanitize(c.definition)}`)
    .join(cs);
}

function downloadFile(content: string, filename: string, mimeType: string) {
  // Delegate to background script — blob URLs in the popup crash the browser.
  chrome.runtime.sendMessage({
    action: "downloadFile",
    content,
    filename,
    mimeType,
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Alpine components ────────────────────────────────────

Alpine.plugin(collapse);

// ── Helpers for tab discovery ────────────────────────────

/** Extract set ID from a Quizlet URL, or null. */
function getSetIdFromUrl(url: string): string | null {
  try {
    const path = new URL(url).pathname;
    const match = path.match(/^\/(?:[a-z]{2}\/)?(\d+)\/[^/]+\/?$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

interface MergeSetEntry {
  id: string;
  tabId: number;
  title: string;
  cards: number;
  cardData: Flashcard[];
  checked: boolean;
  current: boolean;
}

// Main popup component
Alpine.data("popup", () => ({
  screen: "loading" as "loading" | "error" | "main" | "export" | "merge",
  preview: false,
  copied: false,
  exportCopied: false,
  cardCount: 0,      // main screen: always originalSet count
  exportCount: 0,    // export screen: may differ after merge/dedup
  otherSets: [] as MergeSetEntry[],
  mergeSets: [] as MergeSetEntry[],
  exportSource: "main" as "main" | "merge",
  dedupEnabled: true,

  /** Render the merge set list and wire up checkbox listeners. */
  renderMergeList() {
    const container = (this as any).$refs?.mergeList as HTMLElement | undefined;
    if (!container) return;

    container.innerHTML = "";

    for (const set of this.mergeSets) {
      const label = document.createElement("label");
      label.className = `flex items-start gap-3 rounded-md border px-3 py-2.5 cursor-pointer transition-colors duration-150 ${
        set.checked ? "border-primary/40 bg-primary/5" : "border-border hover:bg-muted/30"
      }`;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = set.checked;
      checkbox.className = "mt-0.5 h-4 w-4 rounded border-input accent-primary";

      checkbox.addEventListener("change", () => {
        set.checked = checkbox.checked;
        label.className = `flex items-start gap-3 rounded-md border px-3 py-2.5 cursor-pointer transition-colors duration-150 ${
          set.checked ? "border-primary/40 bg-primary/5" : "border-border hover:bg-muted/30"
        }`;
        this.updateMergeSummary();
      });

      const info = document.createElement("div");
      info.className = "flex-1 min-w-0";

      const titleRow = document.createElement("div");
      titleRow.className = "flex items-center gap-2";

      const titleSpan = document.createElement("span");
      titleSpan.className = "text-sm font-medium text-foreground truncate";
      titleSpan.textContent = set.title;
      titleRow.appendChild(titleSpan);

      if (set.current) {
        const badge = document.createElement("span");
        badge.className = "shrink-0 text-[10px] font-medium text-primary bg-primary/15 rounded px-1.5 py-0.5";
        badge.textContent = "current";
        titleRow.appendChild(badge);
      }

      const countSpan = document.createElement("span");
      countSpan.className = "text-xs text-muted-foreground tabular-nums";
      countSpan.textContent = `${set.cards} cards`;

      info.appendChild(titleRow);
      info.appendChild(countSpan);

      label.appendChild(checkbox);
      label.appendChild(info);
      container.appendChild(label);
    }

    // Wire up dedup toggle
    const dedupLabel = (this as any).$refs?.dedupLabel as HTMLElement | undefined;
    const dedupTrack = (this as any).$refs?.dedupTrack as HTMLElement | undefined;
    const dedupThumb = (this as any).$refs?.dedupThumb as HTMLElement | undefined;

    if (dedupLabel && dedupTrack && dedupThumb) {
      const updateToggleUI = () => {
        if (this.dedupEnabled) {
          dedupTrack.classList.replace("bg-muted", "bg-primary");
          dedupThumb.classList.replace("translate-x-0.5", "translate-x-3.5");
        } else {
          dedupTrack.classList.replace("bg-primary", "bg-muted");
          dedupThumb.classList.replace("translate-x-3.5", "translate-x-0.5");
        }
      };

      dedupLabel.addEventListener("click", (e) => {
        e.preventDefault();
        this.dedupEnabled = !this.dedupEnabled;
        updateToggleUI();
        this.updateMergeSummary();
      });

      updateToggleUI();
    }

    this.updateMergeSummary();
  },

  /** Update the merge summary text, dedup count, and button state. */
  updateMergeSummary() {
    const selected = this.mergeSets.filter((s: MergeSetEntry) => s.checked);
    const selectedCount = selected.length;
    const selectedCards = selected.reduce((sum: number, s: MergeSetEntry) => sum + s.cards, 0);

    const setsEl = (this as any).$refs?.mergeSetsCount as HTMLElement | undefined;
    const cardsEl = (this as any).$refs?.mergeCardsCount as HTMLElement | undefined;
    const btnEl = (this as any).$refs?.mergeExportBtn as HTMLButtonElement | undefined;
    const dedupCountEl = (this as any).$refs?.dedupCount as HTMLElement | undefined;

    if (setsEl) setsEl.textContent = String(selectedCount);
    if (cardsEl) cardsEl.textContent = String(selectedCards);
    if (btnEl) btnEl.disabled = selectedCount < 2;

    // Calculate dedup count from actual card data
    if (dedupCountEl) {
      if (this.dedupEnabled && selectedCount >= 2) {
        const allCards = selected.flatMap((s: MergeSetEntry) => s.cardData);
        const seen = new Set<string>();
        let dupes = 0;
        for (const c of allCards) {
          const key = c.term.trim().toLowerCase();
          if (seen.has(key)) dupes++;
          else seen.add(key);
        }
        dedupCountEl.textContent = dupes > 0 ? `-${dupes}` : "";
      } else {
        dedupCountEl.textContent = "";
      }
    }
  },

  async init() {
    // Settings are already loaded before Alpine.start() — see bottom of file.
    // Get current tab
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.url?.includes("quizlet.com")) {
        this.screen = "error";
        return;
      }

      const response = await chrome.tabs.sendMessage(tab.id!, {
        action: "getCards",
      });

      if (response?.cards?.length > 0) {
        originalSet = {
          title: response.title || "Quizlet Set",
          description: response.description || "",
          cards: response.cards,
        };
        exportSet = originalSet;
        this.cardCount = originalSet.cards.length;
        this.exportCount = originalSet.cards.length;

        this.renderPreview();

        // Discover other Quizlet tabs before deciding which screen to show
        await this.discoverOtherTabs(tab.id!);

        // Check if "..." banner button requested the export/main view
        let openedFromBanner = false;
        try {
          const flags = await chrome.storage.local.get("openExportView");
          if (flags.openExportView) {
            await chrome.storage.local.remove("openExportView");
            openedFromBanner = true;
          }
        } catch {
          // ignore
        }

        if (openedFromBanner && this.otherSets.length > 0) {
          // Other sets available — show main so user sees the merge option
          this.screen = "main";
        } else if (openedFromBanner) {
          // No other sets — go straight to export
          this.exportSource = "main";
          this.screen = "export";
        } else {
          this.screen = "main";
        }
      } else {
        this.screen = "error";
      }
    } catch {
      this.screen = "error";
    }
  },

  /** Find other open Quizlet set tabs and get their metadata. */
  async discoverOtherTabs(currentTabId: number) {
    try {
      const tabs = await chrome.tabs.query({ url: "*://*.quizlet.com/*", currentWindow: true });
      const currentSetId = originalSet ? getSetIdFromUrl(tabs.find(t => t.id === currentTabId)?.url ?? "") : null;

      const others: MergeSetEntry[] = [];
      for (const tab of tabs) {
        if (tab.id === currentTabId || !tab.url) continue;
        const setId = getSetIdFromUrl(tab.url);
        if (!setId || setId === currentSetId) continue;

        // Fetch metadata via background worker
        try {
          const res = await chrome.runtime.sendMessage({ action: "fetchSet", setId });
          if (res?.ok && res.set?.cards?.length > 0) {
            others.push({
              id: setId,
              tabId: tab.id!,
              title: res.set.title || "Quizlet Set",
              cards: res.set.cards.length,
              cardData: res.set.cards,
              checked: false,
              current: false,
            });
          }
        } catch {
          // Skip tabs that fail to fetch
        }
      }

      this.otherSets = others;
    } catch {
      // tabs API unavailable
    }
  },

  /** Open merge screen, building the full set list. */
  openMerge() {
    this.mergeSets = [
      {
        id: "current",
        tabId: 0,
        title: originalSet?.title || "Current set",
        cards: originalSet?.cards.length || 0,
        cardData: originalSet?.cards || [],
        checked: true,
        current: true,
      },
      ...this.otherSets.map((s: MergeSetEntry) => ({ ...s, checked: false })),
    ];
    this.screen = "merge";
    // Render after Alpine updates the DOM (shows the merge screen)
    requestAnimationFrame(() => this.renderMergeList());
  },

  /** Merge selected sets and go to export screen. */
  mergeAndExport() {
    const selected = this.mergeSets.filter((s: MergeSetEntry) => s.checked);
    if (selected.length < 2) return;

    const allCards: Flashcard[] = [];
    const titles: string[] = [];

    for (const entry of selected) {
      allCards.push(...entry.cardData);
      titles.push(entry.title);
    }

    if (allCards.length === 0) return;

    // Deduplicate by normalized term (case-insensitive, trimmed)
    let cards = allCards;
    if (this.dedupEnabled) {
      const seen = new Set<string>();
      cards = allCards.filter((c) => {
        const key = c.term.trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    exportSet = {
      title: titles.join(" + "),
      description: `Merged from ${titles.length} sets`,
      cards,
    };
    this.exportCount = exportSet.cards.length;
    this.exportSource = "merge";
    this.screen = "export";
  },

  /** Open export screen from main (current tab only). */
  openExport() {
    exportSet = originalSet;
    this.exportCount = originalSet?.cards.length || 0;
    this.exportSource = "main";
    this.screen = "export";
  },

  /** Navigate back from export to the correct screen. */
  goBackFromExport() {
    this.screen = this.exportSource === "merge" ? "merge" : "main";
  },

  renderPreview() {
    if (!originalSet) return;

    const tbody = (this as any).$refs?.previewTable as HTMLElement | undefined;
    if (!tbody) return;

    const rows = originalSet.cards.slice(0, 20);
    tbody.innerHTML = rows
      .map(
        (card, i) => `
        <tr class="border-b border-border last:border-0 ${i % 2 === 1 ? "bg-muted/30" : ""}">
          <td class="px-2.5 py-1.5 text-foreground font-medium w-[40%] max-w-0 truncate">${escapeHtml(card.term)}</td>
          <td class="px-2.5 py-1.5 text-muted-foreground max-w-0 truncate">${escapeHtml(card.definition)}</td>
        </tr>`
      )
      .join("");

    if (originalSet.cards.length > 20) {
      tbody.innerHTML += `
        <tr>
          <td colspan="2" class="px-2.5 py-1.5 text-muted-foreground text-center text-xs">
            ... and ${originalSet.cards.length - 20} more
          </td>
        </tr>`;
    }
  },

  // Copy (main screen — always copies original set)
  async copy() {
    if (this.copied || !originalSet) return;
    exportSet = originalSet;
    await navigator.clipboard.writeText(formatCards());
    this.copied = true;
    setTimeout(() => {
      this.copied = false;
    }, 1500);
  },

  // Copy (export screen)
  async copyFromExport() {
    if (this.exportCopied || !exportSet) return;
    await navigator.clipboard.writeText(formatCards());
    this.exportCopied = true;
    setTimeout(() => {
      this.exportCopied = false;
    }, 1500);
  },

  // Save separator settings
  saveSettings() {
    try {
      chrome.storage.sync.set({
        termSeparator: termSepValue,
        cardSeparator: cardSepValue,
      });
    } catch {
      // Not in extension context
    }
  },

  // Export handlers
  exportTXT() {
    if (!exportSet) return;
    downloadFile(
      formatCards(),
      `${exportSet.title || "flashcards"}.txt`,
      "text/plain"
    );
  },

  exportCSV() {
    if (!exportSet) return;
    const csv = exportSet.cards
      .map((c) => {
        const term = `"${c.term.replace(/"/g, '""')}"`;
        const def = `"${c.definition.replace(/"/g, '""')}"`;
        return `${term},${def}`;
      })
      .join("\n");
    downloadFile(
      "term,definition\n" + csv,
      `${exportSet.title || "flashcards"}.csv`,
      "text/csv"
    );
  },

  exportJSON() {
    if (!exportSet) return;
    downloadFile(
      JSON.stringify(exportSet, null, 2),
      `${exportSet.title || "flashcards"}.json`,
      "application/json"
    );
  },

  exportPDFList() {
    if (!exportSet) return;
    chrome.runtime.sendMessage({
      action: "generatePDF",
      type: "list",
      set: exportSet,
    });
  },

  exportPDFCards() {
    if (!exportSet) return;
    chrome.runtime.sendMessage({
      action: "generatePDF",
      type: "cards",
      set: exportSet,
    });
  },
}));

// Combobox component (reusable for both separators)
Alpine.data("combobox", () => ({
  value: "",
  presets: [] as string[],
  open: false,

  initTermSep() {
    this.value = termSepValue;
    this.presets = ["Tab", ",", ":", "\u2192"];
  },

  initCardSep() {
    this.value = cardSepValue;
    this.presets = ["Newline", "Double newline", ";"];
  },

  pick(preset: string) {
    this.value = preset;
    this.open = false;
    this.saveSettings();
  },

  saveSettings() {
    // Determine which combobox this is by checking presets
    if (this.presets.includes("Tab")) {
      termSepValue = this.value;
    } else {
      cardSepValue = this.value;
    }

    try {
      chrome.storage.sync.set({
        termSeparator: termSepValue,
        cardSeparator: cardSepValue,
      });
    } catch {
      // Not in extension context
    }
  },
}));

// Load saved settings BEFORE Alpine starts, so combobox x-init reads correct values.
(window as any).Alpine = Alpine;

(async () => {
  try {
    const settings = await chrome.storage.sync.get({
      termSeparator: "Tab",
      cardSeparator: "Newline",
    });
    termSepValue = settings.termSeparator as string;
    cardSepValue = settings.cardSeparator as string;
  } catch {
    // Not in extension context (dev), use defaults
  }
  Alpine.start();
})();
