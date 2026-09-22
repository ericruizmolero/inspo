import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/workspace";
import { showcaseImages } from "@/lib/showcase";
import LoginForm from "@/components/LoginForm";
import { DEV_LOGIN_EMAIL, SOCIAL_PROVIDERS } from "@/lib/auth";

export const metadata: Metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

const IcBack = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M11 7H3M6.5 3.5L3 7l3.5 3.5" />
  </svg>
);

// Mensajes para los códigos de error con los que Better Auth vuelve a /login?error=…
function loginError(code?: string): string | undefined {
  switch (code) {
    case undefined: case "": return undefined;
    case "INVALID_TOKEN": case "EXPIRED_TOKEN": return "El enlace ha caducado o ya se ha usado. Pide otro.";
    case "access_denied": case "user_cancelled_authorize": return "Has cancelado el acceso. Puedes volver a intentarlo.";
    case "account_not_linked": case "email_doesn't_match": return "Ese correo ya tiene cuenta con otro método. Entra con el enlace por correo.";
    case "email_not_found": return "Esa cuenta no comparte el correo con nosotros. Prueba con otra o con el enlace por correo.";
    case "signup_disabled": return "No se pueden crear cuentas nuevas por aquí.";
    default: return "No se pudo entrar. Vuelve a intentarlo.";
  }
}

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
  // Lateral: las imágenes fijas de public/showcase, siempre 3 columnas de 6. Si hubiera menos
  // se repiten para llenar; sin ninguna, texto.
  const found = await showcaseImages();
  const covers = found.length ? Array.from({ length: 18 }, (_, i) => found[i % found.length]) : [];
  const cols = covers.length ? [0, 1, 2].map((c) => covers.filter((_, i) => i % 3 === c)) : null;

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
            initialError={loginError(error)}
            devEmail={DEV_LOGIN_EMAIL || undefined}
            providers={SOCIAL_PROVIDERS}
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
