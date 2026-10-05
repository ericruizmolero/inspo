# Textos e idiomas

La interfaz es bilingüe: inglés por defecto, castellano segundo. El código está en inglés. → [UI bilingüe](../decisiones/2026-09-23-ui-bilingue-i18n.md)

## Dónde vive cada texto

| Qué | Dónde |
| --- | --- |
| Textos de la interfaz | `lib/i18n/en/ui.ts` y `lib/i18n/es/ui.ts` |
| Planes, directorio, taxonomía, correos, errores, etiquetas de códigos | `lib/i18n/{en,es}/plans.ts`, `directory.ts`, `taxonomy.ts`, `mail.ts`, `errors.ts`, `labels.ts` |
| Extensión de Chrome | `extension/chrome/_locales/{en,es}/messages.json` |
| Este sistema de diseño | `docs/design-system/` (solo castellano) |

## Cómo se usa

- **Servidor**: `const { t } = await getT()` (`lib/i18n`).
- **Cliente**: `const { t, locale } = useT()` (`components/I18nProvider`).
- Un texto con variables es una función: `leads.usage: (days: number) => \`…${days}…\``.
- El castellano está tipado contra el inglés: si falta una clave, no compila. Se añaden las dos a la vez.
- El idioma va en la cookie `lang`; `?lang=es` en un enlace lo fija (útil para compartir).

## Cómo escribimos

- Frases cortas que dicen qué pasa, no qué es el botón. "Ya tengo las referencias", no "Confirmar".
- Sacar de un proyecto se dice siempre como lo que es: vuelve al Inbox.
- Lo que redacta un modelo, en el idioma de la app y sin rayas ni puntos medios entre elementos.
- Nombres propios de fuentes, marcas y valores técnicos (hex, px, CSS) no se traducen.
