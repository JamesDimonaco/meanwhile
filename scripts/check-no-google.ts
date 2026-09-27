import fs from "node:fs";
import path from "node:path";

// Meanwhile must work in mainland China, where Google hosts are blocked.
const BANNED = /fonts\.googleapis\.com|fonts\.gstatic\.com|google-analytics\.com|googletagmanager\.com|maps\.googleapis\.com|www\.google\.com|ajax\.googleapis\.com/;

const OUT = path.join(process.cwd(), "out");
const hits: string[] = [];
for (const f of fs.readdirSync(OUT, { recursive: true, encoding: "utf8" })) {
  if (!/\.(html|js|css|json|webmanifest|txt)$/.test(f)) continue;
  const match = BANNED.exec(fs.readFileSync(path.join(OUT, f), "utf8"));
  if (match) hits.push(`out/${f}: ${match[0]}`);
}

if (hits.length > 0) {
  console.error(`Google hosts found in the build:\n${hits.join("\n")}`);
  process.exit(1);
}
console.log("No Google hosts in out/.");
