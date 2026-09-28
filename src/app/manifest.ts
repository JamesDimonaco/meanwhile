import type { MetadataRoute } from "next";
import common from "../../messages/en/common.json";

export const dynamic = "force-static";

// A single global manifest (not per-locale: the Web Manifest spec has no
// clean multi-language story short of shipping several manifest files with
// different `lang`, out of scope for the MVP). Pulls name/description from
// the English messages so this doesn't drift into its own copy.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: common.appName,
    short_name: common.appName,
    description: common.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#171717",
    theme_color: "#171717",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
