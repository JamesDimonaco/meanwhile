"use client";

import { useSearchParams } from "next/navigation";
import { SearchBox } from "./search-box";
import type { Region } from "@/lib/data/schema";
import type { SearchEntry } from "./search-index";

/** The search box, prefilled from ?q= (a scan that found no match links here). */
export function SearchFromUrl({ entries, regions }: { entries: SearchEntry[]; regions: Region[] }) {
  const q = useSearchParams().get("q") ?? "";
  return <SearchBox key={q} entries={entries} regions={regions} initialQuery={q} />;
}
