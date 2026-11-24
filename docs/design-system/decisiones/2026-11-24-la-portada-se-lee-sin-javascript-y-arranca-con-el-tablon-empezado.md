---
title: La portada se lee sin JavaScript y arranca con el tablón empezado
date: 2026-11-24
status: vigente
kind: diseño
---
**Contexto.** Una revisión de diseño de `/` y `/es/` encontró varios fallos. El HTML salía sin titular, entradilla ni manifiesto (los ponía el script). La ventana del producto tardaba 2,5 s en enseñar la primera referencia. Las tarjetas de Comentar y Comparar tapaban la tecla del vídeo en pantallas bajas y en el móvil. El inglés decía "vote with your team" y el castellano "comenta con tu equipo".

**Decisión.**
- `marketing-site/video/landing/textos.cjs` lee `COPY` de `plantilla.html`, y `construir.py` escribe esos textos en el HTML de cada idioma: los `data-t`, los atributos `data-t-<atributo>` (`href`, `placeholder`, `aria-label`) (el manifiesto es ya un componente). El script solo los cambia con `?lang=`. El `<title>` sale también de `COPY`.
- El tablón de la demo empieza con la primera fila puesta (`first()`: 4 referencias, 2 en el móvil); las demás caen como antes.
- La tecla del vídeo (`.cues`) va por encima de las tarjetas de la demo, en la capa 4. Dice "Mira el vídeo de un minuto" / "Watch the one-minute video": "Míralo en un minuto" se leía como "luego".
- La entradilla en inglés sigue a la castellana: "Gather inspiration, comment with your team and connect your agent with Criterio MCP.". `og-home-en.jpg` lleva ese texto.
- `Términos` y el otro idioma, que no salían en ningún sitio, van en el menú ([decisión](2026-11-24-la-portada-lleva-el-menu-los-pasos-el-bento-y-las-preguntas-de-landing.md)).
- El titular se lee como una frase y todo se ve: "Give your landing some taste. Without ~~AI slop~~." / "Ponle criterio a tu landing. Sin ~~AI slop~~." (`slopPre`, en el `h1`, delante del tachado y en su misma línea). Sin la preposición, "AI slop." suelto no tenía sentido; esconderla tampoco valía (Alberto, 24-11: "no aparece el puto without… la frase no tiene sentido"). `og-home-en.jpg` y `og-home-es.jpg` llevan ya el titular completo.
- `--h-ls` pasa de -0,04 a -0,015 em en la portada y en las páginas secundarias (`Base.astro`): la serif se apelmazaba y "Wi" se tocaba (Alberto, 24-11: "tracking is a bit ugly… we should increase tracking"). El tachado mide lo que el texto (`calc(100% + .1em)`), así que sigue a cualquier tracking. Por debajo de 340 px el titular baja de 36 px para seguir en dos líneas.
- `--t-4` pasa a `#8F8B80` en oscuro y `#6A665C` en claro (la línea de autores daba 4,1:1). Privacidad y "Compara los planes" tienen 27 px de alto para el dedo.
- La línea de los planes de la app (`plans.foot`) dice "en la beta pagas la mitad del precio anual": con "2 meses gratis" en las tarjetas, "va a mitad de precio" se leía como otra oferta. La de la web cambió el mismo día ([decisión](2026-11-24-la-portada-dice-que-se-gana-y-ensena-el-antes-y-el-despues.md)).

**Por qué.** Alberto, 24-11, tras la lista de la revisión: "do all". Los textos concretos son interpretación nuestra. El manifiesto se queda en 680 px centrados, como lo decidió Eric el 23-11: la revisión lo dio por descentrado y se equivocaba.

**Cómo aplicarlo.** Un texto nuevo de la portada lleva su `data-t` con una clave de `COPY` en los dos idiomas, y así sale en el HTML sin hacer nada más. Nunca se escribe un texto solo desde el script. El vídeo publicado se grabó con el tablón vacío al empezar: no se regraba por esto, pero la próxima grabación saldrá con la primera fila puesta.
