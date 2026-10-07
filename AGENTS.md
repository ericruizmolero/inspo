<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Design system: read it, and write down what gets decided

The team's design system lives in `docs/design-system/` (shown at `/library`). Before designing UI or writing CSS, read `docs/design-system/principios.md` and `fundamentos.md`; before creating a component, check `componentes.md`. When the team approves, rejects or corrects a design or development choice, record it with the `registrar-decision` skill in the same piece of work.

Keep it current with everything we build, not only with decisions: any work that changes the interface, a token, a component, a pattern, a route, a shortcut or how we build ends with its page of `docs/design-system/` updated in that same work (`componentes.md`, `patrones.md`, `fundamentos.md`, `desarrollo.md`, `mapa.md`, `atajos.md`), without waiting to be asked. Before calling a task done, check your diff against the design system.
