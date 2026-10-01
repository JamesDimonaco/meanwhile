import type { ScanError, ScanResponse, ScanResult } from "@/lib/scan/result";

export type Problem = "offline" | "unavailable" | "rateLimited" | "badImage" | "failed";

const PROBLEM: Record<ScanError, Problem> = {
  unavailable: "unavailable",
  "rate-limited": "rateLimited",
  "bad-image": "badImage",
  "too-large": "badImage",
  failed: "failed",
};

export type ScanOutcome = { kind: "problem"; problem: Problem } | { kind: "read"; result: ScanResult };

export type ScanSteps = {
  downscale: (file: Blob) => Promise<Blob>;
  upload: (photo: Blob, signal: AbortSignal) => Promise<ScanResponse>;
  /** Called once the photo is ready and the upload starts. */
  onUpload: () => void;
  isOnline: () => boolean;
};

/** Downscale, upload, read the reply. Null when `signal` aborted: the scan was cancelled, so show and do nothing. */
export async function scanPhoto(file: Blob, signal: AbortSignal, steps: ScanSteps): Promise<ScanOutcome | null> {
  let photo: Blob;
  try {
    photo = await steps.downscale(file);
  } catch {
    return signal.aborted ? null : { kind: "problem", problem: "badImage" };
  }
  if (signal.aborted) return null;

  steps.onUpload();
  let body: ScanResponse;
  try {
    body = await steps.upload(photo, signal);
  } catch {
    if (signal.aborted) return null;
    return { kind: "problem", problem: steps.isOnline() ? "failed" : "offline" };
  }
  if (signal.aborted) return null;

  if (body.status === "error") return { kind: "problem", problem: PROBLEM[body.error] };
  return { kind: "read", result: body.result };
}
