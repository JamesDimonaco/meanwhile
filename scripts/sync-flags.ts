import fs from "node:fs";
import path from "node:path";
import { Today } from "../src/lib/data/heartland";
import { WarFile } from "../src/lib/data/war-schema";
import { warCountryCodes } from "../src/lib/data/wars";

// Copies the flag-icons SVG for every code in data/today.json and the wars into
// public/flags and deletes the rest, so the site ships only flags it shows.
// The MIT licence travels with the copies, as it requires.

const PACKAGE = path.join(process.cwd(), "node_modules/flag-icons");
const SOURCE = path.join(PACKAGE, "flags/4x3");
const TARGET = path.join(process.cwd(), "public/flags");

const today = Today.parse(JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/today.json"), "utf8")));
// Read straight from the files, skipping any that don't parse, so one
// half-written war doesn't block every other war's flags. validate-data
// reports what is wrong with the skipped file.
const WARS = path.join(process.cwd(), "data/wars");
const warCodes = warCountryCodes(
  (fs.existsSync(WARS) ? fs.readdirSync(WARS) : [])
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => {
      const file = path.join(WARS, f);
      let json: unknown;
      try {
        json = JSON.parse(fs.readFileSync(file, "utf8"));
      } catch {
        console.warn(`skipped data/wars/${f}: not valid JSON, so its flags are not synced`);
        return [];
      }
      const war = WarFile.safeParse(json);
      if (!war.success) console.warn(`skipped data/wars/${f}: fails the schema, so its flags are not synced`);
      return war.success ? [war.data] : [];
    }),
);
const wanted = new Set([...Object.values(today).flat(), ...warCodes].map((c) => `${c.toLowerCase()}.svg`));

fs.mkdirSync(TARGET, { recursive: true });
for (const file of fs.readdirSync(TARGET)) {
  if (file.endsWith(".svg") && !wanted.has(file)) fs.rmSync(path.join(TARGET, file));
}
for (const file of wanted) fs.copyFileSync(path.join(SOURCE, file), path.join(TARGET, file));
fs.copyFileSync(path.join(PACKAGE, "LICENSE"), path.join(TARGET, "LICENSE"));
console.log(`public/flags: ${[...wanted].sort().join(", ")}`);
