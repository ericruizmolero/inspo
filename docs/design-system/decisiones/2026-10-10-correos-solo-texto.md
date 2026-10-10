---
title: Los correos son solo texto, con el enlace arriba
date: 2026-10-10
status: vigente
kind: diseño
---
**Contexto.** El correo de acceso salía con una plantilla HTML genérica (cabecera, botón, pie con estilos) y la marca mezclada entre remitente, asunto y firma. Es lo primero que ve una persona nueva. Issue #39, chat de socios del 22/09/2026.

**Decisión.** Todos los correos salen en texto plano, sin parte HTML. `lib/mail.ts` devuelve `Mail { subject, text }` y `sendMail(to, mail, opts)` manda solo `text` a Resend. Se borran la plantilla (`layout`), la fuente y las claves que solo servían al HTML (`title`, `body`, `cta`, `note`, `fallbackNote`, `questions`, `stopNote`) de `lib/i18n/{en,es}/mail.ts`. El enlace va en las dos primeras líneas: el de acceso, la invitación, el aviso del panel y el resumen diario. Firman los tres socios: "Eric, Andoni y Alberto" (`signature`, en inglés "Eric, Andoni and Alberto"). El de feedback no lleva firma porque va a los propios socios.

**Por qué.** "Los correos van solo texto, sin diseño alguno. Se leen siempre, y entrar es una interacción que tiene que ser rápida: el enlace cuanto antes" (Alberto, con Eric de acuerdo). La firma con los tres nombres la propuso Alberto el 10/10: no repite la marca y la manda una persona, no un producto.

**Cómo aplicarlo.** Un correo nuevo es una función de `lib/mail.ts` que devuelve `Mail` y un `text` en los dos idiomas. Primero el enlace, luego una o dos frases. Nada de HTML ni botones. La firma la pone `signed`. Los de equipo terminan con `footerText` (por qué llega y la baja de un clic).
