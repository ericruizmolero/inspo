---
title: En móvil y tablet el menú se aparta al bajar, Tino se queda en el borde y nada que pulsar mide menos de 44 px
date: 2026-11-24
status: vigente
kind: diseño
---
**Contexto.** Barrido de la portada en diez tamaños (de 320 a 1180 px, y el móvil tumbado), en los dos idiomas. Sin scroll lateral, pero: la tecla Menú tapaba precios y frases; Tino, en tablet, se sentaba sobre los planes y el bento; la casilla medía 18 px y las preguntas 38; en 320 la respuesta quedaba fuera de pantalla; el titular de tablet era pequeño (38 px a 820) y el manifiesto iba en una columna de 450 px; la ventana del producto medía 1.000 px de alto; el Tino del cierre pasaba por encima del formulario.

**Decisión.**
- Menú: por debajo de 1241 px la tecla se va al bajar y vuelve al subir 24 px, con `transform` (`.hh-away`). Arriba del todo y con el foco dentro, siempre está. El logo y la tecla van al margen del texto (22 px) en el móvil.
- Tino: hasta 1240 px va como en el móvil, asomado por el borde (`edge` en `plantilla.html`). En el cierre se agacha mientras pasa el formulario y sale por debajo.
- Con el dedo (`pointer: coarse`): casilla, correo, botones, preguntas, enlaces del cierre, del pie y del menú a 44 px.
- Preguntas: al pulsar, la página baja lo justo para que se vea la respuesta entera.
- Tipografía: titular `clamp(min(36px, 10.6vw), 5.6vw, 66px)`, titulares de sección `clamp(31px, 4.4vw, 48px)` y manifiesto `clamp(24px, 3.5vw, 38px)`, con la ventana más ancha en tablet (`--gmax: 8vw`).
- Ventana del producto: hasta 560 px de ancho por debajo de 861. Con el móvil tumbado el cierre mide 580 px, no 820.
- El cursor de Alberto, en el manifiesto, cuelga debajo de la palabra: arriba tapaba la línea anterior.

**Por qué.** Alberto, 24-11: "review overall responsive of the landing page and find gaps in tablet and mobile for making a mobile first perfect experience for our future customers".

**Cómo aplicarlo.** Una sección nueva se mira a 320, 390, 820, 1024 y 844x390 antes de darla por hecha, y con `pointer: coarse` sus controles miden 44 px.
