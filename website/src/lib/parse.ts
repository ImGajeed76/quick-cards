export type QuizletSetRef = {
	id: string;
	url: string;
};

export type VocabPair = {
	term: string;
	definition: string;
};

export type ParseResult =
	| { kind: 'empty' }
	| { kind: 'quizlet'; sets: QuizletSetRef[] }
	| { kind: 'vocab'; pairs: VocabPair[]; separator: string }
	| { kind: 'unknown'; reason: string };

// --------------------------------------------------------------------------
// Public entry point
// --------------------------------------------------------------------------

export function parseInput(raw: string): ParseResult {
	const text = preprocess(raw);
	if (!text.trim()) return { kind: 'empty' };

	// 1. Structured formats first — they're unambiguous when they parse.
	const json = tryJson(text);
	if (json) return { kind: 'vocab', pairs: json.pairs, separator: 'json' };

	const mdTable = tryMarkdownTable(text);
	if (mdTable) return { kind: 'vocab', pairs: mdTable.pairs, separator: 'markdown-table' };

	// 2. Quizlet URLs.
	const sets = extractQuizletSets(text);
	if (sets.length > 0) return { kind: 'quizlet', sets };

	// 3. Non-Quizlet URL rejection before guessing vocab (so "https://x" isn't
	//    parsed as term=https, def=//x by the colon scanner).
	if (hasNonQuizletUrl(text)) {
		return { kind: 'unknown', reason: 'Only Quizlet links are supported right now.' };
	}

	// 4. NDJSON / JSON Lines.
	const jsonl = tryJsonl(text);
	if (jsonl) return { kind: 'vocab', pairs: jsonl.pairs, separator: 'jsonl' };

	// 5. Quoted CSV — handles commas/semicolons inside content.
	const quotedCsv = tryQuotedCsv(text);
	if (quotedCsv) return { kind: 'vocab', pairs: quotedCsv.pairs, separator: 'quoted-csv' };

	// 6. TOML-style `key = "value"` lines.
	const toml = tryToml(text);
	if (toml) return { kind: 'vocab', pairs: toml.pairs, separator: 'toml' };

	// 7. Smart per-line delimiter scan with rarity × coverage scoring.
	const delimited = smartDelimiter(text);
	if (delimited) return { kind: 'vocab', pairs: delimited.pairs, separator: delimited.separator };

	// 7. Blank-line-separated 2-line pairs (e.g. Google Translate paste).
	const blank = tryBlankLinePairs(text);
	if (blank) return { kind: 'vocab', pairs: blank.pairs, separator: 'blank-line-pairs' };

	// 8. Alternating-line pairs (term / def / term / def).
	const alt = tryAlternatingPairs(text);
	if (alt) return { kind: 'vocab', pairs: alt.pairs, separator: 'alternating-lines' };

	return {
		kind: 'unknown',
		reason: 'Paste a Quizlet link, or a vocab list (one pair per line with a separator).'
	};
}

// --------------------------------------------------------------------------
// Preprocessing
// --------------------------------------------------------------------------

function preprocess(raw: string): string {
	return raw
		.replace(/^﻿/, '') // UTF-8 BOM
		.replace(/\r\n|\r/g, '\n') // Normalize line endings
		.replace(/ /g, ' '); // NBSP → regular space
}

// Strip leading numbering / bullet prefixes from a single line.
//   "1. foo"  /  "1) foo"  /  "(1) foo"  /  "a) foo"  /  "- foo"  /  "* foo"  /  "• foo"
const LINE_PREFIX_RE = /^\s*(?:\(?\d+[.)]|\(?[a-zA-Z][.)]|[-*•])\s+/;

function stripLinePrefix(line: string): string {
	return line.replace(LINE_PREFIX_RE, '');
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
		'$1 $2'
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
// JSON / JSONL
// --------------------------------------------------------------------------

const TERM_KEYS = [
	'term',
	'front',
	'word',
	'question',
	'q',
	'key',
	'en',
	'english',
	'from',
	'source'
];
const DEF_KEYS = [
	'definition',
	'def',
	'back',
	'meaning',
	'answer',
	'a',
	'value',
	'translation',
	'to',
	'target'
];

function tryJson(text: string): { pairs: VocabPair[] } | null {
	const trimmed = text.trim();
	if (!(trimmed.startsWith('[') || trimmed.startsWith('{'))) return null;

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
	const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
	if (lines.length < 2) return null;

	const pairs: VocabPair[] = [];
	for (const line of lines) {
		if (!(line.startsWith('{') || line.startsWith('['))) return null;
		let parsed: unknown;
		try {
			parsed = JSON.parse(line);
		} catch {
			return null;
		}
		if (Array.isArray(parsed)) {
			if (parsed.length < 2 || typeof parsed[0] !== 'string' || typeof parsed[1] !== 'string') {
				return null;
			}
			pairs.push({ term: parsed[0], definition: parsed[1] });
		} else if (typeof parsed === 'object' && parsed !== null) {
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
				if (item.length >= 2 && typeof item[0] === 'string' && typeof item[1] === 'string') {
					pairs.push({ term: item[0], definition: item[1] });
				} else {
					return null;
				}
			} else if (typeof item === 'object' && item !== null) {
				const p = extractPairFromObject(item as Record<string, unknown>);
				if (!p) return null;
				pairs.push(p);
			} else {
				return null;
			}
		}
		return pairs;
	}

	if (typeof v === 'object' && v !== null) {
		const obj = v as Record<string, unknown>;
		const pairs: VocabPair[] = [];
		for (const [k, val] of Object.entries(obj)) {
			if (typeof val !== 'string') return null;
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
		if (real && typeof obj[real] === 'string') {
			term = obj[real] as string;
			break;
		}
	}
	for (const key of DEF_KEYS) {
		const real = lowerKeys.get(key);
		if (real && typeof obj[real] === 'string') {
			def = obj[real] as string;
			break;
		}
	}

	if (term !== null && def !== null) return { term, definition: def };

	// Fallback: first two string values.
	const strVals = Object.values(obj).filter((v): v is string => typeof v === 'string');
	if (strVals.length >= 2) return { term: strVals[0], definition: strVals[1] };

	return null;
}

// --------------------------------------------------------------------------
// Markdown table
// --------------------------------------------------------------------------

function tryMarkdownTable(text: string): { pairs: VocabPair[] } | null {
	const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
	if (lines.length < 2) return null;

	// Require at least half the lines to look like `| ... |` rows.
	const rowLines = lines.filter((l) => l.startsWith('|') && l.endsWith('|'));
	if (rowLines.length < Math.max(2, lines.length / 2)) return null;

	// Strip separator rows (only |, -, :, whitespace — with at least one dash).
	const dataRows = rowLines.filter((l) => !/^\|[\s|:\-]+\|$/.test(l));
	if (dataRows.length < 2) return null;

	const parsed = dataRows.map((l) => l.slice(1, -1).split('|').map((c) => c.trim()));
	if (!parsed.every((r) => r.length >= 2)) return null;

	// Skip header row if first cell looks like a common header word.
	let start = 0;
	const HEADER_WORDS = new Set([
		'term', 'word', 'front', 'question', 'q', 'key',
		'english', 'spanish', 'french', 'german', 'italian', 'japanese', 'chinese'
	]);
	if (HEADER_WORDS.has(parsed[0][0].toLowerCase())) start = 1;

	const pairs: VocabPair[] = [];
	for (let i = start; i < parsed.length; i++) {
		const [term, def] = parsed[i];
		if (term && def) pairs.push({ term, definition: def });
	}
	return pairs.length >= 2 ? { pairs } : null;
}

// --------------------------------------------------------------------------
// Quoted CSV
// --------------------------------------------------------------------------

// Matches a line starting with "field","field" or "field";"field" or "field"\t"field".
const QUOTED_CSV_LINE_RE = /^"([^"]*)"\s*[,;\t]\s*"([^"]*)"(?:\s*[,;\t].*)?$/;

function tryQuotedCsv(text: string): { pairs: VocabPair[] } | null {
	const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
	if (lines.length < 2) return null;

	const pairs: VocabPair[] = [];
	for (const line of lines) {
		const m = line.match(QUOTED_CSV_LINE_RE);
		if (!m) return null;
		pairs.push({ term: m[1], definition: m[2] });
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
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l && !l.startsWith('#') && !l.startsWith('['));

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
	strictness?: 'once' | 'strict-two';
};

const DELIMITERS: DelimiterSpec[] = [
	{ id: 'tab', rarity: 100, splitter: /\t+/ },
	{ id: 'pipe', rarity: 95, splitter: /\s*\|\s*/ },
	{ id: 'semicolon', rarity: 90, splitter: /\s*;\s*/ },
	{ id: 'arrow-thin', rarity: 85, splitter: /\s*->\s*/ },
	{ id: 'arrow-fat', rarity: 85, splitter: /\s*=>\s*/ },
	{ id: 'arrow-unicode', rarity: 85, splitter: /\s*[→⇒⟶]\s*/ },
	{ id: 'em-dash', rarity: 80, splitter: /\s+—\s+/ },
	{ id: 'en-dash', rarity: 78, splitter: /\s+–\s+/ },
	{ id: 'equals', rarity: 70, splitter: /\s*=\s*/ },
	{ id: 'double-hyphen', rarity: 70, splitter: /\s+--\s+/ },
	{ id: 'hyphen-spaced', rarity: 55, splitter: /\s+-\s+/ },
	{ id: 'slash-spaced', rarity: 55, splitter: /\s+\/\s+/ },
	{ id: 'colon', rarity: 40, splitter: /\s*:\s+/, strictness: 'once' },
	{ id: 'comma', rarity: 30, splitter: /\s*,\s*/, strictness: 'once' },
	{ id: 'space', rarity: 10, splitter: /\s+/, strictness: 'strict-two' }
];

function countMatches(line: string, re: RegExp): number {
	const global = new RegExp(re.source, (re.flags || '').replace(/g/g, '') + 'g');
	return line.match(global)?.length ?? 0;
}

function smartDelimiter(text: string): { pairs: VocabPair[]; separator: string } | null {
	const lines = text
		.split('\n')
		.map((l) => stripLinePrefix(l.trim()))
		.filter(Boolean);

	if (lines.length < 2) return null;

	let best: { pairs: VocabPair[]; separator: string; score: number } | null = null;

	for (const delim of DELIMITERS) {
		const pairs: VocabPair[] = [];

		for (const line of lines) {
			const occurrences = countMatches(line, delim.splitter);
			if (occurrences === 0) continue;
			if (delim.strictness === 'once' && occurrences !== 1) continue;

			if (delim.strictness === 'strict-two') {
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

	return best ? { pairs: best.pairs, separator: best.separator } : null;
}

// --------------------------------------------------------------------------
// Multi-line pair formats
// --------------------------------------------------------------------------

function tryBlankLinePairs(
	text: string
): { pairs: VocabPair[] } | null {
	const groups = text.split(/\n\s*\n/).map((g) => g.trim()).filter(Boolean);
	if (groups.length < 2) return null;

	const pairs: VocabPair[] = [];
	for (const group of groups) {
		const groupLines = group.split('\n').map((l) => l.trim()).filter(Boolean);
		if (groupLines.length !== 2) return null;
		pairs.push({ term: groupLines[0], definition: groupLines[1] });
	}
	return pairs.length >= 2 ? { pairs } : null;
}

function tryAlternatingPairs(
	text: string
): { pairs: VocabPair[] } | null {
	const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
	if (lines.length < 4 || lines.length % 2 !== 0) return null;

	// Bail if any line is a URL — those aren't terms.
	if (lines.some((l) => /https?:\/\//i.test(l))) return null;

	const pairs: VocabPair[] = [];
	for (let i = 0; i < lines.length; i += 2) {
		pairs.push({ term: lines[i], definition: lines[i + 1] });
	}
	return pairs.length >= 2 ? { pairs } : null;
}
