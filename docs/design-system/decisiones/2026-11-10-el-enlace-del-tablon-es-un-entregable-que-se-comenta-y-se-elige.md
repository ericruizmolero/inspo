---
title: El enlace del tablón es un entregable que se comenta y se elige
date: 2026-11-10
status: vigente
kind: producto
supersedes: 2026-11-06-el-enlace-comparte-solo-el-tablon-tal-cual
---
**Contexto.** El enlace `/s/<token>` enseñaba el tablón entero, en solo lectura, a cualquiera con la dirección. Eric (10-11): "vamos a mejorar mucho el compartir tablón", "un enlace público del tablero, que cualquiera (un cliente, el equipo…) pueda comentar y elegir entre variantes", "quien comparte tiene que poder escoger los items que quiere compartir. Todos o seleccionar", "o bien que quien tenga el enlace pueda entrar, o invitar a usuarios específicos", "que cualquiera que entre se le ponga un avatar random y pueda comentar sobre las fichas", "que sirva como entregable intermedio e interactivo con cliente".

**Decisión.**
- Sigue siendo solo el tablón (ni criterio.md ni la marca), con el mismo `Grid`, `InspoCard` e `ItemPanel` de la app.
- Qué se comparte: todo el tablón o una selección, y la selección se hace en el tablón, donde se ven las referencias: ⌘ clic en las tarjetas y "Compartir" en la barra de selección (`SelectBar`, dentro de un proyecto), que abre el diálogo con "Todo el tablón | N elegidas". Se probó elegir sobre una rejilla de miniaturas dentro del diálogo y Eric la descartó: "ahí dentro no se aprecia lo que quieras seleccionar", "que el propio seleccionar cuando seleccionas muchas en el tablón ya te salga un botón de compartir". Se guarda en `system_share.item_ids` (vacío = todo).
- Quién entra (`system_share.access`): `link`, cualquiera con la dirección; `invite`, solo personas invitadas por correo, cada una con su propia dirección (`share_guest`, correo con `shareInviteMail`). La dirección general de un enlace de invitados no abre nada.
- Quien entra es un invitado con nombre: el invitado por correo con el suyo (lo de antes de la @), el resto con uno al azar ("Nutria ámbar", `hooks/use-share-guest.ts`) y su avatar es la inicial en su tono (`PersonAvatar`). El nombre se pulsa arriba a la derecha y se reescribe en el sitio.
- Comentar: la ficha lleva el hilo de la app (`CommentsPanel` con `noFiles`, solo palabras). Lo escrito va a `inspo_comment` con `guest_key` y `share_id`, así que el equipo lo lee en su hilo con la etiqueta "invitado" y lo contesta desde ahí. En el enlace se ve solo lo escrito por ese enlace y las respuestas del equipo, nunca la conversación interna.
- La cabecera del enlace es el nombre del proyecto, el subtítulo opcional que se escribe al compartir y quién eres; sin "criterio.design". El invitado puede poner su foto pulsando su avatar (Eric: "que si quieren que suban su foto"). En un enlace completo el equipo sale con su foto ("la foto de Eric no sale en compartir... que salga"), y lo que guardó un agente sale como de la persona, sin el logo de Claude ("eso solo en compartir").
- Elegir: el círculo de selección de la tarjeta es la elección del invitado (se queda puesto) y la ficha lleva "Elegir" con quién la eligió; quién más la eligió sale arriba a la derecha de la tarjeta (`share_pick`). Cada enlace en el diálogo dice cuántos comentarios y elecciones han vuelto.
- Sin sesión: el token es la prueba y un invitado anónimo manda además un secreto aleatorio de su navegador (su clave es el hash). Límite de 30 mensajes o elecciones cada 10 minutos por persona y 300 por enlace.

**Por qué.** Palabras de Eric arriba: el enlace pasa de enseñar a recoger lo que piensa el cliente. Que el hilo sea el mismo que el del equipo sigue el principio "menos sitios para lo mismo" (interpretación mía), y elegir en el tablón en vez de en una lista del diálogo, "sobre las tarjetas, no en tablas ni modales".

**Cómo aplicarlo.** Lógica en `lib/share.ts` (enlaces e invitados) y `lib/share-guests.ts` (comentar, elegir, renombrar); acciones en `app/actions/share.ts`; página en `components/brand/ShareBoard.tsx` y diálogo en `components/brand/ShareDialog.tsx`; migración `0056_share_guests`. Lo que se añada al enlace pasa por `onLink` para no salir de sus referencias.
