// Directory of sites to look for inspiration. Shown from the sidebar
// ("Looking for inspiration?"). No duplicates: each domain appears only once.

// The text (each group's title and help, each resource's description) lives in
// lib/i18n/<locale>/directory.ts, keyed by group key and URL.
export interface DirectorySite {
  name: string;
  url: string;
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
      { name: "Originkit", url: "https://www.originkit.dev" },
      { name: "Bencho", url: "https://bencho.dev" },
      { name: "ObsidianUI", url: "https://obsidianui.dev" },
      { name: "UI by Halaska", url: "https://ui.halaska.com" },
      { name: "21st.dev", url: "https://21st.dev" },
      { name: "Beautiful UI", url: "https://beautifului.dev" },
      { name: "vgpu", url: "https://vgpu.sh/examples/holographic-card" },
    ],
  },
  {
    key: "motion",
    items: [
      { name: "60fps", url: "https://60fps.design" },
      { name: "Animos", url: "https://animos.app" },
      { name: "Motion in Design", url: "https://motionin.design" },
      { name: "Motionsites", url: "https://motionsites.ai" },
      { name: "Liquid Orb Editor", url: "https://lersent001.github.io/orb/" },
    ],
  },
  {
    key: "resources",
    items: [
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

export const DIRECTORY_TOTAL = DIRECTORY.reduce((n, g) => n + g.items.length, 0);

// File name of the static thumbnail (public/directory/<slug>.jpg),
// generated with `npx tsx scripts/directory-shots.ts`.
export function siteSlug(url: string): string {
  return siteHost(url).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}

export function siteShot(url: string): string {
  return `/directory/${siteSlug(url)}.jpg`;
}

export function siteHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
