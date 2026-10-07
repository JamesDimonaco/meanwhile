import type { ReactNode } from "react";

/** Holds the map's space (MAP_WIDTH by MAP_HEIGHT in src/lib/map/geo.ts) while it loads, so nothing jumps when it arrives. */
export function MapFrame({ children }: { children?: ReactNode }) {
  return (
    <div className="flex aspect-[10/7] w-full items-center justify-center rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
