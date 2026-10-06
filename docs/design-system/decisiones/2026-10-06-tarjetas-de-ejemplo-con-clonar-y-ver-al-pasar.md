---
title: Las tarjetas de ejemplo enseñan Clonar y Ver al pasar el ratón, con los botones del tablón
date: 2026-10-06
status: vigente
kind: diseño
---
**Contexto.** En la librería de ejemplos (Descubrir), una tarjeta solo se podía abrir: para clonar había que entrar en el ejemplo y buscar "Clonar como proyecto" en su cabecera. Eric, 06-10: "en las cards de plantillas podemos poner directamente cuando hacer hovering el ver, clonar no? haz uso parecido a las cards/hovering del tablón".

**Decisión.** `TemplateCardView` (`components/TemplatesView.tsx`) pasa de ser un botón entero a una tarjeta con dos piezas: `.tplc__open` (la imagen y el texto, que abren el ejemplo como antes) y `.tplc__go`, una tira sobre la imagen que aparece al pasar el ratón con **Clonar** y **Ver**. Los botones son los del tablón, las mismas clases (`.tile__go-btn`, y `.tile__go-btn--file` en blanco para Clonar, como Archivar allí): abajo a la izquierda, misma entrada. Clonar crea el proyecto con el nombre del ejemplo, igual que el botón de dentro. En pantallas táctiles la tira no existe: se toca la tarjeta y se clona dentro. Textos en `templates.clone` y `templates.view`.

**Por qué.** La cita de Eric. Interpretación mía: Clonar va en blanco porque es lo que se viene a hacer con un ejemplo, y Ver repite lo que ya hace el clic en la tarjeta para que se lea que hay dos caminos.

**Cómo aplicarlo.** Una tarjeta con imagen que admite acciones las enseña al pasar el ratón con los botones del tablón (`.tile__go-btn`), no con un estilo nuevo: la principal en blanco, abajo a la izquierda. Lo que solo sale al pasar el ratón tiene otro camino en táctil.
