---
title: La herramienta de feedback va con versión fija
date: 2026-10-06
status: vigente
kind: desarrollo
---
**Contexto.** "Dar feedback" se monta sobre Agentation, que no tiene API para encender o apagar su modo: `components/feedback-mode.ts` pulsa su barra oculta. El 6 de octubre una actualización de dependencias subió Agentation de 3.0.2 a 3.1.2 dentro del rango `^3.0.2`. La 3.1 mete la barra en el shadow root de `<agentation-toolbar>`, así que ni los selectores ni la CSS de la app la alcanzaban: el panel propio no se abría y quedaba a la vista la barra original, sin salida clara. Andoni lo encontró en la reunión de ese día.

**Decisión.** `agentation` queda en versión exacta (`3.1.2`) en `package.json`. `feedback-mode.ts` busca la barra dentro del shadow root (`agentationRoot`), la oculta con un `<style>` propio dentro (`hideAgentationBar`) y usa el único botón que enciende y apaga el modo (`aria-keyshortcuts`, con el estado en `aria-expanded`). La regla `[data-agentation-toolbar]` de `globals.css` se retira porque ya no hacía nada.

**Por qué.** La integración depende de la forma interna de una librería ajena: un rango abierto la rompe sin que cambie una línea nuestra.

**Cómo aplicarlo.** Subir Agentation es un cambio a propósito: se lee su barra, se ajusta `feedback-mode.ts` y se prueba entrar, anotar, limpiar, enviar y salir (X y Esc) antes de desplegar.
