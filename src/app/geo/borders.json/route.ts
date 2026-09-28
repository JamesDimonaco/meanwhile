import { hasTerritoryMap, loadBorders, loadCultures } from "@/lib/data/load";

export const dynamic = "force-static";

// Served as one static file so the map fetches borders after first paint
// instead of shipping them inside the page. One file, not one per culture:
// a dynamic segment with no borders yet fails the static export.
export function GET() {
  const borders = loadCultures()
    .filter((c) => hasTerritoryMap(c.id))
    .map((c) => loadBorders(c.id));
  return Response.json(borders);
}
