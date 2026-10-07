import "server-only";
// The team's own design system, read from docs/design-system/ (the same Markdown the agents read)
// and shown at /library. The files are read with readFile, so next.config.ts traces the folder in.
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(process.cwd(), "docs", "design-system");

/** Every page of the library, in navigation order. `file` is relative to docs/design-system/. */
export const DS_GROUPS: { label: string; lead: string; pages: { slug: string; file: string; icon: string }[] }[] = [
  {
    label: "Introducción",
    lead: "Qué es esta librería y cómo está hecha la app.",
    pages: [
      { slug: "inicio", file: "README.md", icon: "overview" },
      { slug: "mapa", file: "mapa.md", icon: "layout" },
      { slug: "atajos", file: "atajos.md", icon: "keyboard" },
    ],
  },
  {
    label: "Fundamentos",
    lead: "El gusto y los tokens: color, tipo, espacio, movimiento.",
    pages: [
      { slug: "principios", file: "principios.md", icon: "principles" },
      { slug: "fundamentos", file: "fundamentos.md", icon: "foundations" },
    ],
  },
  {
    label: "Componentes",
    lead: "Cada pieza de la app, con su nombre, su fichero y cómo se usa.",
    pages: [{ slug: "componentes", file: "componentes.md", icon: "components" }],
  },
  {
    label: "Construir",
    lead: "Cómo montamos páginas, componentes y flujos.",
    pages: [
      { slug: "patrones", file: "patrones.md", icon: "patterns" },
      { slug: "montar", file: "construir/montar.md", icon: "extension" },
      { slug: "textos-e-idiomas", file: "construir/textos-e-idiomas.md", icon: "language" },
      { slug: "pagina-nueva", file: "construir/pagina-nueva.md", icon: "page" },
      { slug: "componente-nuevo", file: "construir/componente-nuevo.md", icon: "components" },
      { slug: "buenas-practicas", file: "construir/buenas-practicas.md", icon: "check" },
    ],
  },
  {
    label: "Mantenimiento",
    lead: "Qué tocar cuando cambia algo de base, y por qué las cosas son así.",
    pages: [
      { slug: "mantenimiento", file: "mantenimiento.md", icon: "usage" },
      { slug: "desarrollo", file: "desarrollo.md", icon: "code" },
      { slug: "decisiones", file: "decisiones/", icon: "decisions" },
    ],
  },
];

export const DS_PAGES = DS_GROUPS.flatMap((g) => g.pages.map((p) => ({ ...p, group: g.label })));
const BY_FILE = new Map(DS_PAGES.map((p) => [p.file.replace(/^.*\//, "") || "decisiones", p.slug]));

export interface DsPage { slug: string; title: string; body: string }

/** A page: its first heading becomes the title, the rest the body. */
export async function readPage(slug: string): Promise<DsPage | null> {
  const page = DS_PAGES.find((p) => p.slug === slug);
  if (!page || page.slug === "decisiones") return null;
  const md = await readFile(path.join(ROOT, page.file), "utf8");
  const h = md.match(/^# (.*)\n+/);
  return { slug, title: h?.[1] ?? slug, body: h ? md.slice(h[0].length) : md };
}

/** Navigation titles come from each file's first heading, so a page is named in one place. */
export async function pageTitles(): Promise<Record<string, string>> {
  const out: Record<string, string> = { decisiones: "Decisiones" };
  await Promise.all(DS_PAGES.filter((p) => p.slug !== "decisiones").map(async (p) => {
    const md = await readFile(path.join(ROOT, p.file), "utf8");
    out[p.slug] = p.slug === "inicio" ? "Cómo usar esta librería" : md.match(/^# (.*)$/m)?.[1] ?? p.slug;
  }));
  return out;
}

export interface Decision {
  slug: string;
  title: string;
  date: string;
  status: string;
  kind: string;
  supersedes?: string;
  body: string;
}

/** Every decision, newest first. */
export async function readDecisions(): Promise<Decision[]> {
  const dir = path.join(ROOT, "decisiones");
  const files = (await readdir(dir)).filter((f) => /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(f));
  const all = await Promise.all(files.map(async (f) => {
    const raw = await readFile(path.join(dir, f), "utf8");
    const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    const meta: Record<string, string> = {};
    for (const line of (m?.[1] ?? "").split("\n")) {
      const i = line.indexOf(":");
      if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    return {
      slug: f.replace(/\.md$/, ""),
      title: meta.title ?? f,
      date: meta.date ?? f.slice(0, 10),
      status: meta.status ?? "vigente",
      kind: meta.kind ?? "diseño",
      supersedes: meta.supersedes,
      body: (m?.[2] ?? raw).trim(),
    };
  }));
  return all.sort((a, b) => b.slug.localeCompare(a.slug));
}

/** Links between the Markdown files become links between the pages. */
export function dsHref(href: string): string {
  if (/^[a-z]+:/i.test(href) || href.startsWith("#") || href.startsWith("/")) return href;
  const [file, hash = ""] = href.split("#");
  const dec = file.match(/decisiones\/(\d{4}-[^/]+)\.md$/);
  if (dec) return `/library/decisiones#${dec[1]}`;
  if (/decisiones\/(README\.md)?$/.test(file)) return "/library/decisiones";
  const slug = BY_FILE.get(file.replace(/^.*\//, ""));
  return slug ? `/library/${slug}${hash ? "#" + hash : ""}` : href;
}

// ─── A small Markdown reader: the subset these files use ─────────────────────

export type Inline = { t: "text" | "code" | "strong"; v: string } | { t: "link"; v: string; href: string };
export type Block =
  | { t: "h"; level: 2 | 3; text: Inline[]; id: string }
  | { t: "p"; text: Inline[] }
  | { t: "ul" | "ol"; items: Inline[][] }
  | { t: "table"; head: Inline[][]; rows: Inline[][][] }
  | { t: "code"; v: string };

export function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function inline(s: string): Inline[] {
  const out: Inline[] = [];
  const re = /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  for (let m; (m = re.exec(s)); ) {
    if (m.index > last) out.push({ t: "text", v: s.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ t: "code", v: m[1] });
    else if (m[2] !== undefined) out.push({ t: "strong", v: m[2] });
    else out.push({ t: "link", v: m[3], href: dsHref(m[4]) });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ t: "text", v: s.slice(last) });
  return out;
}

const cells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => inline(c.trim()));

export function parseMd(md: string): Block[] {
  const lines = md.split("\n");
  const out: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith("```")) {
      const buf: string[] = [];
      for (i++; i < lines.length && !lines[i].startsWith("```"); i++) buf.push(lines[i]);
      out.push({ t: "code", v: buf.join("\n") });
      i++;
      continue;
    }
    const h = line.match(/^(#{2,3}) (.*)$/);
    if (h) { out.push({ t: "h", level: h[1].length as 2 | 3, text: inline(h[2]), id: slugify(h[2]) }); i++; continue; }
    if (line.startsWith("|")) {
      const rows: string[] = [];
      for (; i < lines.length && lines[i].startsWith("|"); i++) rows.push(lines[i]);
      out.push({ t: "table", head: cells(rows[0]), rows: rows.slice(2).map(cells) });
      continue;
    }
    const list = line.match(/^(-|\d+\.) /);
    if (list) {
      const ordered = list[1] !== "-";
      const items: string[] = [];
      for (; i < lines.length && lines[i].trim(); i++) {
        const m = lines[i].match(/^(?:-|\d+\.) (.*)$/);
        if (m) items.push(m[1]);
        else items[items.length - 1] += " " + lines[i].trim();
      }
      out.push({ t: ordered ? "ol" : "ul", items: items.map(inline) });
      continue;
    }
    const buf: string[] = [];
    for (; i < lines.length && lines[i].trim() && !/^(#{2,3} |\||```|- |\d+\. )/.test(lines[i]); i++) buf.push(lines[i].trim());
    out.push({ t: "p", text: inline(buf.join(" ")) });
  }
  return out;
}

// ─── The component catalogue: "## Tab", then "### Name" cards ───────────────

export interface CatalogItem {
  name: string;
  id: string;
  /** Technical name, file, CSS prefix…: copyable chips */
  chips: string[];
  /** A live sample drawn by Specimens.tsx: every card of the system has one; no screenshots */
  sample?: string;
  unused: boolean;
  blocks: Block[];
}
export interface CatalogTab { name: string; id: string; items: CatalogItem[] }

/**
 * Card format, right under its "### Name":
 *   `InspoCard` · `components/InspoCard.tsx` · muestra: botones · sin uso
 * then free Markdown (description, a list of details).
 */
export function parseCatalog(md: string): { intro: Block[]; tabs: CatalogTab[] } {
  const parts = md.split(/^## /m);
  const intro = parseMd(parts.shift() ?? "");
  const tabs = parts.map((part) => {
    const [head, ...rest] = part.split("\n");
    const cards = rest.join("\n").split(/^### /m);
    const tabIntro = cards.shift();
    void tabIntro;
    const items = cards.map((c): CatalogItem => {
      const lines = c.split("\n");
      const name = lines.shift()!.trim();
      let chips: string[] = [], sample: string | undefined, unused = false;
      if (lines[0]?.trim().startsWith("`") || /^muestra:/.test(lines[0]?.trim() ?? "")) {
        for (const bit of lines.shift()!.split(" · ").map((x) => x.trim())) {
          if (bit.startsWith("muestra:")) sample = bit.slice(8).trim();
          else if (bit === "sin uso") unused = true;
          else chips.push(bit.replace(/^`|`$/g, ""));
        }
      }
      chips = chips.filter(Boolean);
      return { name, id: slugify(name), chips, sample, unused, blocks: parseMd(lines.join("\n")) };
    });
    return { name: head.trim(), id: slugify(head), items };
  });
  return { intro, tabs };
}
