import { fetchInspoItems, SHEET_CSV_URL } from "@/lib/sheets";
import { getThumbnailMap, ThumbnailMap } from "@/lib/thumbnails";
import InspoClient from "@/components/InspoClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [items, thumbnailMap] = await Promise.all([
    fetchInspoItems().catch(() => null),
    getThumbnailMap().catch(() => ({} as ThumbnailMap)),
  ]);

  if (!items) {
    return (
      <div
        style={{
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          color: "#A09890",
          fontSize: "12px",
          fontFamily: "var(--font-sans)",
        }}
      >
        <span style={{ fontSize: "24px", opacity: 0.3 }}>—</span>
        <p style={{ margin: 0 }}>No se pudo cargar el sheet.</p>
        <p style={{ margin: 0, color: "#C8C0B8", fontSize: "10px" }}>
          Asegúrate de publicar el Google Sheet como CSV.
        </p>
        <a
          href={SHEET_CSV_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#C8C0B8", fontSize: "10px", marginTop: "4px" }}
        >
          {SHEET_CSV_URL}
        </a>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh" }}>
      <header className="app-header">
        <span className="app-header__title">INSPO</span>
        <span className="app-header__by">by treseiscero</span>
      </header>

      <InspoClient items={items} initialThumbnailMap={thumbnailMap} />
    </div>
  );
}
