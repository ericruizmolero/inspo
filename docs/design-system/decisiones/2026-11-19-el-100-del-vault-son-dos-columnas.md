---
title: El 100 % del Vault son dos columnas
date: 2026-11-19
status: vigente
kind: diseño
---

**Contexto.** La rejilla del Vault en Descubrir abría a cuatro columnas en escritorio: el 100 % eran las que cabían a 300 px, como fijó [el masonry del Vault](2026-11-19-el-vault-es-un-masonry-el-video-da-la-forma-y-la-entrada-abre-como-ficha.md). Eric la puso al 200 %, con dos columnas, y dijo que ese tenía que ser el punto de partida.

**Decisión.** El 100 % son las columnas que caben a 560 px o más: dos en los 1360 de la página (`COLUMN_MIN = 560` en `components/Vault.tsx`, el mismo número que nombra `Vault.css`). El zoom solo añade columnas desde ahí, hasta las que quepan a 200 px (ocho como mucho); nunca hay menos de dos, así que al 100 % el "+" queda apagado. El zoom guardado empieza de cero (`inspo:vault-zoom:2`), porque el anterior contaba desde cuatro columnas. De la decisión del masonry cambia solo esa cifra; lo demás sigue.

**Por qué.** Eric, 19-11, sobre la captura a dos columnas: "creo que el 100% tiene que ser así". Interpretación nuestra: una pieza del Vault es una sección entera de una web y a 300 px no se lee; a dos columnas se ve lo que es sin abrirla.

**Cómo aplicarlo.** Quien quiera ver más piezas a la vez aleja el zoom; no se vuelve a bajar el ancho de partida para que quepan más. Si el Vault crece y dos columnas se quedan cortas, se revisa aquí.
