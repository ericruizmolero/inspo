# Principios

El gusto de Criterio en frases que se pueden aplicar. Cada una enlaza la decisión de la que sale.

## Visual

0. **El sistema de diseño Criterio manda.** Tokens y componentes de `components/criterio/`; la criatura queda fuera por ahora. → [sistema Criterio](decisiones/2026-10-07-sistema-de-diseno-criterio.md)
1. **Jerarquía con peso y color.** Las tarjetas son planas, con una línea `--border` como mucho; nada de bordes discontinuos ni pastillas dentro de cajas. El borde de tinta es solo de los controles (botones, campos, chips). → [sin mono, menos bordes](decisiones/2026-10-03-sin-mono-menos-bordes.md), [sistema Criterio](decisiones/2026-10-07-sistema-de-diseno-criterio.md)
2. **La mono no es decoración.** Nunca para títulos, etiquetas, "eyebrows" ni líneas de estado; solo para datos literales (hex, easings, código). → misma decisión
3. **Una familia: Satoshi.** Títulos, texto e interfaz. La jerarquía la dan el tamaño y el peso; los títulos no pasan de 700. Sin segunda fuente. → [decisión](decisiones/2026-10-08-satoshi-es-la-unica-familia.md)
4. **Botones gruesos con bisel, el guiño a 2000.** Borde de tinta, luz arriba a la izquierda, sombra abajo a la derecha. `.btn` (papel) por defecto; `.btn--primary` (ember) solo para la acción de la vista, uno por vista; `quiet` (`.btn--quiet`) solo para acciones pequeñas dentro de barras y paneles, casi siempre con icono. Los botones de solo icono son `IconButton`, siempre redondo. → [un solo botón de icono](decisiones/2026-10-07-un-solo-boton-de-icono-redondo.md) → [sistema Criterio](decisiones/2026-10-07-sistema-de-diseno-criterio.md)
5. **Cromo sólido que sigue al tema.** Pestañas, selector de vista, zoom, barra de comandos y visor van en `--chrome*`: oscuros en Board, claros en Paper, con una línea `--chrome-border` y el texto fuerte en `--chrome-ink`. → [el cromo sigue al tema](decisiones/2026-10-07-el-cromo-sigue-al-tema.md) Sin cristal ni `backdrop-filter` en barras y superficies; las pastillas de hover y activa de la Isla y del selector sí son de cristal (`--glass-*`). → [cromo de arriba](decisiones/2026-10-07-el-cromo-de-arriba-vuelve-a-44-y-sus-pastillas-a-cristal.md) Solo la barra de comandos flota. → [sistema Criterio](decisiones/2026-10-07-sistema-de-diseno-criterio.md)
6. **Un guiño a un escritorio viejo, nunca un disfraz.** Bisel, campos hundidos y progreso en bloques sí; azul de Windows, degradados en barras de título, Tahoma o barras de tareas no. Lo demás ("como un post-it") se resuelve con las superficies y tokens de la app. → [sistema Criterio](decisiones/2026-10-07-sistema-de-diseno-criterio.md)
7. **Iconos propios cuando el concepto es nuestro** (las 8 áreas): 16 px, trazo 1,5, misma mano. Lucide para lo genérico. Solo un icono relleno en toda la app es aceptable si es la excepción deliberada. Cada icono conserva su trazo: sin regla global de grosor. → [iconos por área](decisiones/2026-10-03-iconos-propios-por-area.md), [cada icono con su trazo](decisiones/2026-10-07-cada-icono-conserva-su-trazo.md)
8. **Dos temas de primera**, Paper (claro) y Board (oscuro), desde los mismos tokens, el cromo incluido. Nunca `#fff` ni `rgba(255,255,255,…)` para UI. → [tema claro/oscuro](decisiones/2026-09-21-tema-claro-oscuro.md)
9. **El primario es ember, y lo que era primario sigue siéndolo**: no se quita el naranja a un botón para que haya menos. → [lo que era primario](decisiones/2026-10-07-lo-que-era-primario-sigue-siendo-primario.md) Butter es para las sugerencias de la app y los tooltips, nada más. **Minimalismo con botones "muy curaditos"**: menos elementos, cada uno pulido. Fondo liso `--bg` en todas las vistas: sin tramas ni texturas que no digan cómo se usa la vista. → [fondo liso](decisiones/2026-10-05-fondo-liso-sin-puntos.md)

## Movimiento y sensación

10. **"Fluidez de Apple"**: arranque instantáneo, todo se mueve en bloque y al unísono, sin tirones. Un morph de caja o vuelos sueltos no valen. → [de dónde sale](decisiones/2026-09-24-cortina-sidebar-waapi.md)
11. **El rendimiento es diseño.** Si va a tirones en Safari, está mal aunque se vea bien en una captura. → [masonry ventanada](decisiones/2026-10-01-masonry-ventanada-sin-flip.md)
12. **Lo público carga al instante.** Login, planes, invitación: nada de trabajo pesado al pintar; lo que haya que elegir lo cura una persona. → [login instantáneo](decisiones/2026-09-22-login-sin-trabajo-pesado.md)

## Producto

13. **El entregable es el `criterio.md`.** Cada pieza de UI se juzga por cómo queda en el fichero. → [el MD es el producto](decisiones/2026-10-04-el-md-es-el-producto.md)
14. **La IA propone, el equipo confirma.** El agente hace el trabajo y deja una propuesta; la persona edita y decide. Lo destructivo pide confirmación ("Hazlo / Déjalo"). → [todo a mano o por agente](decisiones/2026-10-02-todo-a-mano-o-por-agente.md)
15. **Escribir en el sitio.** Sin botones de "Editar" ni recuadros alrededor del texto: se pulsa y se escribe.
16. **Sobre las tarjetas, no en tablas ni modales.** Organizar, proponer y revisar ocurre donde está la referencia.
17. **Menos sitios para lo mismo.** Si dos lugares sirven para comentar o para decidir, sobra uno. → [post-its y DESIGN.md retirados](decisiones/2026-10-05-postits-y-designmd-retirados.md)

## Texto

18. **Lo que escribe un modelo no puede sonar a modelo.** Sin rayas (— – --) ni puntos medios (·) entre elementos, sin recuentos ni píxeles innecesarios, en el idioma de la app. La skill de criterio.md "Evitar AI Slop" (`lib/md-skills-more.ts`) recoge el resto.
19. **Microcopy corto y en dos idiomas**: inglés por defecto, castellano segundo, siempre a la vez. → [UI bilingüe](decisiones/2026-09-23-ui-bilingue-i18n.md)
