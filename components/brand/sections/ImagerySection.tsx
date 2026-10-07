"use client";
// How the brand's pictures look. The board is already the moodboard; this is what it adds up to: the traits every
// picture shares (light, colour, crop, subjects), a few references that show it best, and what a picture never does.
import { useState } from "react";
import { useT } from "../../I18nProvider";
import { useBrand } from "../context";
import { AddButton, ItemTools, useSection } from "../BrandPresentation";
import { Editable } from "../edit/Editable";
import { FileSlot } from "../edit/FileSlot";
import { brandId } from "@/types/brand";
import { Dialog, DialogWindow } from "@/components/ui/dialog";
import { Button, IconButton } from "@/components/criterio";

const MAX = 9;

/** The board's references to choose the examples from */
function Picker({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const { refs } = useBrand();
  const [img, set] = useSection("imagery");
  const [picked, setPicked] = useState<string[]>(img.itemIds);
  const all = Object.values(refs).filter((r) => r.image);
  const room = MAX - img.files.length;
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogWindow className="bmo-pick modal--lg" bar={t.brand.imagery.examples} heading={t.brand.imagery.pick} closeLabel={t.common.close}
        footer={<>
          <span className="bmo-pick__count">{t.brand.imagery.picked(picked.length, room)}</span>
          <Button variant="primary" onClick={() => { set({ itemIds: picked.slice(0, room) }); onClose(); }}>{t.brand.done}</Button>
        </>}>
          <ul className="bmo-pick__grid">
            {all.map((r) => {
              const on = picked.includes(r.id);
              return (
                <li key={r.id}>
                  <button type="button" className={on ? "is-on" : ""} aria-pressed={on} disabled={!on && picked.length >= room}
                    onClick={() => setPicked((p) => (on ? p.filter((x) => x !== r.id) : [...p, r.id]))}>
                    <img src={r.image!} alt="" loading="lazy" decoding="async" />
                    <span>{r.name}</span>
                    {on && <i aria-hidden>{picked.indexOf(r.id) + 1}</i>}
                  </button>
                </li>
              );
            })}
          </ul>
      </DialogWindow>
    </Dialog>
  );
}

export default function ImagerySection() {
  const { t } = useT();
  const { mode, refs, fileSrc } = useBrand();
  const [img, set] = useSection("imagery");
  const [picking, setPicking] = useState(false);
  const s = t.brand.imagery;
  const pics = [
    ...img.itemIds.map((id) => refs[id]).filter((r) => r?.image).map((r) => ({ key: `r:${r.id}`, src: r.image!, alt: r.name, remove: () => set({ itemIds: img.itemIds.filter((x) => x !== r.id) }) })),
    ...img.files.map((f) => ({ key: `f:${f.key}`, src: fileSrc(f.key), alt: f.name ?? "", remove: () => set({ files: img.files.filter((x) => x.key !== f.key) }) })),
  ].slice(0, MAX);
  return (
    <div className="bim">
      {(img.traits.length > 0 || mode === "edit") && (
        <div className="bim-traits">
          {img.traits.map((tr, i) => (
            <div key={tr.id} className="bim-trait">
              <Editable as="p" className="bim-trait__k" value={tr.label} onCommit={(label) => set({ traits: img.traits.map((x) => (x.id === tr.id ? { ...x, label } : x)) })} placeholder={s.label} maxLength={40} />
              <Editable as="p" className="bim-trait__v" value={tr.value} onCommit={(value) => set({ traits: img.traits.map((x) => (x.id === tr.id ? { ...x, value } : x)) })} placeholder={s.value} multiline maxLength={300} />
              <ItemTools list={img.traits} index={i} onChange={(traits) => set({ traits })} />
            </div>
          ))}
          {img.traits.length < 8 && <AddButton className="bim-add" label={s.addTrait} onClick={() => set({ traits: [...img.traits, { id: brandId(), label: "", value: "" }] })} />}
        </div>
      )}
      {(pics.length > 0 || mode === "edit") && (
        <div className="bim-examples">
          <div className="bim-head">
            <h3 className="t-label brand-k">{s.examples}</h3>
            {mode === "edit" && (
              <span className="bim-head__tools">
                <button type="button" className="btn btn--sm" onClick={() => setPicking(true)}>{s.pick}</button>
                {pics.length < MAX && <FileSlot purpose="image" accept="image/png,image/jpeg,image/webp" has={false} onFile={(f) => set({ files: [...img.files, f].slice(0, MAX) })} className="bmo-upload" />}
              </span>
            )}
          </div>
          {pics.length > 0 ? (
            <div className="bim-grid">
              {pics.map((p) => (
                <figure key={p.key} className="bmo-pic">
                  <img src={p.src} alt={p.alt} loading="lazy" decoding="async" draggable={false} />
                  {mode === "edit" && <IconButton icon="close" variant="strong" size="xs" className="bmo-pic__x" onClick={p.remove} label={t.brand.remove} />}
                </figure>
              ))}
            </div>
          ) : <p className="brand-hint">{s.examplesHint}</p>}
        </div>
      )}
      {(img.avoid.length > 0 || mode === "edit") && (
        <div className="bim-avoid">
          <h3 className="t-label brand-k">{s.avoid}</h3>
          <ul>
            {img.avoid.map((line, i) => (
              <li key={i}>
                <Editable value={line} onCommit={(v) => set({ avoid: v ? img.avoid.map((x, j) => (j === i ? v : x)) : img.avoid.filter((_, j) => j !== i) })} placeholder={s.avoidLine} maxLength={200} />
                <ItemTools list={img.avoid} index={i} onChange={(avoid) => set({ avoid })} />
              </li>
            ))}
          </ul>
          {img.avoid.length < 8 && <AddButton label={s.addAvoid} onClick={() => set({ avoid: [...img.avoid, ""] })} />}
        </div>
      )}
      {picking && <Picker onClose={() => setPicking(false)} />}
    </div>
  );
}
