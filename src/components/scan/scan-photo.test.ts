import { describe, expect, it, vi } from "vitest";
import type { ScanResponse } from "@/lib/scan/result";
import { scanPhoto, type ScanSteps } from "./scan-photo";

const READ: ScanResponse = {
  status: "ok",
  result: { destination: { kind: "culture", id: "shang" }, reading: { text: "商", language: "zh-Hans", year: null } },
};

function steps(over: Partial<ScanSteps> = {}) {
  return {
    downscale: vi.fn(async (file: Blob) => file),
    upload: vi.fn(async () => READ),
    onUpload: vi.fn(),
    isOnline: () => true,
    ...over,
  };
}

describe("scanPhoto", () => {
  it("downscales, uploads and returns the reading", async () => {
    const s = steps();
    expect(await scanPhoto(new Blob(), new AbortController().signal, s)).toEqual({ kind: "read", result: READ.result });
    expect(s.onUpload).toHaveBeenCalledOnce();
  });

  it("never uploads when the dialog is closed while the photo is still being downscaled", async () => {
    const controller = new AbortController();
    const s = steps({
      downscale: vi.fn(async (file: Blob) => {
        controller.abort();
        return file;
      }),
    });
    expect(await scanPhoto(new Blob(), controller.signal, s)).toBeNull();
    expect(s.upload).not.toHaveBeenCalled();
    expect(s.onUpload).not.toHaveBeenCalled();
  });

  it("says nothing about a bad image the person already cancelled", async () => {
    const controller = new AbortController();
    const s = steps({
      downscale: vi.fn(async () => {
        controller.abort();
        throw new Error("decode failed");
      }),
    });
    expect(await scanPhoto(new Blob(), controller.signal, s)).toBeNull();
  });

  it("drops a reply that lands after the dialog was closed", async () => {
    const controller = new AbortController();
    const s = steps({
      upload: vi.fn(async () => {
        controller.abort();
        return READ;
      }),
    });
    expect(await scanPhoto(new Blob(), controller.signal, s)).toBeNull();
  });

  it("maps a failed upload to offline or failed by the connection", async () => {
    const upload = vi.fn(async () => {
      throw new TypeError("network");
    });
    expect(await scanPhoto(new Blob(), new AbortController().signal, steps({ upload, isOnline: () => false }))).toEqual(
      { kind: "problem", problem: "offline" },
    );
    expect(await scanPhoto(new Blob(), new AbortController().signal, steps({ upload }))).toEqual({
      kind: "problem",
      problem: "failed",
    });
  });
});
