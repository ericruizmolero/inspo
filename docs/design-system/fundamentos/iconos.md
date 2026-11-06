# Iconos

Un solo juego: Phosphor, peso `regular`, `currentColor`. → [decisión](../decisiones/2026-10-08-todos-los-iconos-son-phosphor.md)

## Dónde vive

| Puerta | Fichero | Para qué |
| --- | --- | --- |
| `Icon`, `IconName` | `components/criterio/index.tsx` | Lo genérico: home, plus, close, search, folder, trash, copy, check, bell, smile (reaccionar a un comentario), arrow-right… `sparkle` es solo para lo que hace la IA; la pestaña de Tablón lleva `pin` (la chincheta), la de Pulido `tornado`, el tornado de cartas que se ve al entrar, y la de Sistema `file-md`, el criterio.md que sale de ella. → [decisión](../decisiones/2026-11-04-pulido-lleva-el-icono-del-tornado.md) |
| `areaIcon` | `components/area-icons.tsx` | Las 8 áreas del Sistema |
| `sectionIcon` | `components/section-icons.tsx` | Las secciones de Ajustes, Admin y esta librería |

Las tres importan de `@phosphor-icons/react/ssr`, que funciona igual en componentes de servidor y de cliente.

## Reglas

- Ningún `<svg>` dibujado a mano para un icono: se añade el glifo de Phosphor a una de las tres puertas. La única excepción es `inbox`, el Cajón (`Cajon` en `components/criterio/index.tsx`), dibujado en la rejilla de 256 de Phosphor con trazo 16 y uniones redondas. → [decisión](../decisiones/2026-11-06-el-inbox-se-llama-cajon-y-lleva-un-cajon-dibujado.md)
- Peso `regular` siempre. Excepciones deliberadas: `fill` en `play` y en el brillo de Polish; `bold` en las marcas de casilla de 10 a 14 px.
- Fuera de Phosphor solo quedan las marcas de terceros (Google, Apple, X, Pinterest) y los dibujos que no son iconos (anillos, gráficas, miniaturas de área, curvas).
- Un icono va siempre con texto o con un `label` que es también su tooltip (`IconButton`).
- Tamaños en los componentes: 14, 16, 18 y 20 según la talla del botón; 20 en las muestras de esta librería.
