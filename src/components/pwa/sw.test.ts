import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Runs the real public/sw.js against an in-memory Cache API that keys
// entries the way browsers do: by full URL, query string included.

const ORIGIN = "https://meanwhile.test";
const source = fs.readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8");

type ExtendableEventLike = { waitUntil: (promise: Promise<unknown>) => void };
type FetchEventLike = ExtendableEventLike & {
  request: Request;
  respondWith: (response: Promise<Response>) => void;
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

  const listeners = new Map<string, (event: ExtendableEventLike) => void>();
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, listener: (event: ExtendableEventLike) => void) => listeners.set(type, listener),
    skipWaiting: () => undefined,
    clients: { claim: async () => undefined },
  };
  const fetch = vi.fn<(request: Request) => Promise<Response>>();
  new Function("self", "caches", "fetch", source)(self, caches, fetch);

  function dispatch(url: string, headers?: HeadersInit) {
    let response: Promise<Response> | undefined;
    const waits: Promise<unknown>[] = [];
    const event: FetchEventLike = {
      request: new Request(new URL(url, ORIGIN), { headers }),
      respondWith: (r) => (response = r),
      waitUntil: (p) => waits.push(p),
    };
    listeners.get("fetch")?.(event);
    if (!response) throw new Error("service worker did not respond");
    return { response, waits };
  }

  /** A full online visit: respond, then let every waitUntil settle. */
  async function visit(url: string, body: string, headers?: HeadersInit) {
    fetch.mockResolvedValueOnce(new Response(body));
    const { response, waits } = dispatch(url, headers);
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

  it("caches router payloads apart from the page's HTML, keyed by their full URL", async () => {
    const sw = setup();
    await sw.visit("/en/c/rome/", "rome page");
    // Next fetches payloads from the page's own path, marked by an RSC header;
    // ?_rsc= is a hash of the headers the payload varies on.
    await sw.visit("/en/c/rome/?_rsc=abc", "rome payload", { RSC: "1" });
    await sw.visit("/en/c/rome/?_rsc=xyz", "rome tree", { RSC: "1" });

    sw.fetch.mockReset().mockRejectedValue(new TypeError("offline"));
    expect(await (await sw.dispatch("/en/c/rome/").response).text()).toBe("rome page");
    expect(await (await sw.dispatch("/en/c/rome/?_rsc=abc", { RSC: "1" }).response).text()).toBe("rome payload");
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
