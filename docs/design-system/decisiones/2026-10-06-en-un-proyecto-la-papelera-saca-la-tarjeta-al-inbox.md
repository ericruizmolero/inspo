---
title: En un proyecto la papelera saca la tarjeta al Inbox
date: 2026-10-06
status: vigente
kind: diseño
---
**Contexto.** La papelera de la tarjeta decía "Quitar de criterio.design" en cualquier sitio y borraba la referencia del espacio entero, también desde el tablón de un proyecto. La marca no es de dónde se quita nada, y dentro de un proyecto lo normal es querer sacarla de ahí, no perderla.

**Decisión.** El texto nombra dónde está la tarjeta: `card.removeFrom(nombre)` en `lib/i18n/{en,es}/ui.ts`, con el nombre que le pasa `InspoClient` (`spaceName`). En el tablón de un proyecto dice "Quitar del proyecto" (`card.removeFromProject`), sin el nombre, que no cabe sobre una tarjeta, y la papelera la saca de él con un solo clic (`onTakeOut` en `components/InspoCard.tsx`, que llama a `toggleFiled`): la referencia sigue en el espacio y, si no está en otro proyecto, vuelve al Inbox. Ahí la papelera no se pone roja ni pide segundo clic. La tarjeta se ve volar a la pestaña Inbox de la Isla, que la recibe con un pequeño rebote, igual que una olvidada en Pulido: `flyToInbox` en `components/fly-to-inbox.ts` (640 ms, la misma curva y los mismos números que el `Flyer` de `PolishView`), con la copia en `.tile-fly` (z 30). Sale del proyecto al aterrizar. Sin pestaña en pantalla (móvil) o con movimiento reducido, se va sin vuelo. Fuera de un proyecto (Inbox y librería) nombra el espacio de trabajo y borra con los dos clics de siempre. Desde un proyecto, borrar del todo queda en la barra de selección.

**Por qué.** Eric, sobre una captura del texto antiguo: "aquí el copy tendría que ser quitar de [espacio donde esté]", "y si estás en un espacio entonces te lo lleva a inbox". Al verlo con un proyecto de nombre largo ("Landing de despacho · Xabier Jareño Abogados" se cortaba): "ahí sería quitar del proyecto o algo así". Y sobre el movimiento: "quitar del proyecto lleva la tarjeta al inbox como hacemos en el pulido". Que sea un solo clic es interpretación de Claude: sacar de un proyecto no destruye nada y el principio 14 reserva la confirmación para lo destructivo. Afina la decisión de los [dos clics](2026-10-06-borrar-tarjeta-con-dos-clics-en-la-papelera.md), que sigue valiendo para borrar.

**Cómo aplicarlo.** Un botón que quita algo dice de dónde lo quita. Sobre una tarjeta, con el nombre solo si es corto por naturaleza (el espacio); un proyecto se llama "el proyecto". Lo que solo cambia de sitio no pide confirmación; lo que se pierde, sí.
