import { describe, expect, it } from "vitest";
import { loadAllWars } from "@/lib/data/load";
import { isShownIn } from "@/lib/data/wars";
import { generateStaticParams } from "./opengraph-image";

// The share image is a page of its own: a war hidden in a language by the
// review gate must not get one there either.
describe("war share images", () => {
  const params = generateStaticParams();

  it("exist exactly where the war's page does", () => {
    const expected = loadAllWars().flatMap((w) => (["en", "es", "zh"] as const).filter((l) => isShownIn(w, l)).map((locale) => ({ locale, id: w.id })));
    expect(params).toEqual(expect.arrayContaining(expected));
    expect(params).toHaveLength(expected.length);
  });
});
