import { describe, expect, it } from "vitest";
import { LOCALES } from "./locales";
import { NAMESPACES } from "./namespaces";

type Json = { [key: string]: Json } | string;

async function messageFile(locale: string, ns: string): Promise<Json> {
  return ((await import(`../../messages/${locale}/${ns}.json`)) as { default: Json }).default;
}

function strings(value: Json, path: string, out: [string, string][] = []): [string, string][] {
  if (typeof value === "string") out.push([path, value]);
  else for (const [key, v] of Object.entries(value)) strings(v, `${path}.${key}`, out);
  return out;
}

// The brand changes in common.appName alone; a message that names the app says {appName}, so no copy is left behind.
describe("the app's name in messages", () => {
  it("is written out only in common.appName", async () => {
    const brands = await Promise.all(LOCALES.map(async (l) => ((await messageFile(l, "common")) as { appName: string }).appName));
    const found: string[] = [];
    for (const locale of LOCALES) {
      for (const ns of NAMESPACES) {
        for (const [path, text] of strings(await messageFile(locale, ns), `${locale}/${ns}`)) {
          if (path.endsWith("/common.appName")) continue;
          if (brands.some((brand) => text.includes(brand))) found.push(path);
        }
      }
    }
    expect(found).toEqual([]);
  });
});
