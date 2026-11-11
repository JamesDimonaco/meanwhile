import type { ComponentProps, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// The parts every page is built from, so a title, a section heading, a card,
// a pill and an empty state look the same wherever they appear. Change the
// look here, not on a page.

/** Reading pages (home, a culture, a war, lists) share one column; pages built round a chart are wider. */
export const PAGE_WIDTH = { reading: "max-w-2xl", wide: "max-w-5xl" } as const;

export function Page({
  width = "reading",
  as = "div",
  className,
  ...props
}: ComponentProps<"div"> & { width?: keyof typeof PAGE_WIDTH; as?: "div" | "article" | "section" }) {
  const Tag = as as "div";
  return <Tag className={cn("mx-auto flex w-full flex-col gap-8 pt-2", PAGE_WIDTH[width], className)} {...props} />;
}

/** The one page title. */
export function PageTitle({ className, ...props }: ComponentProps<"h1">) {
  return <h1 className={cn("text-2xl leading-tight font-semibold tracking-tight text-balance", className)} {...props} />;
}

/** The line under a title that says what the page is. */
export function PageIntro({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-sm leading-relaxed text-muted-foreground", className)} {...props} />;
}

const HEADING = {
  section: "text-lg leading-snug font-semibold tracking-tight",
  sub: "text-sm leading-snug font-semibold",
} as const;

/** A section heading (18px semibold), or `size="sub"` for a heading inside a section or card (14px semibold). */
export function SectionHeading({
  as: Tag = "h2",
  size = "section",
  className,
  ...props
}: ComponentProps<"h2"> & { as?: "h2" | "h3" | "h4"; size?: keyof typeof HEADING }) {
  return <Tag className={cn(HEADING[size], className)} {...props} />;
}

export function Section({ title, children, className }: { title: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <SectionHeading>{title}</SectionHeading>
      {children}
    </section>
  );
}

/** One card: 16px padding, one border, one radius. `CARD_LINK` adds what a card that is itself a link needs. */
export const CARD = "rounded-xl border border-border bg-card p-4";
export const CARD_LINK = cn(
  CARD,
  "transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
);

/** A card's name: the same size and weight whether or not it is the link. */
export const CARD_TITLE = "text-base leading-snug font-semibold";

/**
 * A card with one main link and other links inside it (a war's countries, what overlapped): the main link
 * (`CARD_MAIN_LINK`) is stretched over the card and the others sit above it, so the card looks and taps like the
 * all-link cards without nesting links.
 */
export const CARD_WITH_LINKS = cn(
  CARD,
  "relative transition-colors hover:bg-muted has-[[data-card-link]:focus-visible]:ring-3 has-[[data-card-link]:focus-visible]:ring-ring/50 [&_a:not([data-card-link])]:relative [&_a:not([data-card-link])]:z-10 [&_button]:relative [&_button]:z-10",
);
export const CARD_MAIN_LINK = cn(CARD_TITLE, "self-start after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none");

export function Card({ as = "div", className, ...props }: ComponentProps<"div"> & { as?: "div" | "article" | "li" | "section" }) {
  // One prop type for every tag: none of them takes anything a div doesn't.
  const Tag = as as "div";
  return <Tag className={cn(CARD, className)} {...props} />;
}

/**
 * A box that is closed until tapped: one border, one chevron. The culture page's "Also alive" list, each key
 * event and the credits' works cited all use it.
 */
export function Disclosure({ summary, children, className }: { summary: ReactNode; children: ReactNode; className?: string }) {
  return (
    <details className={cn("group rounded-xl border border-border bg-card", className)}>
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded-xl p-4 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none group-open:rounded-b-none [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">{summary}</span>
        <ChevronDown aria-hidden className={DISCLOSURE_CHEVRON} />
      </summary>
      <div className="border-t border-border">{children}</div>
    </details>
  );
}

/** The chevron of anything that opens in place; add `rotate-180` (or group-open) when it is open. */
export const DISCLOSURE_CHEVRON = "mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180";

/**
 * A 44px-tall hit area under a finger for a small control that sits on its own (a date, a "Disputed" flag, a
 * "N active" on a timeline), without making the control look any bigger. Not for links inside a sentence. The
 * area reaches 10px above and below: give a link on the line next to it `relative z-10` so the link wins there.
 */
export const TOUCH_AREA = "relative pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-2.5";

const PILL = {
  neutral: "bg-muted text-muted-foreground",
  outline: "border border-border text-muted-foreground",
  warning: "bg-amber-100 text-amber-900",
} as const;

export const pillClass = (tone: keyof typeof PILL = "neutral") =>
  cn("inline-flex min-h-6 items-center rounded-full px-2 text-xs font-medium whitespace-nowrap", PILL[tone]);

/** A small label on a card or row: what kind of thing it is, a licence, a record. */
export function Pill({ tone, className, ...props }: ComponentProps<"span"> & { tone?: keyof typeof PILL }) {
  return <span className={cn(pillClass(tone), className)} {...props} />;
}

/**
 * Nothing to show: what happened, then what to do about it. Used for an empty
 * search, an empty filter and a page that isn't there.
 */
export function EmptyState({ title, children, action, className }: { title: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-start gap-2 rounded-xl border border-dashed border-border p-4 text-sm", className)}>
      <p className="font-medium text-foreground">{title}</p>
      {children && <div className="text-muted-foreground">{children}</div>}
      {action}
    </div>
  );
}

/** A problem with what the visitor just did, beside its cause. Announced to screen readers. */
export function ErrorNote({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      role="alert"
      className={cn("rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-foreground", className)}
      {...props}
    />
  );
}

/** Something the visitor should know that isn't their mistake: a link that was trimmed, a page still loading. */
export function Note({ className, ...props }: ComponentProps<"p">) {
  return <p role="status" className={cn("rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-foreground", className)} {...props} />;
}

/** The one text field. */
export const INPUT =
  "h-12 w-full rounded-lg border border-input bg-background px-4 text-base placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

/**
 * For a search box's onFocus. Under a finger, the keyboard takes the lower half of the screen: bring the
 * box's label to the top, so the chips and the first results under it stay in view while typing.
 */
export function keepResultsAboveKeyboard(input: HTMLElement) {
  if (!window.matchMedia("(pointer: coarse)").matches) return;
  (input.closest("label") ?? input).scrollIntoView({ block: "start", behavior: scrollBehavior() });
}

/** For scrolling the page from code: smooth, unless the visitor asked their device for less motion. */
export const scrollBehavior = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

/** A label above its control: the search boxes and every row of filter chips. */
export const FIELD_LABEL = "text-sm font-medium text-foreground";

/** A link that stands on a line of its own: add to TEXT_LINK. 36px tall with a mouse, 44px under a finger. */
export const TALL_LINK = "inline-flex min-h-9 items-center self-start font-medium pointer-coarse:min-h-11";

/** An inline text link. */
export const TEXT_LINK =
  "rounded-sm underline underline-offset-2 hover:decoration-2 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";
