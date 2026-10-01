import { z } from "zod";
import { duplicates, LocalizedText, Period, Phase, Place, Source } from "./schema";

// data/wars/<id>.json. Reuses the culture shapes (LocalizedText, Source,
// Period, Phase, Place), so years are astronomical and fuzzy dates, the
// disputed flag and its note work the same way.

export const WAR_TIERS = ["flagship", "standard"] as const;
/** Events per tier, inclusive, counting culture event references. */
export const TIER_EVENTS = { flagship: [15, 30], standard: [3, 8] } as const;
/** A flagship's bar needs segments to be worth drawing. */
export const MIN_FLAGSHIP_PHASES = 2;
export const CASUALTY_SCOPES = ["battle-deaths", "military-deaths", "civilian-deaths", "total-deaths"] as const;
export const MEMBER_ROLES = ["belligerent", "supporter"] as const;
/** A country page lists a war once per member; more than three is an empire's extent, not a member's home. */
export const MAX_TODAY_COUNTRIES = 3;

const Id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "ids are kebab-case: a-z, 0-9, hyphens");
const Year = z.number().int();
const Text = z.string().trim().min(1);
const WikidataId = z.string().regex(/^Q\d+$/, "Wikidata ids look like Q12345");
const IsoDate = z.iso.date();
const Today = z
  .array(z.string().regex(/^[A-Z]{2}$/, "codes are upper-case ISO 3166-1 alpha-2, e.g. MX"))
  .min(1)
  .max(MAX_TODAY_COUNTRIES);
const Role = z.enum(MEMBER_ROLES);

/**
 * One party on a side. `today` = the present-day countries whose wars page
 * lists this war for this member. Only a `state` member gets a flag.
 */
export const SideMember = z.discriminatedUnion("kind", [
  /** A culture from data/registry.json: linked to its page. */
  z.strictObject({ kind: z.literal("culture"), id: Id, role: Role, today: Today }),
  /** A present-day state (UN member), drawn with its flag and its Intl name. */
  z.strictObject({ kind: z.literal("state"), code: z.string().regex(/^[A-Z]{2}$/), role: Role, today: Today }),
  /** A named historical polity, army or company: plain name, no flag. */
  z.strictObject({ kind: z.literal("polity"), name: LocalizedText, role: Role, today: Today }),
]);

export const Side = z.strictObject({
  id: Id,
  label: LocalizedText,
  members: z.array(SideMember).min(1),
});

/** A side's own name for the war, shown as "<usedBy> calls it <text>" and searchable. Never the title. */
export const AltName = z.strictObject({
  text: Text,
  /** BCP 47, e.g. "zh-Hans", for the lang attribute. */
  lang: Text,
  usedBy: LocalizedText,
  /** What the name means, for readers of other languages. */
  gloss: LocalizedText.optional(),
});

/** All three titles are required, so a gap fails instead of quietly showing English. */
const Title = z.strictObject({ en: Text, es: Text, zh: Text });

/** A war with no end yet: no end years, and the date its figures were last checked. */
export const Ongoing = z
  .strictObject({
    earliestStart: Year,
    latestStart: Year,
    asOf: IsoDate,
    sources: z.array(Source).min(1),
    disputed: z.boolean().default(false),
    note: LocalizedText.optional(),
  })
  .superRefine((o, ctx) => {
    if (o.earliestStart > o.latestStart) ctx.addIssue({ code: "custom", message: "need earliestStart <= latestStart" });
    const asOfYear = Number(o.asOf.slice(0, 4));
    if (o.latestStart > asOfYear) {
      ctx.addIssue({ code: "custom", message: `latestStart (${o.latestStart}) is after the asOf year (${asOfYear})` });
    }
  });

export const WarEvent = z
  .strictObject({
    id: Id,
    start: Year,
    end: Year.optional(),
    title: LocalizedText,
    sources: z.array(Source).min(2, "events need at least 2 independent sources"),
    disputed: z.boolean().default(false),
    note: LocalizedText.optional(),
    /** Every war event is a pin on the map. */
    place: Place,
    wikidataId: WikidataId.optional(),
  })
  .refine((e) => e.end === undefined || e.start <= e.end, { message: "event end must be >= start" });

/** A culture's own event shown in the war's list, by reference, so the two never drift apart. */
export const CultureEventRef = z.strictObject({ culture: Id, event: Id });

export const Leader = z.strictObject({
  name: LocalizedText,
  /** A side id from this war. */
  side: Id,
  role: LocalizedText,
  wikidataId: WikidataId,
});

export const Casualty = z
  .strictObject({
    scope: z.enum(CASUALTY_SCOPES),
    /** A side id; omitted means both or all sides. */
    side: Id.optional(),
    low: z.number().int().nonnegative(),
    high: z.number().int().nonnegative(),
    /** The part of the side this figure counts (e.g. "Spaniards"), shown in place of the side's label. */
    who: LocalizedText.optional(),
    /** Who gives this figure, when it is one party's official count. */
    attributedTo: LocalizedText.optional(),
    asOf: IsoDate.optional(),
    sources: z.array(Source).min(1, "a casualty figure needs its sources"),
    note: LocalizedText.optional(),
  })
  .superRefine((c, ctx) => {
    if (c.high < c.low) ctx.addIssue({ code: "custom", message: `high (${c.high}) is below low (${c.low})` });
    if (c.low === c.high && !c.attributedTo) {
      ctx.addIssue({
        code: "custom",
        message: "a single number (low == high) must be attributedTo whoever gives it; otherwise give a sourced range",
      });
    }
  });

export const WarFile = z
  .strictObject({
    id: Id,
    wikidataId: WikidataId,
    /** Each language's own Wikipedia title. */
    name: Title,
    /** Languages whose Wikipedia has no article on this war: their title is Wikidata's label or our literal translation of the en title. */
    noWikiTitle: z.array(z.enum(["es", "zh"])).default([]),
    /** Extra search terms. Not displayed. */
    aliases: z.array(Text).default([]),
    altNames: z.array(AltName).default([]),
    /** The short account, in our own words. */
    description: LocalizedText,
    /** One neutral line. */
    outcome: LocalizedText,
    tier: z.enum(WAR_TIERS),
    /** Sensitive wars stay out of es/zh until reviewed says that language is checked. */
    sensitive: z.boolean(),
    reviewed: z.strictObject({ es: z.boolean(), zh: z.boolean() }),
    /** Exactly one of period (ended) and ongoing. */
    period: Period.optional(),
    ongoing: Ongoing.optional(),
    sides: z.array(Side).min(2),
    phases: z.array(Phase).default([]),
    events: z.array(WarEvent).default([]),
    cultureEvents: z.array(CultureEventRef).default([]),
    leaders: z.array(Leader).default([]),
    casualties: z.array(Casualty).default([]),
    /** Culture ids this war ended or changed: their pages list it. */
    cultures: z.array(Id).default([]),
    /** An earlier war this one continues or grows out of. */
    follows: Id.optional(),
    sources: z.array(Source).min(1),
  })
  .superRefine((w, ctx) => {
    if ((w.period === undefined) === (w.ongoing === undefined)) {
      ctx.addIssue({ code: "custom", message: "give exactly one of period (an ended war) and ongoing (no end yet)" });
    }
    const sideIds = new Set(w.sides.map((s) => s.id));
    const idLists = [
      ["side", w.sides.map((s) => s.id)],
      ["phase", w.phases.map((p) => p.id)],
      ["event", [...w.events.map((e) => e.id), ...w.cultureEvents.map((r) => r.event)]],
      ["culture", w.cultures],
    ] as const;
    for (const [kind, ids] of idLists) {
      for (const dup of duplicates(ids)) ctx.addIssue({ code: "custom", message: `duplicate ${kind} id "${dup}"` });
    }
    for (let i = 1; i < w.phases.length; i++) {
      if (w.phases[i].start < w.phases[i - 1].start) ctx.addIssue({ code: "custom", message: "phases must be ordered by start year" });
    }
    w.leaders.forEach((l, i) => {
      if (!sideIds.has(l.side)) ctx.addIssue({ code: "custom", path: ["leaders", i, "side"], message: `no side "${l.side}"` });
    });
    w.casualties.forEach((c, i) => {
      if (c.side && !sideIds.has(c.side)) ctx.addIssue({ code: "custom", path: ["casualties", i, "side"], message: `no side "${c.side}"` });
    });
    if (w.follows === w.id) ctx.addIssue({ code: "custom", message: "a war cannot follow itself" });
  });

export type SideMember = z.infer<typeof SideMember>;
export type Side = z.infer<typeof Side>;
export type AltName = z.infer<typeof AltName>;
export type Ongoing = z.infer<typeof Ongoing>;
export type WarEvent = z.infer<typeof WarEvent>;
export type CultureEventRef = z.infer<typeof CultureEventRef>;
export type Leader = z.infer<typeof Leader>;
export type Casualty = z.infer<typeof Casualty>;
export type CasualtyScope = Casualty["scope"];
export type WarFile = z.infer<typeof WarFile>;

/** A validated war: culture event references resolved into events, all events in year order. */
export type War = Omit<WarFile, "events" | "cultureEvents"> & { events: WarEvent[] };
