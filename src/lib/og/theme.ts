/** Shared visual constants for every generated share image (src/app/[locale]/**\/opengraph-image.tsx). */

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png" as const;

// Matches the PWA's dark theme (manifest.ts): near-black canvas, near-white
// text, no colour beyond that — the app itself is a grayscale design.
export const ogColors = {
  background: "#171717",
  foreground: "#fafafa",
  muted: "#a3a3a3",
} as const;
