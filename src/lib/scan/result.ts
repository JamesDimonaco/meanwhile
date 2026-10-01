// What /api/scan replies with. Kept apart from answer.ts so the scan button,
// which every page renders, never pulls zod into the client bundle.

export type ScanDestination =
  | { kind: "culture"; id: string }
  | { kind: "year"; year: number }
  | { kind: "none" };

export type ScanResult = {
  destination: ScanDestination;
  reading: {
    text: string;
    language: string;
    /** Astronomical years. */
    year: { start: number; end: number } | null;
  };
};

export type ScanError = "unavailable" | "rate-limited" | "bad-image" | "too-large" | "failed";

/** The body of every /api/scan reply. */
export type ScanResponse = { status: "ok"; result: ScanResult } | { status: "error"; error: ScanError };

/** Where the timeline opens for a range read off a placard: its middle ("2nd century CE" -> 150). */
export function timelineYear(range: { start: number; end: number }): number {
  return Math.floor((range.start + range.end) / 2);
}
