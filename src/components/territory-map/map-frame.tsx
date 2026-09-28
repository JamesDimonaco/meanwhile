import type { ReactNode } from "react";

export const MAP_WIDTH = 400;
export const MAP_HEIGHT = 280;

/** Holds the map's space while it loads, so nothing jumps when it arrives. */
export function MapFrame({ children }: { children?: ReactNode }) {
  return (
    <div className="flex aspect-[10/7] w-full items-center justify-center rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
