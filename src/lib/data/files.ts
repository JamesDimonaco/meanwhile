import fs from "node:fs";
import path from "node:path";
import type { Culture } from "./schema";
import type { DataFile } from "./validate";

// Server only (fs), and kept apart from load.ts: POST /api/scan imports only
// this. File tracing follows a path built from process.cwd() and copies that
// whole directory into the function, so nothing here names data/ alone: the
// scan function carries data/cultures and not the wars or borders.

export function readJsonFiles(dir: string): DataFile[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const full = path.join(dir, f);
      return {
        path: path.relative(process.cwd(), full).split(path.sep).join("/"),
        data: JSON.parse(fs.readFileSync(full, "utf8")) as unknown,
      };
    });
}

/** What the scan prompt reads from each culture. */
export type CatalogueCulture = Pick<Culture, "id" | "name" | "nativeName" | "aliases" | "periods">;

/** The culture files as they are on disk, sorted by id like loadCultures; the build has already validated them. */
export function readCatalogueCultures(): CatalogueCulture[] {
  return readJsonFiles(path.join(process.cwd(), "data", "cultures"))
    .map((f) => f.data as CatalogueCulture)
    .sort((a, b) => (a.id < b.id ? -1 : 1));
}
