// Apart from schema.ts so client components can use the list without
// pulling zod into the bundle.
export const REGIONS = [
  "china",
  "south-america",
  "mesoamerica",
  "europe",
  "africa",
  "middle-east",
  "south-asia",
  "asia-pacific",
  "north-america",
] as const;
