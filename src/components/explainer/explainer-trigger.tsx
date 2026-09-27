"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useExplainer } from "./explainer-provider";

/** Stub: ui-core owns the final design. */
export function ExplainerTrigger() {
  const t = useTranslations("common");
  const { open } = useExplainer();
  return (
    <Button type="button" variant="link" size="sm" onClick={() => open()}>
      {t("explainerTrigger")}
    </Button>
  );
}
