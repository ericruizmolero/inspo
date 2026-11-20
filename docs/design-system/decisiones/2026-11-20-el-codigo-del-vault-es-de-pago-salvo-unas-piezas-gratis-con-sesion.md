---
title: El código del Vault es de pago, salvo unas pocas piezas gratis para quien inicia sesión
date: 2026-11-20
status: vigente
kind: producto
supersedes: El Vault son piezas nuestras con su código (18-11), en parte
---
**Contexto.** Los planes (`lib/plans.ts`, `marketing-site/src/plans.ts`) se pensaron antes del Vault y no lo nombran. Desde el 18-11, `search_vault` y `read_vault` dan el código entero a cualquier cuenta, también en Gratis, sin mirar plan ni cuota (`lib/mcp/tools.ts`, `lib/mcp/vault.ts`), y `read_criterio` añade "From the Vault" a todos (`vaultMd`). Un agente de una cuenta gratis podía bajarse el Vault entero. details.so cobra su Vault con MCP como plan alto (Max, 19 €) y Osmo Supply lo cobra entero (20 a 25 €), con unas piezas gratis.

**Decisión.** El código del Vault es de los planes de pago. En Gratis, con sesión, se ven todas las tarjetas, el preview en vivo y para qué sirve cada pieza, y el código de las piezas que los socios marcan como gratis, sin un número fijo. Las reglas (`utilities`, `VAULT_RULES`) siguen llegando a todos. Sin sesión, solo el preview público de siempre (`/api/vault/<slug>/preview`). Esto cambia de la decisión del 18-11 solo quién recibe el código; lo demás sigue. Construido el 20-11: una capacidad del plan (`vault: "sample" | "full"` en `PLANS`, con su copia en `marketing-site/src/plans.ts`), un tipo de acceso por entrada (`vault_item.access`, `"paid" | "free"`, `"paid"` por defecto, que pone el socio en `add_to_vault`) y una sola comprobación, `canReadVault` en `types/vault.ts`, que usan `read_vault`, `search_vault`, `vaultMd` y la rejilla de la app: a una pieza cerrada le dan qué es, su preview y el camino al plan (`/settings/plan`), sin el código. El acceso es de la persona: entero si alguno de sus espacios está en un plan de pago (`vaultOf` en `types/vault.ts`), porque una llamada al conector no nombra espacio; la app usa la misma regla para que un candado no diga otra cosa que lo que lee el agente.

**Por qué.** Alberto, 20-11: "i fully agree in closing vault except for a few free ones available when you login", y sobre cuántas: "no number, we just create a few free ones and they would have the type "paid" or "free"". Que las reglas sigan abiertas y los previews públicos es propuesta nuestra: las reglas mejoran cualquier resultado y enseñan lo que vale el resto, y los previews son el escaparate que se comparte fuera.

**Cómo aplicarlo.** Una pieza nueva entra cerrada; abrirla es una decisión del socio que la sube. Ninguna herramienta del conector devuelve el código de una pieza cerrada a un plan sin acceso. Antes de cerrar, la subida tiene que existir: un 402 que no lleva a ninguna parte deja un muro, no una venta.
