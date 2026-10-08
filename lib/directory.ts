// Directory of sites to look for inspiration. Shown from the sidebar
// ("Looking for inspiration?"). No duplicates: each domain appears only once. The skills for agents are a list of
// their own (SKILLS, below), where several can come from the same catalog.

// The text (each group's title and help, each resource's description) lives in
// lib/i18n/<locale>/directory.ts, keyed by group key and URL.
import { readableDomain } from "@/lib/url";
import type { MdSkill } from "@/lib/md-skill-ids";

/** What a skill is about: Discover lists the skills under these, in this order (the system's areas first, then
 *  building an interface and looking it over). Their titles are in lib/i18n/<locale>/ui.ts (discover.skills.topics). */
export const SKILL_TOPICS = ["foundations", "motion", "assets", "voice", "interface", "review"] as const;
export type SkillTopic = (typeof SKILL_TOPICS)[number];

/** Lowercase, without accents, for looking through the directory: "diseño" finds "Diseno" and the other way round */
export const plain = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export interface DirectorySite {
  name: string;
  url: string;
  /** The day it joined the directory (yyyy-mm-dd), for the ones that came after the first batch: Discover shows it as new */
  added?: string;
  /** A skill criterio.md can carry too (an id of MD_SKILLS in lib/md-skills.ts): Discover says so on its row */
  skill?: string;
  /** A skill for agents: the command that installs it (its GitHub owner is its author) */
  install?: string;
  /** A skill for agents: what it is about */
  topic?: SkillTopic;
}

export interface DirectoryGroup {
  key: string;
  items: DirectorySite[];
}

export const DIRECTORY: DirectoryGroup[] = [
  {
    key: "designmd",
    items: [
      { name: "DesignMD.ai", url: "https://designmd.ai", added: "2026-10-08" },
      { name: "Kage", url: "https://kage.design", added: "2026-10-08" },
      { name: "Vibe Prompts", url: "https://vibeprompts.dev", added: "2026-10-08" },
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
      { name: "The Component Gallery", url: "https://component.gallery", added: "2026-10-08" },
      { name: "Pricing Pages", url: "https://pricingpages.design", added: "2026-10-08" },
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
      { name: "shadcn/ui", url: "https://ui.shadcn.com", added: "2026-10-08" },
      { name: "Aceternity UI", url: "https://ui.aceternity.com", added: "2026-10-08" },
      { name: "Magic UI", url: "https://magicui.design", added: "2026-10-08" },
      { name: "Motion Primitives", url: "https://motion-primitives.com", added: "2026-10-08" },
      { name: "Shadcnblocks", url: "https://www.shadcnblocks.com", added: "2026-10-08" },
      { name: "SmoothUI", url: "https://smoothui.dev", added: "2026-10-08" },
      { name: "Uiverse", url: "https://uiverse.io", added: "2026-10-08" },
      { name: "Glass UI (Samasante)", url: "https://glass.samasante.com", added: "2026-10-08" },
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
      { name: "Kinetics (Colorion)", url: "https://kinetics.colorion.co", added: "2026-10-08" },
      { name: "Microkit", url: "https://microkit.co", added: "2026-10-08" },
      { name: "Anime.js", url: "https://animejs.com", added: "2026-10-08" },
      { name: "60fps", url: "https://60fps.design" },
      { name: "Detail", url: "https://detail.design", added: "2026-10-04" },
      { name: "Scrolltide", url: "https://scrolltide.co", added: "2026-10-05" },
      { name: "Prompt Motion", url: "https://prompt-motion.com", added: "2026-10-08" },
      { name: "Animos", url: "https://animos.app" },
      { name: "Motion in Design", url: "https://motionin.design" },
      { name: "Motionsites", url: "https://motionsites.ai" },
      { name: "Liquid Orb Editor", url: "https://lersent001.github.io/orb/" },
    ],
  },
  {
    key: "shaders",
    items: [
      { name: "Three.js", url: "https://threejs.org", added: "2026-10-08" },
      { name: "Shadertoy", url: "https://www.shadertoy.com", added: "2026-10-08" },
      { name: "The Book of Shaders", url: "https://thebookofshaders.com", added: "2026-10-08" },
      { name: "Three.js Journey", url: "https://threejs-journey.com", added: "2026-10-08" },
    ],
  },
  {
    key: "resources",
    items: [
      { name: "Kitbitz", url: "https://kitbitz.art", added: "2026-10-08" },
      { name: "3dicons", url: "https://3dicons.co", added: "2026-10-08" },
      { name: "Design Bookmark", url: "https://designbookmark.com", added: "2026-10-05" },
      { name: "SearchSystem", url: "https://searchsystem.co", added: "2026-10-04" },
      { name: "Logo To Use", url: "https://logotouse.com" },
      { name: "Hano", url: "https://hano.so" },
      { name: "Gradientool", url: "https://gradientool.com" },
      { name: "Colir", url: "https://colir.space", added: "2026-10-08" },
      { name: "Tooooools", url: "https://tooooools.app", added: "2026-10-08" },
      { name: "Ditther", url: "https://ditther.com", added: "2026-10-08" },
      { name: "Pixlo", url: "https://pixlo.me", added: "2026-10-08" },
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
    // Native Mac apps, each one a product and a landing worth looking at (from the "Mac Apps Collection" threads)
    key: "mac",
    items: [
      { name: "Droppy", url: "https://getdroppy.app", added: "2026-10-08" },
      { name: "Wasdy", url: "https://wasdy.app", added: "2026-10-08" },
      { name: "Shhepit", url: "https://shhepit.app", added: "2026-10-08" },
      { name: "Moorline", url: "https://moorline.app", added: "2026-10-08" },
      { name: "Maccelerate", url: "https://maccelerate.app", added: "2026-10-08" },
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
  { name: "frontend-design", topic: "interface", url: "https://ui-skills.com/skills/anthropics/frontend-design", added: "2026-10-05", install: "npx skills add https://github.com/anthropics/skills --skill frontend-design" },
  { name: "emil-design-eng", topic: "interface", url: "https://ui-skills.com/skills/emilkowalski/emil-design-eng", added: "2026-10-05", install: "npx skills add https://github.com/emilkowalski/skills --skill emil-design-eng" },
  { name: "apple-design", topic: "motion", url: "https://ui-skills.com/skills/emilkowalski/apple-design", added: "2026-10-05", install: "npx skills add https://github.com/emilkowalski/skills --skill apple-design" },
  { name: "interaction-design", topic: "motion", url: "https://ui-skills.com/skills/wshobson/interaction-design", added: "2026-10-05", install: "npx skills add https://github.com/wshobson/agents --skill interaction-design" },
  { name: "beautiful-shadows", topic: "foundations", url: "https://ui-skills.com/skills/mengto/beautiful-shadows", added: "2026-10-05", install: "npx skills add https://github.com/MengTo/Skills --skill beautiful-shadows" },
  { name: "adapt", topic: "foundations", url: "https://ui-skills.com/skills/pbakaus/adapt", added: "2026-10-05", install: "npx skills add https://github.com/pbakaus/impeccable --skill adapt" },
  { name: "shadcn", topic: "interface", url: "https://ui-skills.com/skills/shadcn-ui/shadcn", added: "2026-10-05", install: "npx skills add https://github.com/shadcn-ui/ui --skill shadcn" },
  { name: "accessibility", topic: "review", url: "https://ui-skills.com/skills/addyosmani/accessibility", added: "2026-10-05", install: "npx skills add https://github.com/addyosmani/web-quality-skills --skill accessibility", skill: "a11y" },
  { name: "design-review", topic: "review", url: "https://ui-skills.com/skills/superfuture/design-review", added: "2026-10-05", install: "npx skills add https://github.com/Superfuture/design-review --skill design-review" },
  { name: "better-interface", topic: "review", url: "https://ui-skills.com/skills/jakubkrehel/better-interface", added: "2026-10-05", install: "npx skills add https://github.com/jakubkrehel/skills --skill better-interface" },
  { name: "iso-figure", topic: "assets", url: "https://github.com/MrBongoC/ai-iso-skill", added: "2026-10-05", skill: "iso-figure", install: "npx skills add https://github.com/MrBongoC/ai-iso-skill --skill iso-figure" },
  { name: "gsap-skills", topic: "motion", url: "https://github.com/greensock/gsap-skills", added: "2026-10-05", skill: "gsap", install: "npx skills add https://github.com/greensock/gsap-skills" },
  { name: "no-ai-slop", topic: "voice", url: "https://github.com/petergyang/no-ai-slop", added: "2026-10-05", skill: "no-ai-slop", install: "npx skills add https://github.com/petergyang/no-ai-slop --skill no-ai-slop" },
];

/** The skills Discover features: a handful picked by hand, criterio.design's by id and the others by URL */
export const FEATURED_SKILLS: readonly string[] = [
  "gsap", "no-ai-slop", "a11y",
  "https://ui-skills.com/skills/anthropics/frontend-design",
  "https://ui-skills.com/skills/emilkowalski/emil-design-eng",
  "https://ui-skills.com/skills/emilkowalski/apple-design",
];

/** The same for criterio.design's own skills: a new one does not compile until it has its topic */
export const MD_SKILL_TOPIC: Record<MdSkill, SkillTopic> = {
  fonts: "foundations", "color-tokens": "foundations", grid: "foundations", tailwind: "foundations",
  gsap: "motion", transitions: "motion",
  icons: "assets", "logo-svg": "assets", images: "assets", "iso-figure": "assets",
  microcopy: "voice", "no-ai-slop": "voice",
  a11y: "review",
};

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
