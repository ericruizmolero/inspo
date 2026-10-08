# Espaciado

Ocho pasos de espacio y una sola altura de control. En lo nuevo, solo estos valores.

## Escala

| Token | Valor | Dónde |
| --- | --- | --- |
| `--space-1` | 4 | Entre icono y texto, entre chips |
| `--space-2` | 8 | Entre controles de una fila |
| `--space-3` | 12 | Relleno de piezas pequeñas, hueco entre tarjetas del catálogo |
| `--space-4` | 16 | Relleno de tarjeta, el gutter de móvil |
| `--space-5` | 24 | Entre bloques de un panel |
| `--space-6` | 32 | Entre secciones de una página |
| `--space-7` | 48 | Aire bajo una cabecera |
| `--space-8` | 72 | Aire de héroe |

El hueco del tablero es 10 px, el único valor fuera de la escala: lo pide la densidad del masonry.

## Controles: una sola altura

Una altura: **44**, la del `Button` m. Campos, selects y el `SegmentedControl` de papel miden 44 y se alinean con el botón que llevan al lado. Las barras de herramientas y los menús usan la talla s (34) de forma consistente, también el segmentado de papel (`size="s"`) cuando va en una fila de herramientas dentro de la página. Los héroes, la talla l (52). Las filas de Ajustes (`FieldRow`) van enteras en s: botón, segmentado y campo a 34 (`.cr-input-s`), como Descubrir y la Isla. → [decisión](../decisiones/2026-10-07-el-segmentado-de-papel-tiene-talla-s-y-un-borde-sutil.md), [Ajustes planos](../decisiones/2026-10-07-ajustes-planos-sin-barra-moss-ni-sidebar-plegable.md)

| Talla | Alto | Dónde |
| --- | --- | --- |
| s | 34 | Globos, ventanas, barras de herramientas, menús, la tarjeta del tablero, las filas y los pies de Ajustes y Actividad |
| m | 44 | Lo normal en producto: páginas, vistas, pies de diálogo, campos |
| l | 52 | Héroes y la pregunta de inicio |

En una misma barra, todos los controles en la misma talla. Un campo de solo lectura o desactivado se ve plano y apagado; el error va debajo del campo (`.cr-field-hint.is-error`).
