import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

/**
 * Holds the map's space (MAP_WIDTH by MAP_HEIGHT in src/lib/map/geo.ts) while it loads, so nothing jumps when it
 * arrives. Says "Loading map…" unless told otherwise: on weak signal the box can sit there for seconds.
 */
export function MapFrame({ children, problem = false }: { children?: ReactNode; problem?: boolean }) {
  const t = useTranslations("map");
  return (
    <div
      role={problem ? "alert" : "status"}
      className="flex aspect-[10/7] w-full items-center justify-center rounded-xl bg-muted p-4 text-center text-sm text-muted-foreground"
    >
      {children ?? t("loading")}
    </div>
  );
}
