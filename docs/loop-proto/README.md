# Prueba del loop con las inspo de Savvia

Prototipo de los pasos 2, 3 y 4 del loop de Criterio (#42) hecho con scripts, sin tocar el producto. Pregunta que responde: **¿con las ~100 webs que Savvia ha guardado sale un contexto creativo que os reconoce como Savvia?**

Fecha: 2026-09-23. Scripts en `scripts/loop/`. Datos crudos en `.data/loop/` (no se suben al repo).

## Qué hay aquí

| Fichero | Paso del loop | Qué es |
|---|---|---|
| `signals.md` | 2 · Analyse & extract | Por cada web, su tagline y sus señales por eje (tipografía, color, layout, motion, contenido, tono), con la evidencia concreta y la confianza. |
| `patterns.md` | 3 · Find patterns | Las señales que se repiten en tres webs o más, con recuento y la lista de webs que lo sostienen. |
| `context.*.md` | 4 · Build creative context | El borrador de Creative Context que el modelo propone a partir de los patrones. Cada principio cita sus patrones y sus webs. Un fichero por modelo probado. |
| `costs.md` | | Lo que ha cobrado OpenRouter, por paso y modelo. |

## Cómo se ha hecho

1. **DESIGN.md** de cada web con la tubería de producción (Chrome mide tokens + captura, el modelo barato redacta). Igual que en la app, pero guardado en local.
2. **Señales**: a partir del DESIGN.md y las tags existentes, el modelo barato saca entre 4 y 9 señales por web. Solo texto, sin volver a mirar la captura. Cada señal es una etiqueta corta (reutilizable) más una evidencia (los valores concretos).
3. **Patrones**: todas las señales del workspace en una sola pasada con Sonnet, que agrupa las que describen el mismo rasgo aunque estén escritas distinto. Se descarta lo que no aparece en al menos tres webs.
4. **Contexto**: Sonnet redacta el borrador a partir de los patrones y de la lista de webs. Cada principio lleva patrones, webs y confianza.

Lo que NO está: aprobar y editar en la app (paso 4 de verdad), exportar (paso 5) y feedback que revise (paso 6). Eso es lo que se decide con esta lectura.

## Qué os pedimos a Andoni y a ti

Leed `context.*.md` de arriba abajo y en cada principio marcad la decisión: ✅ aprobar, ✏️ editar (escribid cómo debería decir) o ❌ rechazar (y por qué). Si un principio os parece verdad pero las webs que cita no son las buenas, decidlo también: es un fallo de trazabilidad, distinto de un fallo de criterio.

Después mirad `patterns.md` por encima: ¿hay patrones que faltan y que vosotros sabéis que están en las referencias? ¿Hay alguno que sea ruido?

`signals.md` es material de apoyo, para comprobar por qué el sistema dice lo que dice de una web concreta.

## Cómo repetirlo

```bash
npx tsx --conditions=react-server scripts/loop/01-design.ts    # DESIGN.md por web (reanudable)
npx tsx --conditions=react-server scripts/loop/02-signals.ts   # señales por web
npx tsx --conditions=react-server scripts/loop/03-patterns.ts  # patrones
npx tsx --conditions=react-server scripts/loop/04-context.ts [modelo]  # contexto
npx tsx --conditions=react-server scripts/loop/05-report.ts    # renderiza y copia aquí
```

Modelos por variable de entorno: `LOOP_CHEAP_MODEL` (DESIGN.md y señales) y `LOOP_SMART_MODEL` (patrones y contexto). Todo va por OpenRouter con la llave de `.env.local` y contra la copia local de la base de datos; no escribe en Turso, Blob ni en `ai_usage`.
