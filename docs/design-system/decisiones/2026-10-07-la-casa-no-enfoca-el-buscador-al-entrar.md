---
title: La casa no enfoca la caja de proyecto al entrar
date: 2026-10-07
status: vigente
kind: diseño
---
**Contexto.** Al entrar en la casa de la app ("¿Qué vas a hacer hoy?"), la caja para nombrar un proyecto nuevo (`PromptInput` en `components/ProjectChooser.tsx`) tomaba el foco sola (`autoFocus`), con el cursor parpadeando y el anillo de foco encendido antes de que la persona hubiera decidido nada.

**Decisión.** La caja de la casa no lleva `autoFocus`: se enfoca con un clic o con el tabulador, como cualquier campo. Los ejemplos del placeholder siguen rotando igual.

**Por qué.** Eric, 07-10: "cuando entras a la view principal que el buscador no aparezca como focus". Interpretación nuestra: la casa es un sitio donde se elige (abrir un proyecto o empezar uno) y el foco en la caja empuja hacia una sola de las dos cosas.

**Cómo aplicarlo.** Una pantalla de elección no enfoca ningún campo al abrirse. El foco automático queda para los pasos que son un solo campo (nombrar un proyecto desde la Isla, pegar una URL en un modal, el login).
