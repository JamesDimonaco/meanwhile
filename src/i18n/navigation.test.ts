import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Link } from "./navigation";

const seen: unknown[] = [];
vi.mock("next-intl/navigation", () => ({
  createNavigation: () => ({
    Link: ({ prefetch }: { prefetch?: unknown }) => {
      seen.push(prefetch);
      return null;
    },
  }),
}));

function prefetchOf(props: { prefetch?: boolean } = {}) {
  seen.length = 0;
  renderToStaticMarkup(createElement(Link, { href: "/c/rome/", ...props }, "Rome"));
  return seen.at(-1);
}

describe("Link", () => {
  // A static page's prefetch is its whole payload (200–400 KB for a culture). With prefetch on, every
  // link in view fetched one: a timeline visit pulled megabytes, on weak signal and on the Vercel bill.
  it("does not prefetch by default", () => {
    expect(prefetchOf()).toBe(false);
  });

  it("still prefetches where a link asks to", () => {
    expect(prefetchOf({ prefetch: true })).toBe(true);
  });
});
