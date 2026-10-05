import { getTranslations } from "next-intl/server";
import { DEFAULT_LOCALE, HTML_LANG, LOCALES, LOCALE_STORAGE_KEY } from "@/i18n/locales";
import { pickLocale } from "@/i18n/pick-locale";
import { jsonLd, websiteJsonLd } from "@/lib/seo";

// There is no middleware (pages are prerendered), so "/" picks a locale in the browser
// before any JS bundle loads: saved choice first, then browser languages.
const script = `(function(){var s=null;try{s=localStorage.getItem(${JSON.stringify(LOCALE_STORAGE_KEY)})}catch(e){}
var l=(${pickLocale.toString()})(s,navigator.languages||[navigator.language],${JSON.stringify(LOCALES)},${JSON.stringify(DEFAULT_LOCALE)});
location.replace("/"+l+"/"+location.search+location.hash)})()`;

export default async function RootRedirect() {
  const appName = (await getTranslations({ locale: DEFAULT_LOCALE, namespace: "common" }))("appName");
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: script }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(websiteJsonLd(appName)) }} />
      {/* Outside <noscript> so crawlers follow them; the script above redirects before paint. */}
      <ul>
        {LOCALES.map((l) => (
          <li key={l}>
            <a href={`/${l}/`} lang={HTML_LANG[l]}>
              {new Intl.DisplayNames([l], { type: "language" }).of(l)}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
