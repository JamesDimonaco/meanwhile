import Anthropic from "@anthropic-ai/sdk";
import { loadCultures } from "@/lib/data/load";
import { decideScan } from "@/lib/scan/answer";
import { buildScanSystemPrompt } from "@/lib/scan/prompt";
import { createRateLimiter, SCAN_INSTANCE_LIMIT, SCAN_RATE_LIMIT } from "@/lib/scan/rate-limit";
import { readPlacard, type Catalogue } from "@/lib/scan/read-placard";
import type { ScanResponse } from "@/lib/scan/result";
import { checkUploadBytes, checkUploadHeaders, type UploadError } from "@/lib/scan/upload";

export const runtime = "nodejs";
export const maxDuration = 30;

const perIp = createRateLimiter(SCAN_RATE_LIMIT);
const perInstance = createRateLimiter(SCAN_INSTANCE_LIMIT);

let catalogue: Catalogue | undefined;
function getCatalogue(): Catalogue {
  if (!catalogue) {
    const cultures = loadCultures();
    catalogue = { system: buildScanSystemPrompt(cultures), ids: cultures.map((c) => c.id) };
  }
  return catalogue;
}

function reply(body: ScanResponse, status: number): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

const UPLOAD_STATUS: Record<UploadError, number> = { "bad-image": 415, "too-large": 413 };

// Vercel sets both headers itself and overwrites what the client sent.
function clientIp(headers: Headers): string {
  return headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

/** Reads a placard photo. The image is only held in memory for this call: never stored or logged. */
export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return reply({ status: "error", error: "unavailable" }, 503);

  const now = Date.now();
  if (!perIp.take(clientIp(request.headers), now) || !perInstance.take("all", now)) {
    return reply({ status: "error", error: "rate-limited" }, 429);
  }

  const declared = checkUploadHeaders(request.headers.get("content-type"), request.headers.get("content-length"));
  if (!declared.ok) return reply({ status: "error", error: declared.error }, UPLOAD_STATUS[declared.error]);
  const bytes = new Uint8Array(await request.arrayBuffer());
  const upload = checkUploadBytes(declared.mediaType, bytes);
  if (!upload.ok) return reply({ status: "error", error: upload.error }, UPLOAD_STATUS[upload.error]);

  const { system, ids } = getCatalogue();
  try {
    const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 25_000 });
    const answer = await readPlacard(client, { system, ids }, { mediaType: upload.mediaType, bytes });
    if (!answer) return reply({ status: "error", error: "failed" }, 502);
    return reply({ status: "ok", result: decideScan(answer, new Set(ids)) }, 200);
  } catch (error) {
    // The error's name and status only: an SDK error can echo the request.
    const status = error instanceof Anthropic.APIError ? error.status : undefined;
    console.error(`scan: model call failed ${error instanceof Error ? error.name : "unknown"} ${status ?? ""}`);
    return reply({ status: "error", error: "failed" }, 502);
  }
}
