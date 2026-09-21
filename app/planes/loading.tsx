// Esqueleto de /planes: se prefetcha con el enlace del lateral y aparece al instante
// mientras el servidor calcula el uso del mes. Misma estructura que la página real.
import BackLink from "@/components/BackLink";

export default function Loading() {
  return (
    <div className="page pl" aria-busy>
      <div className="pl-bar">
        <BackLink />
      </div>

      <header className="pl-head">
        <h1 className="display pl-title">Planes</h1>
        <p className="pl-lead">Un precio por workspace, sin sorpresas. Cambia cuando quieras.</p>
      </header>

      <section className="pl-usage">
        <div className="pl-usage__head">
          <span className="sk" style={{ width: 120, height: 14 }} />
          <span className="sk" style={{ width: 220, height: 12 }} />
        </div>
        <div className="pl-usage__grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="pl-quota">
              <div className="pl-quota__head">
                <span className="sk" style={{ width: 130, height: 12 }} />
                <span className="sk" style={{ width: 44, height: 12 }} />
              </div>
              <div className="pl-quota__bar" />
            </div>
          ))}
        </div>
      </section>

      <div className="pl-plans">
        {[0, 1, 2].map((i) => (
          <section key={i} className="pl-plan">
            <div className="pl-plan__head"><span className="sk" style={{ width: 90, height: 22 }} /></div>
            <div className="pl-plan__price"><span className="sk" style={{ width: 110, height: 42 }} /></div>
            <p className="pl-plan__tagline"><span className="sk" style={{ width: "85%", height: 14 }} /></p>
            <ul className="pl-plan__features">
              {[0, 1, 2, 3].map((j) => <li key={j}><span className="sk" style={{ width: `${70 - j * 8}%`, height: 13 }} /></li>)}
            </ul>
            <span className="sk pl-plan__cta" />
          </section>
        ))}
      </div>
    </div>
  );
}
