import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, checkUploadBytes, checkUploadHeaders } from "./upload";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);

describe("checkUploadHeaders", () => {
  it("accepts a JPEG within the cap", () => {
    expect(checkUploadHeaders("image/jpeg", "1000")).toEqual({ ok: true, mediaType: "image/jpeg" });
  });

  it("rejects anything that isn't an image type the model reads", () => {
    for (const type of ["text/plain", "application/json", "image/svg+xml", "image/heic", null]) {
      expect(checkUploadHeaders(type, "1000")).toEqual({ ok: false, error: "bad-image" });
    }
  });

  it("caps the declared size at 2 MB", () => {
    expect(MAX_UPLOAD_BYTES).toBe(2 * 1024 * 1024);
    expect(checkUploadHeaders("image/jpeg", String(MAX_UPLOAD_BYTES)).ok).toBe(true);
    expect(checkUploadHeaders("image/jpeg", String(MAX_UPLOAD_BYTES + 1))).toEqual({ ok: false, error: "too-large" });
  });
});

describe("checkUploadBytes", () => {
  it("accepts bytes that match the declared type", () => {
    expect(checkUploadBytes("image/jpeg", JPEG)).toEqual({ ok: true, mediaType: "image/jpeg" });
    expect(checkUploadBytes("image/png", PNG)).toEqual({ ok: true, mediaType: "image/png" });
  });

  it("rejects bytes that don't match the declared type, and an empty body", () => {
    expect(checkUploadBytes("image/jpeg", PNG)).toEqual({ ok: false, error: "bad-image" });
    expect(checkUploadBytes("image/jpeg", new TextEncoder().encode("hello"))).toEqual({ ok: false, error: "bad-image" });
    expect(checkUploadBytes("image/jpeg", new Uint8Array())).toEqual({ ok: false, error: "bad-image" });
  });

  it("rejects a body over the cap even when the header lied", () => {
    const big = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    big.set(JPEG);
    expect(checkUploadBytes("image/jpeg", big)).toEqual({ ok: false, error: "too-large" });
  });
});
