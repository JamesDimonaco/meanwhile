import fs from "node:fs";
import path from "node:path";

// The site must work in mainland China, where Google hosts are blocked.
const BANNED = /fonts\.googleapis\.com|fonts\.gstatic\.com|google-analytics\.com|googletagmanager\.com|maps\.googleapis\.com|www\.google\.com|ajax\.googleapis\.com/;

// Everything a browser can receive: client bundles, prerendered pages and
// route-handler bodies, and public assets. Server-only chunks never reach a phone.
const SCANNED: { dir: string; files: RegExp }[] = [
  { dir: ".next/static", files: /\.(js|css|json|txt)$/ },
  { dir: ".next/server/app", files: /\.(html|rsc|body|json|txt)$/ },
  { dir: "public", files: /\.(html|js|css|json|webmanifest|txt)$/ },
];

const hits: string[] = [];
let scanned = 0;
for (const { dir, files } of SCANNED) {
  const root = path.join(process.cwd(), dir);
  if (!fs.existsSync(root)) {
    console.error(`${dir} is missing: run next build first.`);
    process.exit(1);
  }
  for (const f of fs.readdirSync(root, { recursive: true, encoding: "utf8" })) {
    const full = path.join(root, f);
    // Route handlers build into directories named like files (geo/borders.json/).
    if (!files.test(f) || !fs.statSync(full).isFile()) continue;
    scanned++;
    const match = BANNED.exec(fs.readFileSync(full, "utf8"));
    if (match) hits.push(`${dir}/${f}: ${match[0]}`);
  }
}

if (hits.length > 0) {
  console.error(`Google hosts found in the build:\n${hits.join("\n")}`);
  process.exit(1);
}
console.log(`No Google hosts in ${scanned} built files.`);
