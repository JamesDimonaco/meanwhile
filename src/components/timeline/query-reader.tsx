"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";

function Reader({ onQuery }: { onQuery: (params: ReadonlyURLSearchParams) => void }) {
  const params = useSearchParams();
  useEffect(() => onQuery(params), [params, onQuery]);
  return null;
}

/**
 * Reports the query string from an effect and renders nothing. On a
 * prerendered page useSearchParams client-renders everything up to its nearest
 * Suspense boundary, so this sits alone in its own: the chart around it stays
 * in the HTML instead of streaming in later and shifting the page.
 */
export function QueryReader({ onQuery }: { onQuery: (params: ReadonlyURLSearchParams) => void }) {
  return (
    <Suspense fallback={null}>
      <Reader onQuery={onQuery} />
    </Suspense>
  );
}
