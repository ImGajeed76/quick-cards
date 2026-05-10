export type QuizletSetRef = {
  id: string;
  url: string;
};

export type VocabPair = {
  term: string;
  definition: string;
};

export type ParseResult =
  | { kind: "empty" }
  | { kind: "quizlet"; sets: QuizletSetRef[] }
  | { kind: "vocab"; pairs: VocabPair[]; separator: string }
  | { kind: "unknown"; reason: string };

// --------------------------------------------------------------------------
// Public entry point
// --------------------------------------------------------------------------

export function parseInput(raw: string): ParseResult {
  const text = preprocess(raw);
  if (!text.trim()) return { kind: "empty" };

  // 1. Structured formats first — they're unambiguous when they parse.
  const json = tryJson(text);
  if (json) return { kind: "vocab", pairs: unwrapQuotedSides(json.pairs), separator: "json" };

  const mdTable = tryMarkdownTable(text);
  if (mdTable)
    return { kind: "vocab", pairs: unwrapQuotedSides(mdTable.pairs), separator: "markdown-table" };

  // 2. Quizlet URLs.
  const sets = extractQuizletSets(text);
  if (sets.length > 0) return { kind: "quizlet", sets };

  // 3. Non-Quizlet URL rejection before guessing vocab (so "https://x" isn't
  //    parsed as term=https, def=//x by the colon scanner).
  if (hasNonQuizletUrl(text)) {
    return { kind: "unknown", reason: "Only Quizlet links are supported right now." };
  }

  // 4. NDJSON / JSON Lines.
  const jsonl = tryJsonl(text);
  if (jsonl) return { kind: "vocab", pairs: unwrapQuotedSides(jsonl.pairs), separator: "jsonl" };

  // 5. Quoted CSV — handles fully-quoted cells (every cell wrapped).
  const quotedCsv = tryQuotedCsv(text);
  if (quotedCsv)
    return { kind: "vocab", pairs: unwrapQuotedSides(quotedCsv.pairs), separator: "quoted-csv" };

  // 5.5. CSV with a header row. Quote-aware tokenizer; required header
  //      gates this path so prose-with-commas can't accidentally trigger
  //      it. Catches mixed-quoting CSV and quoted defs with internal
  //      commas (the realistic AI-model output shapes). Reports the
  //      "comma" separator name to match smartDelimiter's labeling.
  const csvWithHeader = tryCsvWithHeader(text);
  if (csvWithHeader) return { kind: "vocab", pairs: csvWithHeader.pairs, separator: "comma" };

  // 6. TOML-style `key = "value"` lines.
  const toml = tryToml(text);
  if (toml) return { kind: "vocab", pairs: unwrapQuotedSides(toml.pairs), separator: "toml" };

  // 7. Smart per-line delimiter scan with rarity × coverage scoring.
  const delimited = smartDelimiter(text);
  if (delimited)
    return {
      kind: "vocab",
      pairs: unwrapQuotedSides(delimited.pairs),
      separator: delimited.separator,
    };

  // 7. Blank-line-separated 2-line pairs (e.g. Google Translate paste).
  const blank = tryBlankLinePairs(text);
  if (blank)
    return { kind: "vocab", pairs: unwrapQuotedSides(blank.pairs), separator: "blank-line-pairs" };

  // 8. Alternating-line pairs (term / def / term / def).
  const alt = tryAlternatingPairs(text);
  if (alt)
    return { kind: "vocab", pairs: unwrapQuotedSides(alt.pairs), separator: "alternating-lines" };

  // 9. Single-line hierarchical split — discovery-based. Catches Quizlet
  //    custom-export formats (`term:def;term:def`) and any other hierarchy
  //    the text implies. Runs last so the specialized multi-line paths get
  //    first crack.
  const hier = tryHierarchySplit(text);
  if (hier)
    return { kind: "vocab", pairs: unwrapQuotedSides(hier.pairs), separator: hier.separator };

  return {
    kind: "unknown",
    reason: "Paste a Quizlet link, or a vocab list (one pair per line with a separator).",
  };
}

// --------------------------------------------------------------------------
// Preprocessing
// --------------------------------------------------------------------------

function preprocess(raw: string): string {
  return raw
    .replace(/^\uFEFF/, "") // UTF-8 BOM
    .replace(/\r\n|\r/g, "\n") // Normalize line endings
    .replace(/\u00A0/g, " "); // NBSP to regular space
}

// Strip leading numbering / bullet prefixes from a single line.
//   "1. foo"  /  "1) foo"  /  "(1) foo"  /  "a) foo"  /  "- foo"  /  "* foo"  /  "• foo"
const LINE_PREFIX_RE = /^\s*(?:\(?\d+[.)]|\(?[a-zA-Z][.)]|[-*•])\s+/;

function stripLinePrefix(line: string): string {
  return line.replace(LINE_PREFIX_RE, "");
}

// --------------------------------------------------------------------------
// Quizlet URLs
// --------------------------------------------------------------------------

// Scheme-optional, subdomain-optional, locale-path-optional, numeric set ID required.
const QUIZLET_URL_RE =
  /(?:https?:\/\/)?(?:(?:www|m)\.)?quizlet\.com(?:\/[a-z]{2}(?:-[a-z]{2})?)?\/(\d+)(?:\/\S*)?/gi;

const GENERIC_URL_RE = /\bhttps?:\/\/\S+/gi;

function extractQuizletSets(text: string): QuizletSetRef[] {
  // Break concatenated URLs apart (e.g. "…/slug/https://quizlet.com/…") by
  // inserting whitespace before any quizlet.com occurrence that has a
  // non-whitespace char directly in front of it. `\b` guards against matching
  // inside a word like "aquizlet.com".
  const normalized = text.replace(
    /(\S)((?:https?:\/\/)?(?:(?:www|m)\.)?\bquizlet\.com\/)/gi,
    "$1 $2",
  );

  const seen = new Set<string>();
  const sets: QuizletSetRef[] = [];
  QUIZLET_URL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = QUIZLET_URL_RE.exec(normalized)) !== null) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    sets.push({ id, url: `https://quizlet.com/${id}` });
  }
  return sets;
}

function hasNonQuizletUrl(text: string): boolean {
  const all = text.match(GENERIC_URL_RE) ?? [];
  return all.some((u) => !/quizlet\.com/i.test(u));
}

// --------------------------------------------------------------------------
// Surrounding-quote stripping
// --------------------------------------------------------------------------

// Per-side, all-or-nothing rule: strip surrounding quotes from a side iff
// EVERY pair on that side is wrapped in matching quotes and stripping
// won't produce an empty cell. Term and definition sides checked
// independently.
const QUOTE_PAIRS: Array<readonly [string, string]> = [
  ['"', '"'],
  ["'", "'"],
  ["“", "”"],
  ["‘", "’"],
];

function stripSurroundingQuotes(s: string): string | null {
  for (const [open, close] of QUOTE_PAIRS) {
    if (s.length >= open.length + close.length && s.startsWith(open) && s.endsWith(close)) {
      const inner = s.slice(open.length, s.length - close.length);
      return inner.length === 0 ? null : inner;
    }
  }
  return null;
}

function unwrapQuotedSides(pairs: VocabPair[]): VocabPair[] {
  if (pairs.length === 0) return pairs;

  const strippedTerms = pairs.map((p) => stripSurroundingQuotes(p.term));
  const stripTerms = strippedTerms.every((s) => s !== null);

  const strippedDefs = pairs.map((p) => stripSurroundingQuotes(p.definition));
  const stripDefs = strippedDefs.every((s) => s !== null);

  if (!stripTerms && !stripDefs) return pairs;

  return pairs.map((p, i) => {
    const t = strippedTerms[i];
    const d = strippedDefs[i];
    return {
      term: stripTerms && t !== null ? t : p.term,
      definition: stripDefs && d !== null ? d : p.definition,
    };
  });
}

// --------------------------------------------------------------------------
// Header row detection
// --------------------------------------------------------------------------

// A row is treated as a header iff EVERY token in BOTH cells is in
// HEADER_WORDS or HEADER_CONNECTIVES, and at least one HEADER_WORDS token
// appears in each cell. Punctuation is stripped before tokenization so
// "French (term)" still matches.
const HEADER_WORDS = new Set([
  "term",
  "terms",
  "definition",
  "definitions",
  "def",
  "defs",
  "front",
  "back",
  "question",
  "questions",
  "answer",
  "answers",
  "q",
  "a",
  "key",
  "value",
  "word",
  "words",
  "vocab",
  "vocabulary",
  "meaning",
  "meanings",
  "translation",
  "translations",
  "text",
  "side",
  "column",
  "label",
  "name",
  "english",
  "spanish",
  "french",
  "german",
  "italian",
  "portuguese",
  "dutch",
  "japanese",
  "chinese",
  "korean",
  "russian",
  "latin",
  "hebrew",
  "arabic",
  "swedish",
  "polish",
  "greek",
  "turkish",
]);

const HEADER_CONNECTIVES = new Set([
  "or",
  "and",
  "the",
  "a",
  "an",
  "in",
  "of",
  "to",
  "from",
  "with",
  "as",
]);

function isHeaderCell(s: string): boolean {
  const tokens = s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return false;
  if (!tokens.some((t) => HEADER_WORDS.has(t))) return false;
  return tokens.every((t) => HEADER_WORDS.has(t) || HEADER_CONNECTIVES.has(t));
}

// Drop pairs[0] if it looks like a header row in BOTH cells. Refuses to
// drop if it would leave fewer than 2 pairs, since at that point the row
// is more likely to be real data than a header.
function dropHeaderRowIfPresent(pairs: VocabPair[]): VocabPair[] {
  if (pairs.length < 3) return pairs;
  const first = pairs[0];
  if (isHeaderCell(first.term) && isHeaderCell(first.definition)) {
    return pairs.slice(1);
  }
  return pairs;
}

// --------------------------------------------------------------------------
// JSON / JSONL
// --------------------------------------------------------------------------

const TERM_KEYS = [
  "term",
  "front",
  "word",
  "question",
  "q",
  "key",
  "en",
  "english",
  "from",
  "source",
];
const DEF_KEYS = [
  "definition",
  "def",
  "back",
  "meaning",
  "answer",
  "a",
  "value",
  "translation",
  "to",
  "target",
];

function tryJson(text: string): { pairs: VocabPair[] } | null {
  const trimmed = text.trim();
  if (!(trimmed.startsWith("[") || trimmed.startsWith("{"))) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }

  const pairs = extractPairsFromJsonValue(parsed);
  return pairs && pairs.length > 0 ? { pairs } : null;
}

function tryJsonl(text: string): { pairs: VocabPair[] } | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;

  const pairs: VocabPair[] = [];
  for (const line of lines) {
    if (!(line.startsWith("{") || line.startsWith("["))) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      return null;
    }
    if (Array.isArray(parsed)) {
      if (parsed.length < 2 || typeof parsed[0] !== "string" || typeof parsed[1] !== "string") {
        return null;
      }
      pairs.push({ term: parsed[0], definition: parsed[1] });
    } else if (typeof parsed === "object" && parsed !== null) {
      const p = extractPairFromObject(parsed as Record<string, unknown>);
      if (!p) return null;
      pairs.push(p);
    } else {
      return null;
    }
  }
  return pairs.length >= 2 ? { pairs } : null;
}

function extractPairsFromJsonValue(v: unknown): VocabPair[] | null {
  if (Array.isArray(v)) {
    const pairs: VocabPair[] = [];
    for (const item of v) {
      if (Array.isArray(item)) {
        if (item.length >= 2 && typeof item[0] === "string" && typeof item[1] === "string") {
          pairs.push({ term: item[0], definition: item[1] });
        } else {
          return null;
        }
      } else if (typeof item === "object" && item !== null) {
        const p = extractPairFromObject(item as Record<string, unknown>);
        if (!p) return null;
        pairs.push(p);
      } else {
        return null;
      }
    }
    return pairs;
  }

  if (typeof v === "object" && v !== null) {
    const obj = v as Record<string, unknown>;
    const pairs: VocabPair[] = [];
    for (const [k, val] of Object.entries(obj)) {
      if (typeof val !== "string") return null;
      pairs.push({ term: k, definition: val });
    }
    return pairs;
  }

  return null;
}

function extractPairFromObject(obj: Record<string, unknown>): VocabPair | null {
  // Prefer known key names (case-insensitive).
  const lowerKeys = new Map(Object.keys(obj).map((k) => [k.toLowerCase(), k]));

  let term: string | null = null;
  let def: string | null = null;

  for (const key of TERM_KEYS) {
    const real = lowerKeys.get(key);
    if (real && typeof obj[real] === "string") {
      term = obj[real] as string;
      break;
    }
  }
  for (const key of DEF_KEYS) {
    const real = lowerKeys.get(key);
    if (real && typeof obj[real] === "string") {
      def = obj[real] as string;
      break;
    }
  }

  if (term !== null && def !== null) return { term, definition: def };

  // Fallback: first two string values.
  const strVals = Object.values(obj).filter((v): v is string => typeof v === "string");
  if (strVals.length >= 2) return { term: strVals[0], definition: strVals[1] };

  return null;
}

// --------------------------------------------------------------------------
// Markdown table
// --------------------------------------------------------------------------

function tryMarkdownTable(text: string): { pairs: VocabPair[] } | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;

  // Require at least half the lines to look like `| ... |` rows.
  const rowLines = lines.filter((l) => l.startsWith("|") && l.endsWith("|"));
  if (rowLines.length < Math.max(2, lines.length / 2)) return null;

  // Strip separator rows (only |, -, :, whitespace — with at least one dash).
  const dataRows = rowLines.filter((l) => !/^\|[\s|:-]+\|$/.test(l));
  if (dataRows.length < 2) return null;

  const parsed = dataRows.map((l) =>
    l
      .slice(1, -1)
      .split("|")
      .map((c) => c.trim()),
  );
  if (!parsed.every((r) => r.length >= 2)) return null;

  const pairs: VocabPair[] = [];
  for (const row of parsed) {
    const [term, def] = row;
    if (term && def) pairs.push({ term, definition: def });
  }
  const filtered = dropHeaderRowIfPresent(pairs);
  return filtered.length >= 2 ? { pairs: filtered } : null;
}

// --------------------------------------------------------------------------
// Quoted CSV
// --------------------------------------------------------------------------

// Matches a line starting with "field","field" or "field";"field" or "field"\t"field".
const QUOTED_CSV_LINE_RE = /^"([^"]*)"\s*[,;\t]\s*"([^"]*)"(?:\s*[,;\t].*)?$/;

function tryQuotedCsv(text: string): { pairs: VocabPair[] } | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;

  const pairs: VocabPair[] = [];
  for (const line of lines) {
    const m = line.match(QUOTED_CSV_LINE_RE);
    if (!m) return null;
    pairs.push({ term: m[1], definition: m[2] });
  }
  const filtered = dropHeaderRowIfPresent(pairs);
  return filtered.length >= 2 ? { pairs: filtered } : null;
}

// --------------------------------------------------------------------------
// CSV with header (quote-aware)
// --------------------------------------------------------------------------

// Real-CSV tokenizer. Walks character-by-character, treating commas inside
// "..." as literal content. Handles RFC-4180-style escaped quotes ("" -> ").
// Produces an array of cell strings.
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') {
        // Escaped quote inside a quoted cell: "" represents a literal "
        cur += '"';
        i++;
        continue;
      }
      inQuote = !inQuote;
      continue;
    }
    if (c === "," && !inQuote) {
      cells.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  cells.push(cur);
  return cells.map((s) => s.trim());
}

// CSV with a recognizable header row (e.g. `term,definition`). Triggers
// quote-aware parsing only when the first line is clearly a header, which
// disambiguates from prose-with-commas. Handles every shape AI models
// produce: fully-quoted cells, mixed quoting, bare terms with quoted defs
// containing internal commas, etc.
function tryCsvWithHeader(text: string): { pairs: VocabPair[] } | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;

  const headerCells = parseCsvLine(lines[0]);
  if (headerCells.length < 2) return null;
  // Both of the first two header cells must look like header words (term /
  // definition / front / back / language names / etc).
  if (!isHeaderCell(headerCells[0]) || !isHeaderCell(headerCells[1])) return null;

  const pairs: VocabPair[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.length < 2) continue;
    const term = cells[0];
    // If a row has more than 2 cells, treat extras as part of the
    // definition (joined back with commas). Anki and most users expect
    // exactly two columns; extras shouldn't get silently dropped.
    const def = cells.length > 2 ? cells.slice(1).join(", ") : cells[1];
    if (term && def) pairs.push({ term, definition: def });
  }
  return pairs.length >= 2 ? { pairs } : null;
}

// --------------------------------------------------------------------------
// TOML
// --------------------------------------------------------------------------

// `key = "value"` or `"key" = "value"` — skip comments (#) and section headers ([...]).
const TOML_LINE_RE = /^(?:"([^"]+)"|([A-Za-z_][\w.-]*))\s*=\s*"([^"]*)"$/;

function tryToml(text: string): { pairs: VocabPair[] } | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && !l.startsWith("["));

  if (lines.length < 2) return null;

  const pairs: VocabPair[] = [];
  for (const line of lines) {
    const m = line.match(TOML_LINE_RE);
    if (!m) return null;
    const term = m[1] ?? m[2];
    const def = m[3];
    if (!term || def === undefined) return null;
    pairs.push({ term, definition: def });
  }
  return pairs.length >= 2 ? { pairs } : null;
}

// --------------------------------------------------------------------------
// Smart delimiter scan
// --------------------------------------------------------------------------

type DelimiterSpec = {
  id: string;
  rarity: number; // 0–100, higher = rarer in prose = more trustworthy
  splitter: RegExp; // non-global — used to find first occurrence
  // 'once': must occur exactly once per line (protects against delim-in-content)
  // 'strict-two': split must yield exactly 2 whitespace tokens (single-space fallback)
  strictness?: "once" | "strict-two";
};

const DELIMITERS: DelimiterSpec[] = [
  { id: "tab", rarity: 100, splitter: /\t+/ },
  { id: "pipe", rarity: 95, splitter: /\s*\|\s*/ },
  { id: "semicolon", rarity: 90, splitter: /\s*;\s*/ },
  { id: "arrow-thin", rarity: 85, splitter: /\s*->\s*/ },
  { id: "arrow-fat", rarity: 85, splitter: /\s*=>\s*/ },
  { id: "arrow-unicode", rarity: 85, splitter: /\s*[→⇒⟶]\s*/ },
  { id: "em-dash", rarity: 80, splitter: /\s+—\s+/ },
  { id: "en-dash", rarity: 78, splitter: /\s+–\s+/ },
  { id: "equals", rarity: 70, splitter: /\s*=\s*/ },
  { id: "double-hyphen", rarity: 70, splitter: /\s+--\s+/ },
  { id: "hyphen-spaced", rarity: 55, splitter: /\s+-\s+/ },
  { id: "slash-spaced", rarity: 55, splitter: /\s+\/\s+/ },
  { id: "colon", rarity: 40, splitter: /\s*:\s+/, strictness: "once" },
  { id: "comma", rarity: 30, splitter: /\s*,\s*/, strictness: "once" },
  { id: "space", rarity: 10, splitter: /\s+/, strictness: "strict-two" },
];

function countMatches(line: string, re: RegExp): number {
  const global = new RegExp(re.source, (re.flags || "").replace(/g/g, "") + "g");
  return line.match(global)?.length ?? 0;
}

function smartDelimiter(text: string): { pairs: VocabPair[]; separator: string } | null {
  const lines = text
    .split("\n")
    .map((l) => stripLinePrefix(l.trim()))
    .filter(Boolean);

  if (lines.length < 2) return null;

  let best: { pairs: VocabPair[]; separator: string; score: number } | null = null;

  for (const delim of DELIMITERS) {
    const pairs: VocabPair[] = [];

    for (const line of lines) {
      const occurrences = countMatches(line, delim.splitter);
      if (occurrences === 0) continue;
      if (delim.strictness === "once" && occurrences !== 1) continue;

      if (delim.strictness === "strict-two") {
        const tokens = line.split(/\s+/).filter(Boolean);
        if (tokens.length !== 2) continue;
        pairs.push({ term: tokens[0], definition: tokens[1] });
        continue;
      }

      // Split on FIRST occurrence — preserves content after the first delimiter.
      const m = line.match(delim.splitter);
      if (!m || m.index === undefined) continue;
      const term = line.slice(0, m.index).trim();
      const def = line.slice(m.index + m[0].length).trim();
      if (term && def) pairs.push({ term, definition: def });
    }

    if (pairs.length < 2) continue;
    const coverage = pairs.length / lines.length;
    if (coverage < 0.5) continue;

    const score = delim.rarity * coverage;
    if (!best || score > best.score) {
      best = { pairs, separator: delim.id, score };
    }
  }

  if (!best) return null;
  const filtered = dropHeaderRowIfPresent(best.pairs);
  if (filtered.length < 2) return null;
  return { pairs: filtered, separator: best.separator };
}

// --------------------------------------------------------------------------
// Multi-line pair formats
// --------------------------------------------------------------------------

function tryBlankLinePairs(text: string): { pairs: VocabPair[] } | null {
  const groups = text
    .split(/\n\s*\n/)
    .map((g) => g.trim())
    .filter(Boolean);
  if (groups.length < 2) return null;

  const pairs: VocabPair[] = [];
  for (const group of groups) {
    const groupLines = group
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (groupLines.length !== 2) return null;
    pairs.push({ term: groupLines[0], definition: groupLines[1] });
  }
  return pairs.length >= 2 ? { pairs } : null;
}

function tryAlternatingPairs(text: string): { pairs: VocabPair[] } | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 4 || lines.length % 2 !== 0) return null;

  // Bail if any line is a URL — those aren't terms.
  if (lines.some((l) => /https?:\/\//i.test(l))) return null;

  const pairs: VocabPair[] = [];
  for (let i = 0; i < lines.length; i += 2) {
    pairs.push({ term: lines[i], definition: lines[i + 1] });
  }
  return pairs.length >= 2 ? { pairs } : null;
}

// --------------------------------------------------------------------------
// Hierarchical split — discovery-based
//
// Every non-word run (and individual non-word char) in the text becomes a
// candidate separator. We try every (outer, inner) pair, split, and score.
// No hardcoded list of known delimiters — the algorithm adapts to whatever
// punctuation the user actually pasted.
// --------------------------------------------------------------------------

/** How "delimiter-y" a single char is. Higher weight = rarer in prose = safer
 *  bet as a delimiter. Used as a tiebreaker when multiple combos parse. */
function charWeight(c: string): number {
  if (c === "\t" || c === "\n") return 50;
  if (/[|;@#$%^&*+~`{}[\]<>]/.test(c)) return 50;
  if (/[=→⇒⟶]/.test(c)) return 30;
  if (/[-—–]/.test(c)) return 15;
  if (/[:/]/.test(c)) return 10;
  if (/[.,'"()!?]/.test(c)) return 1;
  if (/\s/.test(c)) return 1;
  return 5;
}

function tokenMaxWeight(token: string): number {
  let max = 0;
  for (const c of token) max = Math.max(max, charWeight(c));
  return max;
}

/** Pull every non-word run out of the text, plus each individual non-space
 *  non-word character. Pure-space runs are filtered (too noisy). */
function extractHierarchyCandidates(text: string): string[] {
  const set = new Set<string>();
  for (const m of text.matchAll(/[^\p{L}\p{N}]+/gu)) {
    const run = m[0];
    if (!/^ +$/.test(run)) set.add(run);
    for (const c of run) {
      if (c !== " ") set.add(c);
    }
  }
  return [...set];
}

/** Flag systematic non-word boundaries — if all definitions start with the
 *  same non-word char, or all terms end with the same non-word char, the
 *  split probably chopped a real delimiter in half. Used to reject the
 *  "hola##hello@@… split with inner=#" misfire, where every def starts with #. */
function hasSystematicNonWordBoundary(pairs: VocabPair[]): boolean {
  if (pairs.length < 2) return false;
  const isNonWord = (c: string | undefined): boolean =>
    c !== undefined && !/[\p{L}\p{N}\s]/u.test(c);

  const defStarts = pairs.map((p) => p.definition[0]);
  if (isNonWord(defStarts[0]) && defStarts.every((c) => c === defStarts[0])) return true;

  const termEnds = pairs.map((p) => p.term[p.term.length - 1]);
  if (isNonWord(termEnds[0]) && termEnds.every((c) => c === termEnds[0])) return true;

  return false;
}

function labelHierarchy(inner: string, outer: string): string {
  const describe = (t: string): string => {
    if (t === "\t") return "tab";
    if (t === "\n") return "newline";
    return JSON.stringify(t); // shows quotes + escapes for weird chars
  };
  return `hierarchy(${describe(inner)} + ${describe(outer)})`;
}

function tryHierarchySplit(text: string): { pairs: VocabPair[]; separator: string } | null {
  // Single-line only — multi-line inputs that don't match smart-delim / blank-line /
  // alternating are not our responsibility. Otherwise we'd start rescuing inputs
  // the existing paths deliberately reject (e.g. compound-word `-` inside `well-being`
  // or content-comma ambiguity like `hola, amigo, friend`).
  if (text.includes("\n")) return null;

  const candidates = extractHierarchyCandidates(text);
  if (candidates.length < 2) return null;

  let best: { pairs: VocabPair[]; outer: string; inner: string; score: number } | null = null;

  for (const outer of candidates) {
    const chunks = text
      .split(outer)
      .map((c) => c.trim())
      .filter(Boolean);
    if (chunks.length < 2) continue;

    // Rule 1 — reject outer if the chunks still contain a candidate with
    // strictly-higher max-char-weight. Prevents picking weak delimiters when
    // a stronger one survives inside the chunks (e.g. splitting on " - " and
    // leaving " ; " untouched in the middle chunk).
    const outerMax = tokenMaxWeight(outer);
    const hasCompetingInChunks = candidates.some((cand) => {
      if (cand === outer) return false;
      if (tokenMaxWeight(cand) <= outerMax) return false;
      return chunks.some((chunk) => chunk.includes(cand));
    });
    if (hasCompetingInChunks) continue;

    for (const inner of candidates) {
      if (inner === outer) continue;
      // Prevents "-" from being picked as inner when outer is "->" etc.
      if (outer.includes(inner)) continue;

      const pairs: VocabPair[] = [];
      let allParsed = true;
      for (const chunk of chunks) {
        const idx = chunk.indexOf(inner);
        if (idx < 0) {
          allParsed = false;
          break;
        }
        const term = chunk.slice(0, idx).trim();
        const def = chunk.slice(idx + inner.length).trim();
        if (!term || !def) {
          allParsed = false;
          break;
        }
        pairs.push({ term, definition: def });
      }
      if (!allParsed || pairs.length < 2) continue;

      // Prefer LONGER inner — ` - ` beats `-` in `hola-world - hello-there …`,
      // `##` beats `#` in `hola##hello@@…`. The inner-substring-of-outer skip
      // above already prevents ` - ` from misfiring when outer is `->`.
      let score = pairs.length * 10000 + outerMax * 100 + tokenMaxWeight(inner) + inner.length;

      // Rule 2 — large negative bias when every def starts (or every term
      // ends) with the same non-word char. Catches the #/## misfire.
      if (hasSystematicNonWordBoundary(pairs)) {
        score -= 1_000_000;
      }

      if (!best || score > best.score) {
        best = { pairs, outer, inner, score };
      }
    }
  }

  // If the best combo only survived thanks to the negative-score bias, it's
  // almost certainly wrong — reject it and fall through to unknown.
  if (!best || best.score < 0) return null;

  return { pairs: best.pairs, separator: labelHierarchy(best.inner, best.outer) };
}
