# 21st.dev — DESIGN.md
> laboratorio azul en penumbra

**Tema:** oscuro  
**Origen:** https://21st.dev/ · 2026-09-22

Las medidas de origen están normalizadas; los roles y las recomendaciones son interpretados.

21st.dev se presenta como un catálogo nocturno de interfaces: un lienzo casi negro #09090b con un degradado azulado muy sutil en la zona del hero, sobre el que flotan tarjetas de previsualización a sangre en #0f1011. Toda la tipografía es General Sans en peso 500 —el peso de batalla, casi nunca se usa 600—, con un display de 64px y tracking negativo (-1.408px) que aprieta el titular, y una única licencia poética: la palabra «living» en Averia Serif Libre cursiva y azul #0f3df5. El cuerpo baja a 17px en gris #a1a1aa y la interfaz vive a 13px, con metadatos de tarjeta a 11-12px y consolas en ui-monospace a 12,5px. Los botones son píldoras de 28px de alto; el CTA es azul pleno y el secundario, texto gris sin fondo. La profundidad no llega por sombras sino por escalones de superficie y filetes blancos al 6-15%. Las miniaturas aportan el color real —terracota #c86a50, marfil #f6f6f1, magenta, naranja—: el sistema es neutro y el contenido brilla.

## Colores

| Nombre | Valor | Grupo | Rol |
|--------|-------|-------|-----|
| Obsidiana | `#09090b` | neutro | Fondo global del sitio y base de la cabecera; también el relleno del botón terciario con borde. |
| Grafito Tarjeta | `#0f1011` | neutro | Superficie de las tarjetas de previsualización y paneles, un escalón por encima del fondo. |
| Pizarra Borde | `#27272a99` | neutro | Borde estándar de contenedores y botones outline, al 60% para que no corte la penumbra. |
| Filete Blanco | `#ffffff26` | neutro | Hairline de 1px (0,06-0,15 de alpha) que dibuja el contorno de paneles y overlays sobre fondos oscuros. |
| Gris Niebla | `#a1a1aa` | neutro | Texto secundario, subtítulo del hero, enlaces de navegación en reposo y metadatos. |
| Blanco Hielo | `#f4f4f5` | neutro | Texto principal: titulares, nombres de componente y etiquetas activas. |
| Azul Señal | `#0f3df5` | marca | Color de marca: botón «Sign up» y CTA principal, la cursiva «living» y el subrayado del enlace destacado. |
| Azul Eléctrico | `#4b73ff` | acento | Azul más claro para estados hover, píldoras y acentos dentro de demos y gráficos. |
| Terracota Terminal | `#c86a50` | acento | Fondo cálido de las tarjetas de demo tipo terminal, contrapunto al frío dominante. |
| Marfil Documento | `#f6f6f1` | acento | Superficie clara de las tarjetas que muestran agentes o editores en tema light. |

## Tipografía

### General Sans — display
Es la única familia real del sistema: titulares, cuerpo, navegación y botones. La decisión característica es que el peso 500 lo hace todo (319 de 347 nodos medidos); el 600 aparece en contadísimos rótulos y nunca hay bold. El titular escala con clamp(40px,6.2vw,64px) y aprieta el tracking a -1.408px.
- **Sustituto:** system-ui, -apple-system, 'Segoe UI', sans-serif
- **Pesos:** 300, 400, 500, 600
- **Tamaños:** 11-64px · 10 valores
- **Interlineado:** 1,06 en display · 1,5 en cuerpo e interfaz
- **Tracking:** -1.408px en 64px, -0.204px en 17px, normal por debajo de 15px

### Averia Serif Libre — display
Se usa exclusivamente en cursiva y en azul para una palabra del titular («living»). Es el gesto editorial que humaniza un sistema por lo demás geométrico; nunca aparece en párrafos ni en interfaz.
- **Sustituto:** Georgia, 'Times New Roman', serif
- **Pesos:** 400
- **Tamaños:** 64px · 1 valor
- **Interlineado:** 1,06
- **Tracking:** heredado del display

### ui-monospace — mono
Reservada a comandos de instalación, logs de agente y bloques de código dentro de las tarjetas. Interlineado muy abierto para que cada línea de terminal se lea como un ítem independiente.
- **Sustituto:** 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace
- **Pesos:** 500
- **Tamaños:** 11.5-12.5px · 2 valores
- **Interlineado:** 2,1 (26px sobre 12,5px) en bloques de terminal
- **Tracking:** normal

### Escala tipográfica

| Rol | Familia | Peso | Tamaño | Interlineado | Tracking |
|-----|---------|------|--------|--------------|----------|
| leyenda | General Sans | 500 | 11px | 1.5 | normal |
| cuerpo-sm | General Sans | 500 | 12px | 1.5 | normal |
| cuerpo | General Sans | 500 | 13px | 1.5 | normal |
| subtítulo | General Sans | 500 | 15px | 1.5 | normal |
| título-sm | General Sans | 500 | 17px | 1.5 | -0.204px |
| título | General Sans | 600 | 18px | 1.45 | -0.192px |
| título-lg | General Sans | 500 | 44px | 1.1 | -0.968px |
| display | General Sans | 500 | 64px | 1.06 | -1.408px |

## Espaciado y layout

**Densidad:** compacta

- **Unidad base:** 4px
- **Ancho máximo de página:** 1152px (bandas de miniaturas hasta 1471px, casi a sangre)
- **Separación entre secciones:** 64px
- **Padding de tarjeta:** 12px en tarjetas de catálogo · 24-32px en tarjetas de demo
- **Separación entre elementos:** 12px (secundarios: 8px y 24px)

### Radios de borde

- **Botones y píldoras:** 9999px
- **Chips, contadores y enlaces de nav:** 6px
- **Controles y contenedores pequeños:** 8px
- **Tarjetas de demo:** 12px
- **Paneles grandes y overlays:** 16px
- **Miniaturas de catálogo:** 0px

## Elevación

La profundidad se construye por escalones de superficie y filetes, no por sombras difusas: fondo Obsidiana #09090b → tarjeta Grafito #0f1011 → borde interior de 1px con Filete Blanco (box-shadow 0 0 0 1px #ffffff14 o #ffffff0f). Las tarjetas de catálogo usan una sombra mínima rgba(0,0,0,0.04) 0 0 0 1px inset + rgba(0,0,0,0.07) 0 1px 3px. Solo los mockups claros levantan de verdad: rgba(0,0,0,0.25) 0 25px 50px -12px. El pestañeo activo se marca con inset 0 -1px 0 Azul Señal.

## Componentes

### Botón primario
**Rol:** CTA de registro y acceso al catálogo.

Fondo Azul Señal, texto blanco puro, radio píldora, sin borde ni sombra. Dos tamaños: 28px de alto con padding 0 16px y texto en cuerpo, y 44px de alto con padding 0 24px y texto en subtítulo. Hover: aclara hacia Azul Eléctrico en 200ms; active: scale 0.98 en 150ms.

### Botón secundario
**Rol:** Acción de menor peso: «Log in», «Join for free».

Variante fantasma: sin fondo, texto Gris Niebla, radio píldora, padding 0 12px, altura 28px; hover pasa el texto a Blanco Hielo. Variante contorneada: fondo Obsidiana, borde 1px Pizarra Borde, texto Blanco Hielo, altura 44px, padding 0 24px.

### Enlace de navegación
**Rol:** Ítems de la cabecera y enlaces inline del texto.

Texto en cuerpo, Gris Niebla, padding 4px 8px con margen negativo -8px, radio 6px; hover cambia solo el color a Blanco Hielo en 150ms sin fondo. Los enlaces inline del párrafo van en Blanco Hielo con subrayado de 1px y offset de 3px.

### Tarjeta de previsualización
**Rol:** Celda del catálogo: miniatura del componente más título y contador.

Superficie Grafito Tarjeta, esquinas rectas en la miniatura, padding 12px en el pie, inset ring de 1px con Filete Blanco. Título en cuerpo a 18px de interlineado y Blanco Hielo al 80%; contador en leyenda sobre chip de radio 6px y padding 2px 4px. Hover: la imagen escala con transform 0.3s y aparece el overlay de acciones.

### Cabecera
**Rol:** Barra superior fija con logo, navegación central y accesos.

Altura ~48px, fondo Obsidiana sin borde inferior visible mientras se está arriba; al hacer scroll aparece un filete inferior con Filete Blanco y desenfoque de fondo. Contenido alineado en tres zonas dentro del ancho máximo, con 24px de separación entre ítems de nav.

## Movimiento

Transiciones cortas y funcionales con cubic-bezier(0.4,0,0.2,1): color 150ms, background-color 200ms, opacity 200ms, scale 150ms para el feedback de pulsación. Las miniaturas y elementos flotantes usan transform 300ms con un easing más elástico, cubic-bezier(0.23,1,0.32,1). Hay animaciones ligadas al scroll (entradas por opacidad y desplazamiento de las bandas de tarjetas) y vídeos en bucle dentro de las previsualizaciones. Nunca se anima el layout ni el color de fondo de sección; la tipografía jamás se mueve.

## Layout

Contenedor principal de 1152px centrado, con bandas de miniaturas que se ensanchan hasta 1471px y sangran por los bordes para sugerir continuidad. El hero es un bloque alineado a la izquierda, no centrado: titular de dos líneas, párrafo de apoyo, fila de filtros en píldoras y, debajo, una retícula horizontal de previsualizaciones de altura fija y anchos desiguales. Ritmo vertical de 64px entre secciones y 12px como gap dominante dentro de los grupos. Densidad compacta: mucha interfaz a 13px conviviendo con un display de 64px, sin escalones intermedios.

## Imagen

Nada de fotografía de stock: todo son capturas y vídeos en bucle de los propios componentes, que funcionan como muestrario de color. Las miniaturas van a sangre, sin radio y sin filtros, para que el degradado, el metal líquido o el ASCII se lean tal cual. Los mockups de agentes se presentan como tarjetas planas de color pleno —terracota #c86a50, marfil #f6f6f1— con texto monoespaciado encima. Iconografía mínima, lineal y a 1px, siempre en Gris Niebla.

## Qué hacer y qué no

### Sí
- Usar General Sans peso 500 por defecto en absolutamente todo, incluidos titulares y botones.
- Reservar el Azul Señal #0f3df5 para el CTA primario y un único gesto tipográfico por pantalla.
- Construir profundidad con escalones de superficie (#09090b → #0f1011) y filetes de 1px al 6-15% de blanco.
- Mantener la interfaz a 13px y los metadatos a 11-12px: el contraste de escala lo aporta el display de 64px.
- Aplicar tracking negativo solo a partir de 17px (-0.2px) y hasta -1.4px en el display.
- Dejar que el color venga de las miniaturas y mantener los contenedores neutros.
- Dar radio píldora a todos los botones y radio 6-12px al resto de contenedores.

### No
- No usar negritas (700+) ni cursivas en General Sans; la cursiva es exclusiva de Averia Serif Libre.
- No poner Averia Serif Libre en párrafos, botones o navegación.
- No añadir sombras difusas de color ni glows azules sobre las tarjetas oscuras.
- No centrar el hero ni sus párrafos: la alineación es a la izquierda.
- No introducir tamaños intermedios entre 18px y 44px en la escala.
- No pintar fondos de sección en azul o en degradados saturados; el degradado del hero es casi imperceptible.
- No redondear las miniaturas del catálogo ni recortarlas con máscaras.

## Marcas afines

- **Vercel** — Misma lógica de negro casi puro, filetes blancos translúcidos y tipografía geométrica en un solo peso.
- **Linear** — Interfaz densa a 13px, grises zinc, píldoras y transiciones de 150ms con el mismo easing.
- **shadcn/ui** — Comparte literalmente la paleta zinc en oklch, los radios de 6-12px y la estética de catálogo de componentes.
- **Framer** — Retículas de previsualizaciones a sangre donde el color lo aporta el contenido y no el chrome.
- **Raycast** — Oscuridad mate con acento único, tarjetas de demo de color pleno y bloques monoespaciados.

## Prompt para agentes

Diseña una web oscura de catálogo de componentes: fondo #09090b, tarjetas #0f1011, texto #f4f4f5 y secundario #a1a1aa, bordes #27272a99 y filetes blancos al 10%. Tipografía General Sans en peso 500 para todo —display 64px con letter-spacing -1.4px, cuerpo 17px, interfaz 13px, metadatos 11px— y una sola palabra del titular en Averia Serif Libre cursiva azul #0f3df5. Botones píldora de 28 y 44px de alto; primario azul pleno, secundario fantasma. Contenedor de 1152px, hero alineado a la izquierda, gaps de 12px, secciones a 64px. Profundidad por escalones de superficie, nunca por sombras. Transiciones de 150-300ms con cubic-bezier(0.4,0,0.2,1).
