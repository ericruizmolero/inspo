// Directory of sites to look for inspiration. Shown from the sidebar
// ("Looking for inspiration?"). No duplicates: each domain appears only once. The skills for agents are a list of
// their own (SKILLS, below), where several can live on the same catalog.

// The text (each group's title and help, each resource's description) lives in
// lib/i18n/<locale>/directory.ts, keyed by group key and URL.
import { readableDomain } from "@/lib/url";

export interface DirectorySite {
  name: string;
  url: string;
  /** The day it joined the directory (yyyy-mm-dd), for the ones that came after the first batch: Discover shows it as new */
  added?: string;
  /** A skill criterio.md can carry too (an id of MD_SKILLS in lib/md-skills.ts): Discover says so on its row */
  skill?: string;
  /** A skill for agents: the command that installs it (its GitHub owner is its author) */
  install?: string;
}

export interface DirectoryGroup {
  key: string;
  items: DirectorySite[];
}

export const DIRECTORY: DirectoryGroup[] = [
  {
    key: "designmd",
    items: [
      { name: "Refero Styles", url: "https://styles.refero.design" },
      { name: "Inspo MCP", url: "https://inspomcp.dev" },
      { name: "DesignMD.me", url: "https://designmd.me" },
      { name: "Open Design", url: "https://open-design.ai" },
      { name: "DesignMD Supply", url: "https://designmd.supply" },
      { name: "getdesign.md", url: "https://getdesign.md" },
      { name: "Neuform", url: "https://neuform.ai" },
      { name: "Hyperbrowser Design MD", url: "https://design-md.hyperbrowser.ai" },
      { name: "TypeUI", url: "https://typeui.sh" },
    ],
  },
  {
    key: "sites",
    items: [
      { name: "Landing Gallery", url: "https://landing.gallery", added: "2026-10-05" },
      { name: "Umanmade", url: "https://umanmade.com", added: "2026-10-04" },
      { name: "Recent.design", url: "https://recent.design" },
      { name: "Goated UI", url: "https://goatedui.dev" },
      { name: "Landdding", url: "https://landdding.com" },
      { name: "Curated.design", url: "https://curated.design" },
      { name: "Landing.love", url: "https://landing.love" },
      { name: "A1 Gallery", url: "https://a1.gallery" },
      { name: "Inspora", url: "https://inspora.design" },
      { name: "Dark.design", url: "https://dark.design" },
      { name: "Loadmo.re", url: "https://loadmo.re" },
      { name: "Rebrand Gallery", url: "https://rebrand.gallery" },
      { name: "Bento Grids", url: "https://bentogrids.com" },
      { name: "Gridddy", url: "https://gridddy.framer.website" },
      { name: "Design Spells", url: "https://designspells.com" },
      { name: "Best Designs on X", url: "https://bestdesignsonx.com" },
      { name: "Land-book", url: "https://land-book.com" },
      { name: "Lapa Ninja", url: "https://www.lapa.ninja" },
      { name: "Siteinspire", url: "https://www.siteinspire.com" },
      { name: "Httpster", url: "https://httpster.net" },
      { name: "Minimal Gallery", url: "https://minimal.gallery" },
      { name: "Awwwards", url: "https://www.awwwards.com" },
      { name: "Seesaw", url: "https://www.seesaw.website" },
      { name: "Site of Sites", url: "https://siteofsites.co" },
      { name: "Maxibestof", url: "https://maxibestof.one" },
      { name: "Klikkentheke", url: "https://klikkentheke.com" },
      { name: "Hover States", url: "https://hoverstat.es" },
      { name: "The Responsive", url: "https://the-responsive.com" },
      { name: "Lowww", url: "https://lowww.directory" },
      { name: "The FWA", url: "https://thefwa.com" },
    ],
  },
  {
    key: "saas",
    items: [
      { name: "SaaS Landing Page", url: "https://saaslandingpage.com", added: "2026-10-05" },
      { name: "DesignforB2B", url: "https://designforb2b.com", added: "2026-10-04" },
      { name: "Saaspo", url: "https://saaspo.com" },
      { name: "SaaSFrame", url: "https://saasframe.io" },
      { name: "One Page Love", url: "https://onepagelove.com" },
      { name: "Refero", url: "https://refero.design" },
      { name: "Mobbin", url: "https://mobbin.com" },
      { name: "Screenlane", url: "https://screenlane.com" },
      { name: "Page Flows", url: "https://pageflows.com" },
      { name: "Built by Designers", url: "https://builtbydesigners.com" },
    ],
  },
  {
    key: "sections",
    items: [
      { name: "Details", url: "https://www.details.so", added: "2026-10-06" },
      { name: "Supahero", url: "https://supahero.io" },
      { name: "Navbar Gallery", url: "https://navbar.gallery" },
      { name: "Footer.design", url: "https://footer.design" },
      { name: "CTA Gallery", url: "https://cta.gallery" },
      { name: "404s.design", url: "https://404s.design" },
      { name: "Unsection", url: "https://unsection.com" },
      { name: "Posts.design", url: "https://posts.design" },
    ],
  },
  {
    key: "code",
    items: [
      { name: "Reverse UI", url: "https://reverseui.com", added: "2026-10-04" },
      { name: "Cult UI", url: "https://www.cult-ui.com", added: "2026-10-04" },
      { name: "Originkit", url: "https://www.originkit.dev" },
      { name: "Bencho", url: "https://bencho.dev" },
      { name: "ObsidianUI", url: "https://obsidianui.dev" },
      { name: "UI by Halaska", url: "https://ui.halaska.com" },
      { name: "21st.dev", url: "https://21st.dev" },
      { name: "useLayouts", url: "https://uselayouts.com", added: "2026-10-04" },
      { name: "Arc UI", url: "https://uiarc.dev", added: "2026-10-04" },
      { name: "Beautiful UI", url: "https://beautifului.dev" },
      { name: "vgpu", url: "https://vgpu.sh/examples/holographic-card" },
    ],
  },
  {
    key: "motion",
    items: [
      { name: "60fps", url: "https://60fps.design" },
      { name: "Detail", url: "https://detail.design", added: "2026-10-04" },
      { name: "Scrolltide", url: "https://scrolltide.co", added: "2026-10-05" },
      { name: "Animos", url: "https://animos.app" },
      { name: "Motion in Design", url: "https://motionin.design" },
      { name: "Motionsites", url: "https://motionsites.ai" },
      { name: "Liquid Orb Editor", url: "https://lersent001.github.io/orb/" },
    ],
  },
  {
    key: "resources",
    items: [
      { name: "Design Bookmark", url: "https://designbookmark.com", added: "2026-10-05" },
      { name: "SearchSystem", url: "https://searchsystem.co", added: "2026-10-04" },
      { name: "Logo To Use", url: "https://logotouse.com" },
      { name: "Hano", url: "https://hano.so" },
      { name: "Gradientool", url: "https://gradientool.com" },
      { name: "Backgrounds Supply", url: "https://backgrounds.supply" },
      { name: "Supaste", url: "https://supaste.com" },
      { name: "Modulify", url: "https://modulify.ai" },
      { name: "Closeit", url: "https://closeit.fast" },
      { name: "Typewolf", url: "https://www.typewolf.com" },
      { name: "Fonts In Use", url: "https://fontsinuse.com" },
      { name: "Toools.design", url: "https://www.toools.design" },
      { name: "playgrnd", url: "https://www.playgrnd.tools" },
      { name: "Light Rails", url: "https://light-stroke-rail.vercel.app" },
      { name: "Reelfolio", url: "https://reelfolio.io" },
      { name: "Symbl", url: "https://symbl.space" },
      { name: "Svgl", url: "https://svgl.app" },
      { name: "Ditherland", url: "https://ditherland.leobecker.com" },
    ],
  },
  {
    key: "graphics",
    items: [
      { name: "Deck Gallery", url: "https://deck.gallery", added: "2026-10-05" },
      { name: "Logo System", url: "https://logosystem.co", added: "2026-10-05" },
      { name: "Brand Guidelines", url: "https://brandguidelines.net", added: "2026-10-05" },
      { name: "Icon Museum", url: "https://icon.museum", added: "2026-10-04" },
      { name: "Logggos", url: "https://logggos.club", added: "2026-10-04" },
      { name: "The Brand Identity", url: "https://the-brandidentity.com" },
      { name: "Visuelle", url: "https://visuelle.co.uk" },
      { name: "Visual Journal", url: "https://visualjournal.it" },
      { name: "Type01", url: "https://type-01.com" },
      { name: "Aesse Studio", url: "https://aessestudio.tumblr.com" },
    ],
  },
  {
    key: "type",
    items: [
      { name: "Claude Type", url: "https://claudetype.com" },
      { name: "Klim Type Foundry", url: "https://klim.co.nz" },
      { name: "Pangram Pangram", url: "https://pangrampangram.com" },
      { name: "Grilli Type", url: "https://www.grillitype.com" },
      { name: "Dinamo", url: "https://abcdinamo.com" },
      { name: "Colophon Foundry", url: "https://www.colophon-foundry.org" },
      { name: "Commercial Type", url: "https://commercialtype.com" },
      { name: "Displaay", url: "https://displaay.net" },
      { name: "Sharp Type", url: "https://sharptype.co" },
      { name: "Ohno Type", url: "https://ohnotype.co" },
      { name: "Atipo Foundry", url: "https://www.atipofoundry.com" },
      { name: "Future Fonts", url: "https://www.futurefonts.xyz" },
      { name: "Fontshare", url: "https://www.fontshare.com" },
      { name: "Font Pairing (Monotype)", url: "https://www.monotype.com/font-pairing#/playground?fontPair1=Pepi%2FRudi&fontPair2=Schotis+Text" },
      { name: "Velvetyne", url: "https://velvetyne.fr" },
    ],
  },
  {
    key: "development",
    items: [
      { name: "Superdesign", url: "https://superdesign.dev", added: "2026-10-05" },
      { name: "Ship Studio", url: "https://www.ship.studio" },
      { name: "Aura", url: "https://www.aura.build" },
      { name: "Agentation", url: "https://agentation.com" },
      { name: "Claude Code", url: "https://claude.com/claude-code" },
      { name: "Codex (OpenAI)", url: "https://chatgpt.com/codex" },
      { name: "Cursor", url: "https://cursor.com" },
      { name: "v0", url: "https://v0.app" },
      { name: "Lovable", url: "https://lovable.dev" },
      { name: "Bolt", url: "https://bolt.new" },
      { name: "Paper", url: "https://paper.design" },
      { name: "Magic Patterns", url: "https://www.magicpatterns.com" },
    ],
  },
  {
    key: "models",
    items: [
      { name: "Jev (Typesafe AI)", url: "https://typesafe.ai" },
      { name: "Claude (Anthropic)", url: "https://www.anthropic.com" },
      { name: "OpenAI", url: "https://openai.com" },
      { name: "Gemini (Google DeepMind)", url: "https://gemini.google" },
      { name: "Grok (xAI)", url: "https://x.ai" },
      { name: "Mistral", url: "https://mistral.ai" },
      { name: "Llama (Meta)", url: "https://www.llama.com" },
      { name: "DeepSeek", url: "https://www.deepseek.com" },
      { name: "Qwen (Alibaba)", url: "https://qwen.ai" },
    ],
  },
  {
    key: "agents",
    items: [
      { name: "Muse (Meta)", url: "https://muse.ai" },
      { name: "Instinct", url: "https://instinct.co" },
      { name: "OpenClaw", url: "https://openclaw.ai" },
      { name: "Hermes Agent (Nous Research)", url: "https://hermes-agent.nousresearch.com" },
    ],
  },
  {
    key: "moodboards",
    items: [
      { name: "Curated Supply", url: "https://curated.supply" },
      { name: "Savee", url: "https://savee.it" },
      { name: "Cosmos", url: "https://www.cosmos.so" },
      { name: "Grey on X", url: "https://x.com/thisisgrey" },
      { name: "Morrre on Instagram", url: "https://instagram.com/morrre.dsgn" },
      { name: "on.design", url: "https://on.design" },
      { name: "Are.na", url: "https://www.are.na" },
    ],
  },
];

/** Discover › Skills: one entry per skill, with the command that installs it. The one without a command is the catalog
 *  they come from. Their text lives with the directory's, under the group key "skills" */
export const SKILLS: DirectorySite[] = [
  { name: "UI Skills", url: "https://ui-skills.com", added: "2026-10-05" },
  { name: "frontend-design", url: "https://ui-skills.com/skills/anthropics/frontend-design", added: "2026-10-05", install: "npx skills add https://github.com/anthropics/skills --skill frontend-design" },
  { name: "emil-design-eng", url: "https://ui-skills.com/skills/emilkowalski/emil-design-eng", added: "2026-10-05", install: "npx skills add https://github.com/emilkowalski/skills --skill emil-design-eng" },
  { name: "apple-design", url: "https://ui-skills.com/skills/emilkowalski/apple-design", added: "2026-10-05", install: "npx skills add https://github.com/emilkowalski/skills --skill apple-design" },
  { name: "interaction-design", url: "https://ui-skills.com/skills/wshobson/interaction-design", added: "2026-10-05", install: "npx skills add https://github.com/wshobson/agents --skill interaction-design" },
  { name: "beautiful-shadows", url: "https://ui-skills.com/skills/mengto/beautiful-shadows", added: "2026-10-05", install: "npx skills add https://github.com/MengTo/Skills --skill beautiful-shadows" },
  { name: "adapt", url: "https://ui-skills.com/skills/pbakaus/adapt", added: "2026-10-05", install: "npx skills add https://github.com/pbakaus/impeccable --skill adapt" },
  { name: "shadcn", url: "https://ui-skills.com/skills/shadcn-ui/shadcn", added: "2026-10-05", install: "npx skills add https://github.com/shadcn-ui/ui --skill shadcn" },
  { name: "accessibility", url: "https://ui-skills.com/skills/addyosmani/accessibility", added: "2026-10-05", install: "npx skills add https://github.com/addyosmani/web-quality-skills --skill accessibility", skill: "a11y" },
  { name: "design-review", url: "https://ui-skills.com/skills/superfuture/design-review", added: "2026-10-05", install: "npx skills add https://github.com/Superfuture/design-review --skill design-review" },
  { name: "better-interface", url: "https://ui-skills.com/skills/jakubkrehel/better-interface", added: "2026-10-05", install: "npx skills add https://github.com/jakubkrehel/skills --skill better-interface" },
  { name: "iso-figure", url: "https://github.com/MrBongoC/ai-iso-skill", added: "2026-10-05", skill: "iso-figure", install: "npx skills add https://github.com/MrBongoC/ai-iso-skill --skill iso-figure" },
  { name: "gsap-skills", url: "https://github.com/greensock/gsap-skills", added: "2026-10-05", skill: "gsap", install: "npx skills add https://github.com/greensock/gsap-skills" },
  { name: "no-ai-slop", url: "https://github.com/petergyang/no-ai-slop", added: "2026-10-05", skill: "no-ai-slop", install: "npx skills add https://github.com/petergyang/no-ai-slop --skill no-ai-slop" },
];

export const DIRECTORY_TOTAL = DIRECTORY.reduce((n, g) => n + g.items.length, 0);

// File name of the static thumbnail (public/directory/<slug>.jpg),
// generated with `npx tsx scripts/directory-shots.ts`.
export function siteSlug(url: string): string {
  return siteHost(url).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}

/** Joined the directory in the last 30 days */
export const NEW_DAYS = 30;
export function isNewSite(site: DirectorySite, now = Date.now()): boolean {
  return !!site.added && now - Date.parse(site.added) < NEW_DAYS * 86400000;
}
/** What Discover features: the galleries we open most (the sidebar's pick) */
export const featuredUrls = (): string[] => SIDEBAR_PICK_URLS;

// The handful worth a row in the sidebar, under "Directory": the galleries we open most.
// Hand-picked and in this order (Recent.design first); one leaving the directory just disappears.
const SIDEBAR_PICK_URLS = [
  "https://recent.design",
  "https://curated.design",
  "https://goatedui.dev",
  "https://landing.love",
  "https://mobbin.com",
  "https://supahero.io",
  "https://styles.refero.design",
];
const ALL_SITES = DIRECTORY.flatMap((g) => g.items);
const GROUP_OF = new Map(DIRECTORY.flatMap((g) => g.items.map((r) => [r.url, g.key] as const)));
/** The key of the group a site is listed under (its "kind": galleries, motion, type…) */
export function siteGroupKey(url: string): string | undefined {
  return GROUP_OF.get(url);
}
export const SIDEBAR_PICKS: DirectorySite[] = SIDEBAR_PICK_URLS
  .map((u) => ALL_SITES.find((r) => r.url === u))
  .filter((r): r is DirectorySite => !!r);

// "Shuffle" draws from the places to look, not from the tools: models, agents and dev tools stay out.
const SHUFFLE_POOL = DIRECTORY
  .filter((g) => !["development", "models", "agents"].includes(g.key))
  .flatMap((g) => g.items);

/** Another handful for the sidebar, none of them currently shown. */
export function shuffleSidebarPicks(current: DirectorySite[], n = SIDEBAR_PICKS.length): DirectorySite[] {
  const pool = SHUFFLE_POOL.filter((r) => !current.some((c) => c.url === r.url));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, n);
}

// The places to look for each area of a project's system, picked by hand from the directory: what a designer would
// open to get an empty area going. A URL leaving the directory just disappears from its area.
const AREA_SITE_URLS: Record<string, string[]> = {
  typography: ["https://www.typewolf.com", "https://fontsinuse.com", "https://www.monotype.com/font-pairing#/playground?fontPair1=Pepi%2FRudi&fontPair2=Schotis+Text", "https://klim.co.nz", "https://www.grillitype.com", "https://abcdinamo.com", "https://pangrampangram.com", "https://commercialtype.com", "https://claudetype.com", "https://ohnotype.co", "https://www.fontshare.com", "https://velvetyne.fr"],
  color: ["https://gradientool.com", "https://backgrounds.supply", "https://dark.design", "https://savee.it", "https://www.cosmos.so", "https://www.are.na"],
  layout: ["https://bentogrids.com", "https://gridddy.framer.website", "https://httpster.net", "https://the-responsive.com", "https://unsection.com", "https://supahero.io", "https://navbar.gallery", "https://footer.design", "https://curated.design", "https://recent.design", "https://www.seesaw.website", "https://minimal.gallery"],
  motion: ["https://60fps.design", "https://motionsites.ai", "https://scrolltide.co", "https://motionin.design", "https://landing.love", "https://loadmo.re", "https://designspells.com", "https://hoverstat.es", "https://www.originkit.dev", "https://obsidianui.dev", "https://animos.app"],
  iconography: ["https://goatedui.dev", "https://svgl.app", "https://www.toools.design", "https://designspells.com", "https://refero.design", "https://mobbin.com"],
  logo: ["https://logotouse.com", "https://logosystem.co", "https://brandguidelines.net", "https://rebrand.gallery", "https://the-brandidentity.com", "https://symbl.space", "https://svgl.app", "https://visuelle.co.uk", "https://visualjournal.it"],
  imagery: ["https://hano.so", "https://ditherland.leobecker.com", "https://light-stroke-rail.vercel.app", "https://backgrounds.supply", "https://www.playgrnd.tools", "https://savee.it", "https://www.cosmos.so", "https://aessestudio.tumblr.com"],
  voice: ["https://the-brandidentity.com", "https://cta.gallery", "https://404s.design", "https://supahero.io", "https://saaspo.com", "https://curated.supply"],
};
/** The directory's places to look for one area of the system, in the order they are worth opening */
export function areaSites(area: string): DirectorySite[] {
  return (AREA_SITE_URLS[area] ?? []).map((u) => ALL_SITES.find((r) => r.url === u)).filter((r): r is DirectorySite => !!r);
}

export function siteShot(url: string): string {
  return `/directory/${siteSlug(url)}.jpg`;
}

export function siteHost(url: string): string {
  try {
    return readableDomain(new URL(url).hostname.replace(/^www\./, ""));
  } catch {
    return url;
  }
}
