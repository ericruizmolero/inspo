import { fetchInspoItems, SHEET_CSV_URL } from "@/lib/sheets";
import InspoClient from "@/components/InspoClient";

export const revalidate = 60;

export default async function Home() {
  let items = await fetchInspoItems().catch(() => null);

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
      <header
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 32px",
          height: "52px",
          borderBottom: "1px solid #D8D0C6",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: 500,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#0F1923",
          }}
        >
          treseiscero
        </span>
        <span
          style={{
            fontSize: "12px",
            color: "#C8C0B8",
            marginLeft: "10px",
            letterSpacing: "0.04em",
          }}
        >
          / inspo
        </span>
      </header>

      <InspoClient items={items} />
    </div>
  );
}
