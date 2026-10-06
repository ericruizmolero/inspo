---
title: En un espacio de equipo el pulido es una votación, y lo cierra quien gestiona el espacio
date: 2026-10-06
status: vigente
kind: producto
---
**Contexto.** Pulido decidía en el acto y sin dejar rastro: Olvidar sacaba la referencia del proyecto para todo el equipo, y Conservar solo se recordaba en el navegador de quien lo pulsaba (`localStorage`). Quien pulía primero decidía por los demás y nadie sabía quién había hecho qué. Eric preguntó: "¿cómo haríamos para que en el pulido participen todos los miembros del equipo?" y "¿cómo saben los del equipo quién ha hecho qué?".

**Decisión.** Con más de un miembro en el espacio, Pulido es una votación (`lib/polish-votes.ts`, tabla `polish_vote`, vista en `components/PolishView.tsx`):
- **Cada persona vota.** Olvidar y Conservar guardan su voto; nada sale del tablón al votar. Cada una ve pendiente solo lo que no ha votado.
- **La vista lo dice.** Los botones pasan a "Tu voto: que salga" y "Tu voto: que se quede", y bajo ellos queda escrito "Aquí vota todo el equipo: sale lo que todos olvidan." (`.polish__team`). La tarjeta votada vuela a la pestaña Pulido, no al Inbox.
- **Los votos ajenos, después del propio.** Qué votó cada cual solo se enseña en una referencia que uno ya ha votado: en la pasada de dudas, con las caras de quien conserva y de quien olvida (`.polish__votes`).
- **El resultado.** Todos los que votaron conservan: se queda. Todos olvidan: sale al cerrar. No coinciden: es una duda.
- **Cerrar.** "Cerrar pulido" es de quien gestiona el espacio (`closeProjectPolish`, con `manage`). No espera a que vote todo el equipo. Antes puede repasar las dudas y decidir cada una; las que deje sin decidir se quedan en el tablón.
- **Quién ha hecho qué.** En la pestaña Pulido, las caras del equipo, a color quien ha votado todo. En la pantalla final, quién falta por votar, y una vez cerrado, quién lo cerró y cuándo. En la ficha de una referencia que el pulido sacó: "Olvidada en el pulido de X: nombres" con "Devolver al tablón" (`.cm-notice`).
- **A solas no cambia nada.** En un espacio de una persona cada respuesta se aplica al momento, como antes; solo que lo conservado se guarda ya en el servidor.

**Por qué.** Eric aprobó la propuesta ("perfecto, hagamos eso"), confirmó que los votos de los demás se vean solo después de votar uno mismo ("eso es") y añadió la condición que manda en la interfaz: "tiene que quedarle claro que el pulido si es un espacio de equipo tiene que ir consensuado y en votación". El razonamiento de la propuesta es mío: el desacuerdo sobre una referencia es justo lo que el equipo tiene que hablar antes del Sistema, y un botón que le quita cosas a los demás sin avisar no es pulir en equipo. Se descartaron los avisos por correo y un feed de actividad del proyecto: para un equipo pequeño es ruido y otro sitio para lo mismo.

**Cómo aplicarlo.** Lo que una persona hace sobre algo del equipo es una propuesta o un voto hasta que el equipo lo cierra, y la interfaz lo dice con sus palabras en el propio control. Quién hizo qué se enseña donde se va a buscar (la pestaña, la ficha), no en una pantalla aparte. Lo que aún no va a ningún sitio no se anima como si se fuera.
