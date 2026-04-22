import { jsPDF } from "jspdf";
import type { FlashcardSet } from "./types";
import { wrapText } from "./text-utils";

// A4 dimensions in mm
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;

// Margins
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 20;
const MARGIN_LEFT = 15;
const MARGIN_RIGHT = 15;

// Content area
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

// Table settings
const ROW_HEIGHT = 8;
const HEADER_HEIGHT = 10;
const COL_NUM_WIDTH = 12;
const COL_TERM_WIDTH = (CONTENT_WIDTH - COL_NUM_WIDTH) * 0.4;
const COL_DEF_WIDTH = (CONTENT_WIDTH - COL_NUM_WIDTH) * 0.6;

// Font sizes
const TITLE_FONT_SIZE = 18;
const DESCRIPTION_FONT_SIZE = 11;
const TABLE_HEADER_FONT_SIZE = 10;
const TABLE_BODY_FONT_SIZE = 10;

// Violet color scheme (matches extension theme)
const PRIMARY_VIOLET: [number, number, number] = [139, 92, 246]; // violet-500 (#8B5CF6)
const DARK_VIOLET: [number, number, number] = [91, 33, 182]; // violet-700
const LIGHT_VIOLET: [number, number, number] = [237, 233, 254]; // violet-100

// Colors
const HEADER_BG_COLOR = PRIMARY_VIOLET;
const HEADER_TEXT_COLOR: [number, number, number] = [255, 255, 255];
const ALT_ROW_COLOR = LIGHT_VIOLET;
const BORDER_COLOR: [number, number, number] = [221, 214, 254]; // violet-200
const TEXT_COLOR: [number, number, number] = [30, 41, 59]; // slate-800
const TITLE_COLOR = DARK_VIOLET;

/**
 * Calculates the height needed for a row based on text wrapping
 */
function calculateRowHeight(
  doc: jsPDF,
  term: string,
  definition: string,
  lineHeight: number
): { height: number; termLines: string[]; defLines: string[] } {
  const termLines = wrapText(doc, term, COL_TERM_WIDTH - 4, TABLE_BODY_FONT_SIZE);
  const defLines = wrapText(doc, definition, COL_DEF_WIDTH - 4, TABLE_BODY_FONT_SIZE);
  const maxLines = Math.max(termLines.length, defLines.length);
  const height = Math.max(ROW_HEIGHT, maxLines * lineHeight + 6);
  return { height, termLines, defLines };
}

/**
 * Draws the table header
 */
function drawTableHeader(doc: jsPDF, y: number): number {
  const x = MARGIN_LEFT;

  // Header background
  doc.setFillColor(...HEADER_BG_COLOR);
  doc.rect(x, y, CONTENT_WIDTH, HEADER_HEIGHT, "F");

  // Header text
  doc.setFontSize(TABLE_HEADER_FONT_SIZE);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...HEADER_TEXT_COLOR);

  const textY = y + HEADER_HEIGHT / 2 + 1.5;
  doc.text("#", x + COL_NUM_WIDTH / 2, textY, { align: "center" });
  doc.text("Term", x + COL_NUM_WIDTH + 4, textY);
  doc.text("Definition", x + COL_NUM_WIDTH + COL_TERM_WIDTH + 4, textY);

  // Column separators
  doc.setDrawColor(...HEADER_TEXT_COLOR);
  doc.setLineWidth(0.2);
  doc.line(x + COL_NUM_WIDTH, y, x + COL_NUM_WIDTH, y + HEADER_HEIGHT);
  doc.line(
    x + COL_NUM_WIDTH + COL_TERM_WIDTH,
    y,
    x + COL_NUM_WIDTH + COL_TERM_WIDTH,
    y + HEADER_HEIGHT
  );

  return y + HEADER_HEIGHT;
}

/**
 * Draws a table row
 */
function drawTableRow(
  doc: jsPDF,
  y: number,
  rowNum: number,
  termLines: string[],
  defLines: string[],
  rowHeight: number,
  isAlternate: boolean
): number {
  const x = MARGIN_LEFT;
  const lineHeight = TABLE_BODY_FONT_SIZE * 0.4;

  // Row background
  if (isAlternate) {
    doc.setFillColor(...ALT_ROW_COLOR);
    doc.rect(x, y, CONTENT_WIDTH, rowHeight, "F");
  }

  // Border
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.2);
  doc.rect(x, y, CONTENT_WIDTH, rowHeight, "S");

  // Column separators
  doc.line(x + COL_NUM_WIDTH, y, x + COL_NUM_WIDTH, y + rowHeight);
  doc.line(
    x + COL_NUM_WIDTH + COL_TERM_WIDTH,
    y,
    x + COL_NUM_WIDTH + COL_TERM_WIDTH,
    y + rowHeight
  );

  // Text
  doc.setFontSize(TABLE_BODY_FONT_SIZE);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_COLOR);

  // Row number (centered vertically)
  const numY = y + rowHeight / 2 + 1;
  doc.text(String(rowNum), x + COL_NUM_WIDTH / 2, numY, { align: "center" });

  // Term (multiple lines if needed)
  const textStartY = y + 3 + lineHeight;
  for (let i = 0; i < termLines.length; i++) {
    doc.text(termLines[i]!, x + COL_NUM_WIDTH + 2, textStartY + i * lineHeight);
  }

  // Definition (multiple lines if needed)
  for (let i = 0; i < defLines.length; i++) {
    doc.text(
      defLines[i]!,
      x + COL_NUM_WIDTH + COL_TERM_WIDTH + 2,
      textStartY + i * lineHeight
    );
  }

  return y + rowHeight;
}

/**
 * Generates a vocabulary list PDF with title, description, and table
 */
export function generateListPDF(set: FlashcardSet): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  doc.setFont("helvetica", "normal");

  let currentY = MARGIN_TOP;

  // Title
  doc.setFontSize(TITLE_FONT_SIZE);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TITLE_COLOR);
  doc.text(set.title || "Vocabulary List", MARGIN_LEFT, currentY);
  currentY += TITLE_FONT_SIZE * 0.5 + 4;

  // Description (if exists)
  if (set.description && set.description.trim()) {
    doc.setFontSize(DESCRIPTION_FONT_SIZE);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);

    const descLines = wrapText(doc, set.description, CONTENT_WIDTH, DESCRIPTION_FONT_SIZE);
    const descLineHeight = DESCRIPTION_FONT_SIZE * 0.4;
    for (const line of descLines) {
      doc.text(line, MARGIN_LEFT, currentY);
      currentY += descLineHeight;
    }
    currentY += 6;
  } else {
    currentY += 4;
  }

  // Table header
  currentY = drawTableHeader(doc, currentY);

  // Table body
  const lineHeight = TABLE_BODY_FONT_SIZE * 0.4;
  doc.setFontSize(TABLE_BODY_FONT_SIZE);

  for (let i = 0; i < set.cards.length; i++) {
    const card = set.cards[i]!;
    const { height, termLines, defLines } = calculateRowHeight(
      doc,
      card.term,
      card.definition,
      lineHeight
    );

    // Check if we need a new page
    if (currentY + height > PAGE_HEIGHT - MARGIN_BOTTOM) {
      doc.addPage();
      currentY = MARGIN_TOP;
      currentY = drawTableHeader(doc, currentY);
    }

    currentY = drawTableRow(
      doc,
      currentY,
      i + 1,
      termLines,
      defLines,
      height,
      i % 2 === 1
    );
  }

  return doc;
}

/**
 * Generates and saves the vocabulary list PDF to a file
 */
export async function saveListPDF(
  set: FlashcardSet,
  outputPath: string
): Promise<void> {
  const doc = generateListPDF(set);
  const pdfOutput = doc.output("arraybuffer");
  await Bun.write(outputPath, pdfOutput);
}
