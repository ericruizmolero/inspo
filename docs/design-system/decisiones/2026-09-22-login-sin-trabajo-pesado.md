---
title: Lo público carga al instante y se cura a mano
date: 2026-09-22
status: vigente
kind: producto
---
**Contexto.** Se probó un filtro automático que analizaba capturas al arrancar /login para elegir el escaparate.

**Decisión.** El escaparate de /login son imágenes fijas en `public/showcase/` que sube una persona. Nada de análisis al vuelo.

**Por qué.** "esto NO, quiero que sea rápido". La entrada es lo primero que ve alguien nuevo; ni segundos de espera ni una captura en blanco.

**Cómo aplicarlo.** En páginas públicas (login, planes, invitación) no hay IA, ni descargas de Blob, ni análisis de imágenes al renderizar. Lo precomputado va en build, script o segundo plano. Antes de automatizar una selección visual, preguntar si la prefiere elegir el equipo.
