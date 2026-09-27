import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Meanwhile" };

/** Bare root layout for the locale redirect page only; real pages live under [locale]. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
