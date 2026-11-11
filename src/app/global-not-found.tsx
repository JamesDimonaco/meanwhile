import type { Metadata } from "next";
import { DEFAULT_LOCALE, HTML_LANG, LOCALES } from "@/i18n/locales";
import { loadMessages } from "@/i18n/messages";
import { buttonVariants } from "@/components/ui/button";
import { PageIntro, PageTitle } from "@/components/ui/page";
import "./globals.css";

// The app has two root layouts ("/" and "/[locale]"), so a URL that matches no
// page never reaches either: Next serves this file instead, as one static
// document for every bad link. It can't know the language on the server, so
// it carries all three and a script shows the one the URL asks for
// (/zh/c/nope/ -> zh). Without JavaScript all three show, English first.

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: false } };

const SHOW_URL_LANGUAGE = `(function(){var want=location.pathname.split("/")[1],blocks=document.querySelectorAll("[data-not-found]"),found=null,i;for(i=0;i<blocks.length;i++)if(blocks[i].getAttribute("data-not-found")===want)found=blocks[i];if(!found)found=blocks[0];for(i=0;i<blocks.length;i++)blocks[i].hidden=blocks[i]!==found;document.documentElement.lang=found.lang;document.title=found.getAttribute("data-title")})()`;

const NAV_LINK =
  "inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium underline underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

export default async function GlobalNotFound() {
  const blocks = await Promise.all(LOCALES.map(async (locale) => ({ locale, common: (await loadMessages(locale)).common })));
  return (
    // The script below sets lang and hides two of the three blocks before React wakes up: expected, not a mismatch.
    <html lang={HTML_LANG[DEFAULT_LOCALE]} dir="ltr" suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col">
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-4 py-10">
          {blocks.map(({ locale, common }) => (
            <section
              key={locale}
              lang={HTML_LANG[locale]}
              data-not-found={locale}
              data-title={`${common.notFound.title} · ${common.appName}`}
              suppressHydrationWarning
              className="flex flex-col items-start gap-4"
            >
              <a href={`/${locale}/`} className="inline-flex min-h-11 items-center font-semibold">
                {common.appName}
              </a>
              <PageTitle>{common.notFound.title}</PageTitle>
              <PageIntro className="text-base">{common.notFound.body}</PageIntro>
              <a href={`/${locale}/`} className={buttonVariants({ size: "lg" })}>
                {common.notFound.home}
              </a>
              <nav aria-label={common.siteNav} className="-mx-3 flex flex-wrap gap-x-2">
                <a href={`/${locale}/timeline/`} className={NAV_LINK}>
                  {common.nav.timeline}
                </a>
                <a href={`/${locale}/wars/`} className={NAV_LINK}>
                  {common.nav.wars}
                </a>
              </nav>
            </section>
          ))}
        </main>
        <script dangerouslySetInnerHTML={{ __html: SHOW_URL_LANGUAGE }} />
      </body>
    </html>
  );
}
