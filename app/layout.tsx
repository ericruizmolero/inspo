import type { Metadata, Viewport } from "next";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { klimDisplay, klimBody, schibsted } from "./fonts";
import "./globals.css";
import { getSession } from "@/lib/workspace";
import FeedbackTool from "@/components/FeedbackTool";

const SITE = "https://inspo.savvia.studio";
const DESCRIPTION = "La biblioteca de inspiración de tu equipo: guarda webs, vídeos e ideas, coméntalas con capturas y saca el DESIGN.md de cualquier web.";

// Título, descripción y tarjeta para compartir (WhatsApp, Slack, X…). La imagen sale de app/opengraph-image.tsx.
export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Inspo — Savvia", template: "%s — Inspo" },
  description: DESCRIPTION,
  applicationName: "Inspo",
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "Inspo",
    url: SITE,
    title: "Inspo — La biblioteca de inspiración de tu equipo",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Inspo — La biblioteca de inspiración de tu equipo",
    description: DESCRIPTION,
  },
};

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
  // La barra de feedback solo para quien ha entrado: sus notas llegan por correo a los socios
  const session = await getSession();
  return (
    <html
      lang="es"
      className={`${klimDisplay.variable} ${klimBody.variable} ${schibsted.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Pone data-theme antes del primer pintado para que no parpadee al cargar */}
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        {children}
        {session && <FeedbackTool />}
      </body>
    </html>
  );
}
