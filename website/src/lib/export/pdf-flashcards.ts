import { jsPDF } from "jspdf";
import type { FlashcardSet } from "./types";
import { wrapText } from "./text-utils";

// A4 dimensions in mm
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;

// Grid: 2 columns x 4 rows = 8 cards per page
const COLS = 2;
const ROWS = 4;
const CARDS_PER_PAGE = COLS * ROWS;

// Card dimensions (full page split, no margins between cards)
const CARD_WIDTH = PAGE_WIDTH / COLS; // 105mm
const CARD_HEIGHT = PAGE_HEIGHT / ROWS; // 74.25mm

// Text settings
const MAX_FONT_SIZE = 24;
const MIN_FONT_SIZE = 10;
const CARD_PADDING = 8; // padding inside card for text

// Line width for cut guides
const CUT_LINE_WIDTH = 0.3;

// Colors
const CUT_GUIDE_COLOR: [number, number, number] = [196, 181, 253]; // violet-300
const TERM_TEXT_COLOR: [number, number, number] = [30, 41, 59]; // slate-800
const DEF_TEXT_COLOR: [number, number, number] = [71, 85, 105]; // slate-600

/**
 * Calculates the best font size for text to fit in a card
 * Returns the font size and wrapped lines
 */
function fitTextToCard(
  doc: jsPDF,
  text: string,
  maxWidth: number,
  maxHeight: number
): { fontSize: number; lines: string[] } {
  let fontSize = MAX_FONT_SIZE;

  while (fontSize >= MIN_FONT_SIZE) {
    const lines = wrapText(doc, text, maxWidth, fontSize);
    const lineHeight = fontSize * 0.4; // approximate line height in mm
    const totalHeight = lines.length * lineHeight;

    if (totalHeight <= maxHeight) {
      return { fontSize, lines };
    }

    fontSize -= 1;
  }

  // If still doesn't fit at minimum size, just use minimum
  const lines = wrapText(doc, text, maxWidth, MIN_FONT_SIZE);
  return { fontSize: MIN_FONT_SIZE, lines };
}

/**
 * Draws cut guide lines on the page
 */
function drawCutGuides(doc: jsPDF): void {
  doc.setDrawColor(...CUT_GUIDE_COLOR);
  doc.setLineWidth(CUT_LINE_WIDTH);
  doc.setLineDashPattern([2, 2], 0);

  // Vertical lines (between columns)
  for (let col = 1; col < COLS; col++) {
    const x = col * CARD_WIDTH;
    doc.line(x, 0, x, PAGE_HEIGHT);
  }

  // Horizontal lines (between rows)
  for (let row = 1; row < ROWS; row++) {
    const y = row * CARD_HEIGHT;
    doc.line(0, y, PAGE_WIDTH, y);
  }

  // Reset dash pattern
  doc.setLineDashPattern([], 0);
}

/**
 * Draws a card's text centered in its cell
 */
function drawCardText(
  doc: jsPDF,
  text: string,
  col: number,
  row: number,
  mirrored: boolean = false
): void {
  // Calculate card position
  // For mirrored (back side), we flip horizontally
  const actualCol = mirrored ? COLS - 1 - col : col;
  const x = actualCol * CARD_WIDTH;
  const y = row * CARD_HEIGHT;

  // Available space for text (with padding)
  const textMaxWidth = CARD_WIDTH - CARD_PADDING * 2;
  const textMaxHeight = CARD_HEIGHT - CARD_PADDING * 2;

  // Fit text to available space
  const { fontSize, lines } = fitTextToCard(doc, text, textMaxWidth, textMaxHeight);

  // Calculate vertical centering
  doc.setFontSize(fontSize);
  const lineHeight = fontSize * 0.4;
  const totalTextHeight = lines.length * lineHeight;
  const startY = y + (CARD_HEIGHT - totalTextHeight) / 2 + lineHeight * 0.7;

  // Draw each line centered — terms darker, definitions lighter
  const textColor = mirrored ? DEF_TEXT_COLOR : TERM_TEXT_COLOR;
  doc.setTextColor(...textColor);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineWidth = doc.getTextWidth(line);
    const lineX = x + (CARD_WIDTH - lineWidth) / 2;
    const lineY = startY + i * lineHeight;
    doc.text(line, lineX, lineY);
  }
}

/**
 * Generates a double-sided flashcard PDF
 * Front pages have terms, back pages have definitions (mirrored for alignment)
 */
export function generateFlashcardsPDF(set: FlashcardSet): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Use a clean, readable font
  doc.setFont("helvetica", "normal");

  const cards = set.cards;
  const totalPages = Math.ceil(cards.length / CARDS_PER_PAGE);

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const startCardIndex = pageIndex * CARDS_PER_PAGE;

    // === FRONT PAGE (Terms) ===
    if (pageIndex > 0 || startCardIndex > 0) {
      doc.addPage();
    }
    drawCutGuides(doc);

    for (let i = 0; i < CARDS_PER_PAGE; i++) {
      const cardIndex = startCardIndex + i;
      const card = cards[cardIndex];
      if (!card) break;

      const col = i % COLS;
      const row = Math.floor(i / COLS);
      drawCardText(doc, card.term, col, row, false);
    }

    // === BACK PAGE (Definitions - mirrored) ===
    doc.addPage();
    drawCutGuides(doc);

    for (let i = 0; i < CARDS_PER_PAGE; i++) {
      const cardIndex = startCardIndex + i;
      const card = cards[cardIndex];
      if (!card) break;

      const col = i % COLS;
      const row = Math.floor(i / COLS);
      drawCardText(doc, card.definition, col, row, true);
    }
  }

  return doc;
}

/**
 * Generates and saves the flashcards PDF to a file
 */
export async function saveFlashcardsPDF(
  set: FlashcardSet,
  outputPath: string
): Promise<void> {
  const doc = generateFlashcardsPDF(set);
  const pdfOutput = doc.output("arraybuffer");
  await Bun.write(outputPath, pdfOutput);
}
