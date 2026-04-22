import { jsPDF } from "jspdf";
import { hyphenateSync } from "hyphen/en";

// Soft hyphen character used by the hyphenation library
const SOFT_HYPHEN = "\u00AD";

/**
 * Hyphenates a word and returns possible break points
 */
function getHyphenatedParts(word: string): string[] {
  try {
    const hyphenated = hyphenateSync(word);
    return hyphenated.split(SOFT_HYPHEN);
  } catch {
    // Fallback: return word as single part
    return [word];
  }
}

/**
 * Breaks a long word at syllable boundaries to fit within maxWidth
 * Adds hyphens at break points
 */
function breakLongWord(
  doc: jsPDF,
  word: string,
  maxWidth: number
): string[] {
  const parts = getHyphenatedParts(word);
  const chunks: string[] = [];
  let current = "";

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    const isLast = i === parts.length - 1;
    const testWithHyphen = current + part + (isLast ? "" : "-");

    if (doc.getTextWidth(testWithHyphen) > maxWidth && current) {
      // Current chunk is full, push it with hyphen
      chunks.push(current + "-");
      current = part;
    } else {
      current += part;
    }
  }

  if (current) {
    chunks.push(current);
  }

  // If syllable breaking still doesn't work (single syllable too long),
  // fall back to character breaking
  const result: string[] = [];
  for (const chunk of chunks) {
    if (doc.getTextWidth(chunk) > maxWidth) {
      // Character-level break as last resort
      let charChunk = "";
      for (const char of chunk) {
        const test = charChunk + char;
        if (doc.getTextWidth(test + "-") > maxWidth && charChunk) {
          result.push(charChunk + "-");
          charChunk = char;
        } else {
          charChunk = test;
        }
      }
      if (charChunk) {
        result.push(charChunk);
      }
    } else {
      result.push(chunk);
    }
  }

  return result.length > 0 ? result : [word];
}

/**
 * Wraps text to fit within a given width, returns array of lines
 * Uses syllable-based hyphenation for long words
 */
export function wrapText(
  doc: jsPDF,
  text: string,
  maxWidth: number,
  fontSize: number
): string[] {
  doc.setFontSize(fontSize);
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    // Check if the word itself is too long
    if (doc.getTextWidth(word) > maxWidth) {
      // Push current line if exists
      if (currentLine) {
        lines.push(currentLine);
        currentLine = "";
      }
      // Break the long word using syllables
      const chunks = breakLongWord(doc, word, maxWidth);
      for (let i = 0; i < chunks.length; i++) {
        if (i < chunks.length - 1) {
          lines.push(chunks[i]!);
        } else {
          // Last chunk becomes current line (may combine with next word)
          currentLine = chunks[i]!;
        }
      }
    } else {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = doc.getTextWidth(testLine);

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}


