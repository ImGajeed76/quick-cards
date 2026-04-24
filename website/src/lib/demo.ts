// Randomized-but-coherent example generator for the homepage demo.
//
// A pool of ~60 vocab pairs across three languages. Each cycle picks one
// language, samples 3–5 pairs, and renders them into one of four input
// formats. The combinatorial space is large enough that casual visitors
// won't see the same example twice.

export type Pair = { term: string; definition: string };

export type Format = "vocab" | "json" | "csv" | "markdown";

export type Example = {
  format: Format;
  text: string;
  pairs: Pair[];
};

const WORDLISTS: Record<string, Pair[]> = {
  spanish: [
    { term: "hola", definition: "hello" },
    { term: "gato", definition: "cat" },
    { term: "perro", definition: "dog" },
    { term: "amigo", definition: "friend" },
    { term: "libro", definition: "book" },
    { term: "casa", definition: "house" },
    { term: "agua", definition: "water" },
    { term: "sol", definition: "sun" },
    { term: "luna", definition: "moon" },
    { term: "árbol", definition: "tree" },
    { term: "pan", definition: "bread" },
    { term: "leche", definition: "milk" },
    { term: "día", definition: "day" },
    { term: "noche", definition: "night" },
    { term: "rojo", definition: "red" },
    { term: "azul", definition: "blue" },
    { term: "verde", definition: "green" },
    { term: "grande", definition: "big" },
    { term: "pequeño", definition: "small" },
    { term: "bonito", definition: "beautiful" },
  ],
  french: [
    { term: "bonjour", definition: "hello" },
    { term: "chat", definition: "cat" },
    { term: "chien", definition: "dog" },
    { term: "ami", definition: "friend" },
    { term: "livre", definition: "book" },
    { term: "maison", definition: "house" },
    { term: "eau", definition: "water" },
    { term: "soleil", definition: "sun" },
    { term: "lune", definition: "moon" },
    { term: "arbre", definition: "tree" },
    { term: "pain", definition: "bread" },
    { term: "lait", definition: "milk" },
    { term: "jour", definition: "day" },
    { term: "nuit", definition: "night" },
    { term: "rouge", definition: "red" },
    { term: "bleu", definition: "blue" },
    { term: "vert", definition: "green" },
    { term: "grand", definition: "big" },
    { term: "petit", definition: "small" },
    { term: "beau", definition: "beautiful" },
  ],
  japanese: [
    { term: "こんにちは", definition: "hello" },
    { term: "猫", definition: "cat" },
    { term: "犬", definition: "dog" },
    { term: "友達", definition: "friend" },
    { term: "本", definition: "book" },
    { term: "家", definition: "house" },
    { term: "水", definition: "water" },
    { term: "太陽", definition: "sun" },
    { term: "月", definition: "moon" },
    { term: "木", definition: "tree" },
    { term: "パン", definition: "bread" },
    { term: "牛乳", definition: "milk" },
    { term: "日", definition: "day" },
    { term: "夜", definition: "night" },
    { term: "赤", definition: "red" },
    { term: "青", definition: "blue" },
    { term: "緑", definition: "green" },
    { term: "大きい", definition: "big" },
    { term: "小さい", definition: "small" },
    { term: "美しい", definition: "beautiful" },
  ],
};

const LANGUAGES = Object.keys(WORDLISTS);
const FORMATS: Format[] = ["vocab", "json", "csv", "markdown"];

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomPick<T>(arr: T[], avoid?: T): T {
  let pick = arr[Math.floor(Math.random() * arr.length)];
  if (avoid !== undefined && arr.length > 1 && pick === avoid) {
    // Try once more; good enough to avoid immediate repeats.
    pick = arr[Math.floor(Math.random() * arr.length)];
    if (pick === avoid) {
      pick = arr[(arr.indexOf(avoid) + 1) % arr.length];
    }
  }
  return pick;
}

function formatVocab(pairs: Pair[]): string {
  return pairs.map((p) => `${p.term} - ${p.definition}`).join("\n");
}

function formatJson(pairs: Pair[]): string {
  // One line per object so the example stays compact — 5 pairs = 7 lines,
  // fits the demo panel without pushing other formats to grow.
  const lines = pairs.map((p) => `  ${JSON.stringify({ term: p.term, definition: p.definition })}`);
  return `[\n${lines.join(",\n")}\n]`;
}

function formatCsv(pairs: Pair[]): string {
  return "term,definition\n" + pairs.map((p) => `${p.term},${p.definition}`).join("\n");
}

function formatMarkdown(pairs: Pair[]): string {
  return (
    "| Term | Definition |\n|------|------------|\n" +
    pairs.map((p) => `| ${p.term} | ${p.definition} |`).join("\n")
  );
}

const FORMATTERS: Record<Format, (pairs: Pair[]) => string> = {
  vocab: formatVocab,
  json: formatJson,
  csv: formatCsv,
  markdown: formatMarkdown,
};

/** Generate the next demo example, avoiding an immediate repeat of the
 *  previous format so the cycle feels varied. */
export function nextExample(prev?: Example): Example {
  const lang = LANGUAGES[Math.floor(Math.random() * LANGUAGES.length)];
  const pool = WORDLISTS[lang];
  const count = 3 + Math.floor(Math.random() * 3); // 3, 4, or 5 pairs
  const pairs = shuffle(pool).slice(0, count);
  const format = randomPick(FORMATS, prev?.format);
  return {
    format,
    text: FORMATTERS[format](pairs),
    pairs,
  };
}

export const FORMAT_LABELS: Record<Format, string> = {
  vocab: "Vocab list",
  json: "JSON",
  csv: "CSV",
  markdown: "Markdown table",
};
