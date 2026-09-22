// Miniatura esquemática de cada área de la app: una mini interfaz dibujada
// en SVG (40×28) para reconocer de un vistazo qué es cada sección del panel.
// Todo en monocromo con los tokens del tema; se ve igual en claro y oscuro.
import type { ReactNode } from "react";

const ink = "var(--text-2)";
const soft = "var(--surface-3)";

const DRAWINGS: Record<string, ReactNode> = {
  // Cuadrícula de tiles a distintas alturas (masonry)
  biblioteca: (
    <>
      <rect x="4" y="4" width="9" height="11" rx="1.5" fill={ink} />
      <rect x="15.5" y="4" width="9" height="7" rx="1.5" fill={soft} />
      <rect x="27" y="4" width="9" height="13" rx="1.5" fill={soft} />
      <rect x="4" y="17" width="9" height="7" rx="1.5" fill={soft} />
      <rect x="15.5" y="13" width="9" height="11" rx="1.5" fill={ink} />
      <rect x="27" y="19" width="9" height="5" rx="1.5" fill={soft} />
    </>
  ),
  // Barra de búsqueda con un destello
  busqueda: (
    <>
      <rect x="4" y="9" width="32" height="10" rx="5" fill={soft} />
      <circle cx="10.5" cy="14" r="2.4" fill="none" stroke={ink} strokeWidth="1.3" />
      <path d="M12.3 15.8l1.7 1.7" stroke={ink} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M29 11l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill={ink} />
    </>
  ),
  // Documento con líneas de texto
  "design-md": (
    <>
      <rect x="11" y="3" width="18" height="22" rx="2" fill={soft} />
      <rect x="14" y="7" width="8" height="2" rx="1" fill={ink} />
      <rect x="14" y="11" width="12" height="1.5" rx=".75" fill={ink} opacity=".6" />
      <rect x="14" y="14.5" width="12" height="1.5" rx=".75" fill={ink} opacity=".6" />
      <rect x="14" y="18" width="8" height="1.5" rx=".75" fill={ink} opacity=".6" />
    </>
  ),
  // Dos bocadillos de conversación
  comentarios: (
    <>
      <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h14A2.5 2.5 0 0 1 24 6.5v6a2.5 2.5 0 0 1-2.5 2.5H12l-4 3.5V15H7.5A2.5 2.5 0 0 1 5 12.5z" fill={ink} />
      <path d="M17 13.5h15.5A2.5 2.5 0 0 1 35 16v5.5a2.5 2.5 0 0 1-2.5 2.5H31v3l-3.5-3h-8A2.5 2.5 0 0 1 17 21.5z" fill={soft} />
    </>
  ),
  // Lista de enlaces con favicon
  recursos: (
    <>
      <rect x="5" y="4" width="5" height="5" rx="1.2" fill={ink} />
      <rect x="13" y="5" width="18" height="3" rx="1.5" fill={soft} />
      <rect x="5" y="11.5" width="5" height="5" rx="1.2" fill={ink} />
      <rect x="13" y="12.5" width="22" height="3" rx="1.5" fill={soft} />
      <rect x="5" y="19" width="5" height="5" rx="1.2" fill={ink} />
      <rect x="13" y="20" width="14" height="3" rx="1.5" fill={soft} />
    </>
  ),
  // Zona de soltar con un más
  anadir: (
    <>
      <rect x="5" y="4" width="30" height="20" rx="3" fill="none" stroke={soft} strokeWidth="1.5" strokeDasharray="3 2.5" />
      <path d="M20 9.5v9M15.5 14h9" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  // Tres avatares solapados
  equipo: (
    <>
      <circle cx="13" cy="14" r="6.5" fill={soft} />
      <circle cx="27" cy="14" r="6.5" fill={soft} />
      <circle cx="20" cy="14" r="7" fill={ink} stroke="var(--panel)" strokeWidth="1.5" />
    </>
  ),
  // Tres columnas de precio, la del medio destacada
  planes: (
    <>
      <rect x="4" y="9" width="9" height="15" rx="1.5" fill={soft} />
      <rect x="15.5" y="4" width="9" height="20" rx="1.5" fill={ink} />
      <rect x="27" y="9" width="9" height="15" rx="1.5" fill={soft} />
    </>
  ),
  // Gráfica de columnas
  admin: (
    <>
      <rect x="5" y="16" width="5" height="8" rx="1" fill={soft} />
      <rect x="12.5" y="10" width="5" height="14" rx="1" fill={soft} />
      <rect x="20" y="13" width="5" height="11" rx="1" fill={soft} />
      <rect x="27.5" y="5" width="5" height="19" rx="1" fill={ink} />
    </>
  ),
  // Sobre
  invitacion: (
    <>
      <rect x="6" y="6" width="28" height="17" rx="2.5" fill={soft} />
      <path d="M7.5 8.5L20 16.5 32.5 8.5" fill="none" stroke={ink} strokeWidth="1.5" strokeLinejoin="round" />
    </>
  ),
};

export default function AreaThumb({ area, label }: { area: string; label?: string }) {
  const drawing = DRAWINGS[area] ?? (
    <rect x="5" y="5" width="30" height="18" rx="2.5" fill={soft} />
  );
  return (
    <span className="area-thumb" title={label} aria-hidden>
      <svg width="40" height="28" viewBox="0 0 40 28">{drawing}</svg>
    </span>
  );
}
