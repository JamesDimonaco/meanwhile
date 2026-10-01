// James edits this file; data agents never do. It is the review gate's
// source of truth: a war file's own flags can't open a war to es or zh.

/** Decision 9: these wars must be marked sensitive, so they stay out of es and zh until reviewed. */
export const SENSITIVE_WARS: ReadonlySet<string> = new Set([
  "korean-war",
  "second-sino-japanese-war",
  "vietnam-war",
  "russo-ukrainian-war",
  "russo-ukrainian-war-2022",
  "falklands-war",
]);

/** `<war id>:<locale>` for each language James has read and signed off. A war's `reviewed` flag can be true only when listed here. */
export const REVIEWED: ReadonlySet<string> = new Set([]);
