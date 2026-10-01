/**
 * One JSON file per namespace per locale: messages/<locale>/<namespace>.json.
 * Split so parallel work on different screens never edits the same file.
 */
export const NAMESPACES = [
  "common",
  "home",
  "meanwhile",
  "culture",
  "timeline",
  "explainer",
  "map",
  "credits",
  "context",
  "compare",
  "scan",
  "wars",
] as const;
export type Namespace = (typeof NAMESPACES)[number];
