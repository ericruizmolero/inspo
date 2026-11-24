---
title: Las páginas secundarias de la web llevan la tipografía de la portada, el pie no enlaza Recursos ni Skills y responde Savvia CB
date: 2026-11-24
status: vigente
kind: diseño
---

**Contexto.** La portada de criterio.design (`marketing-site/src/pages/index.astro`) tiene titulares en Geist Serif, regulares y apretados, y texto en Satoshi. Privacidad, términos, precios y el resto de páginas que comparten `layouts/Base.astro` seguían con Geist sans en negrita: parecían otra web. Su pie enlazaba Recursos y Skills, y los textos legales nombraban a treseiscero.

**Decisión.** `Base.astro` carga Geist Serif y Satoshi (los mismos ficheros de `public/assets/fonts/` que la portada) y define `--font-display`, `--font-sans` (Satoshi), `--h-w: 400` y `--h-ls: -0.015em` (al principio -0.04em; desde el mismo día más abierto, en la portada también: [decisión](2026-11-24-la-portada-se-lee-sin-javascript-y-arranca-con-el-tablon-empezado.md)). Los `h1` (`PageHead.astro`, `LegalPage.astro`, `404.astro`) van en la serif a `clamp(36px, 4.7vw, 60px)`; los `h2` de sección a 28 px (`LegalPage`, `ResourcesPage`, `SkillsPage`); el texto corrido en Satoshi 500, 17 px en los legales. En `PricingPage.astro` las tarjetas son las de la portada (`HomePlans.astro`): línea de tinta de 1,5 px, radio 14, crema, nombre y precio en la serif y raya discontinua sobre la lista. Los colores de `Base.astro` no cambian. El pie (`Footer.astro`) enlaza solo Precios, Extensión, Privacidad y Términos (lista `FOOTER`); Recursos y Skills conservan su página. En `legal.ts`, `LEGAL.entity` pasa a "Savvia CB" con el mismo NIF y `LEGAL_UPDATED` al 24-11.

**Por qué.** Eric, 24-11, sobre `/es/privacy/`: "a esto hay que darle mismo diseño de typos que la landing", "abajo links como recursos skills no debería estar", "hay que dar estilo también a precios y términos" y "aquí responde ahora Savvia CB... con mismo nif". Interpretación nuestra: se aplica a todas las páginas de `Base.astro` para que no queden dos tipografías en la web, y se mantiene Extensión en el pie porque solo nombró Recursos y Skills.

**Cómo aplicarlo.** Una página nueva de la web usa `Base.astro` y sus variables de tipografía; un titular nunca va en sans negrita. Los textos legales siguen sin leerlos un abogado.

Desde el mismo día llevan también su header, su papel y su pie → [decisión](2026-11-24-toda-la-web-lleva-el-header-de-la-portada-y-el-404-es-de-la-casa.md).
