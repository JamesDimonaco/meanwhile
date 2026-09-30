import { hasTerritoryMap, loadBorders, loadCultures } from "@/lib/data/load";

export const dynamic = "force-static";

// Served as one static file so the map fetches borders after first paint
// instead of shipping them inside the page.
export function GET() {
  const borders = loadCultures()
    .filter((c) => hasTerritoryMap(c.id))
    .map((c) => loadBorders(c.id));
  return Response.json(borders);
}
