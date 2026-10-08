---
title: Source Sans 3 para el texto y Archivo para los títulos
date: 2026-10-08
status: sustituida
kind: diseño
supersedes: Archivo como única familia (2026-10-08, solo la parte de las familias)
---
*Sustituida el mismo día: Alberto no quedó convencido con Source Sans 3 y eligió la E, Atkinson Hyperlegible Next.* → [decisión](2026-10-08-atkinson-hyperlegible-next-para-el-texto-y-archivo-para-los-titulos.md)

**Contexto.** Tras pasar todo a Archivo, Alberto comparó seis fuentes de texto bajo títulos en Archivo, en Home, Discover y una ventana (`design-explorations/body-font.html`). Antes había descartado Archivo ensanchado (112,5 y 125 %) y las serifas.

**Decisión.** Source Sans 3 para el texto y la interfaz: `--font-sans` en `app/globals.css`, cargada como `sourceSans` en `app/fonts.ts`. Archivo, a anchura normal, solo para títulos: el token nuevo `--font-title`, que llevan `h1` a `h6`, `.t-display` y `.t-title-*`, los títulos de `components/criterio/criterio.css` (ventana, globo, tarjeta, barra de comandos, `.cr-hello`, vacío, nota, menú), el wordmark, las letras grandes (404, miniatura del directorio, inicio vacío) y los encabezados del visor de DESIGN.md. La escala, los pesos `--fw-*` y los tokens no cambian. La extensión lleva las dos fuentes en `extension/chrome/fonts`, y la imagen OG pinta el texto pequeño en Source Sans 3.

**Por qué.** Alberto: "i don't like archivo for body, and i would like normal width", y eligió la F ("let's go with F"). Interpretación mía: la forma humanista de Source Sans 3 contrasta con el grotesco de los títulos y es la más cómoda en las descripciones de 13 px.

**Cómo aplicarlo.** Un título usa un paso `.t-*` de título o `--font-title`; cualquier otro texto hereda `--font-sans` y no pone familia. Nada a 800. Si se añade una tercera familia, es una decisión nueva.
