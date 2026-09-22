// Esqueleto de /admin: barra y huecos de los indicadores mientras se agregan los datos.
import BackLink from "@/components/BackLink";

export default function Loading() {
  return (
    <div className="page page--wide" aria-busy>
      <div className="page__bar">
        <BackLink />
        <span className="sk" style={{ width: 120, height: 22 }} />
      </div>
      <div className="page__body">
        <span className="sk" style={{ width: 200, height: 30, borderRadius: "var(--radius-s)" }} />
        <div className="ad-kpis">
          {Array.from({ length: 5 }).map((_, i) => <span key={i} className="sk" style={{ height: 96, borderRadius: "var(--radius-l)" }} />)}
        </div>
        <span className="sk" style={{ height: 220, borderRadius: "var(--radius-l)" }} />
        <span className="sk" style={{ height: 320, borderRadius: "var(--radius-l)" }} />
      </div>
    </div>
  );
}
