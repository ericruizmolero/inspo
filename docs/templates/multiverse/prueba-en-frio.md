# Prueba en frío: ¿cuántas rondas ahorra el sistema?

La pregunta: con el `criterio.md` de Multiverse, ¿cuántas rondas cuesta una página nueva del mismo cliente?
El rediseño de la home costó 31 entregas. La receta estima unas 15. Esta prueba lo mide.

## Qué se pide

Una página que todavía no existe: **la página de producto de CompactifAI**, a partir de lo que
multiversecomputing.com dice de CompactifAI. Misma marca, mismo sistema, contenido nuevo.

## Dos sesiones, para separar lo que aporta cada cosa

Las dos en una sesión de Claude limpia: sin el `CLAUDE.md` del proyecto Multiverse, sin memoria, sin skills
propias. Solo lo que se le pega.

| Sesión | Qué se le da |
|---|---|
| **A · solo el sistema** | el `criterio.md` de la plantilla y la URL del cliente |
| **B · sistema y receta** | lo mismo, más el prompt maestro de la receta (§7 de `receta.md`) encima |

El `criterio.md` se descarga desde Criterio: Biblioteca, Plantillas, «Rediseño de home · Multiverse
Computing», botón criterio.md.

Primer mensaje, igual en las dos:

```
Construye la página de producto de CompactifAI para Multiverse Computing. Su web actual es
https://multiversecomputing.com. El sistema de diseño está decidido en el criterio.md que te pego:
síguelo; donde un área esté abierta, pregúntame antes de inventar. El copy es suyo: sácalo de su web.

<pega aquí el criterio.md>
```

## Cómo se cuenta

Andoni da feedback como lo daría con un cliente, en puntos numerados, hasta poder publicarla. Cada
mensaje de feedback es una ronda. Para cada ronda, una fila:

| Ronda | Sesión | Lo que se pidió (textual) | Tipo |
|---|---|---|---|
| 1 | A | | |

Tipos, los mismos del análisis de Multiverse:

- **Decisión**: cambiar de opinión, pedir algo nuevo, afinar un gusto. Sano e inevitable.
- **Ambigüedad**: la IA leyó al revés o eligió una de dos lecturas.
- **Defecto**: algo que tenía que haber visto antes de entregar.
- **Fuera del sistema**: lo pidió el criterio.md y no lo cumplió (un rebote, un radio nuevo, un color
  fuera de paleta, copy inventado).

## Qué esperamos ver

- Si casi todas las rondas son **Decisión**, el sistema funciona: evita las vueltas que no son decisiones.
- Si aparecen **Fuera del sistema**, el criterio.md no se está leyendo o no es claro: esa área hay que
  reescribirla.
- La diferencia entre A y B dice cuánto vale la receta del estudio por encima del sistema del proyecto.

El resultado se apunta en Criterio: lo que salga como «Nunca» va a su área de la plantilla.
