---
title: El paginador de Tino es una cifra suelta, "2 de 4"
date: 2026-11-06
status: vigente
kind: diseño
---
**Contexto.** Con varios avisos, el globo de Tino llevaba a la derecha de los botones una pastilla con "1 / 4 ›". Eric: "este 1/4 tenemos que mejorar el diseño... el / no me convence... igual algo más minimalista". Entre puntos, la palabra "Otra" y la cifra suelta, eligió la cifra suelta.

**Decisión.** `.tino-corner__next` (`components/HomeTino.css`) es texto: "2 de 4" (`t.tino.pageOf`, "2 of 4" en inglés) en `--fs-label`, en `--on-butter` al 55 %, con el chevron de 12 px. Sin fondo ni pastilla; al pasar el puntero, en tinta. Sigue empujado a la derecha y con su anillo de foco.

**Por qué.** Interpretación nuestra: la barra se leía como fracción y la pastilla pesaba casi como un tercer botón; el número sigue diciendo cuánto queda sin competir con la acción.

**Cómo aplicarlo.** El "3 / 7" del título en Pulido (`.tino-corner__top`) es otro elemento y no ha cambiado; si también molesta, se cambia igual.
