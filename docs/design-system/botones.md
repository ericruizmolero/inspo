# Botones

El botón es la firma del sistema: grueso, con borde de tinta y bisel, el guiño al 2000. Aquí están todas sus variantes, tallas y estados juntas; la ficha técnica está en [Componentes](componentes.md#boton). → [sistema Criterio](decisiones/2026-10-07-sistema-de-diseno-criterio.md)

## Variantes

| Variante | Relleno | Para qué |
| --- | --- | --- |
| primary | Ember, texto tinta | La acción para la que existe la vista. Una por vista, y lo que ya era primario no se baja → [decisión](decisiones/2026-10-07-lo-que-era-primario-sigue-siendo-primario.md) |
| secondary (por defecto) | Papel, texto tinta | Todo lo demás, también Cancelar, Déjalo y Ahora no |
| dark | Tinta, texto papel | Una segunda acción fuerte sobre papel |
| quiet | Ninguno hasta el hover, sin borde ni bisel | Acciones pequeñas dentro de barras y paneles, casi siempre con icono |
| danger | `--danger-deep`, texto papel | Solo para confirmar algo que destruye |

## Tallas

| Talla | Alto | Icono | Dónde |
| --- | --- | --- | --- |
| s | 34 | 16 | Globos, ventanas y sus pies (Cancelar y Guardar), barras de herramientas, la fila de pestañas y acciones de la página del proyecto, la barra del fichero, menús, la tarjeta del tablero, Ajustes y Actividad (filas y pies) → [Ajustes](decisiones/2026-10-07-ajustes-planos-sin-barra-moss-ni-sidebar-plegable.md), [pies de ventana](decisiones/2026-10-07-los-pies-de-ventana-llevan-botones-s.md) |
| m | 44 | 20 | Lo normal en producto: páginas y vistas |
| l | 52 | 20 | Héroes |

En una misma barra, todos en la misma talla. Sin excepciones locales de alto, relleno, letra o radio; solo dos: el botón partido junta sus esquinas y el botón dentro de un campo (`.cr-textbox-bar`) lleva radio 6.

## Estados

- **Hover**: el relleno se aclara un punto; quiet gana su relleno.
- **Pulsado** (`:active` o `pressed`): `--bevel-pressed` y 1 px abajo. Se hunde, no encoge.
- **Desactivado**: relleno `--disabled`, texto `--disabled-text`, borde `--disabled-border`, sin bisel.
- **Foco**: anillo de 2 px en `--focus`, desplazado 2 px.
- **Ocupado**: `Busy` dentro del botón y desactivado mientras dura.

## Botón de icono

El único botón de solo icono de la app es `IconButton`: siempre redondo, un icono y su `label`, que es también el tooltip. Variantes quiet, default y strong; tallas xs 24, s 32, m 40 y l 48. Sobre el cromo, el contenedor lleva `cr-on-chrome`. → [decisión](decisiones/2026-10-07-un-solo-boton-de-icono-redondo.md)

## Reglas

- Etiquetas en sentence case, verbo primero, cortas ("Sí, borrar", "Ya tengo las referencias").
- `icon` delante, `iconEnd` detrás (la flecha de seguir va detrás).
- Lo destructivo pide confirmación en un diálogo con secundario y danger ("Déjalo" / "Sí, borrar").
- Lo que la app tenía antes (`.btn`, `components/ui/button.tsx`) es la misma pieza con el nombre viejo; lo nuevo va en `Button` del sistema. El comando de instalar una skill no es un botón de papel: es un dato literal, en mono. → [decisión](decisiones/2026-10-07-el-comando-de-instalar-una-skill-no-es-un-boton-de-papel.md)
