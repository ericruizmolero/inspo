---
title: Importar un tablero de Are.na, Pinterest o Cosmos trae todo lo que Criterio sabe guardar
date: 2026-10-08
status: vigente
kind: producto
---
**Contexto.** El primer arranque tiene que ofrecer traer lo que uno ya tiene guardado en otro sitio, no solo pegar una web suelta. Pegar la dirección de un tablero de Are.na, Pinterest o Cosmos (en el primer arranque o en Añadir) lo importa a un proyecto con su nombre. Alberto pidió primero solo las webs, porque una imagen no da DESIGN.md. Después lo corrigió.

**Decisión.**
- Entra cada cosa del tablero que Criterio sabe guardar: webs, imágenes, vídeos (YouTube, Vimeo, Loom), posts de X y textos. Se queda fuera solo lo que no sabe guardar, contado por motivo: un archivo (un PDF de Are.na), un tablero dentro del tablero, o algo sin nada que guardar.
- `lib/boards/parse.ts` describe cada cosa de la plataforma igual (su página, el enlace al que apunta, sus imágenes y su texto) y `entryOf` decide una sola vez qué es: el enlace manda (una web con página propia, un vídeo o un post se guardan como esa dirección; un enlace a un fichero de imagen es esa imagen); si no apunta a nada que se guarde (sin enlace, o un perfil de Instagram), es su imagen, o su texto si es un texto. El modelo es `Entry` en `lib/boards/entries.ts`, con `skipped` por motivo.
- Por plataforma: Are.na Link y Embed por su enlace, Image por su fichero original, Text por sus palabras, Attachment y Channel fuera. Pinterest: un pin con enlace es ese enlace, uno subido (o un vídeo) es su imagen, con la página del pin. Cosmos: web y producto por su enlace, un medio es su imagen (un vídeo, por su portada), un texto por sus palabras, con la página del elemento.
- Una imagen o un texto se copia al espacio con la página de la plataforma en `source` (`addMany`, `lib/add-many.ts`), y `staysInside` (`lib/url.ts`) ya cubre Are.na y Cosmos: un enlace compartido no entrega la copia. Importar dos veces no duplica: la imagen y el texto se guardan en una ruta que decide su página.
- Hasta 500 cosas. Se mandan en lotes de 25, o de 10 si llevan imágenes (`lib/batch-limits.ts`, lo mismo que la extensión). El aviso final dice qué entró por tipo y qué se quedó fuera y por qué: "19 websites, 3 images, 9 videos, 1 text imported." y "1 skipped (1 board inside the board)." Lo que ya estaba en la librería se cuenta aparte, no como importado ([decisión](2026-10-08-al-importar-lo-que-ya-estaba-no-cuenta-como-importado.md)).
- Un vídeo de Cosmos o de Pinterest no se copia como vídeo: entra su portada. Copiar vídeos de hasta 100 MB por lotes no compensa ahora.
- El proyecto del tablero es el que ya lleva su nombre, o uno nuevo la primera vez (`projectForBoard`, `lib/projects.ts`): importar el mismo tablero otra vez lo llena, no hace otro. La extensión importa los mismos tableros desde la propia página, con la misma regla y el mismo proyecto ([la extensión pone un botón para importar un tablero](2026-10-08-la-extension-pone-un-boton-para-importar-un-tablero.md)).

**Por qué.** Alberto: "I don't want to only import webs, also all the assets we support that are in the board." Interpretación mía: un tablero es una mezcla, y quien lo importa espera verlo entero en Criterio. Dejar fuera las imágenes vaciaba los tableros de Pinterest y Cosmos, que son sobre todo imágenes.

**Cómo aplicarlo.** Si Criterio aprende a guardar un tipo nuevo, se añade a `Entry` y a `entryOf`, y deja de contarse como fuera. Una plataforma nueva solo describe sus cosas como `Found`; nunca decide por su cuenta qué es web o imagen.
