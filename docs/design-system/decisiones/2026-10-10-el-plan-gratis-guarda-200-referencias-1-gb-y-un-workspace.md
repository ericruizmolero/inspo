---
title: El plan gratis guarda 200 referencias y 1 GB, y cada persona tiene un solo workspace gratis
date: 2026-10-10
status: vigente
kind: producto
---
**Contexto.** El plan gratis de #89 promete un tope de 200 elementos o 1 GB, pero nada se contaba: ningún archivo guardaba su tamaño y guardar era ilimitado. Y cualquiera podía crear todos los equipos que quisiera, cada uno con su plan gratis: diez equipos eran 300 acciones de IA al mes sin pagar (#124).

**Decisión.**
- `lib/plans.ts` lleva `itemsMax` y `storageMaxBytes` (null = sin tope). El plan gratis es el de `priceEur` 0, sea cual sea su clave: 200 referencias y 1 GB (1024³ bytes). Los de pago, sin tope.
- Cuentan las referencias del workspace salvo las que trae una plantilla (`isSampleItem()`, `lib/sample-items.ts`): firmadas por Criterio y aún en el tablero de una plantilla.
- El almacenamiento es la suma de `stored_file.bytes` del workspace: una fila por archivo propio. Las cachés compartidas por dirección (capturas, páginas, posts de X, DESIGN.md) no son de nadie y no cuentan.
- Al tope, guardar responde 402 con `quota: true` por cualquier camino (la app, la extensión, el MCP, el agente, importar, las subidas). Ver, buscar y exportar siguen. El mensaje dice qué está lleno, que lo demás sigue y que se amplía en /planes.
- Importar un tablero entra hasta el tope y dice cuántas se quedaron fuera.
- Crear un equipo pide ser dueño de un workspace de pago. El espacio personal es el gratis y nunca se bloquea.

**Por qué.** Es lo que pide #124 para que el precio no se escape por workspaces. Se cuentan "referencias" y no "elementos" porque así las llama la app en los dos idiomas.

**Cómo aplicarlo.** Un camino nuevo que crea referencias pasa por `addItem`, que ya comprueba el sitio; si antes hace trabajo caro (leer una web, copiar un archivo), llama antes a `assertRoom(ws, { items: 1 })`. Un archivo nuevo de un workspace se guarda con `putFile(key, body, type, organizationId)`; una caché compartida, sin dueño. Una subida firmada se apunta con `recordFile` al dar la dirección. Las cifras tocan el precio: cambiarlas es cosa de los socios.
