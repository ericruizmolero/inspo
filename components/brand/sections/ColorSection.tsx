"use client";
// The palette as a mosaic: the more of the brand a colour covers, the bigger its tile. Each tile carries its name
// and its codes (HEX, HSL, RGB, CMYK); a click copies the hex on a share and opens the colour in the app.
import { useState } from "react";
import { useT } from "../../I18nProvider";
import { useBrand } from "../context";
import { useSection } from "../BrandPresentation";
import { colorCodes, inkOn } from "@/lib/brand-values";
import { COLOR_GROUPS, HEX_RE, brandId, type BrandColor } from "@/types/brand";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowDown, ArrowUp } from "lucide-react";
import { IconButton, SegmentedControl } from "@/components/criterio";

function Codes({ hex }: { hex: string }) {
  const c = colorCodes(hex);
  return (
    <dl className="bc-codes">
      <dd>{c.hex}</dd>
      <dd>HSL: {c.hsl}</dd>
      <dd>RGB: {c.rgb}</dd>
      <dd>CMYK: {c.cmyk}</dd>
    </dl>
  );
}

function ColorForm({ color, isAccent, onChange, onRemove, onAccent, onMove, first, last }: {
  color: BrandColor; isAccent: boolean; onChange: (c: BrandColor) => void; onRemove: () => void; onAccent: () => void; onMove: (d: -1 | 1) => void; first: boolean; last: boolean;
}) {
  const { t } = useT();
  const s = t.brand.color;
  const [hex, setHex] = useState(color.hex);
  const commitHex = (v: string) => { const h = v.startsWith("#") ? v : `#${v}`; if (HEX_RE.test(h)) onChange({ ...color, hex: h.toUpperCase() }); else setHex(color.hex); };
  return (
    <div className="bc-form">
      <label><span>{s.name}</span><input className="input" defaultValue={color.name} maxLength={40} onBlur={(e) => { const v = e.currentTarget.value.trim(); if (v && v !== color.name) onChange({ ...color, name: v }); }} /></label>
      <label><span>{s.hex}</span>
        <span className="bc-form__hex">
          <input type="color" value={hex.toLowerCase()} onChange={(e) => setHex(e.currentTarget.value.toUpperCase())} onBlur={(e) => commitHex(e.currentTarget.value)} aria-label={s.hex} />
          <input className="input" value={hex} maxLength={7} spellCheck={false} onChange={(e) => setHex(e.currentTarget.value.toUpperCase())} onBlur={(e) => commitHex(e.currentTarget.value)} onKeyDown={(e) => { if (e.key === "Enter") commitHex(e.currentTarget.value); }} />
        </span>
      </label>
      <label><span>{s.role}</span><textarea className="input" rows={2} defaultValue={color.role} maxLength={200} onBlur={(e) => { const v = e.currentTarget.value.trim(); if (v !== color.role) onChange({ ...color, role: v }); }} /></label>
      <div className="bc-form__row">
        <label><span>{s.group}</span>
          <select className="input" value={color.group} onChange={(e) => onChange({ ...color, group: e.currentTarget.value as BrandColor["group"] })}>
            {COLOR_GROUPS.map((g) => <option key={g} value={g}>{s.groups[g]}</option>)}
          </select>
        </label>
        <div className="bc-form__size"><span aria-hidden>{s.size}</span>
          {/* How much of the brand it covers: a SegmentedControl as a choice (radios), each a square of its size */}
          <SegmentedControl choice tone="paper" label={s.size} className="bc-form__weights" active={color.weight - 1} onChange={(i) => onChange({ ...color, weight: i + 1 })}
            items={[1, 2, 3, 4].map((w) => ({ label: <><i aria-hidden style={{ width: 4 + w * 3, height: 4 + w * 3 }} /><span className="cr-visually-hidden">{w}</span></> }))} />
        </div>
      </div>
      <div className="bc-form__foot">
        <button type="button" className={`btn btn--quiet btn--sm bc-form__accent${isAccent ? " is-on" : ""}`} onClick={onAccent} disabled={isAccent} data-tip={s.isAccent}>{isAccent ? s.accent : s.makeAccent}</button>
        <span>
          {!first && <IconButton icon={<ArrowUp size={14} aria-hidden />} variant="quiet" size="xs" onClick={() => onMove(-1)} label={t.brand.moveUp} />}
          {!last && <IconButton icon={<ArrowDown size={14} aria-hidden />} variant="quiet" size="xs" onClick={() => onMove(1)} label={t.brand.moveDown} />}
          <button type="button" className="btn btn--quiet btn--sm is-danger" onClick={onRemove}>{t.brand.remove}</button>
        </span>
      </div>
    </div>
  );
}

function Tile({ c, i, list }: { c: BrandColor; i: number; list: BrandColor[] }) {
  const { t } = useT();
  const { mode, accent } = useBrand();
  const [color, set] = useSection("color");
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const ink = inkOn(c.hex);
  const isAccent = color.accentId === c.id;
  const replace = (items: BrandColor[]) => set({ items });
  const inner = (
    <>
      <span className="bc-name">{c.name}{isAccent && <i className="bc-dot" style={{ background: ink }} data-tip={t.brand.color.isAccent} aria-label={t.brand.color.isAccent} />}</span>
      {c.role && <span className="bc-role">{c.role}</span>}
      <Codes hex={c.hex} />
      {copied && <span className="bc-copied">{t.brand.color.copied}</span>}
    </>
  );
  const style = { background: c.hex, color: ink, ["--w" as string]: c.weight, ["--accent" as string]: accent };
  if (mode !== "edit") {
    return (
      <button type="button" className={`bc-tile bc-tile--w${c.weight}`} style={style} data-tip={t.brand.color.copy}
        onClick={() => { void navigator.clipboard?.writeText(c.hex).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200); }); }}>
        {inner}
      </button>
    );
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={`bc-tile bc-tile--w${c.weight}`} style={style}>{inner}</PopoverTrigger>
      <PopoverContent className="be-pop" align="start">
        <ColorForm key={c.id + c.hex} color={c} isAccent={isAccent} first={i === 0} last={i === list.length - 1}
          onChange={(next) => replace(list.map((x) => (x.id === c.id ? next : x)))}
          onRemove={() => { setOpen(false); set({ items: list.filter((x) => x.id !== c.id), accentId: isAccent ? null : color.accentId }); }}
          onAccent={() => set({ accentId: c.id })}
          onMove={(d) => { const n = [...list]; const j = i + d; [n[i], n[j]] = [n[j], n[i]]; replace(n); }} />
      </PopoverContent>
    </Popover>
  );
}

export default function ColorSection() {
  const { t } = useT();
  const { mode } = useBrand();
  const [color, set] = useSection("color");
  const items = color.items;
  return (
    <div className="bc">
      <div className="bc-mosaic">
        {items.map((c, i) => <Tile key={c.id} c={c} i={i} list={items} />)}
        {mode === "edit" && (
          <button type="button" className="bc-tile bc-tile--add" onClick={() => set({ items: [...items, { id: brandId(), name: t.brand.color.name, hex: "#8A8F98", role: "", group: "neutral", weight: 1 }] })}>
            <span aria-hidden>+</span> {t.brand.color.add}
          </button>
        )}
      </div>
      {mode === "edit" && !items.length && <p className="brand-hint">{t.brand.emptyHint}</p>}
    </div>
  );
}
