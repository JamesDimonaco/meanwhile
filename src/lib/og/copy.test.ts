import { describe, expect, it } from "vitest";
import { loadMessages } from "@/i18n/messages";
import { loadAllWars } from "@/lib/data/load";
import type { War } from "@/lib/data/war-schema";
import { warOg } from "./copy";

const gulfWar = loadAllWars().find((w) => w.id === "gulf-war")!;
const ongoingWar: War = {
  ...gulfWar,
  period: undefined,
  ongoing: { earliestStart: 2022, latestStart: 2022, asOf: "2026-09-30", sources: gulfWar.sources, disputed: false },
};

// The share image draws this string as is: a broken <start> tag in the wars.ongoing
// message would drop the start year from every ongoing war's preview, and the fonts
// test only checks which characters warOg returns.
describe("warOg range", () => {
  it("is an ended war's year range", async () => {
    expect(warOg("en", await loadMessages("en"), gulfWar).range).toBe("1990–1991 CE");
  });

  it("puts an ongoing war's start year and as-of date into wars.ongoing, in every locale", async () => {
    expect(warOg("en", await loadMessages("en"), ongoingWar).range).toBe("2022 CE – ongoing, as of 30 September 2026");
    expect(warOg("es", await loadMessages("es"), ongoingWar).range).toBe(
      "2022 e. c. – en curso, a 30 de septiembre de 2026",
    );
    expect(warOg("zh", await loadMessages("zh"), ongoingWar).range).toBe("公元2022年至今（截至2026年9月30日）");
  });
});
