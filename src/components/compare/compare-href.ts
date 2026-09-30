/** The shareable compare URL for these culture ids, in the shape Link takes. */
export function compareHref(ids: readonly string[]) {
  return ids.length === 0 ? "/compare" : { pathname: "/compare", query: { ids: ids.join(",") } };
}

/** Known ids from ?ids=, in order, without repeats. */
export function parseCompareIds(value: string | null, known: ReadonlySet<string>): string[] {
  const ids = (value ?? "").split(",").map((s) => s.trim());
  return [...new Set(ids)].filter((id) => known.has(id));
}
