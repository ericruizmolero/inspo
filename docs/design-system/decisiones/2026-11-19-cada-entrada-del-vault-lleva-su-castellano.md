---
title: Cada entrada del Vault lleva su castellano, escrito por quien la sube
date: 2026-11-19
status: vigente
kind: producto
---

**Contexto.** Las entradas del Vault se escriben en inglés porque las lee un agente (`search_vault`, `read_vault`). Con la app en castellano, la ficha mezclaba idiomas: los rótulos en castellano y el nombre, la frase, las etiquetas, "Cuándo usarla" y los pasos de la documentación en inglés.

**Decisión.** `vault_item` tiene una columna `es` (jsonb, `VaultEs` en `types/vault.ts`): `title`, `summary`, `use`, `tags` y, por bloque, `title` y `note`. Las columnas de siempre siguen en inglés y son lo que recibe el conector; `/api/vault` y `/api/vault/<slug>` devuelven el castellano a quien lee la app en castellano (`getLocale`, `cardOf` y `readVault` en `lib/vault.ts`). Etiquetas y bloques van uno a uno y en el mismo orden: si la lista no coincide con la inglesa, se muestra la inglesa. El código y la pieza en sí no se traducen. El castellano lo escribe el agente que sube la entrada, en el parámetro `es` de `add_to_vault`: todo texto que una llamada escribe tiene que traer su castellano o la llamada se rechaza, y la respuesta dice qué le falta todavía a una entrada anterior (`missingEs`). Si el inglés de una pieza cambia sin su castellano, ese castellano se borra y se ve el inglés nuevo, no la traducción del viejo.

**Por qué.** Eric, 19-11: "haz que aparezca todo traducido", y sobre los nombres de las tarjetas: "los titulares traducir". Interpretación nuestra: que lo escriba quien sube la entrada no cuesta una llamada de IA por lectura ni por guardado, y quien la sube ya tiene el contexto de la pieza; exigirlo en la llamada evita que se olvide.

**Cómo aplicarlo.** Al subir o cambiar una entrada, pasar `es` con lo mismo que se escribe en inglés, en castellano de España. Un nombre de librería o un término que el oficio deja en inglés se queda (GSAP, Hover, Slider). Un idioma nuevo sería otra columna con la misma forma.
