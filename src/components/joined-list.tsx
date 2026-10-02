import { Fragment, type ReactNode } from "react";
import { useLocale } from "next-intl";

/**
 * Elements (links, flags) joined the way the page's language joins a list:
 * "a, b and c", "a、b和c". ListFormat only formats strings, so it formats
 * the indexes and the elements are swapped in.
 */
export function JoinedList({ items }: { items: readonly ReactNode[] }) {
  const locale = useLocale();
  const parts = new Intl.ListFormat(locale, { type: "conjunction" }).formatToParts(items.map((_, i) => String(i)));
  return parts.map((part, i) => <Fragment key={i}>{part.type === "literal" ? part.value : items[Number(part.value)]}</Fragment>);
}
