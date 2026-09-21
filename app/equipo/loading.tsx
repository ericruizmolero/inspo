// Esqueleto de /equipo: la barra con "Volver" aparece al instante mientras llegan miembros e invitaciones.
import BackLink from "@/components/BackLink";

export default function Loading() {
  return (
    <div className="page" aria-busy>
      <div className="page__bar">
        <BackLink />
        <span className="sk" style={{ width: 140, height: 22 }} />
      </div>
      <div className="page__body">
        <span className="sk" style={{ height: 56, borderRadius: "var(--radius-l)" }} />
        <span className="sk" style={{ height: 56, borderRadius: "var(--radius-l)" }} />
        <span className="sk" style={{ height: 120, borderRadius: "var(--radius-l)" }} />
      </div>
    </div>
  );
}
