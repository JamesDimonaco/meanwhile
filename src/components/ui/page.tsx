import type { ComponentProps, ReactNode } from "react";
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

export function Card({ as = "div", className, ...props }: ComponentProps<"div"> & { as?: "div" | "article" | "li" | "section" }) {
  // One prop type for every tag: none of them takes anything a div doesn't.
  const Tag = as as "div";
  return <Tag className={cn(CARD, className)} {...props} />;
}

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

/** The one text field. */
export const INPUT =
  "h-12 w-full rounded-lg border border-input bg-background px-4 text-base placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

/** A label above its control: the search boxes and every row of filter chips. */
export const FIELD_LABEL = "text-sm font-medium text-foreground";

/** An inline text link. */
export const TEXT_LINK =
  "rounded-sm underline underline-offset-2 hover:decoration-2 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";
