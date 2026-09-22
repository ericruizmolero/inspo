import type { Metadata, Viewport } from "next";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { klimDisplay, klimBody, schibsted } from "./fonts";
import "./globals.css";
import { getSession } from "@/lib/workspace";
import { getLocale, type Locale } from "@/lib/i18n";
import { I18nProvider } from "@/components/I18nProvider";
import FeedbackTool from "@/components/FeedbackTool";

// URL pública canónica: la misma que BETTER_AUTH_URL en Vercel (criterio.design desde el 22/09/2026).
const SITE = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://criterio.design";
// Título y descripción en el idioma de quien mira. Un buscador o un robot no manda
// cookie, así que le toca el idioma por defecto: inglés.
const META: Record<Locale, { title: string; description: string; ogLocale: string }> = {
  en: {
    title: "Inspo — Your team's inspiration library",
    description: "Your team's inspiration library: save sites, videos and ideas, comment on them with screenshots, and pull the DESIGN.md out of any site.",
    ogLocale: "en_GB",
  },
  es: {
    title: "Inspo — La biblioteca de inspiración de tu equipo",
    description: "La biblioteca de inspiración de tu equipo: guarda webs, vídeos e ideas, coméntalas con capturas y saca el DESIGN.md de cualquier web.",
    ogLocale: "es_ES",
  },
};

// Título, descripción y tarjeta para compartir (WhatsApp, Slack, X…). La imagen sale de app/opengraph-image.tsx.
export async function generateMetadata(): Promise<Metadata> {
  const m = META[await getLocale()];
  return {
    metadataBase: new URL(SITE),
    title: { default: "Inspo — Savvia", template: "%s — Inspo" },
    description: m.description,
    applicationName: "Inspo",
    openGraph: {
      type: "website",
      locale: m.ogLocale,
      siteName: "Inspo",
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

// Color de la barra del navegador según el tema del sistema (el mismo que --bg en cada tema)
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0d" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // La barra de feedback está en todas las páginas, también sin sesión (login, planes,
  // invitación): sin sesión se anota y se copia, pero enviar a los socios pide entrar.
  const [session, locale] = await Promise.all([getSession(), getLocale()]);
  return (
    <html
      lang={locale}
      className={`${klimDisplay.variable} ${klimBody.variable} ${schibsted.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Pone data-theme antes del primer pintado para que no parpadee al cargar */}
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <I18nProvider locale={locale}>
          {children}
          <FeedbackTool canSend={!!session} />
        </I18nProvider>
      </body>
    </html>
  );
}
