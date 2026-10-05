import { createTranslator } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { LOCALES } from "@/i18n/locales";
import { loadMessages } from "@/i18n/messages";
import { NEVER_SHOWN } from "@/lib/data/countries";
import { generateMetadata, generateStaticParams } from "./page";

vi.mock("next-intl/server", () => ({
  setRequestLocale: () => {},
  getTranslations: async () => (key: string, values?: Record<string, string>) => `${key}${values ? JSON.stringify(values) : ""}`,
}));
// next-intl's navigation can't load outside Next; metadata never renders a Link.
vi.mock("@/i18n/navigation", () => ({ Link: () => null }));

const codes = (locale: string) => generateStaticParams({ params: { locale } }).map((p) => p.code);

describe("country pages", () => {
  it.each(["en", "es", "zh"])("never exist for a disputed or politically loaded code in %s", (locale) => {
    for (const code of NEVER_SHOWN) expect(codes(locale)).not.toContain(code.toLowerCase());
  });

  it("exist for a civilisation's country with no war, and for a war's country with no civilisation", () => {
    for (const locale of ["en", "es", "zh"]) {
      expect(codes(locale)).toContain("pe");
      expect(codes(locale)).toContain("vn");
    }
  });

  // South Korea's only war is the Korean War, behind the review gate in es and zh.
  it("exist only in English for a country whose only entries are gated wars", () => {
    expect(codes("en")).toContain("kr");
    expect(codes("es")).not.toContain("kr");
    expect(codes("zh")).not.toContain("kr");
  });

  it("titles the page with the country's name and keeps hreflang to the languages it exists in", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: "en", code: "kr" }), searchParams: Promise.resolve({}) });
    expect(meta.title).toMatch(/^title\{"country":"South Korea","cultures":0,"wars":[1-9]\d*\}$/);
    expect(meta.description).toMatch(/^metaDescription\{"country":"South Korea","cultures":0,"wars":[1-9]\d*,"name":"Korean War"\}$/);
    expect(Object.keys(meta.alternates?.languages ?? {})).toEqual(["en", "x-default"]);
    expect(meta.openGraph?.images).toEqual([expect.objectContaining({ url: "/en/opengraph-image/" })]);
  });
});

describe("the intro line", () => {
  const intro = async (locale: (typeof LOCALES)[number], cultures: number, wars: number) =>
    createTranslator({ locale, messages: await loadMessages(locale) })("country.intro", { country: "X", cultures, wars });

  it("names only what the page lists", async () => {
    expect(await intro("en", 0, 2)).toBe("Wars fought on the land of today's X or by its peoples.");
    expect(await intro("en", 1, 0)).toBe("Civilisations whose heartland lies in today's X.");
    expect(await intro("en", 2, 3)).toBe("Civilisations whose heartland lies in today's X, and wars fought on its land or by its peoples.");
  });

  // Ukraine and Vietnam list wars only; Bolivia a civilisation only.
  it.each(LOCALES)("in %s, never mentions civilisations on a wars-only page, or wars on a civilisations-only page", async (locale) => {
    const messages = await loadMessages(locale);
    const t = createTranslator({ locale, messages });
    expect((await intro(locale, 0, 2)).toLowerCase()).not.toContain(t("country.cultures").toLowerCase());
    expect((await intro(locale, 1, 0)).toLowerCase()).not.toContain(t("country.wars").toLowerCase());
  });
});

describe("the title and meta description", () => {
  const text = async (locale: (typeof LOCALES)[number], key: "title" | "metaDescription", cultures: number, wars: number) =>
    createTranslator({ locale, messages: await loadMessages(locale) })(`country.${key}`, { country: "X", cultures, wars, name: "A" });
  // The clause promising which items overlapped, which a one-item page can't keep.
  const sameTime = { en: "at the same time", es: "coincidieron", zh: "同时" };

  it("names only what the page lists", async () => {
    expect(await text("en", "title", 0, 2)).toBe("Wars in X: a timeline");
    expect(await text("en", "title", 1, 0)).toBe("X: timeline of civilisations");
    expect(await text("en", "title", 2, 3)).toBe("X: timeline of civilisations and wars");
    expect(await text("zh", "title", 0, 2)).toBe("X的战争时间线");
    expect(await text("es", "title", 2, 3)).toBe("Cronología de X: civilizaciones y guerras");
  });

  // "越南" + "战争" reads as 越南战争, the Vietnam War's zh title, which the review gate keeps out of zh.
  it("never runs a zh country name into 战争, which would spell a war's title", async () => {
    const title = createTranslator({ locale: "zh", messages: await loadMessages("zh") })("country.title", { country: "越南", cultures: 0, wars: 2 });
    expect(title).not.toContain("越南战争");
  });

  // A one-item page's generic sentence was 17 to 39 characters: it names its item instead.
  it.each(LOCALES)("in %s, names the item on a one-item page", async (locale) => {
    expect(await text(locale, "metaDescription", 1, 0)).toContain("A");
    expect(await text(locale, "metaDescription", 0, 1)).toContain("A");
  });

  it("words a one-item page's description around the item's name", async () => {
    expect(await text("en", "metaDescription", 1, 0)).toBe("A in today's X, on a timeline.");
    expect(await text("en", "metaDescription", 0, 3)).toBe(
      "Every war in today's X on one timeline, oldest first, and which of them were happening at the same time.",
    );
  });

  // Ukraine, Vietnam and South Korea list wars only; Bolivia a civilisation only.
  // Stems, so a singular ("The war", "La civilización") counts too.
  const words = { en: ["civilisation", "war"], es: ["civiliza", "guerra"], zh: ["文明", "战争"] };

  it.each(LOCALES)("in %s, never mentions civilisations on a wars-only page, or wars on a civilisations-only page", async (locale) => {
    const [cultures, wars] = words[locale];
    for (const key of ["title", "metaDescription"] as const) {
      for (const n of [1, 2]) {
        expect((await text(locale, key, 0, n)).toLowerCase()).not.toContain(cultures);
        expect((await text(locale, key, n, 0)).toLowerCase()).not.toContain(wars);
      }
    }
  });

  it.each(LOCALES)("in %s, promises overlaps only when the page lists more than one item", async (locale) => {
    expect(await text(locale, "metaDescription", 1, 0)).not.toContain(sameTime[locale]);
    expect(await text(locale, "metaDescription", 0, 1)).not.toContain(sameTime[locale]);
    expect(await text(locale, "metaDescription", 1, 1)).toContain(sameTime[locale]);
    expect(await text(locale, "metaDescription", 0, 2)).toContain(sameTime[locale]);
  });
});
