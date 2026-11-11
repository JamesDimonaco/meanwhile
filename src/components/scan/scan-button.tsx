"use client";

import { useRef, useState, useTransition, type Ref } from "react";
import { Camera, LoaderCircle, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, buttonVariants } from "@/components/ui/button";
import { SEARCH_INPUT_ID } from "@/components/search/search-id";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { YearRangeText } from "@/components/settings/year-text";
import { Link, useRouter } from "@/i18n/navigation";
import { timelineYear, type ScanResponse, type ScanResult } from "@/lib/scan/result";
import { downscaleToJpeg } from "./downscale";
import { scanPhoto, type Problem } from "./scan-photo";
import { CARD_LINK, CARD_TITLE, ErrorNote } from "@/components/ui/page";
import { cn } from "@/lib/utils";

type Phase =
  | { kind: "idle" }
  | { kind: "preparing" }
  | { kind: "reading" }
  | { kind: "problem"; problem: Problem }
  | { kind: "noMatch"; reading: ScanResult["reading"] };

async function upload(photo: Blob, signal: AbortSignal): Promise<ScanResponse> {
  const res = await fetch("/api/scan/", {
    method: "POST",
    headers: { "content-type": "image/jpeg" },
    body: photo,
    signal,
  });
  return (await res.json()) as ScanResponse;
}

/**
 * Camera capture -> downscale -> /api/scan -> the culture page or the timeline.
 * "header" is an icon button; "home" is the full-width call to action.
 */
export function ScanButton({ variant }: { variant: "header" | "home" }) {
  const t = useTranslations("scan");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const againInput = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [opening, startOpening] = useTransition();

  function close() {
    request.current?.abort();
    setPhase({ kind: "idle" });
  }

  function go(href: Parameters<typeof router.push>[0]) {
    // Keeps "Opening…" up until the next page has arrived, however slow the signal.
    startOpening(() => {
      router.push(href);
      setPhase({ kind: "idle" });
    });
  }

  async function scan(file: File) {
    if (!navigator.onLine) return setPhase({ kind: "problem", problem: "offline" });
    setPhase({ kind: "preparing" });

    const controller = new AbortController();
    request.current = controller;
    const outcome = await scanPhoto(file, controller.signal, {
      downscale: downscaleToJpeg,
      upload,
      onUpload: () => setPhase({ kind: "reading" }),
      isOnline: () => navigator.onLine,
    });
    if (!outcome) return;
    if (outcome.kind === "problem") return setPhase(outcome);

    const { destination, reading } = outcome.result;
    if (destination.kind === "culture") return go(`/c/${destination.id}`);
    if (destination.kind === "year") return go({ pathname: "/timeline", query: { year: String(destination.year) } });
    setPhase({ kind: "noMatch", reading });
  }

  // Another photo can't help when the service is down, the limit is reached or there is no signal.
  const canRetry = phase.kind !== "problem" || phase.problem === "badImage" || phase.problem === "failed";
  const busy = opening || phase.kind === "preparing" || phase.kind === "reading";
  const status = opening ? t("opening") : phase.kind === "preparing" ? t("preparing") : t("reading");

  return (
    <>
      <PhotoInput ref={input} onPhoto={scan} />

      {variant === "header" ? (
        <Button type="button" variant="ghost" size="icon" onClick={() => input.current?.click()} aria-label={t("buttonShort")}>
          <Camera />
        </Button>
      ) : (
        <div className="flex flex-col gap-2">
          <Button type="button" size="lg" className="h-12 w-full" onClick={() => input.current?.click()}>
            <Camera />
            {t("button")}
          </Button>
          <p className="text-center text-sm text-muted-foreground">{t("hint")}</p>
        </div>
      )}

      <Dialog open={opening || phase.kind !== "idle"} onOpenChange={(open) => !open && close()}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>
          <DialogDescription render={<div />} className="flex flex-col gap-4 text-start text-sm text-foreground">
            {busy && (
              <p role="status" className="flex items-center gap-2">
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
                {status}
              </p>
            )}

            {!opening && phase.kind === "problem" && <ErrorNote>{t(phase.problem)}</ErrorNote>}

            {!opening && phase.kind === "noMatch" && (
              <div className="flex flex-col gap-3">
                <p>{t("noMatch", { appName: tCommon("appName") })}</p>
                {phase.reading.text && (
                  <blockquote lang={phase.reading.language} className="border-s-2 border-border ps-3 text-base">
                    {phase.reading.text}
                  </blockquote>
                )}
                {phase.reading.year && (
                  <Link
                    prefetch={false}
                    href={{ pathname: "/timeline", query: { year: String(timelineYear(phase.reading.year)) } }}
                    onClick={close}
                    className={cn(CARD_LINK, "flex flex-col gap-0.5 no-underline")}
                  >
                    <span className={CARD_TITLE}>{t("seeOnTimeline")}</span>
                    <span className="text-muted-foreground">
                      <YearRangeText start={phase.reading.year.start} end={phase.reading.year.end} plain />
                    </span>
                  </Link>
                )}
                {phase.reading.text && (
                  <Link
                    prefetch={false}
                    href={{ pathname: "/", query: { q: phase.reading.text } }}
                    onClick={close}
                    className={cn(CARD_LINK, CARD_TITLE, "no-underline")}
                  >
                    {t("searchWith")}
                  </Link>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 empty:hidden">
            {!opening && phase.kind === "problem" && (
              // Every problem has the same way out: the search box does what a scan would have.
              <Link
                prefetch={false}
                href={{ pathname: "/", hash: SEARCH_INPUT_ID }}
                onClick={() => {
                  close();
                  // Already on the home page: the link goes nowhere, so put the cursor in the box.
                  requestAnimationFrame(() => document.getElementById(SEARCH_INPUT_ID)?.focus());
                }}
                className={buttonVariants({ variant: "default" })}
              >
                <Search aria-hidden />
                {t("searchInstead")}
              </Link>
            )}

            {!busy && canRetry && (
              <>
                {/* Its own input: the page behind an open dialog is inert. */}
                <PhotoInput ref={againInput} onPhoto={scan} />
                <Button type="button" variant="outline" onClick={() => againInput.current?.click()}>
                  <Camera />
                  {t("again")}
                </Button>
              </>
            )}
            </div>

            <p className="text-sm text-muted-foreground">{t("privacy")}</p>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PhotoInput({ ref, onPhoto }: { ref: Ref<HTMLInputElement>; onPhoto: (file: File) => void }) {
  return (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      capture="environment"
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      onChange={(e) => {
        const file = e.target.files?.[0];
        // Cleared so choosing the same photo again still fires a change.
        e.target.value = "";
        if (file) onPhoto(file);
      }}
    />
  );
}
