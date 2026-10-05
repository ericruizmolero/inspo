# Principios

El gusto de Criterio en frases que se pueden aplicar. Cada una enlaza la decisión de la que sale.

## Visual

1. **Jerarquía con peso y color, no con bordes.** Nada de cajas con contorno de 1 px, bordes discontinuos ni pastillas dentro de cajas. El estado se dice con relleno, sombra o un punto. → [sin mono, menos bordes](decisiones/2026-10-03-sin-mono-menos-bordes.md)
2. **La mono no es decoración.** Nunca para títulos, etiquetas, "eyebrows" ni líneas de estado; solo para datos literales (hex, easings, código). → misma decisión
3. **Una sola familia: Inter**, con eje óptico; la jerarquía sale de tamaño y peso. → [una sola fuente](decisiones/2026-09-23-una-sola-fuente-inter.md)
4. **Botones sin borde.** `.btn` o `.btn--primary`; `.btn--ghost` solo si no hay otra opción. El primario se reserva para la acción principal de la vista ("gritón" si no).
5. **Cristal, no planchas.** Barras y superficies flotantes en cristal (casi transparente + `backdrop-filter` + línea de luz casi invisible): oscuro en tema oscuro, blanco esmerilado en tema claro. El blanco translúcido sobre oscuro se lee "como un gris": no. → [cristal](decisiones/2026-10-02-superficies-de-cristal.md)
6. **Nada de esqueuomorfismo.** Si se pide algo "como un post-it", se toma la idea (una nota que se lee) y se resuelve con las superficies y tokens de la app.
7. **Iconos propios cuando el concepto es nuestro** (las 8 áreas): 16 px, trazo 1,5, misma mano. Lucide para lo genérico. Solo un icono relleno en toda la app es aceptable si es la excepción deliberada. → [iconos por área](decisiones/2026-10-03-iconos-propios-por-area.md)
8. **Dos temas de primera**, claro y oscuro, desde los mismos tokens. Nunca `#fff` ni `rgba(255,255,255,…)` para UI. → [tema claro/oscuro](decisiones/2026-09-21-tema-claro-oscuro.md)
9. **Minimalismo con botones "muy curaditos"**: menos elementos, cada uno pulido.

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
