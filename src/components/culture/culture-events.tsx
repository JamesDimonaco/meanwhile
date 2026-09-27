import { useLocale } from "next-intl";
import { localize } from "@/lib/data/localize";
import type { EventWorld } from "@/lib/data/queries";
import type { Culture } from "@/lib/data/schema";
import { YearText } from "@/components/settings/year-text";

export type CultureEventsProps = { culture: Culture; eventWorld: EventWorld };

/** Stub: ui-core builds the key-events timeline and the "what else that year" view. */
export function CultureEvents({ culture }: CultureEventsProps) {
  const locale = useLocale();
  return (
    <ol className="flex flex-col gap-2">
      {culture.events.map((event) => (
        <li key={event.id}>
          <YearText year={event.start} /> {localize(event.title, locale)}
        </li>
      ))}
    </ol>
  );
}
