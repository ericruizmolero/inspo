# Rediseño de home · Multiverse Computing: criterio.md

> El sistema de diseño de este proyecto tal y como está decidido. Sigue las áreas decididas; donde un área esté abierta, pregunta antes de inventar.

**criterio.design** · 2026-10-05

## Cómo usar este archivo

> Para el agente que lee este archivo: qué obliga, qué orienta y qué hacer cuando chocan.

1. **Obligatorio.** Los valores de la marca, donde el archivo los tenga (la paleta y sus hex, las fuentes, la escala tipográfica, la sección Tokens), y cada línea de Nunca. Van marcados `(obligatorio)`, como en `**Nunca** (obligatorio):`. Usa los valores tal cual están escritos. No rompas nunca una línea de Nunca.
2. **Dirección.** La decisión de cada área. Síguela y adáptala a la tarea; no la contradigas. Un valor que nombre una decisión (un hex, una familia, un tamaño) se usa tal cual. Una decisión del equipo pesa más que una propuesta desde el tablero.
3. **Orientación.** Las referencias de cada área, marcadas `**Referencias (n)** (orientativo):`, y las Referencias del final son inspiración para leer la intención, nunca algo que copiar: ni su maquetación, ni su texto, ni sus imágenes, ni sus logos. Ninguna referencia es la marca.
4. **Abierto o sin cubrir.** Donde un área esté abierta, o el archivo no diga nada de lo que necesitas, pregunta a la persona. No rellenes el hueco con un valor por defecto.
5. **Conflictos.** Primero las líneas de Nunca, luego los valores de la marca, luego una decisión del equipo, luego una propuesta, luego las referencias. Avisa a la persona del choque.

## El proyecto

Rediseño a ciegas de la home de una empresa de deep tech para presentar al cliente: su copy y su marca, con un nivel de diseño y de detalle que hoy no tiene. Cinco días y 31 entregas con IA.

## En un párrafo

Rediseño a ciegas de la home de Multiverse Computing, deep tech de IA y cuántica para empresas. Se habla a un comprador técnico y escéptico, con el copy literal del cliente y cifras de sus notas de prensa. Un solo tema oscuro de grises fríos y hairlines, con el rojo #F01438 solo en lo que actúa; Schibsted Grotesk para el texto y JetBrains Mono para cifras, kickers y specs; una firma de movimiento por sección; quince ilustraciones isométricas dibujadas por código y el isotipo de 9 bandas.

## Tipografía

Schibsted Grotesk 400, 500 y 600, con itálica 400, para todo el texto. JetBrains Mono 400 y 500 para cifras, kickers, etiquetas y specs. Titulares en caja baja, también los que el cliente escribe en caja alta. text-wrap balance en escritorio y pretty por debajo de 720px; tabular-nums en cifras.

**Por qué:** La mono es la que usa la web real de Multiverse, leída de sus hojas de estilo: la marca del cliente manda sobre el gusto.

**Nunca** (obligatorio):
- Inter, Roboto, Arial o Space Grotesk por defecto
- Una mono que no sea la de la marca del cliente

- **Decidido por el equipo**
- **Referencias (4)** (orientativo):
  - **R13** [Multiverse Computing](https://multiversecomputing.com). Tomar: La web del cliente. Manda en copy, logo, fuentes y cifras: el titular y el cierre se toman literales.
    - Criterio: «La web del cliente. Manda en copy, logo, fuentes y cifras: el titular y el cierre se toman literales.»
  - **R1** [Hero del rediseño](https://criterio.design/api/files/inspo/a9595d5eb40c47dab0a17e89/media/template-multiverse-hero-resultado.png) (imagen). Tomar: El hero terminado: titular en Schibsted, cifras en JetBrains Mono y el rojo solo en lo que actúa.
    - Criterio: «El hero terminado: titular en Schibsted, cifras en JetBrains Mono y el rojo solo en lo que actúa.»
  - **R6** [Schibsted Grotesk](https://fonts.google.com/specimen/Schibsted+Grotesk). Tomar: La fuente de todo el texto, en 400, 500 y 600 con itálica 400. Titulares en caja baja.
    - Criterio: «La fuente de todo el texto, en 400, 500 y 600 con itálica 400. Titulares en caja baja.»
  - **R7** [JetBrains Mono](https://www.jetbrains.com/lp/mono). Tomar: La mono de la web del propio cliente: para cifras, kickers, etiquetas y specs, con tabular-nums.
    - Criterio: «La mono de la web del propio cliente: para cifras, kickers, etiquetas y specs, con tabular-nums.»

## Color

Un solo tema, oscuro. Fondos #15181C, #1B1F24, #22272D y #2A3037; tinta #F8FAFC, #C9CED5 y #8E959E; líneas en tinta al 12 y al 22 %. Rojo #F01438 para rellenos y reglas, #FF5C77 para texto y rgba(240,20,56,.14) para fondos teñidos. Logos de clientes en tinta monocroma.

**Por qué:** Si todo es rojo, nada es rojo: el rojo marca una cosa por escena, el modelo.

**Nunca** (obligatorio):
- Un segundo tema
- Un footer de otro color que la página
- Fotos de prensa o de stock fuera de paleta
- Retratos en el rojo de marca: van en los grises de la página, techo #A6ADB5

- **Decidido por el equipo**
- **Referencias (3)** (orientativo):
  - **R14** [Multiverse · rediseño](https://multiversecomputing.treseiscero.app). Tomar: Donde acabó el trabajo tras 31 entregas: un tema oscuro, dos radios, una firma de movimiento por sección.
    - Criterio: «Donde acabó el trabajo tras 31 entregas: un tema oscuro, dos radios, una firma de movimiento por sección.»
  - **R1** [Hero del rediseño](https://criterio.design/api/files/inspo/a9595d5eb40c47dab0a17e89/media/template-multiverse-hero-resultado.png) (imagen). Tomar: El hero terminado: titular en Schibsted, cifras en JetBrains Mono y el rojo solo en lo que actúa.
    - Criterio: «El hero terminado: titular en Schibsted, cifras en JetBrains Mono y el rojo solo en lo que actúa.»
  - **R8** [Linear](https://linear.app). Tomar: Un solo tema oscuro hecho de grises fríos escalonados y hairlines: el mismo ritmo de fondos alternos.
    - Criterio: «Un solo tema oscuro hecho de grises fríos escalonados y hairlines: el mismo ritmo de fondos alternos.»

## Layout

Ancho máximo 1440px y gutter clamp(20px, 4vw, 64px). El ritmo lo dan dos fondos alternando por secciones, con hairline arriba y abajo de las elevadas. Dos radios: 6px para toda caja y control, 2px para marcas pequeñas. Las rejillas de información son una hoja: celdas unidas, cantos rectos, divisiones dashed que sobresalen. Una sola sección centrada, como ruptura. Altos en dvh o lvh, nunca vh.

**Por qué:** Ocho radios distintos en una página fue el olor de una web sin sistema.

**Nunca** (obligatorio):
- Tarjetas SaaS separadas con gap donde la información es una rejilla
- Píxeles fijos para algo que sangra fuera del gutter
- Interpolar hacia auto (flex-basis, height, width)
- Clases en el marcado sin regla CSS detrás, o id duplicados

- **Decidido por el equipo**
- **Referencias (5)** (orientativo):
  - **R14** [Multiverse · rediseño](https://multiversecomputing.treseiscero.app). Tomar: Donde acabó el trabajo tras 31 entregas: un tema oscuro, dos radios, una firma de movimiento por sección.
    - Criterio: «Donde acabó el trabajo tras 31 entregas: un tema oscuro, dos radios, una firma de movimiento por sección.»
  - **R5** [Mistral AI](https://mistral.ai). Tomar: Andoni pasó tres capturas de su sección de bloques: rejilla de celdas unidas y cantos rectos, como una hoja.
    - Criterio: «Andoni pasó tres capturas de su sección de bloques: rejilla de celdas unidas y cantos rectos, como una hoja.»
  - **R8** [Linear](https://linear.app). Tomar: Un solo tema oscuro hecho de grises fríos escalonados y hairlines: el mismo ritmo de fondos alternos.
    - Criterio: «Un solo tema oscuro hecho de grises fríos escalonados y hairlines: el mismo ritmo de fondos alternos.»
  - **R9** [SandboxAQ](https://www.sandboxaq.com). Tomar: Deep tech de IA y cuántica contada con cifras y sin épica, el registro que pide el copy.
    - Criterio: «Deep tech de IA y cuántica contada con cifras y sin épica, el registro que pide el copy.»
  - **R15** [Image](https://criterio.design/api/files/inspo/a9595d5eb40c47dab0a17e89/media/1791193249537-ovs92m.png) (imagen)
    - Eric: «Esto me gusta!»

## Motion e interacción

Una firma por sección, no un fade-up uniforme. Lo que pesa cae con gravedad (power2.in) y lo de debajo cede 3,2px y vuelve. Las ilustraciones se dibujan al entrar, contorno y luego color, y se quedan quietas; una animación de datos pasa una vez y para. Hover solo donde hay acción: el CTA primario cierra cinco barras a tres en 180ms y revela puntos en 24px junto al cursor, con un pulso de 1,05s desde el punto por el que entras. Elegir una pestaña o un testimonio es un click. Todo lo infinito va en transform u opacity y se pausa fuera de pantalla.

**Por qué:** Los rebotes le quitan seriedad a una empresa de deep tech; el movimiento llega y se para.

**Nunca** (obligatorio):
- Rebotes de cualquier tipo: elastic, back, overshoot, squash-and-stretch
- Caídas con ease-out cuando se pide peso: frenan como una pluma
- Bucles decorativos, incluida una línea de escaneo
- Hover en lo que no se pulsa o en lo que ya está abierto
- Cambiar el color del CTA al hover, o icono en los CTA secundarios
- Animar box-shadow o left en bucle

- **Decidido por el equipo**
- **Referencias (2)** (orientativo):
  - **R14** [Multiverse · rediseño](https://multiversecomputing.treseiscero.app). Tomar: Donde acabó el trabajo tras 31 entregas: un tema oscuro, dos radios, una firma de movimiento por sección.
    - Criterio: «Donde acabó el trabajo tras 31 entregas: un tema oscuro, dos radios, una firma de movimiento por sección.»
  - **R11** [GSAP Eases](https://gsap.com/docs/v3/Eases). Tomar: El visor de curvas: power2.in para lo que cae con gravedad, y lo de debajo que cede 3,2px y vuelve.
    - Criterio: «El visor de curvas: power2.in para lo que cae con gravedad, y lo de debajo que cede 3,2px y vuelve.»

## Iconografía

Nada de iconos de stock. Cada producto lleva su símbolo real, recortado de su propio logotipo; cada sector, su icono propio. Flechas y chevrons de la marca, no genéricos.

**Por qué:** Un glifo inventado para un producto que ya tiene logo en la página es lo primero que el cliente detecta.

**Nunca** (obligatorio):
- Glifos inventados para un producto que ya tiene logotipo
- El mismo icono en todas las piezas de un bloque
- Iconos genéricos en un círculo gris como única ilustración

- **Decidido por el equipo**
- **Referencias (1)** (orientativo):
  - **R12** [IBM Design Language · iconos](https://www.ibm.com/design/language/iconography/ui-icons). Tomar: Iconos con reglas propias de trazo y retícula. Aquí ni eso: cada producto lleva su símbolo real recortado de su logotipo.
    - Criterio: «Iconos con reglas propias de trazo y retícula. Aquí ni eso: cada producto lleva su símbolo real recortado de su logotipo.»

## Logo

El isotipo real, en su variante de 9 bandas, impreso en la tapa del modelo en cada ilustración. El footer termina en el logo real, no en piezas que se le parecen. Logo del nav a 52px sin mover la altura del header. Logos de clientes igualados por tinta medida, no por caja.

**Por qué:** Donde va la marca va la marca.

**Nunca** (obligatorio):
- Barras que imitan el isotipo
- El isotipo completo a tamaño pequeño: sus franjas bajan del píxel

- **Decidido por el equipo**
- **Referencias (2)** (orientativo):
  - **R13** [Multiverse Computing](https://multiversecomputing.com). Tomar: La web del cliente. Manda en copy, logo, fuentes y cifras: el titular y el cierre se toman literales.
    - Criterio: «La web del cliente. Manda en copy, logo, fuentes y cifras: el titular y el cierre se toman literales.»
  - **R2** [Quasar 438B, nota de prensa](https://criterio.design/api/files/inspo/a9595d5eb40c47dab0a17e89/media/template-multiverse-cliente-prensa-quasar.jpg) (imagen). Tomar: Pieza del propio cliente con el isotipo de bandas: de aquí sale la variante de 9 bandas que va impresa en cada ilustración.
    - Criterio: «Pieza del propio cliente con el isotipo de bandas: de aquí sale la variante de 9 bandas que va impresa en cada ilustración.»

## Imagen

Quince ilustraciones isométricas dibujadas por código, en unidades de mundo, cada una con una línea de lo que afirma y ningún sujeto repetido. Material: una sola luz arriba a la izquierda, degradado por cara, cantos en sombra de su propia cara, sombra de contacto, reflejo del rojo sobre la placa y barrido especular. Retratos del equipo en rampa gris a 180px y opacidad plena.

**Por qué:** «Parece de juguete» siempre significa que falta material, no que sobra.

**Nunca** (obligatorio):
- Caras planas de un color con contorno negro de 1px
- Ilustraciones como dibujo de líneas
- Dos ilustraciones que cuentan lo mismo con el mismo objeto
- Retratos «a trazo» hechos por código cuando la referencia es una pintura

- **Decidido por el equipo**
- **Referencias (3)** (orientativo):
  - **R3** [Retrato pintado del equipo](https://criterio.design/api/files/inspo/a9595d5eb40c47dab0a17e89/media/template-multiverse-retrato-pintado.jpg) (imagen). Tomar: Retrato pintado en los rojos de la marca, sin contorno y con el borde deshecho. Salió de la referencia del retrato de Adriano Olivetti.
    - Criterio: «Retrato pintado en los rojos de la marca, sin contorno y con el borde deshecho. Salió de la referencia del retrato de Adriano Olivetti.»
  - **R4** [Mockup de Foundry del cliente](https://criterio.design/api/files/inspo/a9595d5eb40c47dab0a17e89/media/template-multiverse-cliente-mockup-foundry.jpg) (imagen). Tomar: Lo que el cliente tenía: portátil sobre fondo verde, fuera de paleta. Es lo que no se repite; las imágenes pasan a ilustración propia.
    - Criterio: «Lo que el cliente tenía: portátil sobre fondo verde, fuera de paleta. Es lo que no se repite; las imágenes pasan a ilustración propia.»
  - **R5** [Mistral AI](https://mistral.ai). Tomar: Andoni pasó tres capturas de su sección de bloques: rejilla de celdas unidas y cantos rectos, como una hoja.
    - Criterio: «Andoni pasó tres capturas de su sección de bloques: rejilla de celdas unidas y cantos rectos, como una hoja.»

## Voz y tono

El copy es del cliente: titular principal, cierre y frases de posicionamiento, literales de su web actual. Titulares nuevos solo en las secciones que no tenían. Cifras de sus notas de prensa. Un estado se cuenta de una sola manera.

**Por qué:** Si el cliente ve copy nuevo, deja de mirar el diseño; cambiar su posicionamiento es una decisión estratégica que no nos toca.

**Nunca** (obligatorio):
- Fechas o cifras inventadas
- Un producto «coming soon» en un sitio y «early access» en otro

- **Decidido por el equipo**
- **Referencias (3)** (orientativo):
  - **R13** [Multiverse Computing](https://multiversecomputing.com). Tomar: La web del cliente. Manda en copy, logo, fuentes y cifras: el titular y el cierre se toman literales.
    - Criterio: «La web del cliente. Manda en copy, logo, fuentes y cifras: el titular y el cierre se toman literales.»
  - **R9** [SandboxAQ](https://www.sandboxaq.com). Tomar: Deep tech de IA y cuántica contada con cifras y sin épica, el registro que pide el copy.
    - Criterio: «Deep tech de IA y cuántica contada con cifras y sin épica, el registro que pide el copy.»
  - **R10** [Quantinuum](https://www.quantinuum.com). Tomar: Copy técnico de cuántica que se lee: frases de posicionamiento cortas, una idea por bloque.
    - Criterio: «Copy técnico de cuántica que se lee: frases de posicionamiento cortas, una idea por bloque.»

## Referencias (15)

Todo lo que el equipo ha reunido, una vez cada cosa: qué es, quién lo trajo, qué se dijo y qué aporta a cada área. Las áreas lo citan por su código.

### R1 · Hero del rediseño

- **Imagen:** [imagen](https://criterio.design/api/files/inspo/a9595d5eb40c47dab0a17e89/media/template-multiverse-hero-resultado.png)
- **Qué es:** A dark, minimalist landing page with bold, oversized white sans-serif typography. A vibrant red abstract graphic complements the text. Key stats like model size and accuracy are presented in clean cards. The overall mood is sophisticated and technological.
- **Guardada por:** Criterio · 2026-10-04
- **Lo que dijo el equipo:**
  - Criterio: «El hero terminado: titular en Schibsted, cifras en JetBrains Mono y el rojo solo en lo que actúa.»
- **Aporta a:**
  - Tipografía: El hero terminado: titular en Schibsted, cifras en JetBrains Mono y el rojo solo en lo que actúa.
  - Color: El hero terminado: titular en Schibsted, cifras en JetBrains Mono y el rojo solo en lo que actúa.
- **Etiquetas:** Minimal, Producto / SaaS, Dark, Colorido
- **Medido:**
  - Colores en píxeles: `#15181c` 75%, `#463a40` 18%, `#b71934` 7%

### R2 · Quasar 438B, nota de prensa

- **Imagen:** [imagen](https://criterio.design/api/files/inspo/a9595d5eb40c47dab0a17e89/media/template-multiverse-cliente-prensa-quasar.jpg)
- **Qué es:** A clean, minimalist hero section with a pale pink and white gradient background featuring concentric circles. The central focus is on the product name 'Quasar 438B' in large, dark sans-serif typography, highlighted by a small red 'New Model' badge. A circular icon with layered, striped red circles sits below the title, and descriptive text anchors the bottom.
- **Guardada por:** Criterio · 2026-10-04
- **Lo que dijo el equipo:**
  - Criterio: «Pieza del propio cliente con el isotipo de bandas: de aquí sale la variante de 9 bandas que va impresa en cada ilustración.»
- **Aporta a:**
  - Logo: Pieza del propio cliente con el isotipo de bandas: de aquí sale la variante de 9 bandas que va impresa en cada ilustración.
- **Etiquetas:** Minimal, Producto / SaaS, Tipografía, Colorido
- **Medido:**
  - Colores en píxeles: `#fef5f6` 94%, `#fefdfd` 6%

### R3 · Retrato pintado del equipo

- **Imagen:** [imagen](https://criterio.design/api/files/inspo/a9595d5eb40c47dab0a17e89/media/template-multiverse-retrato-pintado.jpg)
- **Qué es:** A digital watercolor illustration of a man with a beard, wearing a suit jacket and collared shirt. The style is predominantly red and pink tones, with a rough, painted texture. The portrait is cropped at the shoulders and set against a stark white background, giving it a minimalist and modern feel.
- **Guardada por:** Criterio · 2026-10-04
- **Lo que dijo el equipo:**
  - Criterio: «Retrato pintado en los rojos de la marca, sin contorno y con el borde deshecho. Salió de la referencia del retrato de Adriano Olivetti.»
- **Aporta a:**
  - Imagen: Retrato pintado en los rojos de la marca, sin contorno y con el borde deshecho. Salió de la referencia del retrato de Adriano Olivetti.
- **Etiquetas:** Minimal, Otro, Dark, Ilustración, Monocromo
- **Medido:**
  - Colores en píxeles: `#ffffff` 45%, `#7a2420` 38%, `#f4bfba` 10%, `#fefdfd` 5%

### R4 · Mockup de Foundry del cliente

- **Imagen:** [imagen](https://criterio.design/api/files/inspo/a9595d5eb40c47dab0a17e89/media/template-multiverse-cliente-mockup-foundry.jpg)
- **Qué es:** A clean, modern dashboard interface is displayed on a laptop screen. The design features a predominantly white and grey color scheme with a bright red accent for key calls to action and headings. A prominent sidebar on the left contains navigation links with icons. The main content area uses a card-based layout to present data and features. The overall mood is professional and efficient.
- **Guardada por:** Criterio · 2026-10-04
- **Lo que dijo el equipo:**
  - Criterio: «Lo que el cliente tenía: portátil sobre fondo verde, fuera de paleta. Es lo que no se repite; las imágenes pasan a ilustración propia.»
- **Aporta a:**
  - Imagen: Lo que el cliente tenía: portátil sobre fondo verde, fuera de paleta. Es lo que no se repite; las imágenes pasan a ilustración propia.
- **Etiquetas:** Minimal, Producto / SaaS, Dark, Grid / bento
- **Medido:**
  - Colores en píxeles: `#13272f` 37%, `#1a3d45` 28%, `#f9f8f8` 23%, `#8b878a` 6%, `#d5282e` 6%

### R5 · Mistral AI

- **Web:** [mistral.ai](https://mistral.ai)
- **Qué es:** Frontier AI LLMs, assistants, agents, services | Mistral · The most powerful AI platform for enterprises. Customize, fine-tune, and deploy AI assistants, autonomous agents, and multimodal AI with open models.
- **Guardada por:** Criterio · 2026-10-04
- **Lo que dijo el equipo:**
  - Criterio: «Andoni pasó tres capturas de su sección de bloques: rejilla de celdas unidas y cantos rectos, como una hoja.»
- **Aporta a:**
  - Layout: Andoni pasó tres capturas de su sección de bloques: rejilla de celdas unidas y cantos rectos, como una hoja.
  - Imagen: Andoni pasó tres capturas de su sección de bloques: rejilla de celdas unidas y cantos rectos, como una hoja.
- **Etiquetas:** Minimal, Producto / SaaS, Tipografía, Colorido
- **Medido:**
  - Colores en píxeles: `#fbfbf7` 72%, `#de3210` 17%, `#c1b6b1` 5%, `#f5952b` 5%

### R6 · Schibsted Grotesk

- **Web:** [fonts.google.com/specimen/Schibsted+Grotesk](https://fonts.google.com/specimen/Schibsted+Grotesk)
- **Qué es:** Schibsted Grotesk - Google Fonts · Schibsted Grotesk is a digital-first font family crafted for user interfaces. Taking visual cues from Schibsted's proud history of printed media as well as our
- **Guardada por:** Criterio · 2026-10-04
- **Lo que dijo el equipo:**
  - Criterio: «La fuente de todo el texto, en 400, 500 y 600 con itálica 400. Titulares en caja baja.»
- **Aporta a:**
  - Tipografía: La fuente de todo el texto, en 400, 500 y 600 con itálica 400. Titulares en caja baja.
- **Etiquetas:** Minimal, Herramienta, Tipografía

### R7 · JetBrains Mono

- **Web:** [jetbrains.com/lp/mono](https://www.jetbrains.com/lp/mono)
- **Qué es:** JetBrains Mono: A free and open source typeface for developers | JetBrains: Developer Tools for Professionals and Teams · Try JetBrains Mono in your IDE. Its simple forms and attention to every detail make coding a nice experience for developers’ eyes, no matter which IDE you choose.
- **Guardada por:** Criterio · 2026-10-04
- **Lo que dijo el equipo:**
  - Criterio: «La mono de la web del propio cliente: para cifras, kickers, etiquetas y specs, con tabular-nums.»
- **Aporta a:**
  - Tipografía: La mono de la web del propio cliente: para cifras, kickers, etiquetas y specs, con tabular-nums.
- **Etiquetas:** Minimal, Herramienta, Tipografía

### R8 · Linear

- **Web:** [linear.app](https://linear.app)
- **Qué es:** Linear – The system for product development · Purpose-built for planning and building products with AI agents.
- **Guardada por:** Criterio · 2026-10-04
- **Lo que dijo el equipo:**
  - Criterio: «Un solo tema oscuro hecho de grises fríos escalonados y hairlines: el mismo ritmo de fondos alternos.»
- **Aporta a:**
  - Color: Un solo tema oscuro hecho de grises fríos escalonados y hairlines: el mismo ritmo de fondos alternos.
  - Layout: Un solo tema oscuro hecho de grises fríos escalonados y hairlines: el mismo ritmo de fondos alternos.
- **Etiquetas:** Minimal, Producto / SaaS, Tipografía, Dark, Grid / bento

### R9 · SandboxAQ

- **Web:** [sandboxaq.com](https://www.sandboxaq.com)
- **Qué es:** Transforming the World with AI and Advanced Computing | SandboxAQ · SandboxAQ leverages the compound effects of AI and advanced computing to address some of the biggest challenges impacting society. SandboxAQ technologies include AI simulation, cryptography management for cybersecurity, and AI sensi
- **Guardada por:** Criterio · 2026-10-04
- **Lo que dijo el equipo:**
  - Criterio: «Deep tech de IA y cuántica contada con cifras y sin épica, el registro que pide el copy.»
- **Aporta a:**
  - Layout: Deep tech de IA y cuántica contada con cifras y sin épica, el registro que pide el copy.
  - Voz y tono: Deep tech de IA y cuántica contada con cifras y sin épica, el registro que pide el copy.
- **Etiquetas:** Corporativo, Producto / SaaS

### R10 · Quantinuum

- **Web:** [quantinuum.com](https://www.quantinuum.com)
- **Qué es:** Quantinuum | Accelerating Quantum Computing · Our trapped ion quantum computers and software solutions are the highest performing in the industry, enabling our users to solve industry&#x27;s most complex problems.
- **Guardada por:** Criterio · 2026-10-04
- **Lo que dijo el equipo:**
  - Criterio: «Copy técnico de cuántica que se lee: frases de posicionamiento cortas, una idea por bloque.»
- **Aporta a:**
  - Voz y tono: Copy técnico de cuántica que se lee: frases de posicionamiento cortas, una idea por bloque.
- **Etiquetas:** Corporativo, Producto / SaaS, Tipografía

### R11 · GSAP Eases

- **Web:** [gsap.com/docs/v3/Eases](https://gsap.com/docs/v3/Eases)
- **Qué es:** Easing | GSAP | Docs & Learning · Easing is the primary way to change the timing of your tweens. Simply changing the ease can adjust the entire feel and personality of your animation. There are infinite eases that you can use in GSAP so we created the visualizer below to help you choose exactly the
- **Guardada por:** Criterio · 2026-10-04
- **Lo que dijo el equipo:**
  - Criterio: «El visor de curvas: power2.in para lo que cae con gravedad, y lo de debajo que cede 3,2px y vuelve.»
- **Aporta a:**
  - Motion e interacción: El visor de curvas: power2.in para lo que cae con gravedad, y lo de debajo que cede 3,2px y vuelve.
- **Etiquetas:** Minimal, Herramienta, Tipografía, Motion

### R12 · IBM Design Language · iconos

- **Web:** [ibm.com/design/language/iconography/ui-icons](https://www.ibm.com/design/language/iconography/ui-icons)
- **Qué es:** A minimalist 404 error page with generous white space. It features IBM's branding in the header and footer, a prominent '404' graphic with a stylized circle, a search bar, and a list of helpful links. The color palette is restricted to blue and white.
- **Guardada por:** Criterio · 2026-10-04
- **Lo que dijo el equipo:**
  - Criterio: «Iconos con reglas propias de trazo y retícula. Aquí ni eso: cada producto lleva su símbolo real recortado de su logotipo.»
- **Aporta a:**
  - Iconografía: Iconos con reglas propias de trazo y retícula. Aquí ni eso: cada producto lleva su símbolo real recortado de su logotipo.
- **Etiquetas:** Minimal, Otro, Tipografía, Monocromo
- **Medido:**
  - Colores en píxeles: `#ffffff` 48%, `#f0f1f2` 44%, `#c2ccdb` 8%

### R13 · Multiverse Computing

- **Web:** [multiversecomputing.com](https://multiversecomputing.com)
- **Qué es:** Multiverse Computing - Pioneering the Era of Efficient and Sovereign AI · We empower organizations to run secure, production-ready AI with tailored solutions — reducing compute costs and retaining full control across cloud, data centers and edge environments
- **Guardada por:** Criterio · 2026-10-04
- **Lo que dijo el equipo:**
  - Criterio: «La web del cliente. Manda en copy, logo, fuentes y cifras: el titular y el cierre se toman literales.»
- **Aporta a:**
  - Tipografía: La web del cliente. Manda en copy, logo, fuentes y cifras: el titular y el cierre se toman literales.
  - Logo: La web del cliente. Manda en copy, logo, fuentes y cifras: el titular y el cierre se toman literales.
  - Voz y tono: La web del cliente. Manda en copy, logo, fuentes y cifras: el titular y el cierre se toman literales.
- **Etiquetas:** Minimal, Producto / SaaS, Tipografía, Dark, Colorido
- **Medido:**
  - Colores en píxeles: `#12151a` 82%, `#453a43` 8%, `#8d6b76` 5%, `#07ae59` 5%

### R14 · Multiverse · rediseño

- **Web:** [multiversecomputing.treseiscero.app](https://multiversecomputing.treseiscero.app)
- **Qué es:** Multiverse Computing — Pioneering the era of efficient & secure AI · We empower organizations to run secure, production-ready AI with tailored solutions, reducing compute costs and retaining full control across cloud, data centers and edge environments. Quasar 438B, CompactifAI, Foundry and Sentinel
- **Guardada por:** Criterio · 2026-10-04
- **Lo que dijo el equipo:**
  - Criterio: «Donde acabó el trabajo tras 31 entregas: un tema oscuro, dos radios, una firma de movimiento por sección.»
- **Aporta a:**
  - Color: Donde acabó el trabajo tras 31 entregas: un tema oscuro, dos radios, una firma de movimiento por sección.
  - Layout: Donde acabó el trabajo tras 31 entregas: un tema oscuro, dos radios, una firma de movimiento por sección.
  - Motion e interacción: Donde acabó el trabajo tras 31 entregas: un tema oscuro, dos radios, una firma de movimiento por sección.
- **Etiquetas:** Minimal, Producto / SaaS, Tipografía, Dark, 3D / WebGL, Colorido
- **Medido:**
  - Colores en píxeles: `#171a1f` 96%, `#525358` 4%

### R15 · Image

- **Imagen:** [imagen](https://criterio.design/api/files/inspo/a9595d5eb40c47dab0a17e89/media/1791193249537-ovs92m.png)
- **Qué es:** A dark-themed website showcases a library of UI sections and layouts. A persistent sidebar on the left lists categories. The main content area displays examples in a grid of cards with mockups and brief descriptions, emphasizing clean typography and ample spacing.
- **Guardada por:** Eric · 2026-10-05
- **Lo que dijo el equipo:**
  - Eric: «Esto me gusta!»
- **Aporta a:**
  - Layout
- **Etiquetas:** Minimal, Estudio / agencia, Tipografía, Dark, Grid / bento
- **Medido:**
  - Colores en píxeles: `#151314` 64%, `#e9e9ea` 20%, `#bfc4aa` 10%, `#68695f` 6%
