import { z } from "zod";
import { REGIONS } from "./regions";

export const EVENT_TYPES = ["founding", "ruler", "invention", "conflict", "collapse"] as const;

const Id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "ids are kebab-case: a-z, 0-9, hyphens");
/** Astronomical year: 1 BCE = 0, 1200 BCE = -1199. */
const Year = z.number().int();
const Text = z.string().trim().min(1);

export const Region = z.enum(REGIONS);
export const EventType = z.enum(EVENT_TYPES);

/** A present-day country in a `today` list: ISO 3166-1 alpha-2, or a UK nation (GB-SCT). Validation checks it against UN_MEMBERS and NATIONS. */
export const TodayCode = z.string().regex(/^[A-Z]{2}(-[A-Z0-9]{1,3})?$/, "codes are upper-case ISO 3166-1 alpha-2, e.g. PE, or GB-ENG, GB-SCT, GB-WLS");

/** English is required; es/zh fall back to English when missing. */
export const LocalizedText = z.strictObject({
  en: Text,
  es: Text.optional(),
  zh: Text.optional(),
});

export const Source = z.strictObject({
  citation: Text,
  url: z.url().optional(),
});

export const NativeName = z.strictObject({
  text: Text,
  /** BCP 47 tag for the lang attribute, e.g. "zh-Hans", "qu". Drives font choice. */
  lang: Text,
});

export const Period = z
  .strictObject({
    id: Id,
    label: LocalizedText.optional(),
    earliestStart: Year,
    latestStart: Year,
    earliestEnd: Year,
    latestEnd: Year,
    sources: z.array(Source).min(1),
    periodoId: z.string().regex(/^p0[0-9a-z]+$/, "PeriodO ids look like p0abc1234de").optional(),
    default: z.boolean().default(false),
    disputed: z.boolean().default(false),
    note: LocalizedText.optional(),
  })
  .superRefine((p, ctx) => {
    const ordered =
      p.earliestStart <= p.latestStart &&
      p.earliestEnd <= p.latestEnd &&
      p.earliestStart <= p.earliestEnd &&
      p.latestStart <= p.latestEnd;
    if (!ordered) {
      ctx.addIssue({
        code: "custom",
        message: `period ${p.id}: need earliestStart <= latestStart, earliestEnd <= latestEnd, and start <= end`,
      });
    }
  });

export const Phase = z
  .strictObject({
    id: Id,
    name: LocalizedText,
    start: Year,
    end: Year,
    sources: z.array(Source).min(1),
  })
  .refine((p) => p.start <= p.end, { message: "phase start must be <= end" });

export const Place = z.strictObject({
  name: LocalizedText,
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  pleiadesId: z.string().regex(/^\d+$/).optional(),
});

export const CultureEvent = z
  .strictObject({
    id: Id,
    start: Year,
    end: Year.optional(),
    type: EventType,
    title: LocalizedText,
    /** Each event is checked against two independent sources. */
    sources: z.array(Source).min(2),
    disputed: z.boolean().default(false),
    note: LocalizedText.optional(),
    place: Place.optional(),
  })
  .refine((e) => e.end === undefined || e.start <= e.end, { message: "event end must be >= start" });

export const Fact = z
  .strictObject({
    id: Id,
    text: LocalizedText,
    start: Year,
    end: Year,
    sources: z.array(Source).min(1),
    disputed: z.boolean().default(false),
  })
  .refine((f) => f.start <= f.end, { message: "fact end must be >= start" });

export const MIN_EVENTS_PER_CULTURE = 5;

export const Culture = z
  .strictObject({
    id: Id,
    region: Region,
    wikidataId: z.string().regex(/^Q\d+$/),
    name: LocalizedText,
    nativeName: NativeName.optional(),
    /** Extra search terms: pinyin, other spellings, older names. Not displayed. */
    aliases: z.array(Text).default([]),
    description: LocalizedText,
    /** false = machine-translated, not yet checked by a native speaker. */
    reviewed: z.strictObject({ es: z.boolean(), zh: z.boolean() }),
    periods: z.array(Period).min(1),
    phases: z.array(Phase).default([]),
    events: z.array(CultureEvent).min(MIN_EVENTS_PER_CULTURE),
    facts: z.array(Fact).min(1),
  })
  .superRefine((c, ctx) => {
    const defaults = c.periods.filter((p) => p.default).length;
    if (defaults !== 1) {
      ctx.addIssue({ code: "custom", message: `exactly one period must be default: true (found ${defaults})` });
    }
    for (const [kind, items] of [
      ["period", c.periods],
      ["phase", c.phases],
      ["event", c.events],
      ["fact", c.facts],
    ] as const) {
      for (const dup of duplicates(items.map((i) => i.id))) {
        ctx.addIssue({ code: "custom", message: `duplicate ${kind} id "${dup}"` });
      }
    }
    for (let i = 1; i < c.phases.length; i++) {
      if (c.phases[i].start < c.phases[i - 1].start) {
        ctx.addIssue({ code: "custom", message: "phases must be ordered by start year" });
      }
    }
  });

const Position = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
const Ring = z.array(Position).min(4);

export const Geometry = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("Polygon"), coordinates: z.array(Ring).min(1) }),
  z.strictObject({ type: z.literal("MultiPolygon"), coordinates: z.array(z.array(Ring).min(1)).min(1) }),
]);

/** public/geo/land/<id>.json: Natural Earth land cut to one map's frame by scripts/build-land.ts; bbox is the cut. */
export const Land = z.strictObject({
  type: z.literal("MultiPolygon"),
  /** [west, south, east, north]; the whole globe when the map's frame reached off it. */
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  coordinates: z.array(z.array(Ring).min(1)).min(1),
});

export const BorderPolity = z.strictObject({
  id: Id,
  label: LocalizedText,
  role: z.enum(["self", "rival"]),
  /** GeoJSON, [lon, lat], pre-simplified before committing. */
  geometry: Geometry,
});

export const Borders = z
  .strictObject({
    /** Exactly one of cultureId and warId: whose map this is. */
    cultureId: Id.optional(),
    warId: Id.optional(),
    sources: z.array(Source).min(1),
    snapshots: z
      .array(z.strictObject({ year: Year, polities: z.array(BorderPolity).min(1) }))
      .min(1),
  })
  .superRefine((b, ctx) => {
    if ((b.cultureId === undefined) === (b.warId === undefined)) {
      ctx.addIssue({ code: "custom", message: "give exactly one of cultureId and warId" });
    }
    for (let i = 1; i < b.snapshots.length; i++) {
      if (b.snapshots[i].year <= b.snapshots[i - 1].year) {
        ctx.addIssue({ code: "custom", message: "snapshots must be in strictly ascending year order" });
      }
    }
  });

/**
 * "Y came after X in this place": place is a real area (the Valley of Mexico,
 * Britain), never a whole region. All three languages required: it is shown as is.
 */
export const SuccessionLink = z
  .strictObject({
    from: Id,
    to: Id,
    place: z.strictObject({ en: Text, es: Text, zh: Text }),
    sources: z.array(Source).min(1),
    note: LocalizedText.optional(),
  })
  .refine((l) => l.from !== l.to, { message: "a culture cannot follow itself" });
export const Succession = z.array(SuccessionLink);

export const RegistryEntry = z.strictObject({
  id: Id,
  region: Region,
  /** English working label so contributors know what the id means. Not displayed. */
  label: Text,
});
export const Registry = z.strictObject({ cultures: z.array(RegistryEntry).min(1) });
/** data/popular.json: the home page's starting points, shown in this order. */
export const Popular = z.strictObject({ cultures: z.array(Id).min(1) });

export type Region = z.infer<typeof Region>;
export type EventType = z.infer<typeof EventType>;
export type LocalizedText = z.infer<typeof LocalizedText>;
export type Source = z.infer<typeof Source>;
export type NativeName = z.infer<typeof NativeName>;
export type Period = z.infer<typeof Period>;
export type Phase = z.infer<typeof Phase>;
export type Place = z.infer<typeof Place>;
export type CultureEvent = z.infer<typeof CultureEvent>;
export type Fact = z.infer<typeof Fact>;
export type Culture = z.infer<typeof Culture>;
export type Geometry = z.infer<typeof Geometry>;
export type Land = z.infer<typeof Land>;
export type BorderPolity = z.infer<typeof BorderPolity>;
export type Borders = z.infer<typeof Borders>;
export type SuccessionLink = z.infer<typeof SuccessionLink>;
export type RegistryEntry = z.infer<typeof RegistryEntry>;
export type Registry = z.infer<typeof Registry>;

export function duplicates(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) dups.add(id);
    seen.add(id);
  }
  return [...dups];
}
