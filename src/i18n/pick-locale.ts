/**
 * Chooses the first-visit locale. Runs as an inline script on the root page
 * (serialised with toString), so it must stay self-contained: no imports,
 * no closures, plain syntax.
 */
export function pickLocale(
  saved: string | null,
  languages: readonly string[],
  supported: readonly string[],
  fallback: string,
): string {
  if (saved && supported.indexOf(saved) >= 0) return saved;
  for (let i = 0; i < languages.length; i++) {
    const base = (languages[i] || "").toLowerCase().split("-")[0];
    if (supported.indexOf(base) >= 0) return base;
  }
  return fallback;
}
