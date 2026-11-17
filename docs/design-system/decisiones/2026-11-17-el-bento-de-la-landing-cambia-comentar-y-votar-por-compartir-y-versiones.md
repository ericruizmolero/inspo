---
title: El bento de la landing cambia comentar y votar por compartir con el cliente y versiones del tablero
date: 2026-11-17
status: vigente
kind: diseño
---
**Contexto.** El bento "Every decision, in one file." (`#porque`) tenía dos baldosas, "Say what you think on top of each reference" y "Vote on what stays", que repetían el paso 2 (comentar) y el paso 3 (Pulido). En el paso 1, Extension y Files llevaban un "+" y una flecha sueltos, más pobres que los logos de Are.na, Pinterest, Cosmos y X.

**Decisión.** En `marketing-site/src/pages/index.astro` y `es/index.astro`:
- `.t-c` pasa a **"Share it with your client." / "No account. They comment and like."**, con un chat de WhatsApp (`.wa9`, recto y solo): le mandas a Marta, la clienta, el enlace con su vista previa ("Landing Criterio", criterio.design) y "The references for your landing. Like the ones you want."; ella contesta "Liked two. The serif one 😍". Sin la página en pequeño debajo: Alberto pidió dejar solo el chat.
- `.t-d` pasa a **"Go back to any version."**, con el desplegable de versiones de la app (`.vh9`, como `VersionPicker`): "Board versions", Andoni "2 in" v3 now, Alberto "1 out" v2, "As it was" con "6 references" v1.
- Sale el CSS de las baldosas viejas (`.r9`, `.v9`, `.d9` y sus animaciones).
- En las fuentes (`MARK`), Extension y Files tienen su dibujo relleno como las demás: una pieza de puzle sobre ember y una carpeta sobre moss (`.lb-ext.lb-mark`, `.lb-files.lb-mark`). Sale en el paso 1 y en todos los sitios donde va el logo de la fuente.

**Por qué.** Alberto: "this last two blocks are redundant because already talk about the comments and the polish section, we need to find in the app two extra things less important we can reference here"; eligió versiones del tablero y compartir con el cliente frente al resumen diario y el criterio.md de cada referencia. Sobre los iconos: "these two icons are really boring in compare with the others, create a same size icons".

**Cómo aplicarlo.** El bento enseña lo que no cuentan los pasos. El equipo son tres: Eric, Andoni y Alberto, y los tres salen ("add my picture, you always use andoni and eric"). Cada baldosa enseña la interfaz real de esa función, medida en la app.
