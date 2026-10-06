---
title: Un miembro borra lo suyo y los admins el resto
date: 2026-10-06
status: vigente
kind: producto
---
**Contexto.** Había tres roles (propietario, admin, miembro) pero solo servían para ajustes, invitaciones y comentarios ajenos. Cualquier miembro podía borrar cualquier referencia y cualquier proyecto, y el rol se elegía al invitar sin poder cambiarlo después.

**Decisión.** Una referencia la borra quien la guardó o quien gestiona el espacio (`deletableIds` en `lib/items.ts`, la misma prueba de autoría que `setItemNote`). Un proyecto lo borra quien lo creó o quien gestiona el espacio (`startedProject` en `lib/projects.ts`). La regla vive en el servidor (`removeInspo`, `removeInspos`, `removeProject` en `app/actions/library.ts`) y el agente la cumple igual (`lib/agent.ts`). Una selección con tarjetas de otra persona no se borra a medias: se rechaza entera con un mensaje. La papelera de la tarjeta no se pinta para quien no puede usarla. En Ajustes › Miembros, quien gestiona el equipo cambia el rol de cada persona entre Miembro y Admin con un selector en su fila (`.list__pick`); el propietario no se mueve.

**Por qué.** Andoni, 6 de octubre: "habrá que poner roles para cada persona porque habrá uno que será el administrador que pueda borrar todo y habrá otros que igual no te interesa". El reparto concreto lo propuso Claude y Eric lo aceptó con "hagamos todo". Que el creador de un proyecto pueda borrarlo es un añadido de Claude: Andoni creó un proyecto de prueba en esa misma reunión y quiso quitarlo al momento.

**Cómo aplicarlo.** Cualquier camino nuevo que borre (una acción, una herramienta del agente, el conector) pasa por `deletableIds` o `startedProject`. `canManage` está en `lib/workspace-core.ts` para que también lo use el código sin Next.
