"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Region } from "@/lib/data/schema";
import { normalizeSelection } from "./region-filter";

export const REGION_STORAGE_KEY = "meanwhile.regions";
const ALL: readonly string[] = [];

const listeners = new Set<() => void>();
let snapshot: readonly string[] | null = null;

function read(): readonly string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(REGION_STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : ALL;
  } catch {
    return ALL;
  }
}

function getSnapshot(): readonly string[] {
  snapshot ??= read();
  return snapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function saveRegionFilter(selection: readonly Region[]) {
  snapshot = selection;
  try {
    localStorage.setItem(REGION_STORAGE_KEY, JSON.stringify(selection));
  } catch {
    // Private mode or storage blocked: keep the filter for this visit only.
  }
  for (const listener of listeners) listener();
}

/**
 * The regions this device last picked (empty = All). Static HTML renders
 * with All, then hydrates to the stored choice.
 */
export function useRegionFilter(available: readonly Region[]): Region[] {
  const stored = useSyncExternalStore(subscribe, getSnapshot, () => ALL);
  return useMemo(() => normalizeSelection(stored, available), [stored, available]);
}
