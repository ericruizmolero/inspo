---
title: El vídeo de la portada abre con el titular y se cierra al decir «Es tuyo»
date: 2026-11-24
status: vigente
kind: diseño
---
**Contexto.** Eric revisó el vídeo de un minuto que abre la portada (`criterio-{es,en}.mp4`). Pasaban unos 4 s hasta oír solo «Mira. Esto es Criterio.», y desde «Es tuyo» hasta el final quedaban unos 12 s. Además vio detalles de la demo que se graba: al importar, toda la pestaña «Landing Criterio» botaba con cada referencia; a la derecha había una barra naranja con «12/12»; el diálogo de Conectar llevaba una cabecera verde; el chat de la IA no tenía la letra de Claude, y el logo de la Isla era una baldosa clara con Tino oscuro.

**Decisión.**
- La voz abre con el titular de la portada: «Ponle criterio a tu landing.» / «Give your landing some taste.» (primer bloque de `T.<idioma>.blocks` en `marketing-site/video/montar.cjs`). En inglés, la frase siguiente pasa a «Here you keep everything you like.». La entrada de marca sigue (Tino, «Criterio» y el visor que se abre), pero dura lo que dura esa frase. El silencio de Tino antes de la voz (`PRE`) baja de 1,3 s a 0,6 s.
- El final: el tramo en el que la IA construye la web (`F`) se corta a su velocidad 0,6 s después de «Es tuyo», y entra el cierre. Ya no se enseña la web acabada a pantalla completa (el tramo `G`, que antes duraba 5,3 s). El cierre («Entrena tu gusto.») dura lo que su voz más 1,7 s.
- En la demo (`marketing-site/video/landing/plantilla.html`), al importar solo bota la cifra de la pestaña (`count` añade `.bump` al `em`, que pasa a `inline-block`). La barra de progreso y el «12/12» (`.ip`) se han quitado.
- El diálogo de Conectar (`.dlg`) es como `DialogWindow` en la app: el título «Lleva Criterio a tu IA» va en la cabecera, con una línea `--cborder` debajo y el aspa de cerrar. Ya no lleva la barra verde ni el «Conectar» de antes.
- El chat de la IA (`.ai.cw`, `.a2`) usa una sola letra, la de la interfaz de Claude, «Anthropic Sans», también en la respuesta. Una primera versión puso la respuesta en «Anthropic Serif» y Eric la corrigió: «la respuesta es como otra typo y eso no está bien». La fuente no se publica: `grabar.cjs` la sirve solo a la grabación, desde la app de Claude instalada en el Mac (`/Applications/Claude.app/Contents/Resources/fonts`, o la ruta que se indique en `CLAUDE_FONTS`). En la web, la demo cae a `system-ui`.
- El logo de la Isla de la demo (`.ws-c`) va como en la app: Tino claro sobre la Isla, con el visor recortado, y un chevron al lado.

**Por qué.** Eric: «se tardan 4 segundos en decir solo "mira, esto es criterio"… quizás hay que empezar por una promesa, por un hook». Entre tres ganchos eligió el titular de la web. Es una promesa, no un arranque sobre el problema, que sigue rechazado. Del final: «desde que acaba el audio de "es tuyo" hasta acaba el video pasan muchos segundos» y, tras un primer recorte, «ni hace falta mostrar esa web de prueba… cuando dice "es tuyo" ya podemos ir terminando». De la demo: «es mejor que solo se mueva el número de contador», «una raya naranja al lado de 12/12 que no mola nada», «esa cabecera verde no queda nada profesional» y «tiene una typo que no es la propia del chat de claude».

**Cómo aplicarlo.** Si cambia el titular de la portada, cambia también la primera frase del vídeo, en los dos idiomas, y se vuelve a generar la voz. Lo que la demo enseña de la app copia la app tal como es hoy: su Isla, sus diálogos y sus números. Lo que enseña de otra herramienta, como el chat de Claude, se graba con la letra de esa herramienta, pero sin publicarla. El enlace a la web de ejemplo va a `plomo/index.html`: el servidor de desarrollo de Astro no sirve `plomo/` como carpeta, y la grabación acababa en «Not found».
