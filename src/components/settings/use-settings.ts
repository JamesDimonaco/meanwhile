"use client";

import { useSyncExternalStore } from "react";
import type { EraStyle } from "@/lib/years";

export type Settings = { eraStyle: EraStyle; showYearsAgo: boolean };

const STORAGE_KEY = "meanwhile.settings";
const DEFAULTS: Settings = { eraStyle: "ce", showYearsAgo: false };

const listeners = new Set<() => void>();
let snapshot: Settings | null = null;

function read(): Settings {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<Settings>;
    return { eraStyle: parsed.eraStyle === "ad" ? "ad" : "ce", showYearsAgo: parsed.showYearsAgo === true };
  } catch {
    return DEFAULTS;
  }
}

function getSnapshot(): Settings {
  snapshot ??= read();
  return snapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updateSettings(patch: Partial<Settings>) {
  snapshot = { ...getSnapshot(), ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Private mode or storage blocked: keep the setting for this visit only.
  }
  for (const listener of listeners) listener();
}

/**
 * Era style (CE/BCE default, or BC/AD) and the years-ago toggle, remembered
 * per browser. Static HTML renders with the defaults, then hydrates.
 */
export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULTS);
}
