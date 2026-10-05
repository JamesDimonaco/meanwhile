// Strips accents (NFKD splits "ā" into "a" + combining macron, then the
// marks are dropped) so a phone keyboard without tone marks still matches
// data's accented pinyin aliases. CJK text has no combining marks to strip,
// so it passes through unchanged.
export function normalize(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

const NOT_WORD = /[^\p{L}\p{N}]+/u;
const WORD_CHAR = /[\p{L}\p{N}]/u;
// Typed Latin reaches CJK names through the pinyin aliases; a one-character
// CJK "typo" is a different word, so CJK is never fuzzed. Nor are digits:
// a year typed wrong is another year.
const NO_FUZZ = /[\p{N}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

// Doubled letters and "ph" for "f" are the commonest dyslexic misspellings
// (chinna, peloponesian, fillipines); folding both sides makes them free and
// leaves the edit budget for real typos.
const fold = (word: string) => word.replace(/ph/g, "f").replace(/(.)\1+/g, "$1");

/** A search term, normalized and split into words once, when the index is built. */
export type Term = { text: string; words: readonly string[]; folded: readonly string[] };

export function toTerms(raw: readonly string[]): Term[] {
  return raw.flatMap((r) => {
    const text = normalize(r);
    if (!text) return [];
    const words = text.split(NOT_WORD).filter(Boolean);
    return [{ text, words, folded: words.map(fold) }];
  });
}

/** Edits a typed word may hold: none up to three letters, where one edit makes a different word. */
const budget = (length: number) => (length < 4 ? 0 : length < 7 ? 1 : 2);
// A half-typed word gets the same budget only from five letters: at four, "meri" would find Mexico.
const HALF_TYPED_FUZZ_FROM = 5;

// Lower is better. Every real hit beats every typo.
const EXACT = 0;
const PREFIX = 1;
const WORD_START = 2;
const INSIDE = 3;
const FUZZY = 4;
// Within typos, fewer edits first; at equal edits, the whole name, then a word in it, then a half-typed word.
const WHOLE = 0;
const IN_TERM = 1;
const HALF_TYPED = 2;

/**
 * Optimal string alignment distance (Damerau-Levenshtein where swapping two
 * neighbours is one edit), or Infinity past max. With prefix, the distance
 * from a to the closest start of b.
 */
function distance(a: string, b: string, max: number, prefix: boolean): number {
  if (b.length < a.length - max || (!prefix && b.length > a.length + max)) return Infinity;
  let before: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      let d = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, before[j - 2] + 1);
      row.push(d);
    }
    // Row minimums never fall, so once every cell is over budget the answer is too.
    if (Math.min(...row) > max) return Infinity;
    before = prev;
    prev = row;
  }
  const d = prefix ? Math.min(...prev) : prev[b.length];
  return d <= max ? d : Infinity;
}

type Query = { text: string; words: readonly string[]; folded: readonly string[]; inside: boolean; fuzzy: boolean };

function wordEdits(q: Query, t: Term, i: number, at: number, max: number, prefix: boolean): number {
  const [qw, tw] = [q.words[i], t.words[at]];
  if (max === 0) return (prefix ? tw.startsWith(qw) : tw === qw) ? 0 : Infinity;
  return Math.min(distance(qw, tw, max, prefix), distance(q.folded[i], t.folded[at], max, prefix));
}

/** The query's words against a run of the term's words, in order; the last may be half typed. */
function typoScore(q: Query, t: Term): number | null {
  const n = q.words.length;
  let best: number | null = null;
  for (let start = 0; start + n <= t.words.length; start++) {
    let edits = 0;
    let kind = start === 0 && n === t.words.length ? WHOLE : IN_TERM;
    for (let i = 0; i < n && edits !== Infinity; i++) {
      const length = q.words[i].length;
      let d = wordEdits(q, t, i, start + i, budget(length), false);
      if (i === n - 1) {
        const half = wordEdits(q, t, i, start + i, length >= HALF_TYPED_FUZZ_FROM ? budget(length) : 0, true);
        if (half < d) [d, kind] = [half, HALF_TYPED];
      }
      edits += d;
    }
    if (edits !== Infinity) {
      const score = FUZZY + edits * 3 + kind;
      if (best === null || score < best) best = score;
    }
  }
  return best;
}

function termScore(q: Query, t: Term): number | null {
  if (t.text === q.text) return EXACT;
  if (t.text.startsWith(q.text)) return PREFIX;
  let inside = false;
  for (let at = t.text.indexOf(q.text, 1); at !== -1; at = t.text.indexOf(q.text, at + 1)) {
    if (!WORD_CHAR.test(t.text[at - 1])) return WORD_START;
    inside = true;
  }
  if (inside && q.inside) return INSIDE;
  return q.fuzzy ? typoScore(q, t) : null;
}

/** What a search ranks: anything with its terms prepared by toTerms. */
export type Ranked<T> = { item: T; terms: readonly Term[] };

/**
 * Items whose terms match the query, best first: exact, prefix, a word
 * starting with it, anywhere inside (from three letters, or CJK), then
 * typos. Typos are dropped when something matched exactly, so a correct
 * "Iran" doesn't bring Iraq. Equal scores keep the items' order.
 */
export function rank<T>(query: string, items: readonly Ranked<T>[]): T[] {
  const text = normalize(query);
  if (!text) return [];
  const words = text.split(NOT_WORD).filter(Boolean);
  const q: Query = {
    text,
    words,
    folded: words.map(fold),
    inside: text.length >= 3 || CJK.test(text),
    fuzzy: words.length > 0 && !NO_FUZZ.test(text),
  };
  const scored = items.flatMap(({ item, terms }) => {
    let best: number | null = null;
    for (const t of terms) {
      const s = termScore(q, t);
      if (s !== null && (best === null || s < best)) best = s;
    }
    return best === null ? [] : [{ item, score: best }];
  });
  const exact = scored.some((s) => s.score === EXACT);
  return scored
    .filter((s) => !exact || s.score < FUZZY)
    .sort((a, b) => a.score - b.score)
    .map((s) => s.item);
}
