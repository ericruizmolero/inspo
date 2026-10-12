# Textos e idiomas

La interfaz es bilingüe: inglés por defecto, castellano segundo. El código está en inglés. → [UI bilingüe](../decisiones/2026-09-23-ui-bilingue-i18n.md)

## Dónde vive cada texto

| Qué | Dónde |
| --- | --- |
| Textos de la interfaz | `lib/i18n/en/ui.ts` y `lib/i18n/es/ui.ts` |
| Planes, taxonomía, correos, errores, etiquetas de códigos | `lib/i18n/{en,es}/plans.ts`, `taxonomy.ts`, `mail.ts`, `errors.ts`, `labels.ts` |
| Web de marketing: portada, recursos, skills, precios, extensión, páginas legales | `marketing-site/src/i18n.ts`, `marketing-site/src/resources.ts`, `marketing-site/src/skills.ts`, `marketing-site/src/plans.ts`, `marketing-site/src/legal.ts` (los dos idiomas en el mismo fichero). Los planes y las skills de criterio.md son copia de la app: se cambian en los dos sitios (`tests/marketing-site-copy.test.ts` lo vigila). Los textos de los recursos y de las skills de otros autores viven solo aquí: Descubrir los lee de estos ficheros |
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
