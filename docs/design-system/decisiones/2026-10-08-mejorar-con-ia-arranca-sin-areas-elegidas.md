---
title: "Mejorar con IA" arranca sin ninguna área elegida
date: 2026-10-08
status: vigente
kind: diseño
---
**Contexto.** El modal "Mejorar con IA" (`components/ImproveModal.tsx`) abría con las ocho áreas marcadas, y "Todas" como chip pulsado. Para afinar una sola había que desmarcar siete.

**Decisión.** Las áreas arrancan sin elegir. Eric, al verlo: "las áreas de primeras tienen que estar sin seleccionar". "Todas" sigue ahí y las marca de un golpe; hace falta al menos una para que "Mejorar" se active. Los objetivos (ordenar, afinar la escritura, releer referencias) sí siguen encendidos de inicio.

**Por qué.** Elegir dónde va la pasada es parte de pedirla (principio 14: la IA propone, el equipo decide). Una pasada sobre todo el sistema es la excepción, no el punto de partida.

**Cómo aplicarlo.** Un selector de alcance que gasta IA arranca vacío y ofrece "Todas" como atajo; nunca al revés.
