"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import EmptyStart from "./EmptyStart";
import RecursosModal from "./RecursosModal";

/**
 * Portada sin sesión: el mismo lienzo de inicio que ve un usuario nuevo, sin sidebar.
 * Pegar una URL lleva a /login con la URL a cuestas; al volver del enlace la web se guarda sola (?add=).
 */
export default function GuestStart() {
  const router = useRouter();
  const [showRecursos, setShowRecursos] = useState(false);

  return (
    <div className="guest">
      <header className="guest__bar">
        <span className="guest__brand">
          <span className="display">Inspo</span>
          <span>savvia.studio</span>
        </span>
        <Link href="/login" className="btn btn--ghost btn--sm">Entrar</Link>
      </header>

      <EmptyStart
        onAddUrl={async (web) => { router.push(`/login?next=${encodeURIComponent(`/?add=${encodeURIComponent(web)}`)}`); }}
        onRecursos={() => setShowRecursos(true)}
      />

      {showRecursos && <RecursosModal guest onClose={() => setShowRecursos(false)} />}
    </div>
  );
}
