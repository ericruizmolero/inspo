// Directorio de webs donde buscar inspiración. Se muestra desde el sidebar
// ("¿Buscando inspiración?"). Sin duplicados: cada dominio aparece una sola vez.

export interface Recurso {
  name: string;
  url: string;
  desc: string;
}

export interface RecursoGrupo {
  key: string;
  title: string;
  hint: string;
  items: Recurso[];
}

export const RECURSOS: RecursoGrupo[] = [
  {
    key: "designmd",
    title: "DESIGN.md para agentes",
    hint: "Sistemas de diseño en texto, listos para pegar en Claude o Cursor",
    items: [
      { name: "Refero Styles", url: "https://styles.refero.design", desc: "DESIGN.md de marcas reales, medidos de la web en vivo. El modelo de nuestro botón." },
      { name: "DesignMD.me", url: "https://designmd.me", desc: "Genera un DESIGN.md a partir de una URL." },
      { name: "Open Design", url: "https://open-design.ai", desc: "Sistemas de diseño abiertos en formato para agentes." },
      { name: "DesignMD Supply", url: "https://designmd.supply", desc: "Colección de DESIGN.md descargables." },
      { name: "getdesign.md", url: "https://getdesign.md", desc: "Extrae el sistema de diseño de cualquier web." },
      { name: "Aura", url: "https://aura.build", desc: "Constructor de UI con IA a partir de estilos definidos." },
      { name: "Neuform", url: "https://neuform.ai", desc: "Sistemas de diseño generados para usar con agentes." },
      { name: "Hyperbrowser Design MD", url: "https://design-md.hyperbrowser.ai", desc: "Extracción automática de DESIGN.md con navegador headless." },
      { name: "TypeUI", url: "https://typeui.sh", desc: "Tipografía y tokens de UI en formato de terminal." },
    ],
  },
  {
    key: "webs",
    title: "Galerías de webs",
    hint: "Landings y sites completos, curados a mano",
    items: [
      { name: "Recent.design", url: "https://recent.design", desc: "Lo mejor del diseño reciente, actualizado a diario." },
      { name: "Landdding", url: "https://landdding.com", desc: "Referencias de landings con filtros por estilo y sector." },
      { name: "Curated.design", url: "https://curated.design", desc: "Selección editorial de webs con criterio, sin ruido." },
      { name: "Landing.love", url: "https://landing.love", desc: "Landings con vídeo de scroll para ver la animación sin abrirlas." },
      { name: "A1 Gallery", url: "https://a1.gallery", desc: "Galería de webs recientes con gusto muy actual." },
      { name: "Inspora", url: "https://inspora.design", desc: "Archivo de diseño visual reciente, más amplio que curado." },
      { name: "Dark.design", url: "https://dark.design", desc: "Solo webs en modo oscuro." },
      { name: "Loadmo.re", url: "https://loadmo.re", desc: "Webs atrevidas vistas en móvil, con sus animaciones." },
      { name: "Rebrand Gallery", url: "https://rebrand.gallery", desc: "Rebrandings: antes y después de marcas reales." },
      { name: "Bento Grids", url: "https://bentogrids.com", desc: "Layouts tipo bento, la moda de los últimos años." },
      { name: "Gridddy", url: "https://gridddy.framer.website", desc: "Webs organizadas por su sistema de grid." },
      { name: "Design Spells", url: "https://designspells.com", desc: "Pequeños detalles que hacen que una interfaz encante." },
      { name: "Best Designs on X", url: "https://bestdesignsonx.com", desc: "Diseñadores y trabajos que circulan por X." },
      { name: "Land-book", url: "https://land-book.com", desc: "Una de las galerías clásicas de landings, enorme." },
      { name: "Lapa Ninja", url: "https://www.lapa.ninja", desc: "Miles de landings con filtros por categoría." },
      { name: "Siteinspire", url: "https://www.siteinspire.com", desc: "Galería veterana con foco en webs limpias y tipográficas." },
      { name: "Httpster", url: "https://httpster.net", desc: "Webs con actitud: tipografía grande y layouts raros." },
      { name: "Minimal Gallery", url: "https://minimal.gallery", desc: "Webs minimalistas, casi todas de portfolio o estudio." },
      { name: "Awwwards", url: "https://www.awwwards.com", desc: "Premios diarios. Mucho WebGL y mucho efecto." },
      { name: "Seesaw", url: "https://www.seesaw.website", desc: "Curación holandesa, muy editorial." },
      { name: "Site of Sites", url: "https://siteofsites.co", desc: "Colección curada de webs, ordenada por lo que hace especial a cada una." },
      { name: "Maxibestof", url: "https://maxibestof.one", desc: "Lo mejor de lo mejor: una selección corta y muy exigente." },
      { name: "Godly", url: "https://godly.website", desc: "Webs astronómicamente buenas: selección corta y muy exigente, con vídeo de cada una." },
      { name: "Klikkentheke", url: "https://klikkentheke.com", desc: "Galería holandesa de webs con mucho cuidado en la selección." },
      { name: "Hover States", url: "https://hoverstat.es", desc: "Webs experimentales e interactivas. Lo raro y lo nuevo." },
      { name: "The Responsive", url: "https://the-responsive.com", desc: "Cada web vista en escritorio y móvil a la vez, para juzgar el responsive." },
      { name: "Lowww", url: "https://lowww.directory", desc: "Directorio de webs minimalistas y ligeras, lo contrario de Awwwards." },
      { name: "The FWA", url: "https://thefwa.com", desc: "Premios a webs innovadoras desde el año 2000. Historia viva de la web." },
    ],
  },
  {
    key: "saas",
    title: "SaaS y producto",
    hint: "Marketing de software y pantallas de app reales",
    items: [
      { name: "Saaspo", url: "https://saaspo.com", desc: "Webs de SaaS organizadas por página: pricing, about, blog." },
      { name: "SaaSFrame", url: "https://saasframe.io", desc: "Landings y emails de SaaS con capturas a página completa." },
      { name: "One Page Love", url: "https://onepagelove.com", desc: "Webs de una sola página, con su gestor de referencias OG." },
      { name: "Refero", url: "https://refero.design", desc: "Capturas de producto real: flujos, pantallas y componentes de apps." },
      { name: "Mobbin", url: "https://mobbin.com", desc: "Flujos completos de apps móviles y web, el estándar del sector." },
      { name: "Screenlane", url: "https://screenlane.com", desc: "Capturas de UI web y móvil, gratis y sin registro." },
      { name: "Page Flows", url: "https://pageflows.com", desc: "Vídeos de flujos de usuario: onboarding, checkout, upgrade." },
    ],
  },
  {
    key: "secciones",
    title: "Secciones y componentes",
    hint: "Cuando solo necesitas resolver un trozo de la página",
    items: [
      { name: "Supahero", url: "https://supahero.io", desc: "Solo heros. Cientos de cabeceras de landing." },
      { name: "Navbar Gallery", url: "https://navbar.gallery", desc: "Barras de navegación, con foco en el detalle." },
      { name: "Footer.design", url: "https://footer.design", desc: "Footers, el trozo que siempre se deja para el final." },
      { name: "CTA Gallery", url: "https://cta.gallery", desc: "Llamadas a la acción que convierten." },
      { name: "404s.design", url: "https://404s.design", desc: "Páginas de error 404 con gracia." },
      { name: "Unsection", url: "https://unsection.com", desc: "Secciones sueltas de webs, clasificadas por tipo." },
      { name: "Posts.design", url: "https://posts.design", desc: "Lo mejor del diseño de posts para redes." },
    ],
  },
  {
    key: "motion",
    title: "Motion e interacción",
    hint: "Animación, micro-interacciones y detalles en movimiento",
    items: [
      { name: "60fps", url: "https://60fps.design", desc: "Animaciones e interacciones de UI grabadas en vídeo." },
      { name: "Animos", url: "https://animos.app", desc: "Diseños en movimiento para presentar tu trabajo." },
      { name: "Motion in Design", url: "https://motionin.design", desc: "Motion con prompts listos para copiar y reproducir con IA." },
    ],
  },
  {
    key: "recursos",
    title: "Recursos y herramientas",
    hint: "Assets, mockups y utilidades que ahorran horas",
    items: [
      { name: "Logo To Use", url: "https://logotouse.com", desc: "Inspiración de logotipos, ordenados por estilo." },
      { name: "Hano", url: "https://hano.so", desc: "Mockups 3D de dispositivos." },
      { name: "Gradientool", url: "https://gradientool.com", desc: "Degradados poco vistos, listos para copiar." },
      { name: "Backgrounds Supply", url: "https://backgrounds.supply", desc: "Fondos y texturas." },
      { name: "Supaste", url: "https://supaste.com", desc: "Historial del portapapeles para macOS." },
      { name: "Modulify", url: "https://modulify.ai", desc: "Construye webs con IA a partir de módulos." },
      { name: "Closeit", url: "https://closeit.fast", desc: "Firma de documentos rápida." },
      { name: "Typewolf", url: "https://www.typewolf.com", desc: "Tipografía en uso: qué fuentes usan las webs que te gustan." },
      { name: "Fonts In Use", url: "https://fontsinuse.com", desc: "Archivo de tipografía aplicada en diseño real." },
      { name: "Toools.design", url: "https://www.toools.design", desc: "Directorio gigante de recursos de diseño." },
    ],
  },
  {
    key: "grafica",
    title: "Branding y gráfica",
    hint: "Identidad, editorial y tipografía: lo que alimenta a la web sin ser web",
    items: [
      { name: "The Brand Identity", url: "https://the-brandidentity.com", desc: "Revista de identidad visual: proyectos de branding contados con detalle." },
      { name: "Visuelle", url: "https://visuelle.co.uk", desc: "Blog veterano de diseño gráfico y branding, actualizado a diario." },
      { name: "Visual Journal", url: "https://visualjournal.it", desc: "Archivo italiano de branding y diseño editorial." },
      { name: "Type01", url: "https://type-01.com", desc: "Tipografía y cultura de diseño: fuentes, estudios y entrevistas." },
      { name: "Aesse Studio", url: "https://aessestudio.tumblr.com", desc: "Tumblr de referencias gráficas del estudio Aesse. Moodboard infinito." },
    ],
  },
  {
    key: "moodboards",
    title: "Moodboards y newsletters",
    hint: "Para guardar lo que ves y para que te llegue sin buscar",
    items: [
      { name: "Curated Supply", url: "https://curated.supply", desc: "Newsletter semanal de objetos y diseño con gusto muy personal." },
      { name: "Savee", url: "https://savee.it", desc: "Moodboards visuales, muy usado por estudios." },
      { name: "Cosmos", url: "https://www.cosmos.so", desc: "Guarda y descubre imágenes sin algoritmo de por medio." },
      { name: "Grey en X", url: "https://x.com/thisisgrey", desc: "Cuenta de X que comparte webs y diseño con muy buen ojo." },
      { name: "Morrre en Instagram", url: "https://instagram.com/morrre.dsgn", desc: "Cuenta de Instagram de referencias de diseño y UI." },
      { name: "Are.na", url: "https://www.are.na", desc: "Bloques y canales para conectar referencias." },
    ],
  },
];

export const RECURSOS_TOTAL = RECURSOS.reduce((n, g) => n + g.items.length, 0);

// Nombre de fichero de la miniatura estática (public/recursos/<slug>.jpg),
// generada con `npx tsx scripts/recursos-shots.ts`.
export function recursoSlug(url: string): string {
  return recursoHost(url).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}

export function recursoShot(url: string): string {
  return `/recursos/${recursoSlug(url)}.jpg`;
}

export function recursoHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
