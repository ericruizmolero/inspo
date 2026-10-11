---
title: Quien descarta una propuesta puede decir por qué en una línea, y la siguiente pasada lo lee
date: 2026-10-11
status: vigente
kind: producto
---
**Contexto.** Desde #48 las pasadas leen las propuestas rechazadas de un área y no las vuelven a proponer, pero un rechazo solo guardaba el estado y quién dijo que no. El modelo no distinguía entre "este azul no" y "ningún segundo color", así que un rechazo de un valor concreto podía bloquear de más o de menos (issue #133).

**Decisión.** Al pulsar Descartar o Retirar en una propuesta (`SystemDoc`, `.sdoc-proposal__refuse`) se abre una línea bajo ella: un campo s opcional ("Por qué no, en una línea"), el mismo botón para confirmar y Cancelar. ↩ confirma y Esc cierra. El motivo se guarda en `about.proposal.reason` (`lib/area-comments.ts`, una línea de 200 caracteres como mucho, solo en una propuesta rechazada: una nueva o aceptada nunca lo lleva). `areaMemory()` lo pasa en `rejected[].reason` y la regla `MEMORY` (`lib/system.ts`) dice que el motivo marca hasta dónde llega el no: lo que descarta queda fuera en cualquier propuesta, lo que deja abierto sigue abierto, y sin motivo el no cubre esa propuesta y sus equivalentes. criterio.md lo enseña bajo la línea de la propuesta descartada (`Por qué no: «…»`), que es también el hilo del área en la app y lo que lee el MCP con `read_criterio`. Sube la versión de system (7), options (6) y curate (4).

**Por qué.** Lo pide el issue #133: "Sin el motivo, el modelo no distingue entre «este azul no» y «ningún segundo color»". El campo es opcional para que decir que no siga costando un clic y un ↩.

**Cómo aplicarlo.** Toda pasada que decida un área lee `rejected[].reason` con `MEMORY`. El MCP no descarta propuestas: el sí y el no siguen siendo del equipo en la app. El caso de las evals es el rechazo del área de color de `scripts/fixtures/system/zernio.json`, que ahora lleva motivo; `rejected back` tiene que seguir en 0. Esto sustituye la frase "No hay campo de motivo del rechazo" de [la decisión del 10 de octubre](2026-10-10-una-propuesta-rechazada-no-vuelve.md).
