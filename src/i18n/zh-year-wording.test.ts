import fs from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import { NAMESPACES } from "./namespaces";

// With the years-ago toggle on, <YearText> ends in common.yearsAgo ("约…年前").
// A zh message that puts 前后 or 之前 straight after the year then reads
// "约2,200年前前后", so every <year></year> slot is checked with that suffix.

function messages(namespace: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "messages/zh", `${namespace}.json`), "utf8"));
}

const yearsAgo = String(messages("common").yearsAgo).replace("{count, number}", "2,200");
const yearWithYearsAgo = `公元前216年 · ${yearsAgo}`;

const withYear = NAMESPACES.flatMap((namespace) =>
  Object.entries(messages(namespace))
    .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].includes("<year></year>"))
    .map(([key, text]) => [`${namespace}.${key}`, text.replace("<year></year>", yearWithYearsAgo)] as const),
);

it("finds the zh messages that show a year", () => {
  expect(withYear.length).toBeGreaterThan(0);
  expect(yearsAgo).toMatch(/前$/);
});

it.each(withYear)("zh %s reads cleanly with years-ago on", (_key, rendered) => {
  expect(rendered).not.toMatch(/前(前|之前|以前)/);
});
