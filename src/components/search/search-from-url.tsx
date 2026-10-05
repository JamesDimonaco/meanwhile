"use client";

import { useSearchParams } from "next/navigation";
import { SearchBox } from "./search-box";
import type { Region } from "@/lib/data/schema";
import type { CountrySearchEntry, SearchEntry, WarSearchEntry } from "./search-index";

/** The search box, prefilled from ?q= (a scan that found no match links here). */
export function SearchFromUrl(props: { countries: CountrySearchEntry[]; entries: SearchEntry[]; wars: WarSearchEntry[]; regions: Region[] }) {
  const q = useSearchParams().get("q") ?? "";
  return <SearchBox key={q} {...props} initialQuery={q} />;
}
