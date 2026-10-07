---
title: Las plantillas se llaman Ejemplos
date: 2026-10-06
status: vigente
kind: producto
---
**Contexto.** La primera pestaña de Descubrir se llamaba Plantillas: sistemas enteros (ocho áreas, receta, tablero) con su "de qué a qué", que se pueden clonar como proyecto. Al plantear casos nuevos que no son trabajo propio sino ingeniería inversa de un resultado ajeno (un vídeo, por ejemplo), "plantilla" prometía algo que esos casos no son.

**Decisión.** En la interfaz se llaman Ejemplos (Examples en inglés): la pestaña (`discover.sections.templates`), el título, el vacío, "Borrar ejemplo" y los avisos (`templates.*` y `readOnlyHint` en `lib/i18n/{en,es}/ui.ts`). Solo cambia el texto que se lee. Los nombres internos se quedan: `?in=templates`, `TemplatesView`, `lib/templates.ts`, la columna `template`, `docs/templates/` y `public/templates/`. La acción sigue siendo "Clonar como proyecto".

**Por qué.** Eric: "plantillas podemos llamarlo 'ejemplos'". Que el motivo sea dar cabida a casos de ingeniería inversa además de los propios es interpretación nuestra, por el contexto en el que lo dijo. No renombrar el código ni la URL también es decisión nuestra: no rompe enlaces ya compartidos y el cambio se deshace tocando dos ficheros.

**Cómo aplicarlo.** En cualquier texto que lea una persona (interfaz, correos, documentación del equipo) se escribe "ejemplo", en masculino. En el código se sigue diciendo `template`. Si un día se renombra la URL, `?in=templates` tiene que seguir entrando.
