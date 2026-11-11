"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { pillClass } from "@/components/ui/page";

const PILL = pillClass("warning");

/**
 * Small "disputed" flag: uncertainty shown, not hidden. Given a note, the
 * flag is a button that shows the note beneath it, since a tooltip can't be
 * reached by touch. Place it in a flex-wrap row so the note takes a line.
 */
export function DisputedBadge({ note }: { note?: string }) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const noteId = useId();

  if (!note) return <span className={PILL}>{t("disputed")}</span>;
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={noteId}
        onClick={() => setOpen((o) => !o)}
        className={`${PILL} cursor-pointer underline decoration-dotted underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50`}
      >
        {t("disputed")}
      </button>
      <p id={noteId} hidden={!open} className="basis-full text-sm text-muted-foreground">
        {note}
      </p>
    </>
  );
}
