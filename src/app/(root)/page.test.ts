import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RootRedirect from "./page";

describe("the root page", () => {
  // "/" is the installed app's start URL: on weak signal a visible list would show on every launch until the redirect lands.
  it("shows the language links to no-JS visitors only", () => {
    const html = renderToStaticMarkup(RootRedirect());
    const outside = html.replace(/<noscript>[\s\S]*?<\/noscript>/g, "");
    expect(html).toContain('href="/es/"');
    expect(outside).not.toContain("<a ");
  });
});
