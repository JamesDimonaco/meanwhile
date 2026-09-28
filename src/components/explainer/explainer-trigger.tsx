"use client";

import { CircleHelp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useExplainer } from "./explainer-provider";

/** Header entry point for the CE/BCE explainer: an info icon, reachable everywhere. */
export function ExplainerTrigger() {
  const t = useTranslations("common");
  const { open } = useExplainer();
  return (
    <Button type="button" variant="ghost" size="icon-sm" onClick={() => open()} aria-label={t("explainerTrigger")}>
      <CircleHelp />
    </Button>
  );
}
