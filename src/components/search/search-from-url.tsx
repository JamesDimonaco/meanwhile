"use client";

import { useSearchParams } from "next/navigation";
import { SearchBox } from "./search-box";
import type { SearchEntry } from "./search-index";

/** The search box, prefilled from ?q= (a scan that found no match links here). */
export function SearchFromUrl({ entries }: { entries: SearchEntry[] }) {
  const q = useSearchParams().get("q") ?? "";
  return <SearchBox key={q} entries={entries} initialQuery={q} />;
}
