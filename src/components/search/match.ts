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
const LATIN = /\p{Script=Latin}/u;

const MAX_EDITS = 2;
/** Edits a typed word may hold: none up to three letters, where one edit makes a different word. */
const budget = (length: number) => (length < 4 ? 0 : length < 7 ? 1 : MAX_EDITS);
// On a term the reader never sees, a second edit or the vowel allowance below
// finds what they can't explain: "colonial" is two edits from "Polonia".
const HIDDEN_EDITS = 1;

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
// Both words from five letters, with at least three consonants to agree: "sung" is not "Sanguo", "rusia" not "ruso", "chine" not "chun".
const SKELETON_FROM = 5;
const SKELETON_MIN = 3;

// Toneless pinyin syllables by initial, ü written u; a few the language lacks get through.
const PINYIN = new RegExp(
  `^(?:${[
    "[bpm](?:a|ai|an|ang|ao|ei|en|eng|i|ian|iao|ie|in|ing|iu|o|ou|u)",
    "f(?:a|an|ang|ei|en|eng|o|ou|u)",
    "[dtnl](?:a|ai|an|ang|ao|e|ei|en|eng|i|ia|ian|iang|iao|ie|in|ing|iu|o|ong|ou|u|uan|ue|ui|un|uo)",
    "[gkh](?:a|ai|an|ang|ao|e|ei|en|eng|ong|ou|u|ua|uai|uan|uang|ui|un|uo)",
    "[jqx](?:i|ia|ian|iang|iao|ie|in|ing|iong|iu|u|uan|ue|un)",
    "[zcs]h?(?:a|ai|an|ang|ao|e|ei|en|eng|i|ong|ou|u|ua|uai|uan|uang|ui|un|uo)",
    "r(?:an|ang|ao|e|en|eng|i|ong|ou|u|ua|uan|ui|un|uo)",
    "y(?:a|an|ang|ao|e|i|in|ing|o|ong|ou|u|uan|ue|un)",
    "w(?:a|ai|an|ang|ei|en|eng|o|u)",
    "a|ai|an|ang|ao|e|ei|en|eng|er|o|ou",
  ].join("|")})+$`,
);

/**
 * Text whose every word splits into pinyin syllables ("Zhongguo", "Hàn
 * cháo"). Plenty of other names split too ("Taliban", "Tailandia"), so ask
 * only of names already known to be Chinese.
 */
export function isPinyin(text: string): boolean {
  const words = normalize(text).split(NOT_WORD).filter(Boolean);
  return words.length > 0 && words.every((w) => PINYIN.test(w));
}

/** A text normalized and split into words, the forms a query and a term are compared in. */
type Forms = {
  text: string;
  words: readonly string[];
  folded: readonly string[];
  /** The folded words with spaces. */
  foldedText: string;
  /** The words run together: "viet nam", "Ch'ing". */
  squashed: string;
  skeletons: readonly string[];
};

function toForms(text: string): Forms {
  const words = text.split(NOT_WORD).filter(Boolean);
  const folded = words.map(fold);
  return { text, words, folded, foldedText: folded.join(" "), squashed: words.join(""), skeletons: folded.map(skeleton) };
}

/**
 * Who sees a term: "shown" is the name on the result in the page's language;
 * "latin" is seen by a reader typing Latin letters, who knows the English
 * name or the pinyin; "hidden" is everything else (other languages, aliases).
 */
type Seen = "shown" | "latin" | "hidden";

/** A search term, prepared once, when the index is built. */
export type Term = Forms & {
  seen: Seen;
  /** Seen, it matches anywhere inside a word from INSIDE_FROM letters, not only at a word's start. */
  inside: boolean;
};

/** The names a result shows, the names seen in Latin letters, then everything else it is found by; a term in two is the first. */
export function toTerms({
  shown,
  latin = [],
  other = [],
  inside = false,
}: {
  shown: readonly string[];
  latin?: readonly string[];
  other?: readonly string[];
  inside?: boolean;
}): Term[] {
  const done = new Set<string>();
  const tiers = [
    [shown, "shown"],
    [latin, "latin"],
    [other, "hidden"],
  ] as const;
  return tiers.flatMap(([raws, seen]) =>
    raws.flatMap((raw) => {
      const text = normalize(raw);
      if (!text || done.has(text)) return [];
      done.add(text);
      return [{ ...toForms(text), seen, inside }];
    }),
  );
}

// A half-typed word gets the same budget only from five letters: at four, "meri" would find Mexico.
const HALF_TYPED_FUZZ_FROM = 5;
const INSIDE_FROM = 3;

// Lower is better. On a seen term, every real hit beats every typo.
const EXACT = 0;
const PREFIX = 1;
const WORD_START = 2;
const INSIDE = 3;
const FUZZY = INSIDE + 1;
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

type Query = Forms & {
  /** One or two Latin letters: only the shown name is searched, other terms only whole. */
  short: boolean;
  /** Typed in Latin letters, so the English name and pinyin are seen. */
  latin: boolean;
  /** Added to any hit on a term the reader doesn't see, short of exact: more than any seen hit can score. */
  unseen: number;
};

function toQuery(text: string): Query {
  const forms = toForms(text);
  return {
    ...forms,
    short: text.length < 3 && !CJK.test(text),
    latin: LATIN.test(text),
    unseen: FUZZY + (MAX_EDITS * forms.words.length + 1) * KINDS,
  };
}

const sees = (q: Query, t: Term) => t.seen === "shown" || (t.seen === "latin" && q.latin);

/**
 * Edits a typed word may hold against a word of a name; a half-typed one gets
 * them only from HALF_TYPED_FUZZ_FROM letters. The shorter of the two words
 * sets the budget: two edits turn "otomanos" into "otoños".
 */
const allowed = (word: string, against: string, prefix: boolean, seen: boolean) =>
  NO_FUZZ.test(word) || (prefix && word.length < HALF_TYPED_FUZZ_FROM) ? 0 : Math.min(budget(Math.min(word.length, against.length)), seen ? MAX_EDITS : HIDDEN_EDITS);

function edits(a: string, b: string, max: number, prefix: boolean): number {
  if (max === 0) return (prefix ? b.startsWith(a) : a === b) ? 0 : Infinity;
  return distance(a, b, max, prefix);
}

function wordEdits(q: Query, t: Term, i: number, at: number, prefix: boolean, seen: boolean): number {
  const word = q.words[i];
  const max = allowed(word, t.words[at], prefix, seen);
  const raw = edits(word, t.words[at], max, prefix);
  if (raw === 0 || budget(word.length) === 0) return raw;
  const unfolded = q.folded[i] === word && t.folded[at] === t.words[at];
  // The folded word's own length sets its budget: "hann" folds to "han", which may not become "san".
  const folded = unfolded ? raw : Math.min(raw, edits(q.folded[i], t.folded[at], allowed(q.folded[i], t.folded[at], prefix, seen), prefix));
  if (!seen || folded !== Infinity || prefix || Math.min(word.length, t.words[at].length) < SKELETON_FROM) return folded;
  if (q.skeletons[i].length < SKELETON_MIN || q.skeletons[i] !== t.skeletons[at]) return Infinity;
  // Counted as the whole budget, so a vowel-swap like "spane" ranks Spain above a half-typed "Spanish".
  return edits(q.folded[i], t.folded[at], max + 1, false) === Infinity ? Infinity : max;
}

/**
 * The query's words against a run of the term's words, in order; the last
 * may be half typed. A term the reader doesn't see is matched only from its
 * start, with one edit in all.
 */
function typoScore(q: Query, t: Term): number | null {
  const seen = sees(q, t);
  const n = q.words.length;
  const last = seen ? t.words.length - n : Math.min(0, t.words.length - n);
  let best: number | null = null;
  for (let start = 0; start <= last; start++) {
    let edits = 0;
    let kind = start === 0 && n === t.words.length ? WHOLE : PART;
    for (let i = 0; i < n && edits !== Infinity; i++) {
      let d = wordEdits(q, t, i, start + i, false, seen);
      if (i === n - 1) {
        const half = wordEdits(q, t, i, start + i, true, seen);
        if (half < d) [d, kind] = [half, PART];
      }
      edits += d;
    }
    if (edits !== Infinity && (seen || edits <= HIDDEN_EDITS)) {
      const score = FUZZY + edits * KINDS + kind + (seen ? 0 : q.unseen);
      if (best === null || score < best) best = score;
    }
  }
  return best;
}

const endsWord = (t: string, at: number) => at === t.length || NOT_WORD.test(t[at]);

/**
 * Exact or prefix; a word starting with `q` too, only whole words on a term
 * the reader doesn't see ("charlemagne" in "Empire of Charlemagne", not
 * "volun" in "Volunteer Army"); CJK anywhere, and with `inside` Latin too.
 */
function textScore(q: string, t: string, seen: boolean, inside: boolean): number | null {
  if (t === q) return EXACT;
  if (t.startsWith(q)) return PREFIX;
  let within = false;
  for (let at = t.indexOf(q, 1); at !== -1; at = t.indexOf(q, at + 1)) {
    if (NOT_WORD.test(t[at - 1]) && (seen || endsWord(t, at + q.length))) return WORD_START;
    within = true;
  }
  return within && (CJK.test(q) || (inside && q.length >= INSIDE_FROM)) ? INSIDE : null;
}

function realScore(q: Query, t: Term): number | null {
  if (q.short && t.seen !== "shown") return t.text === q.text ? EXACT : null;
  const seen = sees(q, t);
  const score = kindOf(q, t, seen);
  return score === null || score === EXACT || seen ? score : score + q.unseen;
}

function kindOf(q: Query, t: Term, seen: boolean): number | null {
  const inside = seen && t.inside;
  const typed = textScore(q.text, t.text, seen, inside);
  if (typed !== null || budget(q.text.length) === 0) return typed;
  // Doubled letters free ("hann" is "han"), and words split or joined
  // differently ("viet nam", "qingchao"), score as if typed right.
  const folded = textScore(q.foldedText, t.foldedText, seen, inside);
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
 * Items whose terms match the query, best first: exact; then hits on a name
 * the reader sees (prefix, a word starting with it, CJK or an `inside` term
 * anywhere inside, then typos); then hits on terms they don't see, which
 * count from the term's start or as whole words inside it, with one edit at
 * most and only from the start. When something matched exactly,
 * typos are dropped, so a correct "Iran" doesn't bring Iraq; when something
 * else matched for real, only typos of a name the reader sees stay, so
 * "korea" doesn't bring a war through its battle "Koregaon".
 * `unlisted` names places the site has no page for: a query closer to one
 * than to anything listed gets no typos, so "Taiwan" and "tiawan" find
 * nothing rather than Thailand or Tiwanaku. Equal scores keep the items' order.
 */
export function rank<T>(query: string, items: readonly Ranked<T>[], unlisted: readonly Term[] = []): T[] {
  const text = normalize(query);
  if (!text) return [];
  const q = toQuery(text);
  const real = items.map(({ terms }) => best(terms, (t) => realScore(q, t)));
  // A query of punctuation alone has no word to spell wrong; one or two letters have no edit to spend.
  const fuzz = q.words.length > 0 && !q.short && !real.includes(EXACT);
  const seenOnly = real.some((s) => s !== null);
  const scores = items.map(({ terms }, i) => real[i] ?? (fuzz ? best(seenOnly ? terms.filter((t) => sees(q, t)) : terms, (t) => typoScore(q, t)) : null));
  // How close, whoever sees the term: "holanda" is one edit from Holland, two from the unlisted Irlanda.
  const closeness = (s: number) => (s >= q.unseen ? s - q.unseen : s);
  const place = fuzz ? best(unlisted, (t) => realScore(q, t) ?? typoScore(q, t)) : null;
  const typos = place === null || closeness(place) >= Math.min(...scores.flatMap((s) => (s === null ? [] : [closeness(s)])));
  return items
    .flatMap(({ item }, i) => {
      const score = typos ? scores[i] : real[i];
      return score === null ? [] : [{ item, score }];
    })
    .sort((a, b) => a.score - b.score)
    .map((s) => s.item);
}
