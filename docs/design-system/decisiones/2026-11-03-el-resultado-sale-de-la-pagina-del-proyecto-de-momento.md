---
title: El Resultado sale de la página del proyecto, de momento
date: 2026-11-03
status: vigente
kind: producto
supersedes: El Resultado es una cuarta vista del Sistema (2026-10-13)
---
**Contexto.** Desde el 13-10 la página del proyecto tenía cuatro pestañas: Agente, Persona, Presentación y Resultado, donde la app construía una página con IA a partir del criterio.md. El mismo día que el criterio.md pasa a ser una guía para que el agente de la persona construya con ella ([decisión](2026-11-03-el-criterio-md-es-una-guia-con-recorrido-no-un-prompt.md)), Eric decide quitar el Resultado.

**Decisión.** La fila de pestañas de `SystemView` (`VIEWS` en `components/SystemView.tsx`) se queda en tres: **Agente**, **Persona** y **Presentación**. `ResultView`, `lib/criterio-result.ts`, su API y la tabla `criterio_result` siguen en el código sin usarse, para poder recuperarla.

**Por qué.** Eric: "lo de resultado vamos a quitar de momento; dejamos agente, humano y presentación". Interpretación mía: si el MD guía al agente de la persona para hacer una página, construirla dentro de la app compite con ese camino y cuesta IA nuestra.

**Cómo aplicarlo.** No se enlaza ni se ofrece el Resultado desde ninguna parte de la interfaz. Si vuelve, se escribe una decisión nueva y se recupera la pestaña añadiendo `"result"` a `VIEWS`.
