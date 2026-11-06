---
title: Añadir enseña las seis entradas arriba, como las filas de la extensión, con marcas reconocibles
date: 2026-11-06
status: vigente
kind: diseño
supersedes: 2026-11-06-etiquetas-cortas-en-una-sola-linea-ui-fina.md
---
**Contexto.** Eric pidió que la caja de Nueva inspo fuera "algo más visual porque puedes añadir todo tipo de enlaces, webs, vídeos de YouTube, tuits". Primero hubo cuatro fichas con icono genérico y servicios debajo (partían en dos y tres filas) y luego una línea fina de icono de 14 y nombre bajo el campo ("demasiado pequeño, no se aprecia"). De tres bocetos eligió la fila de seis entradas encima del campo.

**Decisión.** Encima del enlace, `.add__kinds` (`app/globals.css`, `components/AddInspoModal.tsx`): seis botones en dos columnas, con la forma de `.source-row` de la extensión (`extension/chrome/popup.css`): icono de 20, nombre a `--fs-small` en `--text` y qué trae a `--fs-label` en `--add-quiet`, cada uno en una línea (con elipsis de reserva), sin borde, y la fila entera se ilumina al pasar (`--text` al 7 %). Las entradas son Web (globo), Vídeo (logo de YouTube), Post (logo de X), Tablero (logo de Pinterest), Imagen y Texto; los logos son los monocromos de `@phosphor-icons/react/ssr`, importados en el propio modal. Las cuatro de enlace llevan el foco al campo y, al pegar, la que corresponde se queda iluminada y las demás bajan al 40 %; Imagen abre el selector de archivo y Texto el modo texto. Los dos recuadros discontinuos (`.add__pick`) se retiran. El campo dice "Pega un enlace o suelta una imagen" (`add.pasteLink`) y debajo sigue la pista de que el nombre, la imagen y las etiquetas salen solos. Textos en `add.kinds` de `lib/i18n/{en,es}/ui.ts`.

**Por qué.** Eric, 06-11: "cuidado con los textos en 2 filas, quedan mal. haz la UI fina"; de la línea fina: "está debajo del buscador demasiado pequeño, no se aprecia"; y luego "iconos reconocibles por favor" y "te puedes basar un poco en cómo está la extensión". Interpretación nuestra: "reconocibles" son las marcas de cada sitio, y dos columnas dejan sitio para el nombre y lo que trae sin partir línea.

**Cómo aplicarlo.** Sigue en pie la regla de la anterior: etiquetas y opciones en una sola línea, y si no caben se acorta el texto o se reparte en columnas. Una lista de orígenes o formas de entrar en la app se pinta como las filas de la extensión. Un tipo nuevo de enlace entra en `KIND_ORDER` con su icono y sus dos textos en los dos idiomas.
