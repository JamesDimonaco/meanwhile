import type { ReactElement, ReactNode } from "react";
import { ogColors } from "./theme";

/**
 * Shared chrome for every generated share image: dark canvas, content
 * top-aligned, brand mark bottom-right. No `fontFamily` is set anywhere
 * here or in callers' content — see src/lib/og/fonts.ts for why.
 */
export function ogFrame(children: ReactNode, brand: string): ReactElement {
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
