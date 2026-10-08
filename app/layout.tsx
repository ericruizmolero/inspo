import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { satoshi } from "./fonts";
import "./globals.css";
import { getSession } from "@/lib/workspace";
import { getLocale, type Locale } from "@/lib/i18n";
import { I18nProvider } from "@/components/I18nProvider";
import FeedbackTool from "@/components/FeedbackTool";
import { TipLayer } from "@/components/criterio";

// Canonical public URL: the same as BETTER_AUTH_URL on Vercel (criterio.design since 22/09/2026).
const SITE = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://criterio.design";
// Title and description in the viewer's language. A search engine or bot sends no
// cookie, so it gets the default language: English.
const META: Record<Locale, { title: string; description: string; ogLocale: string }> = {
  en: {
    title: "criterio.design · Your team's inspiration library",
    description: "Your team's inspiration library: save sites, videos and ideas, comment on them with screenshots, and pull the DESIGN.md out of any site.",
    ogLocale: "en_GB",
  },
  es: {
    title: "criterio.design · La biblioteca de inspiración de tu equipo",
    description: "La biblioteca de inspiración de tu equipo: guarda webs, vídeos e ideas, coméntalas con capturas y saca el DESIGN.md de cualquier web.",
    ogLocale: "es_ES",
  },
};

// Title, description and share card (WhatsApp, Slack, X…). The image comes from app/opengraph-image.tsx.
export async function generateMetadata(): Promise<Metadata> {
  const m = META[await getLocale()];
  return {
    metadataBase: new URL(SITE),
    title: { default: "criterio.design", template: "%s · criterio.design" },
    description: m.description,
    applicationName: "criterio.design",
    openGraph: {
      type: "website",
      locale: m.ogLocale,
      siteName: "criterio.design",
      url: SITE,
      title: m.title,
      description: m.description,
    },
    twitter: {
      card: "summary_large_image",
      title: m.title,
      description: m.description,
    },
  };
}

// Browser bar color based on the system theme (the same as --bg in each theme: paper and board)
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EDE6D6" },
    { media: "(prefers-color-scheme: dark)", color: "#0F0F0F" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The feedback bar is on every page, also without a session (login, plans,
  // invite): without a session you can annotate and copy, but sending to the partners requires signing in.
  // The nonce proxy.ts puts in this request's CSP: the one inline script of our own needs it to run
  const [session, locale, nonce] = await Promise.all([getSession(), getLocale(), headers().then((h) => h.get("x-nonce") ?? undefined)]);
  return (
    <html
      lang={locale}
      className={satoshi.variable}
      suppressHydrationWarning
    >
      <head>
        {/* Sets data-theme before the first paint so it does not flicker on load */}
        <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <I18nProvider locale={locale}>
          {children}
          <FeedbackTool canSend={!!session} />
          {/* Tooltips: the system's butter balloon for every [data-tip] on the page */}
          <TipLayer />
        </I18nProvider>
      </body>
    </html>
  );
}
