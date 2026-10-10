---
title: Los correos son solo texto, con el enlace arriba
date: 2026-10-10
status: vigente
kind: diseño
---
**Contexto.** El correo de acceso salía con una plantilla HTML genérica (cabecera, botón, pie con estilos) y la marca mezclada entre remitente, asunto y firma. Es lo primero que ve una persona nueva. Issue #39, chat de socios del 22/09/2026.

**Decisión.** Todos los correos salen en texto plano, sin parte HTML. `lib/mail.ts` devuelve `Mail { subject, text }` y `sendMail(to, mail, opts)` manda solo `text` a Resend. Se borran la plantilla (`layout`), la fuente y las claves que solo servían al HTML (`title`, `body`, `cta`, `note`, `fallbackNote`, `questions`, `stopNote`) de `lib/i18n/{en,es}/mail.ts`. El enlace va en las dos primeras líneas: el de acceso, la invitación, el aviso del panel y el resumen diario. Sin firma: el remitente ya dice Criterio y el asunto dice criterio.design.

**Por qué.** "Los correos van solo texto, sin diseño alguno. Se leen siempre, y entrar es una interacción que tiene que ser rápida: el enlace cuanto antes" (Alberto, con Eric de acuerdo). Quitar la firma es interpretación mía de "sin repetir el nombre tres veces".

**Cómo aplicarlo.** Un correo nuevo es una función de `lib/mail.ts` que devuelve `Mail` y un `text` en los dos idiomas. Primero el enlace, luego una o dos frases. Nada de HTML, botones ni firma. Los de equipo terminan con `footerText` (por qué llega y la baja de un clic).
