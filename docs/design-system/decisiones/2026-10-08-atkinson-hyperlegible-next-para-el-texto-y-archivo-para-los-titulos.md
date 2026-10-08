---
title: Atkinson Hyperlegible Next para el texto y Archivo para los títulos
date: 2026-10-08
status: sustituida
kind: diseño
supersedes: Source Sans 3 para el texto (2026-10-08)
---
*Sustituida el mismo día: Alberto se queda con Satoshi como única familia.* → [decisión](2026-10-08-satoshi-es-la-unica-familia.md)

**Contexto.** Tras pasar todo a Archivo, Alberto comparó seis fuentes de texto bajo títulos en Archivo, en Home, Discover y una ventana (`design-explorations/body-font.html`). Eligió primero la F, Source Sans 3, y la cambió el mismo día. Antes había descartado Archivo ensanchado (112,5 y 125 %) y las serifas.

**Decisión.** Atkinson Hyperlegible Next para el texto y la interfaz: `--font-sans` en `app/globals.css`, cargada como `atkinson` en `app/fonts.ts`. Archivo, a anchura normal, solo para títulos con `--font-title`: `h1` a `h6`, `.t-display` y `.t-title-*`, los títulos de `components/criterio/criterio.css`, el wordmark, las letras grandes y los encabezados del visor de DESIGN.md. La escala, los pesos `--fw-*` y los tokens no cambian. La extensión lleva las dos fuentes en `extension/chrome/fonts`, y la imagen OG pinta el texto pequeño en Atkinson Hyperlegible Next.

**Por qué.** Alberto: "i'm not convince with the F we should go with E". Interpretación mía: Atkinson distingue cada letra, así que las etiquetas de 12 px, los dominios y las cuentas se leen mejor, y su forma da al texto una voz propia que Source Sans 3 no tenía.

**Cómo aplicarlo.** Un título usa un paso `.t-*` de título o `--font-title`; cualquier otro texto hereda `--font-sans` y no pone familia. Nada a 800. Si se añade una tercera familia, es una decisión nueva.
