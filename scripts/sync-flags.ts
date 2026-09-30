import fs from "node:fs";
import path from "node:path";
import { Today } from "../src/lib/data/heartland";

// Copies the flag-icons SVG for every code in data/today.json into
// public/flags and deletes the rest, so the site ships only flags it shows.
// The MIT licence travels with the copies, as it requires.

const PACKAGE = path.join(process.cwd(), "node_modules/flag-icons");
const SOURCE = path.join(PACKAGE, "flags/4x3");
const TARGET = path.join(process.cwd(), "public/flags");

const today = Today.parse(JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/today.json"), "utf8")));
const wanted = new Set(Object.values(today).flatMap((codes) => codes.map((c) => `${c.toLowerCase()}.svg`)));

fs.mkdirSync(TARGET, { recursive: true });
for (const file of fs.readdirSync(TARGET)) {
  if (file.endsWith(".svg") && !wanted.has(file)) fs.rmSync(path.join(TARGET, file));
}
for (const file of wanted) fs.copyFileSync(path.join(SOURCE, file), path.join(TARGET, file));
fs.copyFileSync(path.join(PACKAGE, "LICENSE"), path.join(TARGET, "LICENSE"));
console.log(`public/flags: ${[...wanted].sort().join(", ")}`);
