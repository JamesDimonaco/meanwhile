import type { ComponentProps, ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { TALL_LINK } from "./page";

// Apart from page.tsx, which has no imports of its own to resolve: this one needs the router.

/** "← Wars": the way back, above the title on every page below a list. */
export function BackLink({ href, children }: { href: ComponentProps<typeof Link>["href"]; children: ReactNode }) {
  return (
    <Link
      prefetch={false}
      href={href}
      className={cn(
        TALL_LINK,
        "-ms-1 gap-1.5 rounded-md px-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
      )}
    >
      <ArrowLeft aria-hidden className="size-4 shrink-0 rtl:rotate-180" />
      {children}
    </Link>
  );
}
