---
title: El popup de la extensión tiene dos pestañas, Guardar e Importar, con una fila por sitio
date: 2026-11-06
status: vigente
kind: diseño
---
**Contexto.** Importar estaba dentro del popup, pero al fondo, debajo del formulario de guardar y de "Comentar esta página", como tres botones pequeños ("Un tablero", "Guardados de X", "Marcadores de Chrome"). Pinterest, Are.na y Cosmos no se nombraban: se escondían tras "Un tablero". Eric: "la extensión tiene que permitir traerte los guardados de twitter, pinterest y demás", "tiene que estar dentro de la extensión y bastante visible". Entre dos opciones (pestañas arriba o una tarjeta encima de Guardar) eligió las pestañas.

**Decisión.**
- Arriba del popup, bajo la cabecera, dos pestañas: **Guardar** e **Importar** (`.seg` y `.seg__item` en `extension/chrome/popup.css`), el `PillBar` con `SegmentedControl` de la app sobre cromo: la elegida en `--chrome-raised` y papel, la otra en `--chrome-muted`. Con flechas se pasa de una a otra.
- **Guardar** es lo de siempre (`#pane-save`): el sitio, Nota, Proyecto, Áreas, Guardar, Comentar esta página y la pista del clic derecho.
- **Importar** (`#pane-import`): una frase ("Trae lo que ya tienes guardado en otros sitios…") y una fila por sitio (`.source-row`): Guardados de X, Tableros de Pinterest, Canales de Are.na, Clústeres de Cosmos y Marcadores de Chrome, cada una con su nombre, una línea de qué trae, un icono genérico de Phosphor (nunca el logo de la plataforma) y un `CaretRight`. Toda la fila es el botón y abre `import.html` en esa fuente. Sin API de marcadores (Safari), la de Chrome no sale.
- Dentro de un tablero de Pinterest, Are.na o Cosmos el popup abre en Importar, con **Importar este tablero (Pinterest)** en ember encima de la lista.
- Con un clic derecho (guardar una imagen o un vídeo) no hay pestañas: solo se guarda eso.
- Extensión 0.9.0.

**Por qué.** Eric lo pidió así. Interpretación nuestra: guardar e importar son las dos cosas que se hacen con la extensión, y nombrar cada sitio es lo que hace que alguien que viene de Pinterest sepa que puede traerse lo suyo.

**Cómo aplicarlo.** Un sitio nuevo del que importar es una fila más de `SOURCES` en `popup.js`, con su texto en `_locales/{en,es}/messages.json` y su sección en `import.html`. Las plataformas, solo con su nombre, como pide [lo importado de X y Pinterest no sale del espacio](2026-10-06-lo-importado-de-x-y-pinterest-no-sale-del-espacio.md).
