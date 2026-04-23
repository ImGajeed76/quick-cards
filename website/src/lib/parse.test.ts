import { describe, expect, test } from 'bun:test';
import { parseInput, type ParseResult } from './parse';

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function expectVocab(
	r: ParseResult,
	expected: { separator?: string; pairs: { term: string; definition: string }[] }
): void {
	expect(r.kind).toBe('vocab');
	if (r.kind !== 'vocab') return;
	if (expected.separator) expect(r.separator).toBe(expected.separator);
	expect(r.pairs).toEqual(expected.pairs);
}

function expectQuizlet(r: ParseResult, ids: string[]): void {
	expect(r.kind).toBe('quizlet');
	if (r.kind !== 'quizlet') return;
	expect(r.sets.map((s) => s.id)).toEqual(ids);
}

// --------------------------------------------------------------------------
// Empty / whitespace
// --------------------------------------------------------------------------

describe('empty input', () => {
	test('empty string', () => {
		expect(parseInput('').kind).toBe('empty');
	});

	test('whitespace only', () => {
		expect(parseInput('   \n\t  \n').kind).toBe('empty');
	});
});

// --------------------------------------------------------------------------
// Quizlet URLs
// --------------------------------------------------------------------------

describe('quizlet URLs', () => {
	test('canonical URL', () => {
		expectQuizlet(parseInput('https://quizlet.com/123456/spanish-flashcards'), ['123456']);
	});

	test('without scheme', () => {
		expectQuizlet(parseInput('quizlet.com/987654/french'), ['987654']);
	});

	test('with locale path', () => {
		expectQuizlet(parseInput('https://quizlet.com/de/12345/deutsch-set'), ['12345']);
	});

	test('with pt-br locale', () => {
		expectQuizlet(parseInput('https://quizlet.com/pt-br/4444/portuguese'), ['4444']);
	});

	test('m. subdomain', () => {
		expectQuizlet(parseInput('https://m.quizlet.com/55555/mobile'), ['55555']);
	});

	test('www subdomain', () => {
		expectQuizlet(parseInput('https://www.quizlet.com/66666/foo'), ['66666']);
	});

	test('with query string', () => {
		expectQuizlet(
			parseInput('https://quizlet.com/12345/slug?x=1&i=abc&funnelUUID=xyz'),
			['12345']
		);
	});

	test('with study-mode slug', () => {
		expectQuizlet(parseInput('https://quizlet.com/77/foo/flashcards'), ['77']);
	});

	test('embedded in prose', () => {
		expectQuizlet(parseInput('Check out https://quizlet.com/777/bar for Spanish'), ['777']);
	});

	test('markdown link', () => {
		expectQuizlet(parseInput('[Spanish 5](https://quizlet.com/123/foo)'), ['123']);
	});

	test('two URLs concatenated with no separator', () => {
		const r = parseInput(
			'https://quizlet.com/ch/632955457/grundwortschatz-natur-und-umwelt-flash-cards/https://quizlet.com/ch/505602839/lenvironnement-flash-cards/?x=1jqt'
		);
		expectQuizlet(r, ['632955457', '505602839']);
	});

	test('multiple URLs deduped by ID', () => {
		const r = parseInput(`
			https://quizlet.com/100/a
			https://quizlet.com/200/b
			https://quizlet.com/100/different-slug
		`);
		expectQuizlet(r, ['100', '200']);
	});

	test('class URL is NOT a set', () => {
		// quizlet.com/class/123 has 'class' instead of numeric ID
		const r = parseInput('https://quizlet.com/class/abc');
		// Not a Quizlet set URL; also no other vocab signal → unknown
		expect(r.kind).toBe('unknown');
	});
});

// --------------------------------------------------------------------------
// Non-Quizlet URLs
// --------------------------------------------------------------------------

describe('non-Quizlet URLs', () => {
	test('plain non-Quizlet URL', () => {
		const r = parseInput('https://example.com/flashcards');
		expect(r.kind).toBe('unknown');
		if (r.kind === 'unknown') expect(r.reason).toMatch(/Quizlet/);
	});

	test('Quizlet-looking typo', () => {
		const r = parseInput('https://quizle.com/12345/foo');
		expect(r.kind).toBe('unknown');
	});
});

// --------------------------------------------------------------------------
// JSON
// --------------------------------------------------------------------------

describe('JSON', () => {
	test('array of {term, definition}', () => {
		const input = JSON.stringify([
			{ term: 'hola', definition: 'hello' },
			{ term: 'gato', definition: 'cat' }
		]);
		expectVocab(parseInput(input), {
			separator: 'json',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('array of {front, back}', () => {
		const input = JSON.stringify([
			{ front: 'hola', back: 'hello' },
			{ front: 'gato', back: 'cat' }
		]);
		expectVocab(parseInput(input), {
			separator: 'json',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('array of {q, a}', () => {
		const input = JSON.stringify([
			{ q: 'hola', a: 'hello' },
			{ q: 'gato', a: 'cat' }
		]);
		expectVocab(parseInput(input), {
			separator: 'json',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('flat object', () => {
		const input = JSON.stringify({ hola: 'hello', gato: 'cat' });
		expectVocab(parseInput(input), {
			separator: 'json',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('array of tuples', () => {
		const input = JSON.stringify([
			['hola', 'hello'],
			['gato', 'cat']
		]);
		expectVocab(parseInput(input), {
			separator: 'json',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('invalid JSON falls through', () => {
		// Starts with [ but invalid JSON; semicolon delim will also fail here.
		const r = parseInput('[not really json]');
		expect(r.kind).toBe('unknown');
	});
});

// --------------------------------------------------------------------------
// JSONL
// --------------------------------------------------------------------------

describe('JSONL', () => {
	test('object per line', () => {
		const input = '{"term":"hola","definition":"hello"}\n{"term":"gato","definition":"cat"}';
		expectVocab(parseInput(input), {
			separator: 'jsonl',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('tuple per line', () => {
		const input = '["hola","hello"]\n["gato","cat"]';
		expectVocab(parseInput(input), {
			separator: 'jsonl',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('mixed valid/invalid lines bail', () => {
		const input = '{"term":"hola","definition":"hello"}\nnot json';
		const r = parseInput(input);
		// Falls through to smart delim / alternating / unknown
		expect(r.kind === 'vocab' ? r.separator : r.kind).not.toBe('jsonl');
	});
});

// --------------------------------------------------------------------------
// Markdown table
// --------------------------------------------------------------------------

describe('Markdown table', () => {
	test('full table with header and separator row', () => {
		const input = `| Term | Definition |
|------|------------|
| hola | hello      |
| gato | cat        |`;
		expectVocab(parseInput(input), {
			separator: 'markdown-table',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('table with alignment colons', () => {
		const input = `| Term | Definition |
|:-----|:-----------|
| hola | hello      |
| gato | cat        |`;
		expectVocab(parseInput(input), { separator: 'markdown-table', pairs: [
			{ term: 'hola', definition: 'hello' },
			{ term: 'gato', definition: 'cat' }
		] });
	});
});

// --------------------------------------------------------------------------
// TOML
// --------------------------------------------------------------------------

describe('TOML', () => {
	test('flat key = "value"', () => {
		const input = `hola = "hello"\ngato = "cat"`;
		expectVocab(parseInput(input), {
			separator: 'toml',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('skips comments and section headers', () => {
		const input = `# Spanish vocab\n[spanish]\nhola = "hello"\ngato = "cat"`;
		expectVocab(parseInput(input), {
			separator: 'toml',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('quoted keys', () => {
		const input = `"buenos dias" = "good morning"\n"por favor" = "please"`;
		expectVocab(parseInput(input), {
			separator: 'toml',
			pairs: [
				{ term: 'buenos dias', definition: 'good morning' },
				{ term: 'por favor', definition: 'please' }
			]
		});
	});
});

// --------------------------------------------------------------------------
// Quoted CSV
// --------------------------------------------------------------------------

describe('quoted CSV', () => {
	test('handles commas inside quoted values', () => {
		const input = `"hola","hello, hi, hey"\n"gato","cat, feline"`;
		expectVocab(parseInput(input), {
			separator: 'quoted-csv',
			pairs: [
				{ term: 'hola', definition: 'hello, hi, hey' },
				{ term: 'gato', definition: 'cat, feline' }
			]
		});
	});

	test('semicolon-delimited quoted CSV', () => {
		const input = `"hola";"hello"\n"gato";"cat"`;
		expectVocab(parseInput(input), {
			separator: 'quoted-csv',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('tab-delimited quoted CSV', () => {
		const input = `"hola"\t"hello"\n"gato"\t"cat"`;
		expectVocab(parseInput(input), {
			separator: 'quoted-csv',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});
});

// --------------------------------------------------------------------------
// Smart delimiters
// --------------------------------------------------------------------------

describe('smart delimiter scan', () => {
	test('tab-separated', () => {
		expectVocab(parseInput('hola\thello\ngato\tcat'), {
			separator: 'tab',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('semicolon-separated (the regression)', () => {
		expectVocab(parseInput('hello;world\nnew;card'), {
			separator: 'semicolon',
			pairs: [
				{ term: 'hello', definition: 'world' },
				{ term: 'new', definition: 'card' }
			]
		});
	});

	test('pipe-separated', () => {
		expectVocab(parseInput('hola | hello\ngato | cat'), {
			separator: 'pipe',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('thin arrow ->', () => {
		expectVocab(parseInput('hola -> hello\ngato -> cat'), {
			separator: 'arrow-thin',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('fat arrow =>', () => {
		expectVocab(parseInput('hola => hello\ngato => cat'), {
			separator: 'arrow-fat',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('unicode arrow →', () => {
		expectVocab(parseInput('hola → hello\ngato → cat'), {
			separator: 'arrow-unicode',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('em-dash', () => {
		expectVocab(parseInput('hola — hello\ngato — cat'), {
			separator: 'em-dash',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('en-dash', () => {
		expectVocab(parseInput('hola – hello\ngato – cat'), {
			separator: 'en-dash',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('equals', () => {
		expectVocab(parseInput('hola = hello\ngato = cat'), {
			separator: 'equals',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('double-hyphen', () => {
		expectVocab(parseInput('hola -- hello\ngato -- cat'), {
			separator: 'double-hyphen',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('hyphen with required spaces', () => {
		expectVocab(parseInput('hola - hello\ngato - cat'), {
			separator: 'hyphen-spaced',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('hyphen without spaces is NOT a separator', () => {
		// Compound words shouldn't parse as term-def pairs.
		const r = parseInput('well-being\nlong-term');
		expect(r.kind).toBe('unknown');
	});

	test('slash with spaces', () => {
		expectVocab(parseInput('hola / hello\ngato / cat'), {
			separator: 'slash-spaced',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('colon once per line', () => {
		expectVocab(parseInput('hola: hello\ngato: cat'), {
			separator: 'colon',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('colon bails with multiple occurrences per line', () => {
		// Every line has 2 spaced-colons — ambiguous, should NOT pick colon.
		const r = parseInput('key: value: extra\nfoo: bar: baz');
		expect(r.kind === 'vocab' ? r.separator : null).not.toBe('colon');
	});

	test('colon with trailing unspaced colon stays valid', () => {
		// "10:30" has no space after the colon — only the first colon counts as a
		// separator, so the line parses cleanly.
		expectVocab(parseInput('morning: at 10:30\nnoon: at 12:00'), {
			separator: 'colon',
			pairs: [
				{ term: 'morning', definition: 'at 10:30' },
				{ term: 'noon', definition: 'at 12:00' }
			]
		});
	});

	test('comma once per line', () => {
		expectVocab(parseInput('hola,hello\ngato,cat'), {
			separator: 'comma',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('comma bails when content contains commas', () => {
		const r = parseInput('hola, amigo, friend\ngato, cat');
		// Line 1 has 2 commas → comma separator skips it. Only 1 pair from line 2 → fail.
		expect(r.kind).toBe('unknown');
	});

	test('strict 2-word space', () => {
		expectVocab(parseInput('hola hello\ngato cat'), {
			separator: 'space',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('mixed word counts bail space-split', () => {
		const r = parseInput('hola hello\nbuenos dias good morning');
		// Line 2 has 4 tokens; strict-two fails → unknown.
		expect(r.kind).toBe('unknown');
	});

	test('single pair is not enough', () => {
		const r = parseInput('hola - hello');
		expect(r.kind).toBe('unknown');
	});
});

// --------------------------------------------------------------------------
// Prefixes
// --------------------------------------------------------------------------

describe('line prefixes', () => {
	test('numbered 1.', () => {
		expectVocab(parseInput('1. hola - hello\n2. gato - cat'), {
			separator: 'hyphen-spaced',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('numbered 1)', () => {
		expectVocab(parseInput('1) hola: hello\n2) gato: cat'), {
			separator: 'colon',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('markdown bullets -', () => {
		expectVocab(parseInput('- hola | hello\n- gato | cat'), {
			separator: 'pipe',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('asterisk bullets', () => {
		expectVocab(parseInput('* hola = hello\n* gato = cat'), {
			separator: 'equals',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});
});

// --------------------------------------------------------------------------
// Multi-line pair formats
// --------------------------------------------------------------------------

describe('multi-line pairs', () => {
	test('alternating lines', () => {
		expectVocab(parseInput('hola\nhello\ngato\ncat'), {
			separator: 'alternating-lines',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('alternating lines with odd count bails', () => {
		const r = parseInput('hola\nhello\ngato');
		expect(r.kind).toBe('unknown');
	});

	test('blank-line separated 2-line groups', () => {
		expectVocab(parseInput('hola\nhello\n\ngato\ncat\n\nperro\ndog'), {
			separator: 'blank-line-pairs',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' },
				{ term: 'perro', definition: 'dog' }
			]
		});
	});

	test('blank-line groups with extra lines bail', () => {
		const r = parseInput('hola\nhello\nfoo\n\ngato\ncat');
		// First group has 3 lines, not 2 → fails blank-line; falls through.
		expect(r.kind).toBe('unknown');
	});
});

// --------------------------------------------------------------------------
// Single-line hierarchical split — "term<inner>def<outer>term<inner>def…"
// Covers Quizlet custom-export formats, messaging-app-flattened pastes, and
// any hierarchical combo discovered from the text itself.
// --------------------------------------------------------------------------

describe('single-line hierarchical split', () => {
	test('colon + semicolon (simple)', () => {
		expectVocab(parseInput('hola:hello;gato:cat;perro:dog;amigo:friend'), {
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' },
				{ term: 'perro', definition: 'dog' },
				{ term: 'amigo', definition: 'friend' }
			]
		});
	});

	test('colon + semicolon with accents, apostrophes, parens (real user case)', () => {
		const r = parseInput(
			"protéger l'environnement (m):die Umwelt schützen;réduire la pollution:die Verschmutzung reduzieren;polluer l'eau (f):das Wasser verschmutzen"
		);
		expect(r.kind).toBe('vocab');
		if (r.kind === 'vocab') {
			expect(r.pairs).toHaveLength(3);
			expect(r.pairs[0]).toEqual({
				term: "protéger l'environnement (m)",
				definition: 'die Umwelt schützen'
			});
			expect(r.pairs[2]).toEqual({
				term: "polluer l'eau (f)",
				definition: 'das Wasser verschmutzen'
			});
		}
	});

	test('tab + semicolon (Quizlet custom export)', () => {
		expectVocab(parseInput('hola\thello;gato\tcat;perro\tdog'), {
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' },
				{ term: 'perro', definition: 'dog' }
			]
		});
	});

	test('spaced hyphen + semicolon', () => {
		expectVocab(parseInput('hola - hello; gato - cat; perro - dog'), {
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' },
				{ term: 'perro', definition: 'dog' }
			]
		});
	});

	test('equals + pipe', () => {
		expectVocab(parseInput('hola=hello|gato=cat|perro=dog'), {
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' },
				{ term: 'perro', definition: 'dog' }
			]
		});
	});

	test('arrow + semicolon', () => {
		expectVocab(parseInput('hola->hello;gato->cat;perro->dog'), {
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' },
				{ term: 'perro', definition: 'dog' }
			]
		});
	});

	test('exotic separators discovered from text (not hardcoded)', () => {
		expectVocab(parseInput('hola##hello@@gato##cat@@perro##dog'), {
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' },
				{ term: 'perro', definition: 'dog' }
			]
		});
	});

	test('same char used at both levels → unknown (ambiguous)', () => {
		expect(parseInput('term;def;term;def').kind).toBe('unknown');
	});

	test('unbalanced chunks (one missing inner) → unknown', () => {
		const r = parseInput('hola:hello;junk_no_colon;gato:cat');
		expect(r.kind).toBe('unknown');
	});

	test('inner substring of outer does not misfire', () => {
		// Tempting wrong answer: outer=" - ", inner="-" → 3 pairs (hola, world), etc.
		// Correct: outer=" ; ", inner=" - " → 2 pairs with hyphens preserved in term.
		expectVocab(parseInput('hola-world - hello-there ; gato-paw - cat-foot'), {
			pairs: [
				{ term: 'hola-world', definition: 'hello-there' },
				{ term: 'gato-paw', definition: 'cat-foot' }
			]
		});
	});

	test('multi-line semicolon pairs still parse (any path is fine)', () => {
		// Either smart-delim or hierarchy can claim this one; we just need a
		// valid vocab result. Guards against hierarchy breaking existing paths.
		const r = parseInput('hola;hello\ngato;cat\nperro;dog');
		expect(r.kind).toBe('vocab');
		if (r.kind === 'vocab') {
			expect(r.pairs).toEqual([
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' },
				{ term: 'perro', definition: 'dog' }
			]);
		}
	});
});

// --------------------------------------------------------------------------
// Encoding / line-ending edge cases
// --------------------------------------------------------------------------

describe('encoding edge cases', () => {
	test('CRLF line endings', () => {
		expectVocab(parseInput('hola\thello\r\ngato\tcat'), {
			separator: 'tab',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('UTF-8 BOM stripped', () => {
		expectVocab(parseInput('﻿hola\thello\ngato\tcat'), {
			separator: 'tab',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('non-breaking space normalized', () => {
		// NBSP between term and def; becomes regular space → strict-two-word space separator.
		expectVocab(parseInput('hola hello\ngato cat'), {
			separator: 'space',
			pairs: [
				{ term: 'hola', definition: 'hello' },
				{ term: 'gato', definition: 'cat' }
			]
		});
	});

	test('Japanese terms', () => {
		expectVocab(parseInput('こんにちは - hello\nねこ - cat'), {
			separator: 'hyphen-spaced',
			pairs: [
				{ term: 'こんにちは', definition: 'hello' },
				{ term: 'ねこ', definition: 'cat' }
			]
		});
	});

	test('emoji in content', () => {
		expectVocab(parseInput('love ❤️ - amor\nsun ☀️ - sol'), {
			separator: 'hyphen-spaced',
			pairs: [
				{ term: 'love ❤️', definition: 'amor' },
				{ term: 'sun ☀️', definition: 'sol' }
			]
		});
	});
});

// --------------------------------------------------------------------------
// Priority / mixed inputs
// --------------------------------------------------------------------------

describe('priority', () => {
	test('URL + vocab → Quizlet wins', () => {
		const r = parseInput('https://quizlet.com/1/a\nhola - hello');
		expectQuizlet(r, ['1']);
	});

	test('JSON wins over delimiter scan', () => {
		// This JSON contains many colons and quotes; colon delim shouldn't win.
		const r = parseInput('{"a":"b","c":"d"}');
		expect(r.kind).toBe('vocab');
		if (r.kind === 'vocab') expect(r.separator).toBe('json');
	});

	test('tab beats colon when both are present per line', () => {
		expectVocab(parseInput('foo:bar\thello\nbaz:qux\tworld'), {
			separator: 'tab',
			pairs: [
				{ term: 'foo:bar', definition: 'hello' },
				{ term: 'baz:qux', definition: 'world' }
			]
		});
	});
});

// --------------------------------------------------------------------------
// Unknown
// --------------------------------------------------------------------------

describe('unknown', () => {
	test('single word', () => {
		expect(parseInput('hola').kind).toBe('unknown');
	});

	test('prose paragraph', () => {
		const r = parseInput(
			'Quizlet is a flashcard application for learning vocabulary and concepts.'
		);
		expect(r.kind).toBe('unknown');
	});
});
