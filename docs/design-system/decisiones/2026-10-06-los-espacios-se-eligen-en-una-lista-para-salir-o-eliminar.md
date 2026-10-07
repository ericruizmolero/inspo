---
title: Los espacios se eligen en una lista para salir o eliminarlos
date: 2026-10-06
status: vigente
kind: producto
---
**Contexto.** En la reunión del 6 de octubre Andoni quiso borrar un equipo que había creado para probar y no encontró cómo: no existía "eliminar equipo" en ninguna parte y el propietario tampoco podía salir. Ajustes actuaba siempre sobre el espacio abierto, así que acabó saliendo de Criterio, que no era el que quería quitar.

**Decisión.** Ajustes › Espacio lleva una tarjeta "Tus espacios" (`Spaces` en `app/settings/_components/WorkspacePanel.tsx`) con todos los espacios de la persona en filas `.list__row`: el abierto va marcado, cada fila dice el rol, y la acción va en la fila: "Salir del equipo" para quien no lo creó y "Eliminar" para el propietario. El espacio personal no tiene acción. Eliminar pide escribir el nombre del equipo (`typed` en `useConfirm`) y borra referencias, proyectos, comentarios y ficheros. La tarjeta suelta "Salir de este equipo" desaparece. El servidor no deja eliminar el espacio personal (`beforeDeleteOrganization` en `lib/auth.ts`).

**Por qué.** Andoni: "que puedas seleccionar el espacio y que puedas ver cuál quieres borrar, cuál no". La propuesta de que solo elimine el propietario y de pedir el nombre fue de Claude y Eric la dio por buena con "hagamos todo".

**Cómo aplicarlo.** Lo que saca a alguien de un espacio o lo borra nombra siempre el espacio en la fila y en la confirmación, nunca "este". Lo que se lleva el trabajo de otras personas pide escribir el nombre.
