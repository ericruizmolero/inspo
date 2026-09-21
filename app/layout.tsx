import type { Metadata } from "next";
import { klimDisplay, klimBody, schibsted } from "./fonts";
import "./globals.css";
import { Agentation } from "agentation";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${klimDisplay.variable} ${klimBody.variable} ${schibsted.variable}`}
    >
      <body>
        {children}
        {process.env.NODE_ENV === "development" && (
          <Agentation endpoint="http://localhost:4747" />
        )}
      </body>
    </html>
  );
}
