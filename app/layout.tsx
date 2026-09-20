import type { Metadata } from "next";
import { klimDisplay, klimBody, schibsted } from "./fonts";
import "./globals.css";
import { Agentation } from "agentation";

export const metadata: Metadata = {
  title: "Inspo — Savvia",
  description: "Lo que nos inspira en Savvia. Webs, vídeos, ideas y documentales.",
  metadataBase: new URL("https://inspo.savvia.studio"),
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
