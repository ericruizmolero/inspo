---
title: El Sistema abre como presentación de marca
date: 2026-10-05
status: vigente
kind: producto
supersedes: La vista Sistema como el fichero (04-10), en parte
---
**Contexto.** Desde el 04-10 la vista Sistema era el `criterio.md` editable, y el código del bento, el escenario de área y la bandeja seguía sin pintarse.

**Decisión.** (Alberto, commit ce9df07f.) La pestaña Sistema abre en una guía de marca visual: introducción, logo, color, tipografía, imagen, movimiento, voz, aplicaciones y recursos, todo editable donde está; el criterio.md sigue al lado como vista Markdown, con tablas por área y los tokens en CSS. Una segunda pasada del modelo convierte las decisiones de área en esos valores. Una marca existente se importa desde su web, sus ficheros o sus guías. Se comparte por enlace de solo lectura (completo o limpio) y se descarga como zip. Se borra el código del bento, el escenario y la bandeja.

**Por qué.** Lo que el equipo enseña y entrega es la marca; el MD sigue siendo lo que lee un agente (ver [el MD es el producto](2026-10-04-el-md-es-el-producto.md)). Motivo resumido del commit de Alberto; no lo explicó con más palabras.

**Cómo aplicarlo.** Lo editado a mano se queda fijo en las pasadas siguientes hasta que se devuelve. Piezas en `components/brand/`; comprobar con `npm run check:brand`.
