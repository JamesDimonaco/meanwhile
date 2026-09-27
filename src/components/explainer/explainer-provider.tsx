"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type ExplainerContextValue = {
  /** Open the CE/BCE explainer; pass the tapped year for the "how long ago" line. */
  open: (year?: number) => void;
  close: () => void;
};

const ExplainerContext = createContext<ExplainerContextValue>({ open: () => {}, close: () => {} });

/** Stub: ui-core renders the explainer sheet and first-BCE auto-open here. */
export function ExplainerProvider({ children }: { children: ReactNode }) {
  const [, setYear] = useState<number | null>(null);
  return (
    <ExplainerContext value={{ open: (year) => setYear(year ?? null), close: () => setYear(null) }}>
      {children}
    </ExplainerContext>
  );
}

export function useExplainer(): ExplainerContextValue {
  return useContext(ExplainerContext);
}
