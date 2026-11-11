---
title: Copiar enlace da una dirección corta que guarda la referencia y su proyecto
date: 2026-11-11
status: vigente
kind: desarrollo
---
**Contexto.** El enlace de una referencia copiado desde su ficha era `https://app.criterio.design/i/<id de 24>?in=<id de 24>`: 83 caracteres, tres líneas en un chat. Eric: "los links se pueden acortar un poco cuando compartes?? es larguísimo". Entre quitar `?in=` (se pierde el proyecto), un dominio sin `app.` (ahorra 4) y un código corto, eligió el código.

**Decisión.**
- "Copiar enlace" (`copyLink` en `components/ItemPanel.tsx`) pide `shortLinkOf` (`app/actions/library.ts`) y copia `/i/<código>`: 10 letras y cifras al azar. Queda en unos 40 caracteres.
- El código vive en `short_link` (migración `0058`): `code`, `item_id`, `inside` (el `?in=` con que se copió, `""` si ninguno). Uno por referencia y lugar, así que copiar dos veces da el mismo enlace. Lógica en `lib/short-link.ts`.
- `app/(library)/i/[id]/page.tsx` lo lee: una persona con sesión va a `/i/<id>?in=<proyecto>`; una app de vista previa lee la tarjeta de la referencia bajo la dirección corta.
- Los enlaces largos ya pegados siguen valiendo. Si el código no se puede pedir (sin red, sin sesión), se copia el largo.
- El portapapeles se abre en el propio clic con un `ClipboardItem` que espera la dirección, porque Safari no deja escribir después de un `await`.

**Por qué.** Es la única opción que lo deja corto sin perder el proyecto. Diez caracteres (unos 59 bits) porque sin sesión el código es el secreto con que entra una app de vista previa, como lo era el id.

**Cómo aplicarlo.** El código no baja de 10 caracteres. Solo lo crea quien ve la referencia (miembro de su espacio). Otra dirección que se pegue fuera y necesite acortarse usa esta tabla, no otro acortador.
