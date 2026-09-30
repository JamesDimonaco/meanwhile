import { expect, it } from "vitest";
import manifest from "./manifest";

it("launches the installed app at / so the saved or browser language is picked, not always English", () => {
  expect(manifest().start_url).toBe("/");
});
