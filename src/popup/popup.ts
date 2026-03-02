import Alpine from "@alpinejs/csp";
import collapse from "@alpinejs/collapse";
import type { FlashcardSet } from "../lib/types";

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
let currentSet: FlashcardSet | null = null;
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
  if (!currentSet) return "";
  const ts = getTermSeparator();
  const cs = getCardSeparator();
  return currentSet.cards
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

// Main popup component
Alpine.data("popup", () => ({
  screen: "loading" as "loading" | "error" | "main" | "export",
  preview: false,
  copied: false,
  exportCopied: false,
  cardCount: 0,

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
        currentSet = {
          title: response.title || "Quizlet Set",
          description: response.description || "",
          cards: response.cards,
        };
        this.cardCount = currentSet.cards.length;

        // Check if "..." banner button requested the export view
        try {
          const flags = await chrome.storage.local.get("openExportView");
          if (flags.openExportView) {
            await chrome.storage.local.remove("openExportView");
            this.screen = "export";
          } else {
            this.screen = "main";
          }
        } catch {
          this.screen = "main";
        }

        this.renderPreview();
      } else {
        this.screen = "error";
      }
    } catch {
      this.screen = "error";
    }
  },

  renderPreview() {
    if (!currentSet) return;

    const tbody = (this as any).$refs?.previewTable as HTMLElement | undefined;
    if (!tbody) return;

    const rows = currentSet.cards.slice(0, 20);
    tbody.innerHTML = rows
      .map(
        (card, i) => `
        <tr class="border-b border-border last:border-0 ${i % 2 === 1 ? "bg-muted/30" : ""}">
          <td class="px-2.5 py-1.5 text-foreground font-medium w-[40%] max-w-0 truncate">${escapeHtml(card.term)}</td>
          <td class="px-2.5 py-1.5 text-muted-foreground max-w-0 truncate">${escapeHtml(card.definition)}</td>
        </tr>`
      )
      .join("");

    if (currentSet.cards.length > 20) {
      tbody.innerHTML += `
        <tr>
          <td colspan="2" class="px-2.5 py-1.5 text-muted-foreground text-center text-xs">
            ... and ${currentSet.cards.length - 20} more
          </td>
        </tr>`;
    }
  },

  // Copy (main screen)
  async copy() {
    if (this.copied || !currentSet) return;
    await navigator.clipboard.writeText(formatCards());
    this.copied = true;
    setTimeout(() => {
      this.copied = false;
    }, 1500);
  },

  // Copy (export screen)
  async copyFromExport() {
    if (this.exportCopied || !currentSet) return;
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
    if (!currentSet) return;
    downloadFile(
      formatCards(),
      `${currentSet.title || "flashcards"}.txt`,
      "text/plain"
    );
  },

  exportCSV() {
    if (!currentSet) return;
    const csv = currentSet.cards
      .map((c) => {
        const term = `"${c.term.replace(/"/g, '""')}"`;
        const def = `"${c.definition.replace(/"/g, '""')}"`;
        return `${term},${def}`;
      })
      .join("\n");
    downloadFile(
      "term,definition\n" + csv,
      `${currentSet.title || "flashcards"}.csv`,
      "text/csv"
    );
  },

  exportJSON() {
    if (!currentSet) return;
    downloadFile(
      JSON.stringify(currentSet, null, 2),
      `${currentSet.title || "flashcards"}.json`,
      "application/json"
    );
  },

  exportPDFList() {
    if (!currentSet) return;
    chrome.runtime.sendMessage({
      action: "generatePDF",
      type: "list",
      set: currentSet,
    });
  },

  exportPDFCards() {
    if (!currentSet) return;
    chrome.runtime.sendMessage({
      action: "generatePDF",
      type: "cards",
      set: currentSet,
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
