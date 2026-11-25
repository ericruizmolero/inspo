---
title: El pie de todos los correos lleva el apartado legal
date: 2026-11-25
status: sustituida
kind: diseño
---
**Contexto.** El pie de los correos decía "criterio.design" y "© Criterio", sin las páginas legales ni quién los manda.

**Decisión.** El pie de `layoutHtml` y `layoutText` (`lib/mail-layout.ts`) lleva siempre, en todos los correos, los enlaces a criterio.design, Privacidad y Términos en el idioma del correo, y debajo "© Savvia CB, NIF E75239277" y el domicilio (`SENDER`). Son los datos de `LEGAL` en `marketing-site/src/legal.ts`, los de las páginas legales. El motivo y la baja siguen encima cuando el correo los tiene.

**Por qué.** Alberto: "el footer debería llevar siempre el apartado legal, actualízalo en todos los mails". Qué datos entran es interpretación nuestra.

**Cómo aplicarlo.** Si cambia la entidad, cambian `LEGAL` y `SENDER` (`tests/mail-templates.test.ts` avisa), y después `npm run mail:templates layout`.
