import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/workspace";
import { getDesignMdIndex } from "@/lib/design-store";
import { proxiedSrc } from "@/lib/proxied-src";
import LoginForm from "@/components/LoginForm";
import { DEV_LOGIN_EMAIL } from "@/lib/auth";

export const metadata: Metadata = { title: "Entrar — Inspo" };
export const dynamic = "force-dynamic";

const IcBack = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M11 7H3M6.5 3.5L3 7l3.5 3.5" />
  </svg>
);

// Portadas para el lateral: las de los DESIGN.md ya generados (capturas de webs públicas,
// sin nada de ningún workspace ni de nadie)
async function covers(): Promise<{ covers: string[]; total: number }> {
  const index = await getDesignMdIndex();
  const entries = Object.values(index).sort((a, b) => +new Date(b.generatedAt) - +new Date(a.generatedAt));
  const covers = entries.map((e) => e.coverUrl).filter((u): u is string => !!u).slice(0, 15).map(proxiedSrc);
  return { covers, total: entries.length };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  if (await getSession()) redirect(next && next.startsWith("/") ? next : "/");
  const pub = await covers().catch(() => ({ covers: [], total: 0 }));
  // Si viene del lienzo de inicio con una URL (?next=/?add=…), el titular lo dice
  const pendingDomain = (() => {
    try {
      const add = new URL(next ?? "", "http://x").searchParams.get("add");
      return add ? new URL(add).hostname.replace(/^www\./, "") : "";
    } catch { return ""; }
  })();
  const cols = pub.covers.length >= 6 ? [0, 1, 2].map((c) => pub.covers.filter((_, i) => i % 3 === c)) : null;

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
            <div className="collage">
              {cols.map((col, ci) => (
                <div key={ci} className="collage__col">
                  {col.map((src, i) => <img key={i} src={src} alt="" loading="lazy" decoding="async" />)}
                </div>
              ))}
            </div>
            <div className="auth__visual-caption">
              <span className="display">DESIGN.md</span>
              <span>{pub.total} sistemas de diseño extraídos hasta hoy</span>
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
