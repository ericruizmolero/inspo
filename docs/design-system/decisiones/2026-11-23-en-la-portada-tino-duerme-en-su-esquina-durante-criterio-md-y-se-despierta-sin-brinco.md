---
title: En la portada Tino duerme en su esquina durante criterio.md, solo sigue a lo que se ve y se despierta sin brinco
date: 2026-11-23
status: vigente
kind: diseño
---
**Contexto.** En la portada (`marketing-site/video/landing/plantilla.html`) había tres saltos raros en el Tino 3D de la esquina (`#actor`):
- Si bajabas rápido mientras la demo del héroe estaba en el Pulido, Tino se quedaba pegado a la ventana del producto, ya fuera de pantalla. La demo se pausa cuando no se ve, así que `actorSide` seguía activo. Al llegar al pie, el Tino grande nacía desde esa posición perdida y aparecía desde el centro.
- En criterio.md se escondía por abajo y volvía a salir antes del pie.
- Al despertar subía en 0,4 s y a la vez pegaba un brinco (`jump(42)`) con sacudida de orejas.

**Decisión.**
- En el `tick` de Tino, la ventana (`#frame`, en el Pulido) y las caras (`.tm-r`) solo se siguen si se ven en pantalla con sitio para él (`vis`). Si no, vuelve a su esquina, y el globo del Pulido (`.pick`) se oculta con `.actor.lost`. `#say` también, salvo si está con las caras (`.actor.faces`): lo que dice de cada uno se sigue viendo aunque la demo se haya quedado pausada en el Pulido.
- Los suavizados del `tick` (posición de la esquina y el crecimiento hacia el Tino grande) dependen del tiempo entre fotogramas, no del número de fotogramas: van igual a 60 Hz que a 120 Hz.
- En criterio.md el Tino de la esquina se queda en su sitio, dormido (`tino.rest(0)` al entrar). Ya no se despierta al llegar ni da el saltito del final. El que escribe es el Tino en píxeles del cursor.
- Se agacha solo para los precios (`#pricing`), como decidió Alberto el [20/11](2026-11-20-los-planes-de-la-portada-siguen-lang-y-tino-se-agacha-cuando-pasan-por-su-esquina.md). Ese día se había movido por error a `#mf`, y se devuelve.
- Despertar: el lienzo sube en 0,7 s con `cubic-bezier(.25, 1, .5, 1)`. Ya arriba, a los 420 ms, se estira las orejas (`kick(16)`) con un bote mínimo (`jump(12)`). Dormirse: se hunde en 1,1 s con `cubic-bezier(.65, 0, .35, 1)`. El Tino grande del pie despierta igual de suave (`kick(18)` y `jump(16)` a los 260 ms, antes `jump(46)`). Con movimiento reducido no hay transición.
- Al pasar por una cara del equipo, Tino se pone al lado de la última foto (`$$(".tm-r figure").at(-1)`, a 40 px), como uno más de la fila. Ahí su globo se abre hacia la derecha, con el rabo a la izquierda (`.actor.faces-r`), para no tapar la última foto; si no cabe en pantalla, o en móvil, se abre como siempre. Antes se medía con la fila entera (`.tm-r`), que ocupa casi todo el ancho, y se quedaba lejos, en tierra de nadie.
- La escritura de criterio.md va antes: empieza cuando el texto asoma por abajo (`vh * .95`, antes `.8`) y acaba con la última línea hacia el 64 % de la pantalla en escritorio y el 71 % en móvil (antes hacia el 40 %, ya arriba).

**Por qué.** Eric: "si hago scroll down muy rapido desde el hero a veces se queda en el hero hasta que no llego al footer y de ahi aparece desde el centro… miralo bien que sea robusto que funcione bien siempre". Sobre criterio.md: "que en el criterio.md siga estando pero que esté dormido ahi para que no haya esos saltos tan raros". Sobre despertar: "el como pasa de estar dormido a levantarse puede ser algo más smooth". Sobre las caras: "aqui es como que tino está en tierra de nadie". Sobre la escritura: "que la animacion de salida de textos de manifiesto empiece un poco antes porque ahora cuando llego al final es como que se queda un poco arriba".

**Cómo aplicarlo.** Tino solo se pega a algo de la página mientras ese algo se ve. Lo que se pausa fuera de pantalla no puede dejarlo colgado. Para no tapar una sección, se agacha. Para callarse, se duerme en su sitio: no se esconde y vuelve a salir. Los suavizados que corren en `requestAnimationFrame` se calculan con el tiempo transcurrido (`1 - Math.exp(-dt / τ)`).
