import { expect, it } from "vitest";
import common from "../../messages/en/common.json";
import manifest from "./manifest";

it("launches the installed app at / so the saved or browser language is picked, not always English", () => {
  expect(manifest().start_url).toBe("/");
});

it("names the installed app by its appName", () => {
  expect(manifest().name).toBe(common.appName);
  expect(manifest().short_name).toBe(common.appName);
});

// A home screen label cuts off at about 12 characters.
it("keeps short_name short enough for a home screen label", () => {
  expect(manifest().short_name!.length).toBeLessThanOrEqual(12);
});
