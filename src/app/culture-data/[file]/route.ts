import { toCompareCulture } from "@/components/compare/compare-data";
import { loadCulture, loadCultures } from "@/lib/data/load";

export const dynamic = "force-static";
export const dynamicParams = false;

// One static file per culture (/culture-data/<id>.json): the compare page
// is the same for every pair, so it fetches only the cultures it shows.
export function generateStaticParams() {
  return loadCultures().map((c) => ({ file: `${c.id}.json` }));
}

export async function GET(_request: Request, { params }: RouteContext<"/culture-data/[file]">) {
  const { file } = await params;
  return Response.json(toCompareCulture(loadCulture(file.replace(/\.json$/, "")), loadCultures()));
}
