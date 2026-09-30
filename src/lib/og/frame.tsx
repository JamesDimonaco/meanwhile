import type { ReactElement } from "react";
import { ogColors } from "./theme";

/**
 * Shared chrome for every generated share image: dark canvas, content
 * top-aligned, brand mark bottom-right. No `fontFamily` is set anywhere
 * here or in callers' content — see src/lib/og/fonts.ts for why.
 *
 * `children` is a real array of keyed elements, not a JSX fragment
 * (`<>...</>`): satori doesn't lay Fragments out in flow with their
 * siblings, which silently stacks every "row" on top of the next instead
 * of flowing them down the column.
 */
export function ogFrame(children: ReactElement[], brand: string): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        background: ogColors.background,
        color: ogColors.foreground,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>{children}</div>
      <div style={{ display: "flex", fontSize: 26, color: ogColors.muted }}>{brand}</div>
    </div>
  );
}
