import type { Locale } from "./locales";
import type common from "../../messages/en/common.json";
import type compare from "../../messages/en/compare.json";
import type context from "../../messages/en/context.json";
import type credits from "../../messages/en/credits.json";
import type culture from "../../messages/en/culture.json";
import type explainer from "../../messages/en/explainer.json";
import type home from "../../messages/en/home.json";
import type map from "../../messages/en/map.json";
import type meanwhile from "../../messages/en/meanwhile.json";
import type scan from "../../messages/en/scan.json";
import type timeline from "../../messages/en/timeline.json";
import type wars from "../../messages/en/wars.json";

// English files are the source of truth for message keys.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: {
      common: typeof common;
      context: typeof context;
      compare: typeof compare;
      credits: typeof credits;
      culture: typeof culture;
      explainer: typeof explainer;
      home: typeof home;
      map: typeof map;
      meanwhile: typeof meanwhile;
      scan: typeof scan;
      timeline: typeof timeline;
      wars: typeof wars;
    };
  }
}
