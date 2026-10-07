"use client";
// The system in the world. First its building blocks, the two areas that have no section of their own: the layout
// (its decision, the radii and spacing it names) and the icons. Then six mockups drawn live from the tokens.
import { useMemo, useState } from "react";
import { useT } from "../../I18nProvider";
import { useBrand } from "../context";
import { useSection } from "../BrandPresentation";
import { Editable } from "../edit/Editable";
import { FileSlot } from "../edit/FileSlot";
import { luminance } from "@/lib/brand-values";
import { BrowserTab, IGPost, IGStory, IPhoneHome, MacDock, XProfile, type MockBrand } from "../mockups/Mockups";

function Blocks() {
  const { t } = useT();
  const { areas } = useBrand();
  const layout = areas.find((a) => a.area === "layout");
  const icons = areas.find((a) => a.area === "iconography");
  if (!layout?.decision && !icons?.decision) return null;
  // The radii a decision names, drawn: "8px cards, 999px buttons"
  const radii = [...new Set((layout?.decision ?? "").match(/\b\d{1,3}px\b/g) ?? [])].map((v) => parseInt(v)).filter((v) => v > 0 && v <= 48).slice(0, 4);
  return (
    <div className="ba-blocks">
      <h3 className="t-label brand-k">{t.brand.apps.blocks}</h3>
      <div className="ba-blocks__grid">
        {layout?.decision && (
          <div className="ba-block">
            <span className="ba-block__k">{t.brand.apps.layout}</span>
            {radii.length > 0 && <div className="ba-radii">{radii.map((r) => <i key={r} style={{ borderRadius: r }}><small>{r}px</small></i>)}</div>}
            <p>{layout.decision}</p>
          </div>
        )}
        {icons?.decision && (
          <div className="ba-block">
            <span className="ba-block__k">{t.brand.apps.iconography}</span>
            <p>{icons.decision}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApplicationsSection() {
  const { t } = useT();
  const { spec, name, mode, refs, fileSrc, accent, display, text } = useBrand();
  const [apps, set] = useSection("applications");
  const [editing, setEditing] = useState(false);
  const s = t.brand.apps;
  const b: MockBrand = useMemo(() => {
    const items = spec.color.items;
    const neutrals = items.filter((c) => c.group === "neutral").sort((x, y) => luminance(x.hex) - luminance(y.hex));
    const ink = neutrals[0]?.hex ?? "#101216";
    const paper = neutrals[neutrals.length - 1]?.hex ?? "#F4F5F6";
    const brand = items.find((c) => c.group === "brand")?.hex ?? accent;
    const logo = spec.logo;
    const file = (f: { key: string } | null) => (f ? fileSrc(f.key) : null);
    // Only a real picture goes behind words: an upload, or a reference that is an image. A site's screenshot never does
    const picture = (id: string | null) => { const r = id ? refs[id] : null; return r?.image && r.kind === "image" ? r.image : null; };
    const firstPicture = spec.imagery.files[0] ? fileSrc(spec.imagery.files[0].key) : spec.imagery.itemIds.map(picture).find(Boolean) ?? null;
    return {
      name, handle: apps.handle, domain: apps.domain, tagline: apps.tagline, bio: apps.bio, postLine: apps.postLine || spec.intro.headline,
      mark: file(logo.mark.light) ?? file(logo.primary.light), markOnDark: file(logo.mark.dark) ?? file(logo.primary.dark),
      hero: (apps.heroFile ? fileSrc(apps.heroFile.key) : null) ?? picture(apps.heroItemId) ?? firstPicture,
      paper, ink, accent, brand, display, text,
      labels: { follow: s.follow, followers: s.followers, following: s.following, likes: s.likes },
    };
  }, [spec, apps, name, refs, fileSrc, accent, display, text, s]);
  const field = (k: "handle" | "domain" | "tagline" | "bio" | "postLine", label: string, max: number) => (
    <label className="ba-field"><span>{label}</span><Editable value={apps[k]} onCommit={(v) => set({ [k]: v })} placeholder={label} maxLength={max} /></label>
  );
  return (
    <div className="ba">
      <Blocks />
      <div className="ba-head">
        <h3 className="t-label brand-k">{s.inUse}</h3>
        {mode === "edit" && <button type="button" className="cr-btn cr-btn-quiet cr-btn-s ba-edit" onClick={() => setEditing((e) => !e)} aria-expanded={editing}>{editing ? t.brand.done : `${s.handle}, ${s.domain.toLowerCase()}, ${s.postLine.toLowerCase()}`}</button>}
      </div>
      {mode === "edit" && editing && (
        <div className="ba-fields">
          {field("handle", s.handle, 30)}{field("domain", s.domain, 80)}{field("tagline", s.tagline, 120)}{field("bio", s.bio, 200)}{field("postLine", s.postLine, 120)}
          <div className="ba-field"><span>{s.hero}</span>
            <FileSlot purpose="image" accept="image/png,image/jpeg,image/webp" has={!!apps.heroFile} onFile={(heroFile) => set({ heroFile })} onClear={() => set({ heroFile: null })}>
              {apps.heroFile && <img className="ba-hero" src={fileSrc(apps.heroFile.key)} alt="" />}
            </FileSlot>
          </div>
        </div>
      )}
      <div className="ba-grid">
        {([["xProfile", <XProfile key="x" b={b} />], ["story", <IGStory key="s" b={b} />], ["post", <IGPost key="p" b={b} />], ["tab", <BrowserTab key="t" b={b} />], ["dock", <MacDock key="d" b={b} />], ["home", <IPhoneHome key="h" b={b} />]] as const).map(([k, node]) => (
          <figure key={k} className={`ba-mock ba-mock--${k}`}>
            <div className="ba-mock__stage">{node}</div>
            <figcaption>{s[k]}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
