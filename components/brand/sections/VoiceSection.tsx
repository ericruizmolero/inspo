"use client";
// How the brand writes: each principle as a line said the way the brand says it, set large, with its name and what
// it means under it; then, for the places words go (a campaign, a spec, an error, a button), what to write and what
// never to write, struck through.
import { useT } from "../../I18nProvider";
import { useBrand } from "../context";
import { AddButton, ItemTools, useSection } from "../BrandPresentation";
import { Editable } from "../edit/Editable";
import { brandId } from "@/types/brand";

export default function VoiceSection() {
  const { t } = useT();
  const { mode, display } = useBrand();
  const [voice, set] = useSection("voice");
  const s = t.brand.voice;
  return (
    <div className="bv">
      {(voice.principles.length > 0 || mode === "edit") && (
        <div className="bv-principles">
          {voice.principles.map((p, i) => (
            <article key={p.id} className="bv-card">
              <div className="bv-card__face"><Editable as="p" className="bv-quote" style={{ fontFamily: display }} value={p.sample} onCommit={(sample) => set({ principles: voice.principles.map((x) => (x.id === p.id ? { ...x, sample } : x)) })} placeholder={s.sample} multiline maxLength={200} /></div>
              <Editable as="h4" className="bv-title" value={p.title} onCommit={(title) => set({ principles: voice.principles.map((x) => (x.id === p.id ? { ...x, title } : x)) })} placeholder={s.title} maxLength={80} />
              <Editable as="p" className="bv-body" value={p.body} onCommit={(body) => set({ principles: voice.principles.map((x) => (x.id === p.id ? { ...x, body } : x)) })} placeholder={s.body} multiline maxLength={300} />
              <ItemTools list={voice.principles} index={i} onChange={(principles) => set({ principles })} />
            </article>
          ))}
          {voice.principles.length < 6 && <AddButton className="bv-addcard" label={s.addPrinciple} onClick={() => set({ principles: [...voice.principles, { id: brandId(), title: "", body: "", sample: "" }] })} />}
        </div>
      )}
      {(voice.pairs.length > 0 || mode === "edit") && (
        <div className="bv-pairs">
          {voice.pairs.map((p, i) => (
            <div key={p.id} className="bv-pair">
              <Editable as="p" className="bv-context" value={p.context} onCommit={(context) => set({ pairs: voice.pairs.map((x) => (x.id === p.id ? { ...x, context } : x)) })} placeholder={s.context} maxLength={60} />
              <div className="bv-do"><span>{s.do}</span><Editable as="p" value={p.do} onCommit={(v) => set({ pairs: voice.pairs.map((x) => (x.id === p.id ? { ...x, do: v } : x)) })} placeholder={s.do} maxLength={200} /></div>
              <div className="bv-dont"><span>{s.dont}</span><Editable as="p" value={p.dont} onCommit={(v) => set({ pairs: voice.pairs.map((x) => (x.id === p.id ? { ...x, dont: v } : x)) })} placeholder={s.dont} maxLength={200} /></div>
              <ItemTools list={voice.pairs} index={i} onChange={(pairs) => set({ pairs })} />
            </div>
          ))}
          {voice.pairs.length < 8 && <AddButton label={s.addPair} onClick={() => set({ pairs: [...voice.pairs, { id: brandId(), context: "", do: "", dont: "" }] })} />}
        </div>
      )}
    </div>
  );
}
