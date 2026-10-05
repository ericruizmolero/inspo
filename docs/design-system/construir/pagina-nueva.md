# Añadir una página

## Las tres familias de página

| Familia | Cómo se ve | Ejemplos |
| --- | --- | --- |
| **App** | Isla arriba a la izquierda, dock de cristal, tablero o documento a pantalla completa | `/`, `/i/[id]`, proyecto |
| **Sección** | `SectionShell`: sidebar shadcn con secciones, migas, contenido a 800 px (1040 con `wide`) | `/settings`, `/admin`, `/library` |
| **Pública** | Sin sesión, carga instantánea, sin trabajo pesado | `/login`, `/invite/[id]`, `/extension/privacy` |

## Lista de lo que hace falta

1. La ruta en `app/`. En Next 16 `params` y `searchParams` son promesas: `await params`.
2. **Acceso**: `proxy.ts` deja pasar sin sesión solo lo que está en `PUBLIC`; el permiso real (workspace, rol, admin) lo comprueba la propia página o su layout (`getSession`, `getCtx`, `isAdmin`). Lo interno responde 404, no 403.
3. **Metadatos** con `generateMetadata` y el título sacado de `t`.
4. **Textos** en `lib/i18n/{en,es}` (ver [Textos e idiomas](textos-e-idiomas.md)).
5. **CSS** en un fichero propio junto al componente, solo con tokens.
6. **Presencia**: en páginas de sección, `<ActivityPing area="…" />` para que aparezca en `/admin`.
7. **Ficheros leídos en runtime** (`readFile`, `readdir`): añadir la ruta a `outputFileTracingIncludes` en `next.config.ts` o fallará en Vercel.
8. Comprobar en móvil (800 px es el corte de la app) y en los dos temas.
9. Añadirla al [mapa de la app](../mapa.md) y, si se decidió algo nuevo, registrar la decisión.

## Guardarraíles

- Nada de colores fuera de los tokens, ni `#fff` para UI.
- Nada de mono en títulos o etiquetas; nada de bordes para separar.
- Ninguna familia tipográfica nueva.
- Un solo botón primario por vista; nada de botones inventados fuera de `.btn`.
- Ningún texto escrito en el componente.
- En páginas públicas, nada de IA, Blob ni análisis al renderizar.
- Nada de tablas ni modales para organizar referencias: se hace sobre las tarjetas.
