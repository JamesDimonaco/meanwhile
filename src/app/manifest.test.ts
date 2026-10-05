import { expect, it } from "vitest";
import manifest from "./manifest";

it("launches the installed app at / so the saved or browser language is picked, not always English", () => {
  expect(manifest().start_url).toBe("/");
});

// A home screen label cuts off at about 12 characters.
it("names the installed app Who Was When, short enough for a home screen label", () => {
  expect(manifest().name).toBe("Who Was When");
  expect(manifest().short_name).toBe("Who Was When");
  expect(manifest().short_name!.length).toBeLessThanOrEqual(12);
});
