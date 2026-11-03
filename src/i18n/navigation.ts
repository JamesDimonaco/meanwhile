import { createElement, type ComponentProps } from "react";
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

const navigation = createNavigation(routing);

// Use these instead of next/link and next/navigation so the locale prefix is kept.
export const { redirect, usePathname, useRouter, getPathname } = navigation;

// No prefetch unless a link asks: on a static page it fetches the whole target payload for every
// link in view, which costs visitors on weak signal and the site its Vercel ISR and transfer quota.
export function Link({ prefetch = false, ...props }: ComponentProps<typeof navigation.Link>) {
  return createElement(navigation.Link, { prefetch, ...props });
}
