import { describe, expect, it } from "vitest";
import { pickLocale } from "./pick-locale";

const SUPPORTED = ["en", "es", "zh"];

describe("pickLocale", () => {
  it("prefers the locale the visitor chose before", () => {
    expect(pickLocale("zh", ["es-ES"], SUPPORTED, "en")).toBe("zh");
  });

  it("ignores a saved value that is not a supported locale", () => {
    expect(pickLocale("fr", ["es-MX"], SUPPORTED, "en")).toBe("es");
  });

  it("takes the first browser language we support, by base language", () => {
    expect(pickLocale(null, ["fr-FR", "zh-CN", "es"], SUPPORTED, "en")).toBe("zh");
    expect(pickLocale(null, ["zh-TW"], SUPPORTED, "en")).toBe("zh");
    expect(pickLocale(null, ["ES-419"], SUPPORTED, "en")).toBe("es");
  });

  it("falls back to English", () => {
    expect(pickLocale(null, ["fr-FR", "de"], SUPPORTED, "en")).toBe("en");
    expect(pickLocale(null, [], SUPPORTED, "en")).toBe("en");
  });

  it("still works after being serialised into an inline script", () => {
    const fn = new Function(`return (${pickLocale.toString()})`)() as typeof pickLocale;
    expect(fn(null, ["zh-CN"], SUPPORTED, "en")).toBe("zh");
  });
});
