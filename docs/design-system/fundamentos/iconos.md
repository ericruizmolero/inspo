# Iconos

Tres juegos, cada uno con su trazo. No hay regla global que iguale el grosor: se probó el 07-10 (1,5 px en pantalla para todos) y se retiró el mismo día porque se veían mal ("so ugly"). → [decisión](../decisiones/2026-10-07-cada-icono-conserva-su-trazo.md)

## Juegos

| Juego | Dónde vive | Cuadrícula y trazo | Para qué |
| --- | --- | --- | --- |
| Del sistema (`Icon`, `IconName`) | `components/criterio/index.tsx` | 24 px, trazo 2, puntas redondas, `currentColor` | Lo genérico: home, plus, close, search, folder, trash, copy, check, bell, arrow-right… `play` es el único relleno |
| De área (`areaIcon`) | `components/area-icons.tsx` | 16 px, trazo 1,5, misma mano | Las 8 áreas del Sistema, un concepto nuestro → [decisión](../decisiones/2026-10-03-iconos-propios-por-area.md) |
| De sección (`sectionIcon`) | `components/section-icons.tsx` | 16 px, trazo 1,5 | Las secciones de Ajustes, Admin y esta librería |

## Reglas

- Iconos propios cuando el concepto es nuestro; lo genérico sale del juego del sistema (Lucide queda para lo que el sistema no tiene).
- Un icono relleno en toda la app es aceptable solo como excepción deliberada (`play`).
- Un icono va siempre con texto o con un `label` que es también su tooltip (`IconButton`).
- Tamaños en los componentes: 14, 16, 18 y 20 según la talla del botón; 20 en las muestras de esta librería.
