import { hasTerritoryMap, loadAllWars, loadBorders, loadCultures } from "@/lib/data/load";

export const dynamic = "force-static";
export const dynamicParams = false;

// One static file per culture or war map, fetched after first paint, so a
// map page downloads only its own borders instead of every empire's.
export function generateStaticParams() {
  return [...loadCultures(), ...loadAllWars()]
    .filter((item) => hasTerritoryMap(item.id))
    .map((item) => ({ file: `${item.id}.json` }));
}

export async function GET(_request: Request, { params }: RouteContext<"/geo/borders/[file]">) {
  const { file } = await params;
  return Response.json(loadBorders(file.replace(/\.json$/, "")));
}
