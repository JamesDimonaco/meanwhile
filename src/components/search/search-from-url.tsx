"use client";

import { useSearchParams } from "next/navigation";
import { SearchBox } from "./search-box";
import type { Region } from "@/lib/data/schema";
import type { SearchEntry, WarSearchEntry } from "./search-index";

/** The search box, prefilled from ?q= (a scan that found no match links here). */
export function SearchFromUrl({ entries, wars, regions }: { entries: SearchEntry[]; wars: WarSearchEntry[]; regions: Region[] }) {
  const q = useSearchParams().get("q") ?? "";
  return <SearchBox key={q} entries={entries} wars={wars} regions={regions} initialQuery={q} />;
}
