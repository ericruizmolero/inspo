# Sistema de diseño de Criterio (uso interno)

Aquí se recoge **cada decisión de diseño y desarrollo** que tomamos sobre la plataforma, con su porqué, para que cualquiera del equipo (persona o agente) construya igual que lo haríamos nosotros. No es documentación del producto para clientes: es nuestro criterio sobre nuestra propia app.

Se ve en **criterio.design/library** (solo para quien tiene acceso a `/admin`), que pinta estos mismos ficheros: cada página de tokens con su muestra viva encima de las reglas (la paleta, la escala tipográfica, los radios, las curvas…), los componentes con el CSS real de la app, y las decisiones como registro filtrable. Los agentes leen los `.md`; las personas, la página. Es la misma fuente.

Está pensado para que lo lea primero un agente. Por eso cada regla dice **qué hacer**, **por qué** y **de dónde sale** (decisión fechada), y lo que se retiró queda escrito para que nadie lo vuelva a meter.

## Cómo está ordenado

| Bloque | Páginas | Cuándo leerlo |
| --- | --- | --- |
| Introducción | [Cómo usar](README.md), [Mapa de la app](mapa.md), [Atajos de teclado](atajos.md) | Al llegar al proyecto |
| Fundamentos | [Principios](principios.md), [Tokens](fundamentos.md) y una página por familia: [Color](fundamentos/color.md), [Tipografía](fundamentos/tipografia.md), [Espaciado](fundamentos/espaciado.md), [Radios y sombras](fundamentos/radios-y-sombras.md), [Movimiento](fundamentos/movimiento.md), [Iconos](fundamentos/iconos.md), [Pantalla, capas y foco](fundamentos/pantalla.md) | Antes de diseñar o escribir CSS |
| Componentes | [Botones](botones.md), [Marca](marca.md), [Catálogo](componentes.md) | Antes de crear una pieza nueva |
| Construir | [Patrones](patrones.md), [Montar el proyecto](construir/montar.md), [Textos e idiomas](construir/textos-e-idiomas.md), [Añadir una página](construir/pagina-nueva.md), [Añadir un componente](construir/componente-nuevo.md), [Buenas prácticas](construir/buenas-practicas.md) | Al montar algo |
| Mantenimiento | [Mantenimiento técnico](mantenimiento.md), [Desarrollo](desarrollo.md), [Decisiones](decisiones/README.md) | Al cambiar algo de base, o para saber por qué algo es así |

## Reglas del sistema

1. **El código manda sobre el documento en los valores; el documento manda en la intención.** Si un token cambia en `app/globals.css`, se actualiza aquí en el mismo commit. Si el código contradice un principio, el código está mal (o el principio cambió y falta su decisión).
2. **Toda decisión nueva se registra** en `decisiones/` con fecha, contexto, decisión, porqué y estado. Si cambia una regla, se edita también la página de la regla y se enlaza la decisión.
3. **Lo retirado no se borra**: su decisión pasa a `retirada` o `sustituida por …`. Así un agente sabe qué no reintroducir.
4. **Las palabras de quien decide se citan literales** cuando explican el gusto ("lo veo ai slop"). Interpretaciones nuestras se marcan como tales.
5. **Escrito en castellano** (lo leemos nosotros); nombres de tokens, clases y ficheros tal cual están en el código.

## Para agentes

- Antes de diseñar o tocar UI: lee `principios.md`, `fundamentos.md` y la página de `fundamentos/` que toques (color, tipografía, espaciado…). Antes de crear un componente, busca en `componentes.md`.
- Cuando el equipo apruebe, rechace o corrija algo de diseño o desarrollo en la conversación, regístralo con la skill `registrar-decision` (`.claude/skills/registrar-decision/`) en el mismo trabajo, sin esperar a que te lo pidan.
- Todo trabajo que cambie la interfaz, un token, un componente, un patrón, una ruta, un atajo o la forma de construir termina con este sistema al día en ese mismo trabajo, haya habido decisión o no: la ficha en `componentes.md`, la regla en su página, la ruta en `mapa.md`, el atajo en `atajos.md`. → [decisión](decisiones/2026-10-06-el-sistema-de-diseno-se-actualiza-con-cada-cambio.md)
- Si encuentras una contradicción entre este sistema y el código, dilo en tu respuesta en vez de elegir en silencio.
