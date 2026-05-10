import { describe, expect, test } from "bun:test";
import { parseInput, type ParseResult } from "./parse";

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function expectVocab(
  r: ParseResult,
  expected: { separator?: string; pairs: { term: string; definition: string }[] },
): void {
  expect(r.kind).toBe("vocab");
  if (r.kind !== "vocab") return;
  if (expected.separator) expect(r.separator).toBe(expected.separator);
  expect(r.pairs).toEqual(expected.pairs);
}

function expectQuizlet(r: ParseResult, ids: string[]): void {
  expect(r.kind).toBe("quizlet");
  if (r.kind !== "quizlet") return;
  expect(r.sets.map((s) => s.id)).toEqual(ids);
}

// --------------------------------------------------------------------------
// Empty / whitespace
// --------------------------------------------------------------------------

describe("empty input", () => {
  test("empty string", () => {
    expect(parseInput("").kind).toBe("empty");
  });

  test("whitespace only", () => {
    expect(parseInput("   \n\t  \n").kind).toBe("empty");
  });
});

// --------------------------------------------------------------------------
// Quizlet URLs
// --------------------------------------------------------------------------

describe("quizlet URLs", () => {
  test("canonical URL", () => {
    expectQuizlet(parseInput("https://quizlet.com/123456/spanish-flashcards"), ["123456"]);
  });

  test("without scheme", () => {
    expectQuizlet(parseInput("quizlet.com/987654/french"), ["987654"]);
  });

  test("with locale path", () => {
    expectQuizlet(parseInput("https://quizlet.com/de/12345/deutsch-set"), ["12345"]);
  });

  test("with pt-br locale", () => {
    expectQuizlet(parseInput("https://quizlet.com/pt-br/4444/portuguese"), ["4444"]);
  });

  test("m. subdomain", () => {
    expectQuizlet(parseInput("https://m.quizlet.com/55555/mobile"), ["55555"]);
  });

  test("www subdomain", () => {
    expectQuizlet(parseInput("https://www.quizlet.com/66666/foo"), ["66666"]);
  });

  test("with query string", () => {
    expectQuizlet(parseInput("https://quizlet.com/12345/slug?x=1&i=abc&funnelUUID=xyz"), ["12345"]);
  });

  test("with study-mode slug", () => {
    expectQuizlet(parseInput("https://quizlet.com/77/foo/flashcards"), ["77"]);
  });

  test("embedded in prose", () => {
    expectQuizlet(parseInput("Check out https://quizlet.com/777/bar for Spanish"), ["777"]);
  });

  test("markdown link", () => {
    expectQuizlet(parseInput("[Spanish 5](https://quizlet.com/123/foo)"), ["123"]);
  });

  test("two URLs concatenated with no separator", () => {
    const r = parseInput(
      "https://quizlet.com/ch/632955457/grundwortschatz-natur-und-umwelt-flash-cards/https://quizlet.com/ch/505602839/lenvironnement-flash-cards/?x=1jqt",
    );
    expectQuizlet(r, ["632955457", "505602839"]);
  });

  test("multiple URLs deduped by ID", () => {
    const r = parseInput(`
			https://quizlet.com/100/a
			https://quizlet.com/200/b
			https://quizlet.com/100/different-slug
		`);
    expectQuizlet(r, ["100", "200"]);
  });

  test("class URL is NOT a set", () => {
    // quizlet.com/class/123 has 'class' instead of numeric ID
    const r = parseInput("https://quizlet.com/class/abc");
    // Not a Quizlet set URL; also no other vocab signal → unknown
    expect(r.kind).toBe("unknown");
  });
});

// --------------------------------------------------------------------------
// Non-Quizlet URLs
// --------------------------------------------------------------------------

describe("non-Quizlet URLs", () => {
  test("plain non-Quizlet URL", () => {
    const r = parseInput("https://example.com/flashcards");
    expect(r.kind).toBe("unknown");
    if (r.kind === "unknown") expect(r.reason).toMatch(/Quizlet/);
  });

  test("Quizlet-looking typo", () => {
    const r = parseInput("https://quizle.com/12345/foo");
    expect(r.kind).toBe("unknown");
  });
});

// --------------------------------------------------------------------------
// JSON
// --------------------------------------------------------------------------

describe("JSON", () => {
  test("array of {term, definition}", () => {
    const input = JSON.stringify([
      { term: "hola", definition: "hello" },
      { term: "gato", definition: "cat" },
    ]);
    expectVocab(parseInput(input), {
      separator: "json",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("array of {front, back}", () => {
    const input = JSON.stringify([
      { front: "hola", back: "hello" },
      { front: "gato", back: "cat" },
    ]);
    expectVocab(parseInput(input), {
      separator: "json",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("array of {q, a}", () => {
    const input = JSON.stringify([
      { q: "hola", a: "hello" },
      { q: "gato", a: "cat" },
    ]);
    expectVocab(parseInput(input), {
      separator: "json",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("flat object", () => {
    const input = JSON.stringify({ hola: "hello", gato: "cat" });
    expectVocab(parseInput(input), {
      separator: "json",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("array of tuples", () => {
    const input = JSON.stringify([
      ["hola", "hello"],
      ["gato", "cat"],
    ]);
    expectVocab(parseInput(input), {
      separator: "json",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("invalid JSON falls through", () => {
    // Starts with [ but invalid JSON; semicolon delim will also fail here.
    const r = parseInput("[not really json]");
    expect(r.kind).toBe("unknown");
  });
});

// --------------------------------------------------------------------------
// JSONL
// --------------------------------------------------------------------------

describe("JSONL", () => {
  test("object per line", () => {
    const input = '{"term":"hola","definition":"hello"}\n{"term":"gato","definition":"cat"}';
    expectVocab(parseInput(input), {
      separator: "jsonl",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("tuple per line", () => {
    const input = '["hola","hello"]\n["gato","cat"]';
    expectVocab(parseInput(input), {
      separator: "jsonl",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("mixed valid/invalid lines bail", () => {
    const input = '{"term":"hola","definition":"hello"}\nnot json';
    const r = parseInput(input);
    // Falls through to smart delim / alternating / unknown
    expect(r.kind === "vocab" ? r.separator : r.kind).not.toBe("jsonl");
  });
});

// --------------------------------------------------------------------------
// Markdown table
// --------------------------------------------------------------------------

describe("Markdown table", () => {
  test("full table with header and separator row", () => {
    const input = `| Term | Definition |
|------|------------|
| hola | hello      |
| gato | cat        |`;
    expectVocab(parseInput(input), {
      separator: "markdown-table",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("table with alignment colons", () => {
    const input = `| Term | Definition |
|:-----|:-----------|
| hola | hello      |
| gato | cat        |`;
    expectVocab(parseInput(input), {
      separator: "markdown-table",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });
});

// --------------------------------------------------------------------------
// TOML
// --------------------------------------------------------------------------

describe("TOML", () => {
  test('flat key = "value"', () => {
    const input = `hola = "hello"\ngato = "cat"`;
    expectVocab(parseInput(input), {
      separator: "toml",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("skips comments and section headers", () => {
    const input = `# Spanish vocab\n[spanish]\nhola = "hello"\ngato = "cat"`;
    expectVocab(parseInput(input), {
      separator: "toml",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("quoted keys", () => {
    const input = `"buenos dias" = "good morning"\n"por favor" = "please"`;
    expectVocab(parseInput(input), {
      separator: "toml",
      pairs: [
        { term: "buenos dias", definition: "good morning" },
        { term: "por favor", definition: "please" },
      ],
    });
  });
});

// --------------------------------------------------------------------------
// Quoted CSV
// --------------------------------------------------------------------------

describe("quoted CSV", () => {
  test("handles commas inside quoted values", () => {
    const input = `"hola","hello, hi, hey"\n"gato","cat, feline"`;
    expectVocab(parseInput(input), {
      separator: "quoted-csv",
      pairs: [
        { term: "hola", definition: "hello, hi, hey" },
        { term: "gato", definition: "cat, feline" },
      ],
    });
  });

  test("semicolon-delimited quoted CSV", () => {
    const input = `"hola";"hello"\n"gato";"cat"`;
    expectVocab(parseInput(input), {
      separator: "quoted-csv",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("tab-delimited quoted CSV", () => {
    const input = `"hola"\t"hello"\n"gato"\t"cat"`;
    expectVocab(parseInput(input), {
      separator: "quoted-csv",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });
});

// --------------------------------------------------------------------------
// Smart delimiters
// --------------------------------------------------------------------------

describe("smart delimiter scan", () => {
  test("tab-separated", () => {
    expectVocab(parseInput("hola\thello\ngato\tcat"), {
      separator: "tab",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("semicolon-separated (the regression)", () => {
    expectVocab(parseInput("hello;world\nnew;card"), {
      separator: "semicolon",
      pairs: [
        { term: "hello", definition: "world" },
        { term: "new", definition: "card" },
      ],
    });
  });

  test("pipe-separated", () => {
    expectVocab(parseInput("hola | hello\ngato | cat"), {
      separator: "pipe",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("thin arrow ->", () => {
    expectVocab(parseInput("hola -> hello\ngato -> cat"), {
      separator: "arrow-thin",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("fat arrow =>", () => {
    expectVocab(parseInput("hola => hello\ngato => cat"), {
      separator: "arrow-fat",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("unicode arrow →", () => {
    expectVocab(parseInput("hola → hello\ngato → cat"), {
      separator: "arrow-unicode",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("em-dash", () => {
    expectVocab(parseInput("hola — hello\ngato — cat"), {
      separator: "em-dash",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("en-dash", () => {
    expectVocab(parseInput("hola – hello\ngato – cat"), {
      separator: "en-dash",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("equals", () => {
    expectVocab(parseInput("hola = hello\ngato = cat"), {
      separator: "equals",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("double-hyphen", () => {
    expectVocab(parseInput("hola -- hello\ngato -- cat"), {
      separator: "double-hyphen",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("hyphen with required spaces", () => {
    expectVocab(parseInput("hola - hello\ngato - cat"), {
      separator: "hyphen-spaced",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("hyphen without spaces is NOT a separator", () => {
    // Compound words shouldn't parse as term-def pairs.
    const r = parseInput("well-being\nlong-term");
    expect(r.kind).toBe("unknown");
  });

  test("slash with spaces", () => {
    expectVocab(parseInput("hola / hello\ngato / cat"), {
      separator: "slash-spaced",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("colon once per line", () => {
    expectVocab(parseInput("hola: hello\ngato: cat"), {
      separator: "colon",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("colon bails with multiple occurrences per line", () => {
    // Every line has 2 spaced-colons — ambiguous, should NOT pick colon.
    const r = parseInput("key: value: extra\nfoo: bar: baz");
    expect(r.kind === "vocab" ? r.separator : null).not.toBe("colon");
  });

  test("colon with trailing unspaced colon stays valid", () => {
    // "10:30" has no space after the colon — only the first colon counts as a
    // separator, so the line parses cleanly.
    expectVocab(parseInput("morning: at 10:30\nnoon: at 12:00"), {
      separator: "colon",
      pairs: [
        { term: "morning", definition: "at 10:30" },
        { term: "noon", definition: "at 12:00" },
      ],
    });
  });

  test("comma once per line", () => {
    expectVocab(parseInput("hola,hello\ngato,cat"), {
      separator: "comma",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("comma bails when content contains commas", () => {
    const r = parseInput("hola, amigo, friend\ngato, cat");
    // Line 1 has 2 commas → comma separator skips it. Only 1 pair from line 2 → fail.
    expect(r.kind).toBe("unknown");
  });

  test("strict 2-word space", () => {
    expectVocab(parseInput("hola hello\ngato cat"), {
      separator: "space",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("mixed word counts bail space-split", () => {
    const r = parseInput("hola hello\nbuenos dias good morning");
    // Line 2 has 4 tokens; strict-two fails → unknown.
    expect(r.kind).toBe("unknown");
  });

  test("single pair is not enough", () => {
    const r = parseInput("hola - hello");
    expect(r.kind).toBe("unknown");
  });
});

// --------------------------------------------------------------------------
// Prefixes
// --------------------------------------------------------------------------

describe("line prefixes", () => {
  test("numbered 1.", () => {
    expectVocab(parseInput("1. hola - hello\n2. gato - cat"), {
      separator: "hyphen-spaced",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("numbered 1)", () => {
    expectVocab(parseInput("1) hola: hello\n2) gato: cat"), {
      separator: "colon",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("markdown bullets -", () => {
    expectVocab(parseInput("- hola | hello\n- gato | cat"), {
      separator: "pipe",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("asterisk bullets", () => {
    expectVocab(parseInput("* hola = hello\n* gato = cat"), {
      separator: "equals",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });
});

// --------------------------------------------------------------------------
// Multi-line pair formats
// --------------------------------------------------------------------------

describe("multi-line pairs", () => {
  test("alternating lines", () => {
    expectVocab(parseInput("hola\nhello\ngato\ncat"), {
      separator: "alternating-lines",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("alternating lines with odd count bails", () => {
    const r = parseInput("hola\nhello\ngato");
    expect(r.kind).toBe("unknown");
  });

  test("blank-line separated 2-line groups", () => {
    expectVocab(parseInput("hola\nhello\n\ngato\ncat\n\nperro\ndog"), {
      separator: "blank-line-pairs",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
        { term: "perro", definition: "dog" },
      ],
    });
  });

  test("blank-line groups with extra lines bail", () => {
    const r = parseInput("hola\nhello\nfoo\n\ngato\ncat");
    // First group has 3 lines, not 2 → fails blank-line; falls through.
    expect(r.kind).toBe("unknown");
  });
});

// --------------------------------------------------------------------------
// Single-line hierarchical split — "term<inner>def<outer>term<inner>def…"
// Covers Quizlet custom-export formats, messaging-app-flattened pastes, and
// any hierarchical combo discovered from the text itself.
// --------------------------------------------------------------------------

describe("single-line hierarchical split", () => {
  test("colon + semicolon (simple)", () => {
    expectVocab(parseInput("hola:hello;gato:cat;perro:dog;amigo:friend"), {
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
        { term: "perro", definition: "dog" },
        { term: "amigo", definition: "friend" },
      ],
    });
  });

  test("colon + semicolon with accents, apostrophes, parens (real user case)", () => {
    const r = parseInput(
      "protéger l'environnement (m):die Umwelt schützen;réduire la pollution:die Verschmutzung reduzieren;polluer l'eau (f):das Wasser verschmutzen",
    );
    expect(r.kind).toBe("vocab");
    if (r.kind === "vocab") {
      expect(r.pairs).toHaveLength(3);
      expect(r.pairs[0]).toEqual({
        term: "protéger l'environnement (m)",
        definition: "die Umwelt schützen",
      });
      expect(r.pairs[2]).toEqual({
        term: "polluer l'eau (f)",
        definition: "das Wasser verschmutzen",
      });
    }
  });

  test("tab + semicolon (Quizlet custom export)", () => {
    expectVocab(parseInput("hola\thello;gato\tcat;perro\tdog"), {
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
        { term: "perro", definition: "dog" },
      ],
    });
  });

  test("spaced hyphen + semicolon", () => {
    expectVocab(parseInput("hola - hello; gato - cat; perro - dog"), {
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
        { term: "perro", definition: "dog" },
      ],
    });
  });

  test("equals + pipe", () => {
    expectVocab(parseInput("hola=hello|gato=cat|perro=dog"), {
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
        { term: "perro", definition: "dog" },
      ],
    });
  });

  test("arrow + semicolon", () => {
    expectVocab(parseInput("hola->hello;gato->cat;perro->dog"), {
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
        { term: "perro", definition: "dog" },
      ],
    });
  });

  test("exotic separators discovered from text (not hardcoded)", () => {
    expectVocab(parseInput("hola##hello@@gato##cat@@perro##dog"), {
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
        { term: "perro", definition: "dog" },
      ],
    });
  });

  test("same char used at both levels → unknown (ambiguous)", () => {
    expect(parseInput("term;def;term;def").kind).toBe("unknown");
  });

  test("unbalanced chunks (one missing inner) → unknown", () => {
    const r = parseInput("hola:hello;junk_no_colon;gato:cat");
    expect(r.kind).toBe("unknown");
  });

  test("inner substring of outer does not misfire", () => {
    // Tempting wrong answer: outer=" - ", inner="-" → 3 pairs (hola, world), etc.
    // Correct: outer=" ; ", inner=" - " → 2 pairs with hyphens preserved in term.
    expectVocab(parseInput("hola-world - hello-there ; gato-paw - cat-foot"), {
      pairs: [
        { term: "hola-world", definition: "hello-there" },
        { term: "gato-paw", definition: "cat-foot" },
      ],
    });
  });

  test("multi-line semicolon pairs still parse (any path is fine)", () => {
    // Either smart-delim or hierarchy can claim this one; we just need a
    // valid vocab result. Guards against hierarchy breaking existing paths.
    const r = parseInput("hola;hello\ngato;cat\nperro;dog");
    expect(r.kind).toBe("vocab");
    if (r.kind === "vocab") {
      expect(r.pairs).toEqual([
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
        { term: "perro", definition: "dog" },
      ]);
    }
  });
});

// --------------------------------------------------------------------------
// Encoding / line-ending edge cases
// --------------------------------------------------------------------------

describe("encoding edge cases", () => {
  test("CRLF line endings", () => {
    expectVocab(parseInput("hola\thello\r\ngato\tcat"), {
      separator: "tab",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("UTF-8 BOM stripped", () => {
    expectVocab(parseInput("﻿hola\thello\ngato\tcat"), {
      separator: "tab",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("non-breaking space normalized", () => {
    // NBSP between term and def; becomes regular space → strict-two-word space separator.
    expectVocab(parseInput("hola hello\ngato cat"), {
      separator: "space",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("Japanese terms", () => {
    expectVocab(parseInput("こんにちは - hello\nねこ - cat"), {
      separator: "hyphen-spaced",
      pairs: [
        { term: "こんにちは", definition: "hello" },
        { term: "ねこ", definition: "cat" },
      ],
    });
  });

  test("emoji in content", () => {
    expectVocab(parseInput("love ❤️ - amor\nsun ☀️ - sol"), {
      separator: "hyphen-spaced",
      pairs: [
        { term: "love ❤️", definition: "amor" },
        { term: "sun ☀️", definition: "sol" },
      ],
    });
  });
});

// --------------------------------------------------------------------------
// Priority / mixed inputs
// --------------------------------------------------------------------------

describe("priority", () => {
  test("URL + vocab → Quizlet wins", () => {
    const r = parseInput("https://quizlet.com/1/a\nhola - hello");
    expectQuizlet(r, ["1"]);
  });

  test("JSON wins over delimiter scan", () => {
    // This JSON contains many colons and quotes; colon delim shouldn't win.
    const r = parseInput('{"a":"b","c":"d"}');
    expect(r.kind).toBe("vocab");
    if (r.kind === "vocab") expect(r.separator).toBe("json");
  });

  test("tab beats colon when both are present per line", () => {
    expectVocab(parseInput("foo:bar\thello\nbaz:qux\tworld"), {
      separator: "tab",
      pairs: [
        { term: "foo:bar", definition: "hello" },
        { term: "baz:qux", definition: "world" },
      ],
    });
  });
});

// --------------------------------------------------------------------------
// Header row detection
// --------------------------------------------------------------------------

describe("header row detection", () => {
  // Positive cases: row 1 is a header, should be skipped.

  test("CSV with term,definition header", () => {
    const input = `term,definition\nhola,hello\ngato,cat`;
    expectVocab(parseInput(input), {
      separator: "comma",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("CSV header is case-insensitive", () => {
    const input = `Term,Definition\nhola,hello\ngato,cat`;
    expectVocab(parseInput(input), {
      separator: "comma",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("CSV with front,back header", () => {
    const input = `front,back\nhola,hello\ngato,cat`;
    expectVocab(parseInput(input), {
      separator: "comma",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("CSV with question,answer header", () => {
    const input = `question,answer\nhola,hello\ngato,cat`;
    expectVocab(parseInput(input), {
      separator: "comma",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("CSV with multi-word header (english term, spanish def)", () => {
    const input = `english term,spanish def\nhola,hello\ngato,cat`;
    expectVocab(parseInput(input), {
      separator: "comma",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("CSV with language-name header (Spanish word, English meaning)", () => {
    const input = `Spanish word,English meaning\nhola,hello\ngato,cat`;
    expectVocab(parseInput(input), {
      separator: "comma",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("CSV with parenthesized header (French (term), English (translation))", () => {
    const input = `French (term),English (translation)\nhola,hello\ngato,cat`;
    expectVocab(parseInput(input), {
      separator: "comma",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("tab-separated with header", () => {
    const input = `term\tdefinition\nhola\thello\ngato\tcat`;
    expectVocab(parseInput(input), {
      separator: "tab",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("pipe-separated with header", () => {
    const input = `term | definition\nhola | hello\ngato | cat`;
    expectVocab(parseInput(input), {
      separator: "pipe",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("quoted CSV with header", () => {
    const input = `"term","definition"\n"hola","hello"\n"gato","cat"`;
    expectVocab(parseInput(input), {
      separator: "quoted-csv",
      pairs: [
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("the /tool page CSV demo", () => {
    const input = `term,definition
Photosynthesis,Plants convert sunlight into chemical energy
Mitosis,Cell division producing two identical daughter cells
Osmosis,Water diffusing across a semipermeable membrane
Cytoplasm,Gel-like substance filling a cell`;
    expectVocab(parseInput(input), {
      separator: "comma",
      pairs: [
        { term: "Photosynthesis", definition: "Plants convert sunlight into chemical energy" },
        { term: "Mitosis", definition: "Cell division producing two identical daughter cells" },
        { term: "Osmosis", definition: "Water diffusing across a semipermeable membrane" },
        { term: "Cytoplasm", definition: "Gel-like substance filling a cell" },
      ],
    });
  });

  // Negative cases: row 1 is real data, must NOT be skipped.

  test("only one cell is a header word, not skipped", () => {
    // term-side cell is "term" (header), but def-side "Mitosis" is not.
    // This is real data: a flashcard whose term happens to be the word "term".
    const input = `term,Mitosis\nhola,hello\ngato,cat`;
    expectVocab(parseInput(input), {
      separator: "comma",
      pairs: [
        { term: "term", definition: "Mitosis" },
        { term: "hola", definition: "hello" },
        { term: "gato", definition: "cat" },
      ],
    });
  });

  test("multi-word cells with non-header tokens, not skipped (front door, back door)", () => {
    // Both cells contain a header word (front, back) but also "door"
    // which is neither header nor connective. Real vocab pair.
    const input = `front door,back door\nfoo,bar\nbaz,qux`;
    expectVocab(parseInput(input), {
      separator: "comma",
      pairs: [
        { term: "front door", definition: "back door" },
        { term: "foo", definition: "bar" },
        { term: "baz", definition: "qux" },
      ],
    });
  });

  test("multi-word cells with non-header tokens, not skipped (term limit, definition section)", () => {
    const input = `term limit,definition section\nfoo,bar\nbaz,qux`;
    expectVocab(parseInput(input), {
      separator: "comma",
      pairs: [
        { term: "term limit", definition: "definition section" },
        { term: "foo", definition: "bar" },
        { term: "baz", definition: "qux" },
      ],
    });
  });

  test("plain real-word pair, not skipped", () => {
    const input = `apple,red\nbanana,yellow\ngrape,purple`;
    expectVocab(parseInput(input), {
      separator: "comma",
      pairs: [
        { term: "apple", definition: "red" },
        { term: "banana", definition: "yellow" },
        { term: "grape", definition: "purple" },
      ],
    });
  });

  // Edge: refuse to skip if it would leave < 2 pairs.

  test("refuses to skip if only 1 data row would remain", () => {
    // Two rows total, row 1 looks like a header. Don't skip; that would
    // leave only 1 pair, which is below the parser's threshold and
    // suggests the user actually meant `term`/`definition` as data.
    const input = `term,definition\nhola,hello`;
    const r = parseInput(input);
    expect(r.kind).toBe("vocab");
    if (r.kind !== "vocab") return;
    expect(r.pairs).toEqual([
      { term: "term", definition: "definition" },
      { term: "hola", definition: "hello" },
    ]);
  });
});

// --------------------------------------------------------------------------
// /csv-to-anki landing page claim verification
// --------------------------------------------------------------------------

describe("/csv-to-anki snag claims", () => {
  // Snag 01 (encoding): pasted text arrives already decoded, so non-ASCII
  // characters survive into the parsed pairs verbatim. No encoding step
  // means no mojibake.
  test("non-ASCII / accented characters round-trip cleanly", () => {
    const input = `café,coffee shop\npiña,pineapple\nMüller,family name\n友達,friend`;
    expectVocab(parseInput(input), {
      separator: "comma",
      pairs: [
        { term: "café", definition: "coffee shop" },
        { term: "piña", definition: "pineapple" },
        { term: "Müller", definition: "family name" },
        { term: "友達", definition: "friend" },
      ],
    });
  });

  // Snag 02 (short rows): a row with a stray separator and a missing
  // second field gets skipped, not padded with empty. Anki's importer
  // would silently produce a half-blank card; ours drops it.
  test("short row with empty second field is dropped, not padded", () => {
    const input = `café,coffee shop\npiña,\nmanzana,apple`;
    const r = parseInput(input);
    expect(r.kind).toBe("vocab");
    if (r.kind !== "vocab") return;
    expect(r.pairs).toEqual([
      { term: "café", definition: "coffee shop" },
      { term: "manzana", definition: "apple" },
    ]);
    expect(r.pairs.find((p) => p.term === "piña")).toBeUndefined();
  });

  test("row with only a term and no separator is dropped", () => {
    const input = `café,coffee shop\npiña\nmanzana,apple`;
    const r = parseInput(input);
    expect(r.kind).toBe("vocab");
    if (r.kind !== "vocab") return;
    // The lone "piña" line has no comma, doesn't match the comma
    // delimiter, gets ignored by the comma path.
    expect(r.pairs.find((p) => p.term === "piña")).toBeUndefined();
    expect(r.pairs).toEqual([
      { term: "café", definition: "coffee shop" },
      { term: "manzana", definition: "apple" },
    ]);
  });
});

// --------------------------------------------------------------------------
// Surrounding-quote stripping
// --------------------------------------------------------------------------

// Per-side, all-or-nothing rule: strip surrounding quotes from a cell side
// (term or definition) iff EVERY pair on that side has matching surrounding
// quotes and stripping won't produce an empty cell. Each side is checked
// independently, so "café = "coffee shop"" (bare terms, quoted defs) gets
// the def quotes stripped while terms stay intact.

describe("surrounding quote stripping", () => {
  // Positive cases: side(s) are uniformly quoted, strip applies.

  test("def-side quoted, terms bare (the /csv-to-anki Key=value tile)", () => {
    const input = `café = "coffee shop"\npiña = "pineapple"\nmanzana = "apple"\nagua = "water"`;
    const r = parseInput(input);
    expect(r.kind).toBe("vocab");
    if (r.kind !== "vocab") return;
    expect(r.pairs).toEqual([
      { term: "café", definition: "coffee shop" },
      { term: "piña", definition: "pineapple" },
      { term: "manzana", definition: "apple" },
      { term: "agua", definition: "water" },
    ]);
  });

  test("both sides uniformly quoted", () => {
    const input = `"café" - "coffee shop"\n"piña" - "pineapple"\n"manzana" - "apple"`;
    const r = parseInput(input);
    expect(r.kind).toBe("vocab");
    if (r.kind !== "vocab") return;
    expect(r.pairs).toEqual([
      { term: "café", definition: "coffee shop" },
      { term: "piña", definition: "pineapple" },
      { term: "manzana", definition: "apple" },
    ]);
  });

  test("single quotes work the same", () => {
    const input = `'café' - 'coffee shop'\n'piña' - 'pineapple'\n'manzana' - 'apple'`;
    const r = parseInput(input);
    expect(r.kind).toBe("vocab");
    if (r.kind !== "vocab") return;
    expect(r.pairs).toEqual([
      { term: "café", definition: "coffee shop" },
      { term: "piña", definition: "pineapple" },
      { term: "manzana", definition: "apple" },
    ]);
  });

  test("curly double quotes", () => {
    const input = `“café” - “coffee shop”\n“piña” - “pineapple”\n“manzana” - “apple”`;
    const r = parseInput(input);
    expect(r.kind).toBe("vocab");
    if (r.kind !== "vocab") return;
    expect(r.pairs).toEqual([
      { term: "café", definition: "coffee shop" },
      { term: "piña", definition: "pineapple" },
      { term: "manzana", definition: "apple" },
    ]);
  });

  test("curly single quotes", () => {
    const input = `‘café’ - ‘coffee shop’\n‘piña’ - ‘pineapple’\n‘manzana’ - ‘apple’`;
    const r = parseInput(input);
    expect(r.kind).toBe("vocab");
    if (r.kind !== "vocab") return;
    expect(r.pairs).toEqual([
      { term: "café", definition: "coffee shop" },
      { term: "piña", definition: "pineapple" },
      { term: "manzana", definition: "apple" },
    ]);
  });

  test("apostrophe inside content survives the strip", () => {
    const input = `"it's a test" - "foo bar"\n"another one" - "baz qux"\n"third pair" - "quux"`;
    const r = parseInput(input);
    expect(r.kind).toBe("vocab");
    if (r.kind !== "vocab") return;
    expect(r.pairs).toEqual([
      { term: "it's a test", definition: "foo bar" },
      { term: "another one", definition: "baz qux" },
      { term: "third pair", definition: "quux" },
    ]);
  });

  // Negative cases: leave quotes alone.

  test("only some defs quoted, leave all unstripped", () => {
    // Two pairs have quoted defs, one doesn't. Inconsistent: don't strip.
    const input = `café - "coffee shop"\npiña - pineapple\nmanzana - "apple"`;
    const r = parseInput(input);
    expect(r.kind).toBe("vocab");
    if (r.kind !== "vocab") return;
    expect(r.pairs).toEqual([
      { term: "café", definition: '"coffee shop"' },
      { term: "piña", definition: "pineapple" },
      { term: "manzana", definition: '"apple"' },
    ]);
  });

  test("mismatched open/close on one pair, don't strip", () => {
    // First def starts with " but ends with ' (mismatched). Per-side
    // strip aborts because that pair fails the matching-pair check.
    const input = `café - "coffee shop'\npiña - "pineapple"\nmanzana - "apple"`;
    const r = parseInput(input);
    expect(r.kind).toBe("vocab");
    if (r.kind !== "vocab") return;
    expect(r.pairs[0].definition).toBe(`"coffee shop'`);
    expect(r.pairs[1].definition).toBe(`"pineapple"`);
  });

  test("stripping would produce empty cell, abort side strip", () => {
    // First def is just `""` — strip would leave empty. Whole def-side
    // strip aborts; quotes stay on every def including the others.
    const input = `café - ""\npiña - "pineapple"\nmanzana - "apple"`;
    const r = parseInput(input);
    expect(r.kind).toBe("vocab");
    if (r.kind !== "vocab") return;
    expect(r.pairs[0].definition).toBe(`""`);
    expect(r.pairs[1].definition).toBe(`"pineapple"`);
    expect(r.pairs[2].definition).toBe(`"apple"`);
  });

  test("term-side and def-side strip independently", () => {
    // Terms all single-quoted, defs all double-quoted. Each side strips
    // its own consistent quote style independently.
    const input = `'café' - "coffee shop"\n'piña' - "pineapple"\n'manzana' - "apple"`;
    const r = parseInput(input);
    expect(r.kind).toBe("vocab");
    if (r.kind !== "vocab") return;
    expect(r.pairs).toEqual([
      { term: "café", definition: "coffee shop" },
      { term: "piña", definition: "pineapple" },
      { term: "manzana", definition: "apple" },
    ]);
  });

  // Regression: existing TOML format already strips quotes inside its
  // own parser. Make sure the new helper doesn't double-strip or break
  // that path.
  test("regression: tryToml continues to work with bare keys + quoted values", () => {
    const input = `hola = "hello"\ngato = "cat"\nperro = "dog"`;
    const r = parseInput(input);
    expect(r.kind).toBe("vocab");
    if (r.kind !== "vocab") return;
    expect(r.separator).toBe("toml");
    expect(r.pairs).toEqual([
      { term: "hola", definition: "hello" },
      { term: "gato", definition: "cat" },
      { term: "perro", definition: "dog" },
    ]);
  });
});

// --------------------------------------------------------------------------
// Real AI model output (CSV with header)
// --------------------------------------------------------------------------

// These are verbatim outputs collected from ChatGPT, Claude (Haiku 4.5),
// and DeepSeek (v3.2) when given the canonical "output a CSV codeblock
// with two columns: term, definition" prompt. The /chatgpt-flashcards-
// to-anki page promises these will parse cleanly; these tests are the
// receipts.

describe("real AI model CSV output", () => {
  test("ChatGPT default: every cell wrapped in straight double quotes", () => {
    const input = `term,definition
"Nucleus","Organelle that contains DNA and controls cell activities"
"Mitochondria","Organelles that produce ATP through cellular respiration"
"Ribosome","Structure responsible for protein synthesis"
"Cell Membrane","Selective barrier that regulates movement of substances into and out of the cell"
"Endoplasmic Reticulum","Network of membranes involved in protein and lipid synthesis"
"Lysosome","Organelle containing enzymes that digest waste materials and cellular debris"`;
    const r = parseInput(input);
    expect(r.kind).toBe("vocab");
    if (r.kind !== "vocab") return;
    expect(r.pairs).toEqual([
      { term: "Nucleus", definition: "Organelle that contains DNA and controls cell activities" },
      {
        term: "Mitochondria",
        definition: "Organelles that produce ATP through cellular respiration",
      },
      { term: "Ribosome", definition: "Structure responsible for protein synthesis" },
      {
        term: "Cell Membrane",
        definition:
          "Selective barrier that regulates movement of substances into and out of the cell",
      },
      {
        term: "Endoplasmic Reticulum",
        definition: "Network of membranes involved in protein and lipid synthesis",
      },
      {
        term: "Lysosome",
        definition: "Organelle containing enzymes that digest waste materials and cellular debris",
      },
    ]);
  });

  test("Claude (Haiku): mixed quoting, multi-comma unquoted defs", () => {
    // Some rows bare, some quoted, some defs contain semicolons or commas.
    // The Golgi row has 4 unquoted commas — must split on the first one.
    // The Endoplasmic row is the only fully-quoted one — quotes must be
    // stripped per cell, not silently kept as literal characters.
    const input = `term,definition
Mitochondria,Organelle responsible for producing ATP through cellular respiration; often called the powerhouse of the cell
Ribosome,Non-membrane-bound organelle that synthesizes proteins by translating mRNA sequences into amino acid chains
"Endoplasmic Reticulum (Rough)","Network of membrane-bound sacs studded with ribosomes; synthesizes and transports proteins"
Golgi Apparatus,"Organelle that modifies, packages, and ships proteins and lipids in vesicles to their final destinations"
Lysosome,Membrane-bound vesicle containing digestive enzymes that break down cellular waste and foreign materials
Nucleolus,Dense region within the nucleus where ribosomal RNA is synthesized and assembled into ribosomal subunits`;
    const r = parseInput(input);
    expect(r.kind).toBe("vocab");
    if (r.kind !== "vocab") return;
    expect(r.pairs).toHaveLength(6);
    expect(r.pairs[0].term).toBe("Mitochondria");
    expect(r.pairs[2].term).toBe("Endoplasmic Reticulum (Rough)");
    expect(r.pairs[2].definition).toContain(
      "Network of membrane-bound sacs studded with ribosomes",
    );
    // No literal " characters survived.
    expect(r.pairs[2].term.includes('"')).toBe(false);
    expect(r.pairs[2].definition.includes('"')).toBe(false);
    expect(r.pairs[3].term).toBe("Golgi Apparatus");
    expect(r.pairs[3].definition).toContain("modifies, packages, and ships");
  });

  test("DeepSeek: bare terms + every def quoted with internal commas", () => {
    const input = `term,definition
Cell Membrane,"A selectively permeable lipid bilayer that encloses the cell contents, regulating the passage of materials in and out."
Cytoplasm,"The gel-like substance inside the cell, excluding the nucleus, where organelles are suspended and metabolic reactions occur."
Nucleus,"The membrane-bound organelle that houses the cell's genetic material (DNA) and controls cellular activities."
Mitochondrion,"The organelle responsible for producing the majority of the cell's chemical energy (ATP) via aerobic respiration."
Ribosome,"A molecular machine, composed of RNA and protein, that synthesizes polypeptides by translating messenger RNA (mRNA)."
Endoplasmic Reticulum,"A network of membranous tubules and sacs involved in the synthesis, folding, and transport of proteins (rough ER) and lipids (smooth ER)."`;
    const r = parseInput(input);
    expect(r.kind).toBe("vocab");
    if (r.kind !== "vocab") return;
    expect(r.pairs).toHaveLength(6);
    expect(r.pairs[0].term).toBe("Cell Membrane");
    expect(r.pairs[0].definition).toContain(
      "A selectively permeable lipid bilayer that encloses the cell contents",
    );
    expect(r.pairs[4].term).toBe("Ribosome");
    expect(r.pairs[4].definition).toContain("A molecular machine, composed of RNA and protein");
    // Internal commas inside the quoted def must survive.
    expect(r.pairs[4].definition.includes(",")).toBe(true);
    // No surrounding quotes leaked through.
    expect(r.pairs[0].definition.startsWith('"')).toBe(false);
    expect(r.pairs[0].definition.endsWith('"')).toBe(false);
  });
});

// --------------------------------------------------------------------------
// Unknown
// --------------------------------------------------------------------------

describe("unknown", () => {
  test("single word", () => {
    expect(parseInput("hola").kind).toBe("unknown");
  });

  test("prose paragraph", () => {
    const r = parseInput(
      "Quizlet is a flashcard application for learning vocabulary and concepts.",
    );
    expect(r.kind).toBe("unknown");
  });
});
