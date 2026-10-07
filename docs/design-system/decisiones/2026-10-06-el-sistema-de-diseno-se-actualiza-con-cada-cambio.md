---
title: El sistema de diseño se actualiza con cada cambio, no solo con cada decisión
date: 2026-10-06
status: vigente
kind: desarrollo
---
**Contexto.** La regla escrita era registrar una decisión cuando el equipo aprueba, rechaza o corrige algo. Con varias sesiones de agente trabajando el mismo día, parte de lo construido (una página nueva, un componente, un permiso que cambia lo que se pinta) llegaba al código sin su ficha en el catálogo o sin que ninguna página de reglas enlazara la decisión.

**Decisión.** Todo trabajo que cambie la interfaz, un token, un componente, un patrón, una ruta, un atajo o la forma de construir termina con `docs/design-system/` al día en ese mismo trabajo, sin esperar a que nadie lo pida: la ficha en `componentes.md`, la regla en `patrones.md`, `fundamentos.md` o `desarrollo.md`, la ruta en `mapa.md`, el atajo en `atajos.md`, y la decisión en `decisiones/` cuando la hubo. Queda escrito en `AGENTS.md` y en el apartado "Para agentes" del `README.md` de este sistema.

**Por qué.** Eric, 6 de octubre: "actualiza siempre el sitema de diseño con las ultimas cosas que vayamos haciendo". Interpretación nuestra: `/library` es lo que leen las personas y los agentes antes de construir, así que una pieza que no está ahí se vuelve a inventar o se contradice.

**Cómo aplicarlo.** Antes de dar un trabajo por terminado, repasar el diff contra el sistema: cada componente nuevo o cambiado tiene su ficha, cada decisión del día está enlazada desde al menos una página de reglas, y lo que se retiró dice que se retiró. Si otra sesión está tocando lo mismo, no se duplica su decisión: se enlaza la suya.
