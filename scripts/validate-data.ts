import { readDataset } from "../src/lib/data/load";

const { errors, warnings, cultures, borders } = readDataset();

for (const w of warnings) console.warn(`warn: ${w}`);
for (const e of errors) console.error(`error: ${e}`);

if (errors.length > 0) {
  console.error(`\nData validation failed with ${errors.length} error(s).`);
  process.exit(1);
}
console.log(`Data OK: ${cultures.length} culture(s), ${borders.length} border file(s), ${warnings.length} warning(s).`);
