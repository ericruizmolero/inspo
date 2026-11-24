---
title: El logo de la portada va dentro del titular, y la portada no lleva header
date: 2026-11-24
status: vigente
kind: diseño
supersedes: La portada lleva el logo con el menú (2026-11-24), solo en que el logo va arriba
---
**Contexto.** Con [el menú oculto](2026-11-24-el-menu-de-la-web-se-oculta-por-ahora.md), el header de la portada era solo el logo: Tino en píxeles y "criterio".

**Decisión.** La portada (`/`, `/es/`) no lleva header. Tino en píxeles, el trazado del logotipo con el visor hueco (`public/tino/tino-logo-negro.svg`), va en el `h1` delante de la palabra: "Ponle (Tino) criterio a tu landing." En inglés va delante de "taste.", que es la palabra que traduce criterio. En `marketing-site/video/landing/plantilla.html`, `.h1-m`: 0,88 em de alto, en el color del texto, oculto a los lectores de pantalla y sin separarse de la palabra al partir línea. El titular se escribe en tres trozos de `COPY`: `h1a`, `h1m` y `h1b`. Las demás páginas siguen con el logo en `SiteHeader`, que es su vuelta a la portada. Sin header, el héroe pierde el aire que dejaba debajo (`.hero` sin `padding-top`): el titular empieza a unos 70 px del borde en todos los tamaños, en vez de a unos 145.

**Por qué.** Alberto, 24-11: "quita el logo también y hazlo parte de la header de la landing Ponle 'logo' criterio" y, al verlo, "reduce entonces el espacio del hero por arriba". El sitio en inglés y que las demás páginas lo conserven son interpretación nuestra.

**Cómo aplicarlo.** El logo no se repite en el héroe de la portada. Si vuelve el menú a la portada, `construir.py` coloca `SiteMenu` directamente, sin logo. Si se cambia el titular, Tino va pegado a la palabra del nombre.
