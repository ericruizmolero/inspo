---
title: Las utilidades del Vault son reglas y llegan al agente sin que las pida
date: 2026-11-19
status: vigente
kind: producto
---

**Contexto.** La entrada "Optical Corrections" se rehízo como cinco reglas aplicables (una por corrección) en vez de una lámina para pegar. Probándola como la leería un agente externo salieron tres fallos del conector, no de la entrada: solo aparecía si el agente la buscaba por su nombre ("button with icon" o la categoría `buttons` no devolvían nada, porque la búsqueda exigía todas las palabras); el mensaje final de `read_vault` decía "keep the structure and the motion", pensado para secciones; y un agente que monta un hero con un botón de play no busca "optical".

**Decisión.** La categoría `utilities` del Vault se trata como reglas (`VAULT_RULES` en `lib/mcp/vault.ts`): correcciones que valen para cualquier cosa que se construya, no piezas que colocar. Llegan solas por dos sitios: `search_vault` las devuelve siempre en `always_apply`, se busque lo que se busque, y `read_criterio` las lista en "Rules for whatever you build" dentro de "From the Vault", las nombre o no el plan. Leída una, `read_vault` dice que son reglas y que no se coloca la demo (`RULES_DO`). La búsqueda ya no exige todas las palabras: quita las vacías (with, the, con, de), iguala singular y plural, mira también "cuándo usarla" y el castellano de la entrada, y si ninguna entrada las tiene todas devuelve las que tengan alguna, la más completa primero.

**Por qué.** Eric pasó el informe de la prueba el 19-11 ("sobre el MCP"): "Para que estas correcciones se apliquen de verdad tendrían que llegar al agente sin que las pida". Interpretación nuestra: usar la categoría `utilities` como marca de regla evita un campo nuevo mientras solo haya reglas en ella; si entra una utilidad que sea una pieza y no una regla, hará falta ese campo.

**Cómo aplicarlo.** Una entrada que sea una regla va en `utilities`, con un bloque por regla y un "cuándo usarla" que diga qué casos buscar en lo construido. No se ha probado todavía con un agente construyendo algo real.
