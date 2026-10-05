// Strips accents (NFKD splits "ā" into "a" + combining macron, then the
// marks are dropped) so a phone keyboard without tone marks still matches
// data's accented pinyin aliases. CJK text has no combining marks to strip,
// so it passes through unchanged.
function normalize(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

const NOT_WORD = /[^\p{L}\p{N}]+/u;
// Typed Latin reaches CJK names through the pinyin aliases; a one-character
// CJK "typo" is a different word, so CJK is never fuzzed. Nor are digits:
// a year typed wrong is another year.
const NO_FUZZ = /[\p{N}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
// CJK has no spaces between words, so it is the one script matched anywhere inside a name.
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

/** Edits a typed word may hold: none up to three letters, where one edit makes a different word. */
const budget = (length: number) => (length < 4 ? 0 : length < 7 ? 1 : 2);

// Doubled letters and "ph" for "f" are the commonest dyslexic misspellings
// (chinna, peloponesian, fillipines); folding both sides makes them free.
// Never down to fewer than three letters: "inn" is not "in", "eeuu" not "eu",
// and the "ii" of "World War II" is not the "i" of "World War I".
function fold(word: string): string {
  const folded = word.replace(/ph/g, "f").replace(/(.)\1+/g, "$1");
  return folded.length < 3 ? word : folded;
}
// Vowels are the letters most often spelt wrong (spane, mochay), so a word
// whose consonants all agree, in order, may hold one edit over its budget
// and still cost no more than the budget.
const skeleton = (folded: string) => folded[0] + folded.slice(1).replace(/[aeiouy]/g, "");
// From five letters, with at least three consonants to agree: "sung" is not "Sanguo", nor "rusia" "ruso".
const SKELETON_FROM = 5;
const SKELETON_MIN = 3;

/** A search term, normalized and split into words once, when the index is built. */
export type Term = {
  text: string;
  words: readonly string[];
  folded: readonly string[];
  /** The folded words with spaces. */
  foldedText: string;
  /** The words run together: "viet nam", "Ch'ing". */
  squashed: string;
  skeletons: readonly string[];
  /** The name the reader sees on the result, the only term a one- or two-letter query searches. */
  shown: boolean;
};

function toTerm(text: string, shown: boolean): Term {
  const words = text.split(NOT_WORD).filter(Boolean);
  const folded = words.map(fold);
  return { text, words, folded, foldedText: folded.join(" "), squashed: words.join(""), skeletons: folded.map(skeleton), shown };
}

/** The names a result shows, then everything else it is found by; a term in both is shown. */
export function toTerms(shown: readonly string[], other: readonly string[] = []): Term[] {
  const seen = new Set<string>();
  return [...shown.map((r) => [r, true] as const), ...other.map((r) => [r, false] as const)].flatMap(([r, isShown]) => {
    const text = normalize(r);
    if (!text || seen.has(text)) return [];
    seen.add(text);
    return [toTerm(text, isShown)];
  });
}

// A half-typed word gets the same budget only from five letters: at four, "meri" would find Mexico.
const HALF_TYPED_FUZZ_FROM = 5;

// Lower is better. Every real hit beats every typo.
const EXACT = 0;
const PREFIX = 1;
const WORD_START = 2;
const INSIDE = 3;
const FUZZY = 4;
// Within typos, fewer edits first; at equal edits, the whole name, then a word in it or a half-typed word alike.
const WHOLE = 0;
const PART = 1;
const KINDS = 2;

// Reused across calls: distance() runs for every word pair on every keystroke.
let before: number[] = [];
let prev: number[] = [];
let row: number[] = [];

/**
 * Optimal string alignment distance (Damerau-Levenshtein where swapping two
 * neighbours is one edit), or Infinity past max. With prefix, the distance
 * from a to the closest start of b.
 */
function distance(a: string, b: string, max: number, prefix: boolean): number {
  if (b.length < a.length - max || (!prefix && b.length > a.length + max)) return Infinity;
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    row[0] = i;
    let low = i;
    for (let j = 1; j <= b.length; j++) {
      let d = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, before[j - 2] + 1);
      row[j] = d;
      if (d < low) low = d;
    }
    // Row minimums never fall, so once every cell is over budget the answer is too.
    if (low > max) return Infinity;
    const spare = before;
    before = prev;
    prev = row;
    row = spare;
  }
  let d = prev[b.length];
  if (prefix) for (let j = 0; j < b.length; j++) d = Math.min(d, prev[j]);
  return d <= max ? d : Infinity;
}

type Query = {
  text: string;
  words: readonly string[];
  folded: readonly string[];
  foldedText: string;
  squashed: string;
  skeletons: readonly string[];
  /** One or two Latin letters: only the shown name is searched, other terms only whole. */
  short: boolean;
};

/** Edits a typed word may hold; a half-typed one gets them only from HALF_TYPED_FUZZ_FROM letters. */
const allowed = (word: string, prefix: boolean) =>
  NO_FUZZ.test(word) || (prefix && word.length < HALF_TYPED_FUZZ_FROM) ? 0 : budget(word.length);

function edits(a: string, b: string, max: number, prefix: boolean): number {
  if (max === 0) return (prefix ? b.startsWith(a) : a === b) ? 0 : Infinity;
  return distance(a, b, max, prefix);
}

function wordEdits(q: Query, t: Term, i: number, at: number, prefix: boolean): number {
  const word = q.words[i];
  const max = allowed(word, prefix);
  const raw = edits(word, t.words[at], max, prefix);
  if (raw === 0 || budget(word.length) === 0) return raw;
  const unfolded = q.folded[i] === word && t.folded[at] === t.words[at];
  // The folded word's own length sets its budget: "hann" folds to "han", which may not become "san".
  const folded = unfolded ? raw : Math.min(raw, edits(q.folded[i], t.folded[at], allowed(q.folded[i], prefix), prefix));
  if (folded !== Infinity || prefix || word.length < SKELETON_FROM) return folded;
  if (q.skeletons[i].length < SKELETON_MIN || q.skeletons[i] !== t.skeletons[at]) return Infinity;
  // Counted as the whole budget, so a vowel-swap like "spane" ranks Spain above a half-typed "Spanish".
  return edits(q.folded[i], t.folded[at], max + 1, false) === Infinity ? Infinity : max;
}

/** The query's words against a run of the term's words, in order; the last may be half typed. */
function typoScore(q: Query, t: Term): number | null {
  const n = q.words.length;
  let best: number | null = null;
  for (let start = 0; start + n <= t.words.length; start++) {
    let edits = 0;
    let kind = start === 0 && n === t.words.length ? WHOLE : PART;
    for (let i = 0; i < n && edits !== Infinity; i++) {
      let d = wordEdits(q, t, i, start + i, false);
      if (i === n - 1) {
        const half = wordEdits(q, t, i, start + i, true);
        if (half < d) [d, kind] = [half, PART];
      }
      edits += d;
    }
    if (edits !== Infinity) {
      const score = FUZZY + edits * KINDS + kind;
      if (best === null || score < best) best = score;
    }
  }
  return best;
}

/** Exact, prefix or a word starting with `q` in `t`; CJK anywhere. */
function textScore(q: string, t: string): number | null {
  if (t === q) return EXACT;
  if (t.startsWith(q)) return PREFIX;
  let inside = false;
  for (let at = t.indexOf(q, 1); at !== -1; at = t.indexOf(q, at + 1)) {
    if (NOT_WORD.test(t[at - 1])) return WORD_START;
    inside = true;
  }
  return inside && CJK.test(q) ? INSIDE : null;
}

function realScore(q: Query, t: Term): number | null {
  if (q.short && !t.shown) return t.text === q.text ? EXACT : null;
  const typed = textScore(q.text, t.text);
  if (typed !== null || budget(q.text.length) === 0) return typed;
  // Doubled letters free ("hann" is "han"), and words split or joined
  // differently ("viet nam", "qingchao"), score as if typed right.
  const folded = textScore(q.foldedText, t.foldedText);
  if (folded !== null) return folded;
  if (t.squashed === q.squashed) return EXACT;
  return q.words.length > 1 && t.squashed.startsWith(q.squashed) ? PREFIX : null;
}

/** What a search ranks: anything with its terms prepared by toTerms. */
export type Ranked<T> = { item: T; terms: readonly Term[] };

function best(terms: readonly Term[], score: (t: Term) => number | null): number | null {
  let min: number | null = null;
  for (const t of terms) {
    const s = score(t);
    if (s !== null && (min === null || s < min)) min = s;
  }
  return min;
}

/**
 * Items whose terms match the query, best first: exact, prefix, a word
 * starting with it, CJK anywhere inside, then typos. When something matched
 * exactly, typos are dropped, so a correct "Iran" doesn't bring Iraq; when
 * something else matched for real, only typos of a name the reader sees
 * stay, so "korea" doesn't bring a war through its battle "Koregaon".
 * `unlisted` names places the site has no page for: a query that matches one
 * gets no typos, so "Taiwan" finds nothing rather than Thailand. Equal scores
 * keep the items' order.
 */
export function rank<T>(query: string, items: readonly Ranked<T>[], unlisted: readonly Term[] = []): T[] {
  const text = normalize(query);
  if (!text) return [];
  const words = text.split(NOT_WORD).filter(Boolean);
  const folded = words.map(fold);
  const q: Query = {
    text,
    words,
    folded,
    foldedText: folded.join(" "),
    squashed: words.join(""),
    skeletons: folded.map(skeleton),
    short: text.length < 3 && !CJK.test(text),
  };
  const real = items.map(({ terms }) => best(terms, (t) => realScore(q, t)));
  // A query of punctuation alone has no word to spell wrong; one or two letters have no edit to spend.
  const typos = words.length > 0 && !q.short && !real.includes(EXACT) && best(unlisted, (t) => realScore(q, t)) === null;
  const shownOnly = real.some((s) => s !== null);
  return items
    .flatMap(({ item, terms }, i) => {
      const score = real[i] ?? (typos ? best(shownOnly ? terms.filter((t) => t.shown) : terms, (t) => typoScore(q, t)) : null);
      return score === null ? [] : [{ item, score }];
    })
    .sort((a, b) => a.score - b.score)
    .map((s) => s.item);
}
