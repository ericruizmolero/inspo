---
title: Tino propone un respiro tras un buen rato activo
date: 2026-11-06
status: vigente
kind: diseño
---
**Contexto.** Tino solo hablaba del trabajo: el proyecto, el Inbox, el fichero. Eric: "haz que Tino de vez en cuando si ve que llevas X tiempo en la plataforma activo que te recomiende ponerte musiquita o igual cambiar de dark mode a light mode, o que vayas a recursos a ver inspiración etc."

**Decisión.** `useTinoBreak` (`components/tino-break.ts`), dentro de `HomeTino`, así vale en todas las esquinas (Inicio, tablón, Inbox, Sistema).
- **Tiempo activo**: cuenta cada 15 s si la pestaña está a la vista y hubo puntero, rueda o teclado en los últimos 90 s. Se guarda en `sessionStorage` (`criterio:tino-active`), sobrevive a recargar.
- **Cuándo**: a los 40 minutos activos, y nunca dos respiros a menos de 30 minutos de reloj (`criterio:tino-break-at` en `localStorage`, así dos pestañas no lo dicen las dos). Tras decirlo, el contador vuelve a cero.
- **Qué**, por turnos (`criterio:tino-break-turn`), saltando lo que no toca:
  - **Música** (solo si está apagada): "Llevas una hora dándole sin nada de fondo. ¿Te pongo algo de lo-fi?", **Ponla** enciende la música de la app (`startMusic` en `components/SoundControl.tsx`).
  - **Tema**: "Llevas una hora en oscuro. Pásate un rato a claro…", **Pasar a claro** (o a oscuro) con `switchTheme`.
  - **Recursos** (salvo si ya estás en Descubrir): "…En Recursos están los sitios donde buscamos referencias", **Ir a Recursos** (`/?in=discover`).
  - **Estirar**: "Llevas una hora sin parar. Estira, bebe agua y vuelve con otros ojos.", **Vale**.
- Sale aunque se cerrara el globo de la visita, por encima de los avisos, pero nunca encima de lo que la persona está haciendo (`say`, `speak`) ni con la esquina en silencio (`quiet`) o Tino apagado: espera. "Luego", la × o su botón lo dan por dicho.
- El tiempo se dice como se dice ("media hora", "una hora", "hora y media", "dos horas"; `t.tino.pause.long`), nunca en minutos.

**Por qué.** Eric, con sus palabras arriba. Los 40 minutos y el orden de los turnos son interpretación nuestra de "de vez en cuando".

**Cómo aplicarlo.** Un respiro nuevo es un `Kind` más en `tino-break.ts` con su condición de cuándo no toca. Para probarlo sin esperar, en la consola: `sessionStorage.setItem("criterio:tino-active", 2400000); localStorage.removeItem("criterio:tino-break-at")` y en 15 s sale.
