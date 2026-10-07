import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SettingsHeading from "@/components/SettingsHeading";
import DsMarkdown from "@/components/design-library/DsMarkdown";
import Decisions from "@/components/design-library/Decisions";
import { FoundationsSpecimen } from "@/components/design-library/Specimens";
import Catalog from "@/components/design-library/Catalog";
import { sectionIcon } from "@/components/section-icons";
import { getSession } from "@/lib/workspace";
import { isAdmin } from "@/lib/activity";
import { DS_GROUPS, DS_PAGES, pageTitles, parseCatalog, parseMd, readDecisions, readPage, type Block } from "@/lib/design-system";

type Props = { params: Promise<{ section: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ section }, titles] = await Promise.all([params, pageTitles()]);
  return { title: titles[section] ?? "Sistema de diseño" };
}

/** "En esta página": the h2s of a long page, kept in view beside it. */
function Toc({ blocks }: { blocks: Block[] }) {
  const hs = blocks.filter((b): b is Extract<Block, { t: "h" }> => b.t === "h" && b.level === 2);
  if (hs.length < 3) return null;
  return (
    <nav className="ds-toc" aria-label="En esta página">
      <span className="t-label ds-toc__label">En esta página</span>
      {hs.map((h) => <a key={h.id} href={`#${h.id}`}>{h.text.map((x) => x.v).join("")}</a>)}
    </nav>
  );
}

/** The home page's map of the library: one tile per block, with its pages. */
async function Blocks() {
  const titles = await pageTitles();
  return (
    <div className="ds-cards">
      {DS_GROUPS.filter((g) => g.label !== "Introducción").map((g) => (
        <Link key={g.label} href={`/library/${g.pages[0].slug}`} className="cr-card cr-card-raised ds-card">
          <span className="ds-card__icon">{sectionIcon(g.pages[0].icon)}</span>
          <span className="t-title-m ds-card__title">{g.label}</span>
          <span className="ds-card__lead">{g.lead}</span>
          <span className="ds-card__pages">{g.pages.map((p) => titles[p.slug]).join(", ")}</span>
        </Link>
      ))}
    </div>
  );
}

export default async function DesignLibrarySection({ params }: Props) {
  const { section } = await params;
  // Checked here too, not only in the layout: a client navigation can render this page without the layout
  const s = await getSession();
  if (!s || !(await isAdmin(s.user.email))) notFound();
  const meta = DS_PAGES.find((p) => p.slug === section);
  if (!meta) notFound();
  const source = `docs/design-system/${meta.file}`;
  const aside = <span className="settings__meta">{source}</span>;

  if (section === "decisiones") {
    const items = (await readDecisions()).map(({ body, ...rest }) => ({ ...rest, blocks: parseMd(body) }));
    return (
      <>
        <SettingsHeading title="Decisiones" lead="Cada sí y cada no del equipo, con su porqué. Lo retirado se queda para que nadie lo vuelva a meter." aside={aside} />
        <Decisions items={items} />
      </>
    );
  }

  const page = await readPage(section);
  if (!page) notFound();
  if (section === "componentes") {
    const { intro, tabs } = parseCatalog(page.body);
    const lead = intro[0]?.t === "p" ? intro[0].text.map((x) => x.v).join("") : "";
    return (
      <>
        <SettingsHeading title={page.title} lead={lead} aside={aside} />
        <Catalog tabs={tabs} />
      </>
    );
  }
  const blocks = parseMd(page.body);
  // The first paragraph is the page's lead
  const first = blocks[0]?.t === "p" ? blocks.shift() as Extract<Block, { t: "p" }> : null;
  const lead = first ? first.text.map((x) => x.v).join("") : DS_GROUPS.find((g) => g.label === meta.group)!.lead;
  const title = section === "inicio" ? "Cómo usar esta librería" : page.title;

  return (
    <>
      <SettingsHeading title={title} lead={lead} aside={aside} />
      {section === "inicio" && <Blocks />}
      {section === "fundamentos" && <FoundationsSpecimen />}
      <div className="ds-page">
        <DsMarkdown blocks={blocks} />
        <Toc blocks={blocks} />
      </div>
    </>
  );
}
