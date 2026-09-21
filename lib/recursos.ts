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
      { name: "Inspo MCP", url: "https://inspomcp.dev", desc: "Más de 800 webs reales con capturas, componentes y un DESIGN.md por web, servidas a tu agente por MCP." },
      { name: "DesignMD.me", url: "https://designmd.me", desc: "Genera un DESIGN.md a partir de una URL." },
      { name: "Open Design", url: "https://open-design.ai", desc: "Sistemas de diseño abiertos en formato para agentes." },
      { name: "DesignMD Supply", url: "https://designmd.supply", desc: "Colección de DESIGN.md descargables." },
      { name: "getdesign.md", url: "https://getdesign.md", desc: "Extrae el sistema de diseño de cualquier web." },
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
      { name: "Goated UI", url: "https://goatedui.dev", desc: "Webs, interfaces, iconos de app e imágenes OG. Galería de craft actual." },
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
      { name: "Built by Designers", url: "https://builtbydesigners.com", desc: "Apps, herramientas y experimentos diseñados, construidos y lanzados por diseñadores." },
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
    key: "codigo",
    title: "Componentes con código",
    hint: "Bloques y kits listos para copiar o para conectar al agente",
    items: [
      { name: "Originkit", url: "https://www.originkit.dev", desc: "La mayor librería gratuita de componentes animados: código, Framer o por MCP." },
      { name: "Bencho", url: "https://bencho.dev", desc: "Bloques de UI vivos: los tocas, los ajustas y te los llevas al proyecto." },
      { name: "ObsidianUI", url: "https://obsidianui.dev", desc: "Componentes React con Motion y Tailwind, pensados desde la animación." },
      { name: "UI by Halaska", url: "https://ui.halaska.com", desc: "Kit de UI en un solo fichero para productos de IA, sobre shadcn. Un prompt y listo." },
      { name: "21st.dev", url: "https://21st.dev", desc: "Componentes de UI hechos por la comunidad, con código y prompt para pegarlos en el agente." },
      { name: "Beautiful UI", url: "https://beautifului.dev", desc: "Componentes pensados para interfaces con IA: chat, streaming, herramientas." },
      { name: "vgpu", url: "https://vgpu.sh/examples/holographic-card", desc: "Librería WebGPU pensada para agentes; el ejemplo de la tarjeta holográfica lo resume." },
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
      { name: "Motionsites", url: "https://motionsites.ai", desc: "Webs animadas con el prompt de IA para reproducir cada efecto." },
      { name: "Liquid Orb Editor", url: "https://lersent001.github.io/orb/", desc: "Editor de orbes líquidos: ajusta el efecto y exporta el código." },
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
      { name: "playgrnd", url: "https://www.playgrnd.tools", desc: "Medio centenar de mini herramientas generativas, sin cuenta y todo en el navegador." },
      { name: "Light Rails", url: "https://light-stroke-rail.vercel.app", desc: "Estudio de patrones de luz generativos, con mockups y showreel al momento." },
      { name: "Reelfolio", url: "https://reelfolio.io", desc: "Convierte capturas y mockups en un showreel de portfolio en vídeo." },
      { name: "Symbl", url: "https://symbl.space", desc: "Prueba tu logo en contextos reales antes de enseñarlo." },
      { name: "Svgl", url: "https://svgl.app", desc: "Biblioteca de logos en SVG, limpios y listos para usar." },
      { name: "Ditherland", url: "https://ditherland.leobecker.com", desc: "Convierte imágenes y vídeo en arte con tramado (dither)." },
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
    key: "tipografia",
    title: "Tipografía y fundiciones",
    hint: "Fundiciones cuyas páginas de specimen ya son inspiración por sí solas",
    items: [
      { name: "Claude Type", url: "https://claudetype.com", desc: "Fundición francesa de tipografías con carácter, como Kalice. Specimens muy cuidados." },
      { name: "Klim Type Foundry", url: "https://klim.co.nz", desc: "Söhne, Tiempos, Family. De aquí salen las fuentes de Savvia; los specimens son una lección." },
      { name: "Pangram Pangram", url: "https://pangrampangram.com", desc: "Fundición muy usada en webs actuales. Pesos de prueba gratis para maquetar." },
      { name: "Grilli Type", url: "https://www.grillitype.com", desc: "GT America, GT Sectra, GT Flexa. Specimens interactivos que juegan con la fuente." },
      { name: "Dinamo", url: "https://abcdinamo.com", desc: "Fundición de Berlín, experimental y juguetona. Web con mucha personalidad." },
      { name: "Colophon Foundry", url: "https://www.colophon-foundry.org", desc: "Londres y Los Ángeles. Tipografías editoriales con specimens elegantes." },
      { name: "Commercial Type", url: "https://commercialtype.com", desc: "Graphik, Canela, Publico. Clásicos contemporáneos muy presentes en producto." },
      { name: "Displaay", url: "https://displaay.net", desc: "Fundición de Praga con gusto muy actual, entre lo geométrico y lo cálido." },
      { name: "Sharp Type", url: "https://sharptype.co", desc: "Nueva York. Sharp Grotesk y familias enormes con specimens de mucha altura." },
      { name: "Ohno Type", url: "https://ohnotype.co", desc: "Obviously, Degular. Fundición con humor y una web que lo demuestra." },
      { name: "Atipo Foundry", url: "https://www.atipofoundry.com", desc: "Fundición de Gijón. Paga lo que quieras y familias muy versátiles." },
      { name: "Future Fonts", url: "https://www.futurefonts.xyz", desc: "Fuentes en desarrollo: compras barato ahora y recibes las versiones nuevas." },
      { name: "Fontshare", url: "https://www.fontshare.com", desc: "Fuentes gratuitas de Indian Type Foundry con calidad de pago." },
      { name: "Font Pairing (Monotype)", url: "https://www.monotype.com/font-pairing#/playground?fontPair1=Pepi%2FRudi&fontPair2=Schotis+Text", desc: "Playground para ver dos fuentes funcionando juntas en una maqueta y buscar parejas." },
      { name: "Velvetyne", url: "https://velvetyne.fr", desc: "Tipografías libres y experimentales. Para cuando la marca puede arriesgar." },
    ],
  },
  {
    key: "desarrollo",
    title: "Desarrollo con agentes",
    hint: "Para construir con IA lo que has visto y para dar feedback sobre lo construido",
    items: [
      { name: "Ship Studio", url: "https://www.ship.studio", desc: "Donde vive esta app: preview en vivo, agentes y comentarios sobre la página, todo en un sitio." },
      { name: "Aura", url: "https://www.aura.build", desc: "Constructor de UI con IA que parte de un estilo definido, no de un prompt en blanco." },
      { name: "Agentation", url: "https://agentation.com", desc: "Extensión para señalar elementos de la web y mandar el feedback directo al agente." },
      { name: "Claude Code", url: "https://claude.com/claude-code", desc: "El agente de Anthropic en la terminal, el que construye inspo." },
      { name: "Codex (OpenAI)", url: "https://chatgpt.com/codex", desc: "El agente de programación de OpenAI: terminal, app de escritorio y nube, con varios agentes trabajando en paralelo." },
      { name: "Cursor", url: "https://cursor.com", desc: "Editor con agentes integrados, el estándar para programar con IA." },
      { name: "v0", url: "https://v0.app", desc: "De Vercel: genera interfaces React con Tailwind y shadcn a partir de texto o capturas." },
      { name: "Lovable", url: "https://lovable.dev", desc: "Apps completas desde el chat, con backend y despliegue incluidos." },
      { name: "Bolt", url: "https://bolt.new", desc: "Prototipos full-stack en el navegador, rápido para probar una idea." },
      { name: "Paper", url: "https://paper.design", desc: "Herramienta de diseño vectorial con MCP: el agente lee y edita el diseño directamente." },
      { name: "Magic Patterns", url: "https://www.magicpatterns.com", desc: "Prototipos de UI con IA pensados para diseñadores de producto." },
    ],
  },
  {
    key: "modelos",
    title: "Modelos",
    hint: "Los modelos que usamos y los frontier que conviene tener a mano",
    items: [
      { name: "Jev (Typesafe AI)", url: "https://typesafe.ai", desc: "Modelo de clasificación System-1: rápido, barato y con probabilidades. Etiqueta las inspos de esta app." },
      { name: "Claude (Anthropic)", url: "https://www.anthropic.com", desc: "Fable, Opus, Sonnet y Haiku. Redacta los DESIGN.md y describe las capturas de inspo." },
      { name: "OpenAI", url: "https://openai.com", desc: "GPT y o-series. El otro laboratorio de referencia." },
      { name: "Gemini (Google DeepMind)", url: "https://gemini.google", desc: "Los modelos de Google, fuertes en contexto largo y multimodal." },
      { name: "Grok (xAI)", url: "https://x.ai", desc: "Los modelos de xAI, con acceso en tiempo real a X." },
      { name: "Mistral", url: "https://mistral.ai", desc: "El laboratorio europeo: modelos abiertos y de peso ligero." },
      { name: "Llama (Meta)", url: "https://www.llama.com", desc: "Los modelos abiertos de Meta, base de medio ecosistema open source." },
      { name: "DeepSeek", url: "https://www.deepseek.com", desc: "Modelos abiertos chinos de razonamiento a coste muy bajo." },
      { name: "Qwen (Alibaba)", url: "https://qwen.ai", desc: "La familia abierta de Alibaba, muy usada en fine-tuning y local." },
    ],
  },
  {
    key: "agentes",
    title: "Agentes",
    hint: "Agentes personales que actúan por ti: para entender hacia dónde va la interfaz",
    items: [
      { name: "Muse (Meta)", url: "https://muse.ai", desc: "El agente personal de Meta: navega, rellena formularios, reserva y paga, y sigue trabajando con la app cerrada." },
      { name: "Instinct", url: "https://instinct.co", desc: "Asistente personal al que escribes o llamas; usa el móvil y el ordenador como una persona. Con invitación." },
      { name: "OpenClaw", url: "https://openclaw.ai", desc: "Agente personal open source que corre en tu propia máquina y te responde desde WhatsApp, Telegram, Slack o iMessage. MIT, sin versión de pago." },
      { name: "Hermes Agent (Nous Research)", url: "https://hermes-agent.nousresearch.com", desc: "Agente open source con memoria persistente que se crea sus propias skills y aprende de cada sesión. También en la nube, siempre encendido." },
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
      { name: "on.design", url: "https://on.design", desc: "Comunidad de diseñadores solo por invitación: perfiles, trabajo y estudios independientes." },
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
