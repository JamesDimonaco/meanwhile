import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

// Runs the real public/sw.js against an in-memory Cache API that keys
// entries the way browsers do: by full URL, query string included.

const ORIGIN = "https://meanwhile.test";
const source = fs.readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8");

type FetchEventLike = {
  request: Request;
  respondWith: (response: Promise<Response>) => void;
  waitUntil: (promise: Promise<unknown>) => void;
};
function urlOf(key: Request | string): string {
  return typeof key === "string" ? new URL(key, ORIGIN).href : key.url;
}

function setup() {
  const entries = new Map<string, Response>();
  const cache = {
    put: async (key: Request | string, response: Response) => {
      entries.set(urlOf(key), response);
    },
    match: async (key: Request | string) => entries.get(urlOf(key))?.clone(),
  };
  const caches = {
    open: async () => cache,
    match: cache.match,
    keys: async () => ["meanwhile-runtime"],
    delete: async () => true,
  };

  const listeners = new Map<string, (event: FetchEventLike) => void>();
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, listener: (event: FetchEventLike) => void) => listeners.set(type, listener),
    skipWaiting: () => undefined,
    clients: { claim: async () => undefined },
  };
  const fetch = vi.fn<(request: Request) => Promise<Response>>();
  new Function("self", "caches", "fetch", source)(self, caches, fetch);

  function dispatch(url: string) {
    let response: Promise<Response> | undefined;
    const waits: Promise<unknown>[] = [];
    listeners.get("fetch")?.({
      request: new Request(new URL(url, ORIGIN)),
      respondWith: (r) => (response = r),
      waitUntil: (p) => waits.push(p),
    });
    if (!response) throw new Error("service worker did not respond");
    return { response, waits };
  }

  /** A full online visit: respond, then let every waitUntil settle. */
  async function visit(url: string, body: string) {
    fetch.mockResolvedValueOnce(new Response(body));
    const { response, waits } = dispatch(url);
    await response;
    await Promise.all(waits);
  }

  return {
    entries,
    fetch,
    dispatch,
    visit,
  };
}

describe("service worker", () => {
  it("serves a visited page offline when only the query string differs", async () => {
    const sw = setup();
    await sw.visit("/en/timeline/?year=1", "timeline page");

    sw.fetch.mockRejectedValueOnce(new TypeError("offline"));
    const { response } = sw.dispatch("/en/timeline/?year=-263");
    expect(await (await response).text()).toBe("timeline page");
  });

  it("keeps one cache entry per path however many ?_rsc= prefetches arrive", async () => {
    const sw = setup();
    await sw.visit("/en/timeline/index.txt?_rsc=abc", "payload");
    await sw.visit("/en/timeline/index.txt?_rsc=xyz", "payload");
    expect(sw.entries.size).toBe(1);
  });

  it("prefers a fast network over the cache", async () => {
    const sw = setup();
    await sw.visit("/en/", "old home");
    sw.fetch.mockResolvedValueOnce(new Response("new home"));
    const { response } = sw.dispatch("/en/");
    expect(await (await response).text()).toBe("new home");
  });
});
