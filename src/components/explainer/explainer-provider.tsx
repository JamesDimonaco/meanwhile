"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { updateSettings, useSettings } from "@/components/settings/use-settings";
import { currentYear, formatYear, roundYearsAgo, yearsAgo, type EraStyle } from "@/lib/years";

type ExplainerContextValue = {
  /** Open the CE/BCE explainer; pass the tapped year for the "how long ago" line. */
  open: (year?: number) => void;
  close: () => void;
};

const ExplainerContext = createContext<ExplainerContextValue>({ open: () => {}, close: () => {} });

const BCE_SEEN_KEY = "meanwhile.seenBCE";
let bceAutoOpenClaimed = false;

/**
 * True at most once per page load, and only the first time ever in this
 * browser: lets many <YearText> instances mounting a BCE date at once agree
 * on a single one to trigger the auto-open, instead of a burst of opens.
 */
export function claimFirstBCEAutoOpen(): boolean {
  if (bceAutoOpenClaimed) return false;
  bceAutoOpenClaimed = true;
  try {
    if (localStorage.getItem(BCE_SEEN_KEY)) return false;
    localStorage.setItem(BCE_SEEN_KEY, "1");
  } catch {
    // No storage: still show it once this page load, just not remembered.
  }
  return true;
}

function isEraStyle(value: unknown): value is EraStyle {
  return value === "ce" || value === "ad";
}

export function ExplainerProvider({ children }: { children: ReactNode }) {
  const [year, setYear] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("explainer");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const settings = useSettings();

  const value = useMemo<ExplainerContextValue>(
    () => ({
      open: (y) => {
        setYear(y ?? null);
        setIsOpen(true);
      },
      close: () => setIsOpen(false),
    }),
    [],
  );

  const howLongAgo =
    year === null ? null : roundYearsAgo(Math.max(0, yearsAgo(year, currentYear())));

  return (
    <ExplainerContext value={value}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[85dvh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>
          <DialogDescription render={<div />} className="flex flex-col gap-3 text-start text-sm text-foreground">
            <p>{t("intro")}</p>
            <p className="text-muted-foreground">{t("why")}</p>
            <section>
              <h3 className="font-medium text-foreground">{t("countingTitle")}</h3>
              <p className="text-muted-foreground">{t("counting")}</p>
            </section>
            <section>
              <h3 className="font-medium text-foreground">{t("noZeroTitle")}</h3>
              <p className="text-muted-foreground">{t("noZero")}</p>
            </section>
            {year !== null && howLongAgo !== null && (
              <section>
                <h3 className="font-medium text-foreground">{t("howLongTitle")}</h3>
                <p className="text-muted-foreground">
                  {t("howLong", { year: formatYear(year, locale, settings.eraStyle), count: howLongAgo })}
                </p>
              </section>
            )}

            <div className="flex flex-col gap-4 rounded-lg border border-border p-3">
              <label className="flex items-center justify-between gap-3">
                <span>{tCommon("showYearsAgo")}</span>
                <Switch
                  checked={settings.showYearsAgo}
                  onCheckedChange={(checked) => updateSettings({ showYearsAgo: checked })}
                />
              </label>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 px-0">{tCommon("eraStyle")}</legend>
                <RadioGroup
                  value={settings.eraStyle}
                  onValueChange={(next) => {
                    if (isEraStyle(next)) updateSettings({ eraStyle: next });
                  }}
                  className="gap-2"
                >
                  <label className="flex items-center gap-2">
                    <RadioGroupItem value="ce" />
                    {tCommon("eraStyleCe")}
                  </label>
                  <label className="flex items-center gap-2">
                    <RadioGroupItem value="ad" />
                    {tCommon("eraStyleAd")}
                  </label>
                </RadioGroup>
              </fieldset>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </ExplainerContext>
  );
}

export function useExplainer(): ExplainerContextValue {
  return useContext(ExplainerContext);
}
