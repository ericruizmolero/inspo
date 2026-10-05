# Zernio: la receta

Cómo se hizo la home de Zernio con una IA y con qué especificación se puede rehacer de una tirada.

**De dónde sale esto.** La única fuente es `ZERNIO_SPEC.md`, la especificación que la propia IA escribió
al final del trabajo a partir de las referencias subidas y las capturas (3 a 5 de agosto de 2026). No es la conversación literal: no guarda las
frases de quien pidió cada cambio, así que este documento no cita a nadie. Lo que sí guarda es el orden
de las iteraciones (§0), los valores reales de la página (§1–§5) y las reglas para regenerarla (§6).

**Lo que falta en el tablero.** Las referencias se subieron como capturas y vídeos a la conversación y
no están aquí, y el spec no dice de qué web es cada una. Por orden del §0:

- header con desplegable a columnas y columna lateral "Más" con tarjeta promo (→ mega-menú)
- diagrama de pipeline con pills mono, nodo central INGEST/REDUCE/NORMALIZE/ROUTE y glow (→ hero B)
- ventana de app con rejilla de puntos de fondo (→ fondos dot-grid)
- "tabs + panel con gráfico a la derecha" (→ Channels)
- sección "Meet a new approach": vídeo a sangre que funde a oscuro y grid 3×2 de cards con borde discontinuo (→ The Shift)
- "dock" con slot "YOUR AGENT HERE" y 3 cards inferiores (→ Agents)
- "Take their word for it": card oscura con logo, cita, autor y foto (→ Customers)
- logotipo gigante dibujado con líneas horizontales sobre oscuro (→ pruebas de watermark, descartadas)
- sellos GDPR y AICPA SOC con titular centrado y línea vertical (→ Security)
- grid de líneas punteadas a toda anchura con caja central y 3 logos que rotan (→ Final CTA)
- footer con logo, 5 columnas de links de color y el símbolo en contorno/3D en la esquina (→ Footer)
- vídeos `Plain example.mp4`, `Sona.mp4` y un clip del portapapeles, en frames `plain-*`, `pz-*`, `sona-*` (→ preloader, reveals, ritmo)
- capturas de cada prueba: `tiles*`, `plat*`, `tab*`, `wheel*`, `approach*`, `01/02-ag`, `wm*`, `emboss*`, `deboss*`, `footer-plain*`, `footer3d*`, `pre1`, `dark1`, `m1`
- fotos de equipo y retratos de clientes (HeyMark, Vibiz; Pedro, Lautaro, Chris)

Si aparecen, van al tablero con lo que el §0 dice de cada una.

**Resultado:** https://zernio.treseiscero.app · grabación: https://screen.studio/share/3hpK71WF

---

# Zernio — Home page spec (para regenerar la web con cualquier IA)

> Fuente: `Zernio Home v2.dc.html` (versión actual). Este documento describe la página completa: marca, tokens, layout, copy, interacciones y animaciones. Copy de la web en **inglés**; respétalo literal.

---

## 0. Historial de iteraciones (reconstruido a partir de referencias subidas y capturas)

> Orden cronológico deducido de las marcas de tiempo de los archivos (3–5 ago 2026). Es una reconstrucción: refleja qué se pidió y hacia dónde fue cada sección, no cada ajuste menor.

**Día 1 — 3 de agosto: base, header y hero**
1. **Punto de partida**: la web existente de Zernio (estética mono, etiquetas tipo `PLATFORMS` / `HOW IT WORKS` / `PRICING` en caja naranja, listado plano de plataformas Social / Messaging / Ad networks, bloque de código oscuro `zernio.ts`, fila de logos de partners, cards de precio y calculadora de cuentas). Se usó como fuente de copy y contenido.
2. **Mega-menú**: referencia de un header con desplegable a columnas (encabezado + link de color + descripción gris) y una columna lateral "Más" con tarjeta promo. → Header Zernio con Platform / Use cases / Developers, rail "More" y promo de Open Analytics.
3. **Hero "Esquema"**: referencia de diagrama de pipeline (pills mono a la izquierda → nodo central con etapas INGEST/REDUCE/NORMALIZE/ROUTE → destinos a la derecha, glow detrás). → Hero B con entradas/salidas, tokens animados y chips AUTH · NORMALIZE · FAN-OUT · RETRY.
4. **Hero "Código"**: el bloque de código de la web original (antes oscuro, "15 channels") se convirtió en una ventana clara que se escribe sola, con 3 pasos y el resultado "200 OK". Se creó `Zernio Hero Options` para comparar ambos heros; en v2 conviven con un conmutador A/B.
5. Referencia de ventana de app con rejilla de puntos de fondo → origen de los fondos dot-grid de las cards.
6. **Channels**: se partió del listado plano de plataformas. Primero tabs por categoría (Social 12 / Messaging 4 / Ad networks 7) con grid de tiles (`tiles*`); después tabs por canal con panel de detalle (`plat*`, `tab*`), inspirado en una referencia de "tabs + panel con gráfico a la derecha". Se probó una "rueda" de tarjetas (`wheel*`) que acabó como la pila 3D vertical actual.
7. **The Shift**: referencia de sección "Meet a new approach" (foto/vídeo a sangre que funde a oscuro + grid 3×2 de cards con borde discontinuo e ilustraciones mínimas). → Sección oscura con vídeo (`approach-bg.webm`, subido como .webm), tinte naranja y 6 cards Channels / Inbox / Ads / Webhooks / Analytics / API (`approach*`).

**Día 2 — 4 de agosto: agents, clientes, watermark**
8. **Agents**: referencia de "dock" (cápsula vertical con slot "YOUR AGENT HERE" + logo de marca, y logos que entran en el slot) + 3 cards inferiores (orquestación, chat agente, órbita de iconos). → Dock de Zernio con tiles de canales que encajan, y cards "Real tool calls" / "Read and reply to the inbox" / "Claude, Cursor or your CLI" (`01/02-ag`).
9. **Customers**: referencia de "Take their word for it" (card oscura grande con logo, cita, autor y foto a la derecha + 2 testimonios debajo). → Card de caso rotativo + testimonios + "Show more".
10. **Watermark del footer**: referencia de logotipo gigante dibujado con líneas horizontales sobre fondo oscuro. → Pruebas de wordmark "zernio" en bandas/rayado (`wm*`, `wm-bands`).

**Día 3 — 5 de agosto: secciones finales, footer y pulido**
11. **How it works** y **Pricing**: se tomó el copy de la web original (3 pasos; Self-serve $0 / Enterprise Custom; calculadora con slider logarítmico 1–10k) y se rediseñó con el sistema nuevo: pasos interactivos con escenario animado y calculadora con desglose por tramos.
12. **Security**: referencia de sellos GDPR (círculo de estrellas) + AICPA SOC, titular centrado y línea vertical que baja. → Sección de seguridad con sellos SVG naranjas y chips de compliance.
13. **Final CTA**: varias capturas de una referencia con grid de líneas punteadas a toda anchura, caja central, 3 logos que rotan (con transición vertical) y dos botones. → `#final` con líneas que se dibujan al entrar y slots de logos de clientes.
14. **Footer**: referencias de footer con logo + 5 columnas de links de color y, en la esquina, el símbolo de la marca dibujado en contorno/3D. Exploraciones: wordmark en contorno, emboss/deboss del wordmark (`emboss*`, `deboss*`), wordmark a modo de watermark con fondo degradado, versión plana (`footer-plain*`). → Final: footer plano + mark de Zernio apilado en 3D girando (`footer3d*`).
15. **Header ya construido** (captura del mega-menú Zernio sobre la sección oscura) — revisión del resultado.
16. **Assets de casos**: fotos de equipo (HeyMark, Vibiz) y retratos (Pedro, Lautaro, Chris) para la card de casos y los testimonios.
17. **Movimiento y extras**: vídeos de referencia (`Plain example.mp4`, `Sona.mp4`, un clip del portapapeles) descompuestos en frames (`plain-*`, `pz-*`, `sona-*`) para el preloader (`pre1`: cuadro con borde que se dibuja + mark que se rellena + contador), los reveals al hacer scroll y el ritmo general. Además: dark mode (`dark1`), sonido de UI, eyebrows que se "scramblean" y responsive móvil (`m1`).
18. **Zernio Home v2.dc.html**: consolidación de todo lo anterior. Es la versión que describe este documento.

---

## 1. Marca

- **Nombre**: Zernio (antes "Late"). Mensaje: *"Late is now Zernio. Zero breaking changes."*
- **Producto**: una API REST para publicar, responder, medir y promocionar en 23 canales sociales, de mensajería y de ads. Público: ingenieros / founders SaaS.
- **Assets**: `assets/logo.svg` (wordmark), `assets/mark.svg` (símbolo "Z"), iconos de canales en `assets/icons/*.svg` (x, instagram, tiktok, linkedin, facebook, youtube, threads, reddit, pinterest, bluesky, snapchat, google, whatsapp, telegram, discord, slack, meta, googleads, openai), logos de partners en `assets/partners/*.svg`, fotos/logos de clientes en `assets/img/`.
- Los iconos se pintan siempre como **máscara CSS** (`mask: url(icon.svg)` + `background: currentColor`) para heredar color y tema.

## 2. Tokens visuales

**Tipografía**
- Sans: **Instrument Sans** (400–700). Mono: **JetBrains Mono** (400/500/700) para eyebrows, etiquetas, código, datos.
- H1 68px / lh .98 / tracking -0.04em / 600. H2 44px / lh 1.08 / -0.032em / 600. H3 19–27px / 600.
- Body 15–19.5px, lh 1.55–1.65. Eyebrow mono 11px, tracking .2em, MAYÚSCULAS, color `--faint`.
- Patrón de H2: frase principal + segunda frase en la misma línea con `opacity: .4` (ej. *"Pay for what you use. <span .4>No plans, no seats…</span>"*).
- `text-wrap: balance` en titulares, `pretty` en párrafos. Números con `tabular-nums`.

**Color (light)**
```
--bg #F7F4F0  --surface #FFF  --surface-2 #FBF8F5
--line #E4DCD3  --line-strong #C6BAAE  --line-soft #EFE8E0
--ink #17130F  --ink-soft #4C453F  --muted #57504A  --faint #8A8177
--tint #FDEEEA  --tint-line #F3D3C9  --accent-ink #B0350F
ACCENT #EB3514 (hover #D42D0F), gradiente de texto: #EB3514 → #F2833E → #EB3514
--warm #FAEAE1  --warm-2 #FDF7F3  (final CTA y footer)
--shift-bg #14110F (secciones oscuras)
```
**Color (dark, `[data-theme="dark"]` en `<html>`)**
```
--bg #100E0C  --surface #17130F  --surface-2 #1B1714
--line #2A2521  --line-strong #3A322C  --line-soft #221E1B
--ink #F2ECE5  --ink-soft #C9BFB4  --muted #A79C90
--tint #26130D  --tint-line #4A2318  --accent-ink #FF8A63
--warm #1A1310  --warm-2 #130E0B
```
Syntax highlight: key #8A34B0 / str #A03A12 / comment #6D8C72 / plain #2E2822 (dark: #C792EA / #F79267 / #7FAF87 / #E6E0D8).

**Forma y espacio**
- Contenedor `max-width: 1240px`, padding lateral 32px. Secciones con padding vertical 92–100px.
- Radios: botones 10px, chips 6–8px, cards 12–18px, pills 999px.
- Bordes 1px `--line` en todo; sombras muy suaves y largas (`0 18px 40px -34px rgba(23,19,15,.35)`).
- Fondos "técnicos": rejilla de puntos `radial-gradient(var(--line) 1px, transparent 1px)` a 16px.
- El acento se usa con moderación: un CTA primario, puntos de estado, iconos activos.

**Movimiento**
- Curva principal `cubic-bezier(.32,.72,0,1)`; reveals `cubic-bezier(.22,1,.36,1)`. Duraciones .2–.5s en UI, .7–1s en reveals.
- Solo `transform`/`opacity` siempre que sea posible.

## 3. Componentes recurrentes

- **CTA primario** (naranja #EB3514, texto blanco, 14×22px padding, radio 10px). Hover: sube 1px, sombra naranja, el label se desplaza -2px, el **mark de Zernio** entra deslizando desde la izquierda (dos imágenes que se intercambian con translateX 15px) y un **brillo diagonal** (sheen) cruza el botón (`zSheen .7s`).
- **CTA secundario**: surface + borde `--line`; hover borde `--line-strong` + sombra + sheen tenue.
- **CTA "ink"** (negro en light, crema en dark) para header y algunos bloques.
- **Eyebrow mono** con animación: letras aparecen escalonadas (34ms por letra) al entrar en viewport; al hacer hover se "scramblean" a 0/1 en naranja y vuelven al salir.
- **Pill "NEW"**: badge naranja mono + texto + chevron que se mueve 2px en hover.
- **Links de texto**: subrayado de 1px que crece de 0→100% en hover.

## 4. Estructura de la página (orden)

### 4.1 Header (sticky)
- Barra flotante dentro de contenedor 1240px, alto 56px, inset 8px arriba. Al hacer scroll gana fondo translúcido + blur + hairline.
- Logo · nav: **Platform ▾, Use cases ▾, Developers ▾, Reliability, Pricing** · a la derecha: botón sonido (on/off), botón tema (sol/luna con crossfade+rotación), "Sign in", CTA "Start for free".
- **Mega-menú**: al hover el contenedor crece en altura (transición de height .34s) y muestra columnas con encabezado + links (título naranja + descripción gris) y una columna "rail" con promo (kicker mono, cifra grande, texto, link):
  - Platform: Publish / Engage / Measure / Promote (4 links cada uno) + More (MCP server, Phone numbers, Chat SDK adapter) + promo "OPEN ANALYTICS · 399,530 posts this week".
  - Use cases: By product / By job / For buyers + Customers (HeyMark, Vibiz, All customers) + promo "IN PRODUCTION · 15,885 accounts".
  - Developers: Start / Reference / Tooling + Operations (Status, Changelog) + promo "MIGRATING FROM LATE? · Zero changes".

### 4.2 Hero (dos variantes conmutables con un segmented "A · Código / B · Esquema")
**A · Código (por defecto)**
- Pill NEW "Late is now Zernio. Zero breaking changes".
- H1: **"<gradiente>One API</gradiente> for every social, messaging and ad channel."**
- Sub: "Publish, reply, measure and promote across 23 channels with a single REST call. We hold the platform apps, the OAuth flows, the rate limits and the retries."
- CTAs: "Start for free" (primario) + "Read the quickstart". Nota mono: "Free up to 2 accounts · no credit card · no platform dev apps".
- Debajo: **ventana de editor** `zernio.ts` (traffic lights, "TypeScript") con 3 pasos arriba (Connect a channel / Publish everywhere / Reply on WhatsApp) que se marcan ✓ en naranja a medida que el código avanza. El código TypeScript **se escribe línea a línea** (190ms/línea, caret naranja parpadeando) y hace loop:
  ```ts
  import Zernio from "@zernio/node";
  const zernio = new Zernio(process.env.ZERNIO_API_KEY!);
  // 1. Connect any of 23 channels via hosted OAuth
  const { authUrl } = await zernio.accounts.connect({ platform: "instagram", profileId });
  // 2. Publish everywhere in one call
  await zernio.posts.create({ content: "Launch day!", mediaItems: [{ type: "video", url: videoUrl }],
    platforms: [ {platform:"instagram",...}, {platform:"linkedin",...}, {platform:"tiktok",...} ] });
  // 3. Give your product its own phone number
  await zernio.whatsapp.phoneNumbers.purchase({ profileId, country: "US" });
  ```
  Footer del editor al terminar: "200 OK · published to [instagram] [linkedin] [tiktok] · + WhatsApp number live".
- **Scroll pinned**: el hero es sticky; al hacer scroll el subtítulo+CTAs se desvanecen y suben (-26px, scale .97) mientras el editor sube y ocupa su lugar (smoothstep). El editor se funde con el fondo por abajo (degradado 220px).
- Glows radiales suaves (blanco arriba, naranja 7% abajo).

**B · Esquema**
- H1: "Twenty-three APIs in. <gradiente>One API</gradiente> out." Sub: "Rate limits, token refreshes, media specs and app reviews go in. Published posts, unified metrics and one webhook come out."
- Diagrama SVG 1240×464: 6 pills de entrada a la izquierda (ONE REST CALL, MEDIA FILE, DM REPLY, AD BUDGET, SCHEDULE, ONE API KEY) → curvas hacia un **nodo central** con el mark de Zernio → 6 pills de salida en tinte naranja con icono (INSTAGRAM, TIKTOK, WHATSAPP, LINKEDIN, META ADS, +18 CHANNELS). Tokens animados viajan por las curvas con `offset-path` (`{ content }`, `video.mp4`, `"on its way"`, `$40/day`, `09:00Z`, `sk_live_…` → `201 created`, `reach 18.2k`, `msg_8f2c`, `200 OK`, `spend $12.40`, `retry 1/3`). Debajo chips: AUTH · NORMALIZE · FAN-OUT · RETRY.

### 4.3 Barra de stats
3 columnas separadas por 1px: contador animado "posts published this week", contador "accounts connected this week" (cuentan al entrar en viewport, 1.5s ease-out), y **logos de partners oficiales** rotando cada 2.6s (Meta Business Partner, TikTok Marketing Partner, LinkedIn Marketing Partner, Pinterest Business Partner, X Official Partner).

### 4.4 Channels (`#platforms`)
- Eyebrow CHANNELS. H2 "Every channel, already shipped. <.4>One endpoint. We hold the dev apps, the OAuth flows and the reviews.</.4>"
- Fila de **23 tabs** horizontales con scroll (icono + nombre), máscara de fade en los bordes según scroll, autoplay que avanza mientras está en viewport (se detiene al hacer click; el tab activo se centra).
- Panel de 2 columnas (360px + 1fr): izquierda kind (SOCIAL…), nombre, descripción, "Learn more →". Derecha sobre rejilla de puntos: **pila 3D vertical de tarjetas** (perspectiva, translateY ±54%, rotateX ∓26°, translateZ negativo; opacidad 1 / .2 / .06). Cada tarjeta: icono + nombre + estado LIVE con punto verde pulsante, chips de formatos soportados, tabla de specs (p. ej. Instagram: Carousel up to 10 items · Reel ≤90s 9:16 · Caption 2,200 chars), snippet `platform: "instagram"` y barra de progreso QUEUED → PUBLISHING → PUBLISHED (4.2s).

### 4.5 The Shift (`#approach`, oscuro)
- Envolvente que al hacer scroll gana **inset de 56px y radio 40px** (la sección se "despega" como una tarjeta).
- Alto 760px con **vídeo en loop** de fondo + capas de degradado oscuro y tinte naranja 14%.
- Eyebrow THE SHIFT. H2 blanco "Meet a new layer: social infrastructure. <.45>One integration between your product and every channel.</.45>" + párrafo.
- Grid 3×2 de cards con borde discontinuo naranja 30%, cada una con mini-ilustración en HTML + label mono naranja + título + texto:
  CHANNELS "Connect once, publish anywhere" (rejilla de iconos) · INBOX "Every conversation in one thread" (chips de acciones) · ADS "Run paid from your own product" (iconos de redes de ads) · WEBHOOKS "React the moment it happens" (TRIGGER post.published → ACTION notify · retry) · ANALYTICS "Metrics that match the platforms" (barras) · API "Build anything on top" (`POST /v1/posts` → 202 accepted).

### 4.6 Agents (`#agents`)
- Grid 1.32fr / 1fr. Izquierda (470px, rejilla de puntos): **dock** — una cápsula blanca vertical con un slot vacío y un slot naranja con el mark; tiles de 152px con logos de canales flotan/derivan y van "encajando" en el slot de uno en uno.
- Derecha: eyebrow AGENTS, H2 "Every channel docks into one API. <.4>Same tools, same payload, same auth.</.4>", texto sobre MCP en mcp.zernio.com con 300+ tools, CTA "See pricing".
- Debajo 3 cards con ilustración (250px) + título + texto: "Real tool calls, not prompts" (TOOL CALL posts.create → Published / Webhook / Auto retry), "Read and reply to the inbox" (burbujas DM Instagram ↔ YOUR AGENT), "Claude, Cursor or your CLI" (chip mcp.zernio.com con iconos orbitando).

### 4.7 Customers (`#customers`)
- Eyebrow CUSTOMERS. H2 centrado "Take their word for it. <.4>Teams that replaced a dozen integrations with one.</.4>"
- **Card de caso destacado** oscura (rota cada 7s, dots abajo-derecha): logo + marca + sector, métrica grande, cita grande, foto+nombre+rol; a la derecha imagen con crossfade+zoom. Al hacer hover aparece un **cursor custom** negro "Read case study ⟶ mark" que sigue al ratón; click abre el caso.
  - Plinng — "3h to ship Instagram" — Sergio Cayero, Head of Product.
  - HeyMark — "100h development saved" — Pedro Cisternas, Co-Founder.
  - Vibiz — "73,724 posts published" — Lautaro Suarez, CTO.
- 2 testimonios fijos (Razvan Ghetiu, purplepalm.ai; Dev Singh) + 6 más en grid colapsado con velo blur y botón "Show more/less" que expande con stagger (Elena Zarino, Leon, Justin, Marko, Chris, Zahareus).
- Fila "ALSO SHIPPING ON ZERNIO": ClickUp, RE/MAX, Warner Music Group, Holo, HeyMark, Vibiz, Plinng.

### 4.8 How it works (`#how`)
- H2 "Live in under five minutes. <.4>Signup to your first post, message or ad.</.4>"
- Izquierda: 3 pasos clicables (número en círculo, título, texto, badge de tiempo). Derecha: escenario con autoplay (4.2s por paso, botón PAUSE/PLAY + "01/03"):
  1. API KEYS — clave `zk_live_…` escribiéndose → estado listo ("30 SECONDS · NO SALES CALL").
  2. Lista de cuentas conectándose una a una ("HOSTED OAUTH · NO DEVELOPER APPS").
  3. Llamadas enviadas que entran en cascada con verbo, endpoint y ms ("MESSAGING, SOCIAL AND ADS, SHIPPED").

### 4.9 Pricing (`#pricing`)
- H2 "Pay for what you use. <.4>No plans, no seats, every feature included.</.4>" + "One platform: social accounts, ads, phone numbers, calls, SMS and WhatsApp." + "Start with 2 free accounts."
- 2 cards: **Self-serve** (borde naranja, fondo tint) "$0 to start" + 4 checks + "Start free"; **Enterprise** "Custom" + 4 checks (volume discounts past 2000 accounts, SAML SSO/SCIM/MFA/audit logs, Slack con ingeniería, SOC 2 y GDPR) + "Talk to us".
- **Calculadora**: slider logarítmico 1→10k cuentas (default ≈ 250), total /mo, media por cuenta, y tabla de tramos que se iluminan al usarse:
  `1–2 free · 3–10 $5.00 · 11–100 $2.50 · 101–1,000 $2.00 · 1,001+ $1.50` (por cuenta, acumulativo).

### 4.10 FAQ (`#faq`)
- H2 centrado "Questions engineers ask first. / <.4>The rest is in the docs.</.4>". Acordeón de 6 en card 840px; al abrir, el número se convierte en punto naranja, el "+" rota a "−", la respuesta entra con grid-rows 0fr→1fr.
- Preguntas: dev apps por plataforma · qué pasa si falla un post · white-label · riesgo de alcance/bans · miles de cuentas · agentes IA (MCP). Pie: "Still unsure? Read the docs".

### 4.11 Security (`#security`)
- Sellos dibujados en SVG naranja (círculo de 12 estrellas "GDPR", doble anillo "AICPA / SOC 2").
- H2 "Engineered with enterprise-level security. <.4>Built for everyone.</.4>" + texto. Chips mono: SOC 2 TYPE II · GDPR · TOKENS ENCRYPTED AT REST · FULL AUDIT LOG · AUTOMATIC RETRIES · SIGNED WEBHOOKS. Link "Visit the trust portal →". Línea vertical degradada que baja hacia el CTA final.

### 4.12 Final CTA (`#final`, fondo warm)
- Grid de **líneas punteadas** naranjas (horizontales arriba/medio/abajo, vertical central, marco 1180px) que se dibujan con scaleX/scaleY al entrar, luego aparece una caja interior y el contenido escalonado.
- 3 **slots de logos** de clientes en naranja que cambian cada 4.2s (slide vertical out/in escalonado).
- H2 "Join the teams shipping on Zernio. <.4>Social, messaging and ads in one API.</.4>" + "Start for free" + "Quickstart".

### 4.13 Footer (warm-2)
- Logo + "© 2026 Zernio / Zernio Technologies S.L." y 5 columnas de links naranjas: Product, Developers, Channels, Company, Trust.
- Esquina inferior derecha: el **mark de Zernio en 3D** — 16 capas apiladas en translateZ con filtro de contorno naranja, girando lentamente (rotateX 34°, rotateZ oscilante, 22s).

## 5. Capa global

- **Preloader**: overlay de 5 paneles verticales color warm; un cuadro de 260px cuyo borde naranja se dibuja + el mark que se rellena de abajo arriba con contador 0→100% (1.9s); después los paneles suben escalonados (1s, `cubic-bezier(.76,0,.24,1)`). Botón fijo abajo-derecha "● REPLAY INTRO".
- **Reveal por scroll**: hijos de cada sección entran con opacity 0→1 y translateY 22px→0, stagger 90ms (máx 360ms).
- **Blur inferior fijo**: franja de 96px con 3 capas de backdrop-blur progresivo al pie del viewport.
- **Sonido de UI** (Web Audio, sin archivos): "tick" en hover y "click" en pointerdown sobre botones/links; persistente con `localStorage["zernio-mute"]`.
- **Tema**: toggle light/dark persistente en `localStorage["zernio-theme"]`.
- **Responsive** (≤900px): nav oculto, todas las grids a 1 columna, H1 40px / H2 30px, paddings 20px, pila 3D escalada; ≤560px H1 32px, footer a 1 columna.

## 6. Reglas para regenerar

- Un único documento, estilos inline o CSS mínimo; nada de librerías UI. Fuentes desde Google Fonts.
- No inventar colores fuera de la paleta; el naranja #EB3514 es el único acento.
- Copy literal de este documento; tono técnico, frases cortas, sin emojis.
- Toda la iconografía de canales con los SVG oficiales como máscara.
- Respetar `prefers-reduced-motion` desactivando autoplay, typing y reveals.
