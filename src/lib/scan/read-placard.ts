import type Anthropic from "@anthropic-ai/sdk";
import { ModelAnswer, answerJsonSchema } from "./answer";
import type { ImageMediaType } from "./upload";

export const SCAN_MODEL = "claude-opus-5";

export type Catalogue = { system: string; ids: string[] };

/** One vision call. Returns null when the reply isn't a complete, schema-valid answer. */
export async function readPlacard(
  client: Anthropic,
  catalogue: Catalogue,
  image: { mediaType: ImageMediaType; bytes: Uint8Array },
): Promise<ModelAnswer | null> {
  const started = Date.now();
  const response = await client.beta.messages.create({
    model: SCAN_MODEL,
    max_tokens: 4096,
    // A classifier decline is retried server-side on the recommended model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    // Reading a label is a lookup, not a puzzle; low effort keeps a scan to a few seconds.
    output_config: { effort: "low", format: { type: "json_schema", schema: answerJsonSchema(catalogue.ids) } },
    system: [{ type: "text", text: catalogue.system, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: image.mediaType, data: Buffer.from(image.bytes).toString("base64") },
          },
          { type: "text", text: "Read this placard." },
        ],
      },
    ],
  });

  const u = response.usage;
  console.info(
    `scan: ${response.model} ${response.stop_reason} ${Date.now() - started}ms in=${u.input_tokens} cache_read=${u.cache_read_input_tokens ?? 0} cache_write=${u.cache_creation_input_tokens ?? 0} out=${u.output_tokens}`,
  );

  if (response.stop_reason !== "end_turn") return null;
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return null;
  try {
    const parsed = ModelAnswer.safeParse(JSON.parse(text.text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
