---
title: Una imagen entera en la ficha no lleva tarjeta detrás
date: 2026-10-08
status: vigente
kind: diseño
---
**Contexto.** Desde hoy la tarjeta de la página de la ficha (`.ip-card--page`) se ajusta a lo que contiene y se centra en el escenario (→ [la ficha solo enseña la referencia](2026-10-08-la-ficha-solo-ensena-la-referencia-centrada.md)). Con una imagen subida (`PageView` con `fit`, `.pn.is-fit`) eso tenía dos problemas. El primero, que la imagen no salía: el visor llevaba `container-type: size`, que le quita el alto propio, y con la tarjeta ajustada al contenido la imagen entera quedaba en una línea de 2 px (Eric, 08-10: "algunas imagenes no salen en la ficha"). El segundo, ya visible la imagen, que la tarjeta seguía detrás como un recuadro más ancho que ella: la tarjeta ocupa el ancho del escenario y la imagen se ajusta por alto, así que el marco nunca casa con la proporción de la imagen.

**Decisión.** El escenario (`.ip-stage.cr-viewer-stage`, `app/globals.css`) es el contenedor de tamaño contra el que la imagen mide su alto (`container-type: size`; tiene alto fijo, el del visor o 70 svh en móvil), y el visor `.pn.is-fit` solo contiene el ancho (`container-type: inline-size`). La imagen ocupa como mucho el ancho del visor y el alto del escenario menos su relleno (`max-width: 100cqw; max-height: calc(100cqh - 32px)`), con sus 6 px de radio. Y la tarjeta no pinta nada detrás de ella: `.ip-card--page.cr-viewer-media:has(.pn.is-fit)` lleva fondo transparente y sin borde, en la misma regla que `.ip-media` (post, vídeo). Una captura de web larga no cambia: sigue en su tarjeta y hace scroll dentro.

**Por qué.** Eric, 08-10, viendo la ficha de "03 Color and type@2x" ya con la imagen: "el recuadro de atrás tiene que irse", "porque no concuerda el ratio de imagen en cada momento". Interpretación: un marco solo tiene sentido si abraza la imagen; si no puede seguir su proporción, sobra.

**Cómo aplicarlo.** En la ficha, lo que se ve es la referencia: si la caja no puede ajustarse a ella en las dos direcciones, la caja desaparece. Y un contenedor con `container-type: size` nunca va dentro de una caja que se ajusta a su contenido: no tiene tamaño propio y la caja se queda en nada; el contenedor de tamaño es siempre uno con alto definido (el escenario).
