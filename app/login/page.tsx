import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/workspace";
import { showcaseCovers, showcaseSrc } from "@/lib/showcase";
import LoginForm from "@/components/LoginForm";
import { DEV_LOGIN_EMAIL } from "@/lib/auth";

export const metadata: Metadata = { title: "Entrar — Inspo" };
export const dynamic = "force-dynamic";

const IcBack = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M11 7H3M6.5 3.5L3 7l3.5 3.5" />
  </svg>
);

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  if (await getSession()) redirect(next && next.startsWith("/") ? next : "/");
  // Si viene del lienzo de inicio con una URL (?next=/?add=…), el titular lo dice
  const pendingDomain = (() => {
    try {
      const add = new URL(next ?? "", "http://x").searchParams.get("add");
      return add ? new URL(add).hostname.replace(/^www\./, "") : "";
    } catch { return ""; }
  })();
  // Lateral: las últimas webs guardadas en Savvia. Con pocas, menos columnas; sin ninguna, texto.
  const covers = (await showcaseCovers().catch(() => [] as string[])).map(showcaseSrc);
  const nCols = covers.length >= 9 ? 3 : covers.length >= 4 ? 2 : covers.length > 0 ? 1 : 0;
  const cols = nCols ? Array.from({ length: nCols }, (_, c) => covers.filter((_, i) => i % nCols === c)) : null;

  return (
    <div className="auth">
      <section className="auth__panel">
        <header className="auth__top">
          <span className="auth__brand">
            <span className="display auth__title">Inspo</span>
            <span className="auth__by">savvia.studio</span>
          </span>
          <Link href="/" className="auth__back">{IcBack} Volver</Link>
        </header>

        <div className="auth__card">
          <LoginForm
            next={next}
            lead={pendingDomain ? <>Entra para guardar<br />{pendingDomain}.</> : <>Guarda lo que<br />te inspira.</>}
            hint={pendingDomain
              ? "Sin contraseñas: te mandamos un enlace de un solo uso. Al volver, la web se guarda sola en tu librería y te sacamos su DESIGN.md."
              : "Webs, vídeos e ideas en un solo sitio, con su DESIGN.md listo para copiar. Sin contraseñas: te mandamos un enlace de un solo uso."}
            initialError={error === "INVALID_TOKEN" || error === "EXPIRED_TOKEN" ? "El enlace ha caducado o ya se ha usado. Pide otro." : undefined}
            devEmail={DEV_LOGIN_EMAIL || undefined}
          />
        </div>

        <footer className="auth__foot">
          <span>¿Primera vez? La cuenta se crea sola con el primer enlace.</span>
        </footer>
      </section>

      <aside className="auth__visual" aria-hidden>
        {cols ? (
          <>
            <div className="collage" data-cols={nCols}>
              {cols.map((col, ci) => (
                <div key={ci} className="collage__col">
                  {col.map((src, i) => <img key={i} src={src} alt="" loading="lazy" decoding="async" />)}
                </div>
              ))}
            </div>
            <div className="auth__visual-caption">
              <span className="display">Lo último</span>
              <span>Las webs que hemos guardado estos días en el estudio</span>
            </div>
          </>
        ) : (
          <div className="auth__visual-empty">
            <span className="display">Inspo</span>
            <span>Webs, vídeos, ideas y documentales. Con su DESIGN.md.</span>
          </div>
        )}
      </aside>
    </div>
  );
}
