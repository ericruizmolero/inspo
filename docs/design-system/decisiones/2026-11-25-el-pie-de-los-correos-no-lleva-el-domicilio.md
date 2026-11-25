---
title: El pie de los correos no lleva el domicilio
date: 2026-11-25
status: vigente
kind: diseño
supersedes: 2026-11-25-el-pie-de-todos-los-correos-lleva-el-apartado-legal
---

**Contexto.** Desde esta misma mañana el pie de todos los correos (`layoutHtml` y `layoutText` en `lib/mail-layout.ts`) llevaba los enlaces legales, "© Savvia CB, NIF E75239277" y, debajo, el domicilio de Hondarribia.

**Decisión.** Fuera el domicilio: `SENDER` ya no tiene `address` y el pie acaba en "© Savvia CB, NIF E75239277". Los enlaces a criterio.design, Privacidad y Términos siguen. El domicilio sigue en `LEGAL` (`marketing-site/src/legal.ts`) y en las páginas legales. `tests/mail-templates.test.ts` comprueba que el pie no lo lleva.

**Por qué.** Eric, 25-11, sobre el correo de bienvenida: "podríamos quitar la direccion de abajo porfa?".

**Cómo aplicarlo.** Tras cambiar el pie, `npm run mail:templates layout` vuelve a publicar las plantillas de Resend con él.
