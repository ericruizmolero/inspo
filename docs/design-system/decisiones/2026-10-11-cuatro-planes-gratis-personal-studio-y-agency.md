---
title: Cuatro planes por workspace, Gratis, Personal a 15 €, Studio a 49 € y Agency a 149 €
date: 2026-10-11
status: vigente
kind: producto
supersedes: Los precios de Solo, Studio y Agency (0, 29 y 79 €) y que pasar del límite de personas pare la IA
---
**Contexto.** Había tres planes: Solo (gratis), Studio a 29 € y Agency a 79 €. Con esos precios harían falta unos 256 equipos pagando para llegar a 10.000 € al mes. La página de planes prometía dos cosas que no existen: comentarios y revisiones de DESIGN.md, y soporte por correo el mismo día. Un equipo que bajaba de plan y quedaba con más personas de las que admite perdía también la IA. La decisión completa está en la issue #89.

**Decisión.**
- Cuatro planes en `lib/plans.ts`, con las claves `free`, `personal`, `studio` y `agency` (la clave `solo` desaparece y la migración pasa las filas a `free`):

| Plan | Mes | Año | Personas | Acciones de IA al mes | Referencias | Búsquedas IA |
|---|---|---|---|---|---|---|
| Gratis | 0 | | 1 | 30 | 200 y 1 GB | 30 al mes |
| Personal | 15 | 150 | 1, sin invitaciones | 300 | sin límite | uso justo |
| Studio | 49 | 490 | hasta 5 | 500 | sin límite | uso justo |
| Agency | 149 | 1.490 | hasta 15 en cada espacio, 10 espacios | 2.000 entre todos | sin límite | uso justo |

- El precio es por cuenta de facturación (un workspace, o hasta 10 en Agency), no por persona. Las mismas cifras en euros y en dólares, sin IVA. El anual son dos meses gratis. Ajustes → Plan enseña euros en castellano y dólares en inglés, y el gratis "0 € al mes, para siempre" para que las cuatro tarjetas tengan la misma forma. El botón de cada tarjeta dice solo "Subir" o "Bajar": el nombre ya está en su título, y con cuatro columnas "Move up to Personal" partía en dos líneas.
- Búsquedas con uso justo (`searches: { kind: "fairUse" }`): el techo interno es 10 veces las acciones de IA del plan (3.000, 5.000 y 20.000). Al pasarlo nadie se queda sin buscar: se registra `quota.fair_use_passed` y Ajustes → Plan avisa. Solo el plan gratis tiene un tope que corta (`kind: "capped"`).
- Más personas que el plan, tras bajar de plan: nadie sale y la IA sigue. Solo se paran las invitaciones nuevas, y Ajustes, Equipo y el correo a los dueños avisan. `assertSeatsOk` desaparece.
- La página de planes ya no promete comentarios de DESIGN.md ni soporte el mismo día. Agency promete 10 espacios con un solo plan, que ya cumple la cuenta de facturación (#125).
- Sin prueba de 14 días: el plan gratis hace de prueba.

**Por qué.** De la issue #89: el cliente principal es un equipo, y "50 a 150 €/mes es una cifra que un equipo dentro de una empresa paga sin aprobaciones largas". El coste de IA no limita el precio: Agency al tope cuesta unos 10 $ al mes. Personal existe "para el diseñador que trabaja solo y como puerta de entrada a equipos", y no invita "para que los equipos pequeños no lo usen compartiendo cuenta". Cobrar por persona "castiga invitar, que es lo que queremos". La tabla es una hipótesis que se valida con unos 10 equipos antes de lanzar.

**Cómo aplicarlo.** El nombre de un plan está en el diccionario (`t.plans.items[clave].name`, "Gratis" o "Free"), no en `lib/plans.ts`. Un precio o un tope nuevo se cambia en `lib/plans.ts` y su texto en `lib/i18n/<idioma>/plans.ts`, nunca en otro sitio. Lo que la página de planes promete tiene que existir o tener su issue abierta antes del lanzamiento. Pasarse de un límite blando avisa; solo corta lo que cuesta dinero sin techo, y en el plan gratis.
