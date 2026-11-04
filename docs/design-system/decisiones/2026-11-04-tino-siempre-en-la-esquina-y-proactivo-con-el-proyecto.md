---
title: Tino siempre en la esquina de abajo a la derecha, y proactivo con el proyecto en el que estás
date: 2026-11-04
status: vigente
kind: diseño
supersedes: 2026-10-20-tino-entra-en-el-inicio-y-es-la-busqueda-del-tablon (solo dónde se sienta Tino en el tablón), 2026-10-20-tino-en-el-sistema-dock-notas-y-version-del-fichero (solo dónde se sienta Tino en el dock)
---
**Contexto.** En el tablón y en la página Sistema Tino iba sentado en el extremo izquierdo del dock, con las orejas por encima de la barra, y solo hablaba de la búsqueda o de lo que se le pedía. En el Inicio, en cambio, asoma en la esquina y propone cosas. Al probar la primera versión en el tablón, el aviso de la bandeja ("En la bandeja hay 23 referencias sin proyecto") salía dentro de un proyecto.

**Decisión.**
- Tino está siempre en la esquina de abajo a la derecha (`TinoCorner`, `.tino-corner`), como en el Inicio: en el tablón de un proyecto, en la bandeja y en la página Sistema. El dock del tablón (`SearchBar` `.sb--dock`) y la caja del Sistema (`TinoDock`) ya no le guardan sitio (`.sb__tino-room` fuera). `SearchTino` y `TinoDock` hablan a través de `HomeTino` (`speak` para la respuesta a lo que hace la persona, `face`, `quiet`, `scope`), pintado fuera del dock porque su `transform` arrastraría una esquina `fixed`.
- Lo que contesta (la búsqueda, una edición, "Lo estoy guardando") va por encima de todo y sale aunque Tino esté silenciado. Cuando nadie le pide nada dice, de uno en uno, lo que el proyecto puede necesitar (`components/board-nudges.ts`):
  - Tablón (`boardNudges`): pocas referencias antes de la primera pasada (menos de 8), la primera pasada cuando ya hay bastantes, referencias que el sistema no ha leído, áreas sin ninguna referencia detrás, lo que otra persona añadió esta semana (abre el tablón filtrado por ella) y pulir a partir de 24.
  - Sistema (`systemNudges`): cómo funciona, una vez para siempre cada cosa (qué es el criterio.md y que se escribe encima, que se le pueden pedir cambios en palabras con "Probar" que rellena la caja, que se copia o se conecta a la IA) y luego lo que espera: propuestas abiertas (lleva a la primera), áreas sin decidir (rellena la caja con la petición) y referencias sin leer.
  - "Luego" y la × valen por tablón y por la página Sistema (`scope`), no por toda la app.
- Dentro de un proyecto nunca habla de la bandeja ni de otros proyectos.
- Donde Tino tiene la esquina, el botón de tema va detrás de la píldora (`.home-corner`; en el tablón, la prop `corner` de `Grid`).
- Entre 801 y 1040 px el dock se aparta a la izquierda para no pisar la esquina; con las sugerencias abiertas el globo se esconde. En teléfono la esquina no sale (como en el Inicio).

**Por qué.** Eric: "A Tino le vamos a poner siempre como está en la home, a la derecha del todo, y Tino aquí tiene que ser proactivo, ver lo que tiene en el tablón e incitarte a hacer cosas". Sobre la bandeja: "este mensaje no tiene sentido, ¿no? Porque ahí ya estoy en un proyecto. Tiene que ser proactivo con lo que está pasando en el proyecto". Sobre el Sistema: "tiene que ser proactivo con el sistema, decirte cómo funciona y qué puedes hacer".

**Cómo aplicarlo.** Un aviso nuevo de Tino se añade en `components/board-nudges.ts`, con su texto en `t.tino.board` o `t.tino.system`, y habla solo del proyecto abierto. Lo que explica cómo funciona algo lleva `once`. Una vista nueva con Tino lo pone con `HomeTino`/`TinoCorner` en la esquina, nunca dentro de una barra.
