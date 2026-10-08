---
title: El login es plano, sigue el tema y enlaza siempre a Términos y Privacidad
date: 2026-10-07
status: vigente
kind: diseño
---
**Contexto.** Con el sistema, el login heredó el campo hundido casi negro, los botones sociales con bisel a 52 y el Chip de mantequilla de "Último usado", que a 13 px con relleno se montaba sobre "Continuar con Google". Y en producción no salían los enlaces a Términos y Privacidad porque `legalShown()` los ocultaba hasta tener los datos de la sociedad en `lib/legal.ts`.

**Decisión.** El panel del login sigue el tema (`.auth__panel`: `--bg` y `--text`, ya no fuerza Paper con `color-scheme: light`): en Board es oscuro con el CTA en papel y el estado desactivado en los grises del tema; en Paper, papel. `.auth__panel` (`app/globals.css`) redefine dentro del login los tokens de campo (`--field` = superficie, borde de 1 px `--border`, sin `--sunken`) y los `.btn` que no son primarios (46 de alto, superficie, línea de 1 px, sin bisel, peso 500); el foco del campo es borde fuerte y `--surface-2`, sin anillo. El CTA ember conserva el bisel; "Volver" (`cr-btn`) también va plano. "Último usado" (`.auth__last.cr-chip`) es una pastilla de 12 px, relleno 3/7, `--surface-2` y texto apagado, absoluta al final del botón. Pista a `--fs-ui`, etiqueta y pie a `--fs-label`. En `lib/legal.ts`, `legalShown()` devuelve siempre true: las páginas responden en producción con los datos pendientes nombrados como tales y el aviso de borrador, y el pie del login las enlaza siempre.

**Por qué.** Eric: "esto que tenga aspecto parecido a como antes. El último usado se solapa con el texto. No están las políticas y términos". Y al verlo en papel: "igual el color hay que ver cuál usar de background, ¿no? Me gustaba más dark mode". Interpretación nuestra: el login es la puerta y pide el formulario sencillo de antes; el bisel queda solo en la acción principal.

**Cómo aplicarlo.** Los formularios de entrada (login, invitación) son planos: campo y botones sobre la superficie con línea de 1 px, un solo bisel en el CTA. Una etiqueta dentro de un botón va pequeña y apagada y nunca invade el texto. Los enlaces legales están siempre; lo que falta es rellenar `LEGAL` en `lib/legal.ts`.
