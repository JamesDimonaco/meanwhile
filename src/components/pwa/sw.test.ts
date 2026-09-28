import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  let holdPuts: Promise<void> = Promise.resolve();
  const cache = {
    put: async (key: Request | string, response: Response) => {
      await holdPuts;
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
    hold: () => {
      let release = () => {};
      holdPuts = new Promise((resolve) => (release = resolve));
      return release;
    },
  };
}

const settled = async (p: Promise<unknown>) => {
  let done = false;
  void p.then(
    () => (done = true),
    () => (done = true),
  );
  await vi.advanceTimersByTimeAsync(0);
  return done;
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

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

  it("keeps the worker alive until the response is written to the cache", async () => {
    const sw = setup();
    const release = sw.hold();
    sw.fetch.mockResolvedValueOnce(new Response("page"));
    const { response, waits } = sw.dispatch("/en/");
    await response;

    expect(waits.length).toBeGreaterThan(0);
    expect(await settled(Promise.all(waits))).toBe(false);
    release();
    await Promise.all(waits);
    expect(sw.entries.size).toBe(1);
  });

  it("falls back to the cache after 3 s when the network hangs on weak signal", async () => {
    const sw = setup();
    await sw.visit("/en/", "cached home");

    sw.fetch.mockReturnValueOnce(new Promise(() => {}));
    const { response } = sw.dispatch("/en/");
    await vi.advanceTimersByTimeAsync(2_999);
    expect(await settled(response)).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await settled(response)).toBe(true);
    expect(await (await response).text()).toBe("cached home");
  });

  it("keeps waiting on a slow network when nothing is cached", async () => {
    const sw = setup();
    sw.fetch.mockReturnValueOnce(
      new Promise((resolve) => setTimeout(() => resolve(new Response("slow but fresh")), 10_000)),
    );
    const { response } = sw.dispatch("/en/credits/");
    await vi.advanceTimersByTimeAsync(5_000);
    expect(await settled(response)).toBe(false);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(await (await response).text()).toBe("slow but fresh");
  });

  it("prefers a fast network over the cache", async () => {
    const sw = setup();
    await sw.visit("/en/", "old home");
    sw.fetch.mockResolvedValueOnce(new Response("new home"));
    const { response } = sw.dispatch("/en/");
    expect(await (await response).text()).toBe("new home");
  });
});
