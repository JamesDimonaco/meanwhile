// One colour per position on the compare screen, the same in the bars, the
// column headers and the event cards. Full class names so Tailwind sees them.
export const SLOTS = [
  {
    color: "var(--compare-1)",
    text: "text-compare-1",
    bg: "bg-compare-1",
    edgeStart: "border-s-4 border-s-compare-1",
    edgeEnd: "border-e-4 border-e-compare-1",
  },
  {
    color: "var(--compare-2)",
    text: "text-compare-2",
    bg: "bg-compare-2",
    edgeStart: "border-s-4 border-s-compare-2",
    edgeEnd: "border-e-4 border-e-compare-2",
  },
  {
    color: "var(--compare-3)",
    text: "text-compare-3",
    bg: "bg-compare-3",
    edgeStart: "border-s-4 border-s-compare-3",
    edgeEnd: "border-e-4 border-e-compare-3",
  },
] as const;

/** Two on a phone; a third fits from this width up. */
export const WIDE_QUERY = "(min-width: 768px)";
export const MAX_NARROW = 2;
export const MAX_WIDE = 3;
