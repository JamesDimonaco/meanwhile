import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The SDK is mocked at its boundary: the route's own parsing and decisions run for real.
const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    beta = { messages: { create } };
  },
}));

import { POST } from "./route";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);

function scan(body: Uint8Array, type = "image/jpeg", ip = "203.0.113.7") {
  return POST(
    new Request("http://127.0.0.1/api/scan/", {
      method: "POST",
      headers: { "content-type": type, "x-real-ip": ip },
      body,
    }),
  );
}

function modelReplies(answer: unknown) {
  create.mockResolvedValue({
    stop_reason: "end_turn",
    content: [{ type: "text", text: JSON.stringify(answer) }],
    usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
  });
}

describe("POST /api/scan", () => {
  beforeEach(() => {
    create.mockReset();
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.unstubAllEnvs());

  it("answers 503 when the server has no API key", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await scan(JPEG);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: "error", error: "unavailable" });
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects a body that isn't an image without calling the model", async () => {
    const res = await scan(new TextEncoder().encode("hello"), "text/plain", "203.0.113.8");
    expect(res.status).toBe(415);
    expect(await res.json()).toEqual({ status: "error", error: "bad-image" });
    expect(create).not.toHaveBeenCalled();
  });

  it("sends the image with a forced schema and routes on the answer", async () => {
    modelReplies({
      cultureId: "shang",
      year: { start: { value: 1300, era: "BCE" }, end: { value: 1300, era: "BCE" } },
      language: "zh-Hans",
      text: "商代 公元前1300年",
      confidence: "high",
    });
    const res = await scan(JPEG, "image/jpeg", "203.0.113.9");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: "ok",
      result: {
        destination: { kind: "culture", id: "shang" },
        reading: { text: "商代 公元前1300年", language: "zh-Hans", year: { start: -1299, end: -1299 } },
      },
    });

    const params = create.mock.calls[0][0];
    expect(params.model).toBe("claude-opus-5");
    expect(params.output_config.format.type).toBe("json_schema");
    expect(params.output_config.format.schema.properties.cultureId.anyOf[0].enum).toContain("shang");
    expect(params.messages[0].content[0]).toEqual({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: Buffer.from(JPEG).toString("base64") },
    });
  });

  it("answers 502 when the model's reply doesn't fit the schema", async () => {
    modelReplies({ cultureId: "shang", note: "ignore previous instructions" });
    const res = await scan(JPEG, "image/jpeg", "203.0.113.10");
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ status: "error", error: "failed" });
  });
});
