import type { CultureEventsProps } from "@/components/culture/culture-events";
import { CultureEvents } from "@/components/culture/culture-events";

/**
 * Stub: rome-map builds the scroll-driven events timeline paired with the
 * territory map. Rendered instead of CultureEvents when hasTerritoryMap(id).
 * Same props as CultureEvents so the detail page can swap them.
 */
export function CultureStory(props: CultureEventsProps) {
  return <CultureEvents {...props} />;
}
