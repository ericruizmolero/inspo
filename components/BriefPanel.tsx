"use client";
// The project's brief, every field in one place. Order and questions are the table of
// docs/design-system/decisiones/2026-10-10-el-brief-pide-una-frase-y-el-resto-se-rellena-solo.md.
// A long form, so the flat modal with the packed form, like Improve with AI. Each field is saved alone, so only the
// field someone touched leaves `drafted`.
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { A11Y_LEVELS, BRIEF_LIMITS, BRIEF_TEXT_MAX, KEEP_PARTS, PLATFORMS, PRICE_RANGES, isMarketTag, readBrief, type Brief, type DraftField } from "@/types/brief";
import { normalizeWebUrl } from "@/lib/url";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button, Chip, Icon, IconButton, TextArea } from "@/components/criterio";
import { useT } from "./I18nProvider";
import "./BriefPanel.css";

type Editable = Exclude<keyof Brief, "drafted" | "updatedAt" | "updatedBy">;
type KeysOf<V> = { [K in Editable]-?: Brief[K] extends V ? K : never }[Editable];

type Field =
  | { key: KeysOf<string>; kind: "text" | "long"; required?: true }
  | { key: "clientItemId"; kind: "client" }
  | { key: "product"; kind: "product" }
  | { key: "markets" | "traits" | "stack"; kind: "tags"; max: number; len: number; suggest?: readonly string[] }
  | { key: "competitors"; kind: "urls" }
  | { key: "voiceSamples"; kind: "texts" }
  | { key: "platforms" | "keep"; kind: "chips" }
  | { key: "a11y"; kind: "level" }
  | { key: "sector"; kind: "sector" };

const FIELDS: readonly Field[] = [
  { key: "about", kind: "long", required: true },
  { key: "clientItemId", kind: "client" },
  { key: "product", kind: "product" },
  { key: "markets", kind: "tags", max: BRIEF_LIMITS.markets, len: 35, suggest: ["es-ES", "en-GB", "en-US", "fr-FR", "de-DE"] },
  { key: "competitors", kind: "urls" },
  { key: "competitorsNote", kind: "long" },
  { key: "traits", kind: "tags", max: BRIEF_LIMITS.traits, len: BRIEF_LIMITS.word },
  { key: "neverSay", kind: "text" },
  { key: "firstSeconds", kind: "text" },
  { key: "platforms", kind: "chips" },
  { key: "stack", kind: "tags", max: BRIEF_LIMITS.stack, len: BRIEF_LIMITS.word, suggest: ["Tailwind", "Figma", "SwiftUI", "React", "Next.js", "Webflow", "Framer"] },
  { key: "a11y", kind: "level" },
  { key: "keep", kind: "chips" },
  { key: "voiceSamples", kind: "texts" },
  { key: "sector", kind: "sector" },
];
const CHIPS = { platforms: PLATFORMS, keep: KEEP_PARTS } as const;
const DEBOUNCE = 900;
const SINGLE = new Set<Field["kind"]>(["text", "long", "sector"]);

export default function BriefPanel({ brief: stored, client, onSave, onClose }: {
  /** project.brief as stored */
  brief: unknown;
  /** The name of the client's current site, when it is a redesign */
  client: string | null;
  /** Saves one field; the brief as saved, or null when it failed (the caller says why) */
  onSave: (patch: Partial<Brief>) => Promise<Brief | null>;
  onClose: () => void;
}) {
  const { t } = useT();
  const s = t.system.briefPanel;
  const md = t.system.md.brief;
  const [brief, setBrief] = useState<Brief>(() => readBrief(stored) ?? readBrief({})!);
  const [status, setStatus] = useState<"saving" | "saved" | null>(null);
  // One save at a time: saveBrief reads the stored brief and writes it back whole, so two in flight could lose one
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  // The panel's value stays the truth: every control already hands over what readBrief keeps, and a reply taken back
  // would undo a newer save of the same field still in the queue
  const save = <K extends Editable>(key: K, value: Brief[K]) => {
    setBrief((b) => ({ ...b, [key]: value, drafted: b.drafted.filter((d) => d !== key) }));
    setStatus("saving");
    queue.current = queue.current
      .then(() => onSave({ [key]: value } as Partial<Brief>))
      .then((saved) => setStatus(saved ? "saved" : null), () => setStatus(null));
  };

  const field = (f: Field) => {
    switch (f.kind) {
      case "text":
      case "long":
        return <TextBox value={brief[f.key]} long={f.kind === "long"} max={BRIEF_TEXT_MAX}
          required={f.required} onCommit={(v) => save(f.key, v)} />;
      case "client":
        return <p className="brf__client">{client ? <>{t.system.client.redesignOf} <b>{client}</b></> : s.noClient}</p>;
      case "product":
        return (
          <>
            <TextBox label={s.questions.product} value={brief.product.what} max={BRIEF_TEXT_MAX} placeholder={s.productPlaceholder}
              onCommit={(what) => save("product", { ...brief.product, what })} />
            <div className="pills pills--line">
              {PRICE_RANGES.map((p) => (
                <Chip key={p} pressed={brief.product.price === p}
                  onClick={() => save("product", { ...brief.product, price: brief.product.price === p ? null : p })}>{md.prices[p]}</Chip>
              ))}
            </div>
          </>
        );
      case "tags":
        return <Tags label={s.questions[f.key]} values={brief[f.key]} max={f.max} len={f.len} suggest={f.suggest}
          placeholder={f.key === "markets" ? s.marketPlaceholder : s.tagPlaceholder}
          parse={f.key === "markets" ? (v) => (isMarketTag(v) ? v : null) : (v) => v}
          bad={s.badMarket} onChange={(v) => save(f.key, v)} />;
      case "urls":
        return <Tags label={s.questions.competitors} values={brief.competitors} max={BRIEF_LIMITS.competitors} len={BRIEF_LIMITS.url} placeholder={s.urlPlaceholder}
          parse={(v) => { const u = normalizeWebUrl(v); return u && u.length <= BRIEF_LIMITS.url ? u : null; }} show={(u) => u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
          bad={s.badUrl} onChange={(v) => save("competitors", v)} />;
      case "texts":
        return <Samples values={brief.voiceSamples} onChange={(v) => save("voiceSamples", v)} />;
      case "chips": {
        const keys: readonly string[] = CHIPS[f.key];
        const names: Record<string, string> = f.key === "platforms" ? md.platformNames : md.keepNames;
        const on: readonly string[] = brief[f.key];
        return (
          <div className="pills pills--line">
            {keys.map((k) => (
              <Chip key={k} pressed={on.includes(k)}
                onClick={() => save(f.key, keys.filter((x) => (x === k ? !on.includes(k) : on.includes(x))) as Brief[typeof f.key])}>{names[k]}</Chip>
            ))}
          </div>
        );
      }
      case "level":
        return (
          <div className="pills pills--line">
            {/* Nobody chose (null) is AA, so AA shows chosen */}
            {A11Y_LEVELS.map((l) => <Chip key={l} pressed={(brief.a11y ?? "AA") === l} onClick={() => save("a11y", l)}>WCAG {l}</Chip>)}
          </div>
        );
      case "sector":
        return (
          <select className="cr-input" value={brief.sector ?? ""} onChange={(e) => save("sector", e.target.value || null)}>
            <option value="">{s.sectorNone}</option>
            {Object.entries(md.sectors).map(([k, name]) => <option key={k} value={k}>{name}</option>)}
          </select>
        );
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="brf">
        <div className="modal__header">
          <DialogTitle className="t-title-s">{s.title}</DialogTitle>
          <span className="brf__status" role="status">{status && (status === "saving" ? t.doc.saving : t.doc.saved)}</span>
          <DialogClose render={<IconButton icon="close" variant="default" size="s" label={t.common.close} />} />
        </div>
        <div className="modal__body brf__body">
          <DialogDescription className="brf__lead">{s.lead}</DialogDescription>
          {brief.drafted.length > 0 && <p className="brf__hint">{s.draftHint}</p>}
          {FIELDS.map((f) => (
            <Row key={f.key} label={s.questions[f.key]} single={SINGLE.has(f.kind)} draft={brief.drafted.includes(f.key as DraftField) ? s.draft : null}>
              {field(f)}
            </Row>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** A question and its control. One box is a label; chips are a group, where a label would press the first chip */
function Row({ label, single, draft, children }: { label: string; single: boolean; draft: string | null; children: React.ReactNode }) {
  const id = useId();
  const head = <span id={id} className="t-label brf__label">{label}{draft && <small className="brf__draft">{draft}</small>}</span>;
  return single
    ? <label className="brf__row">{head}{children}</label>
    : <div className="brf__row" role="group" aria-labelledby={id}>{head}{children}</div>;
}

/** Saved after a pause in typing, on leaving the box or with ⌘Enter, like the blocks of criterio.md. A required box
 *  left empty saves nothing and says so */
function TextBox({ label, value, long, max, placeholder, required, onCommit }: { label?: string; value: string; long?: boolean; max: number; placeholder?: string; required?: boolean; onCommit: (v: string) => void }) {
  const { t } = useT();
  const [text, setText] = useState(value);
  const sent = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hint = useId();
  const empty = required && !text.trim();
  const flush = (raw: string) => {
    clearTimeout(timer.current);
    const v = raw.trim();
    if (v === sent.current.trim() || (required && !v)) return;
    sent.current = v;
    onCommit(v);
  };
  // The pause and closing the panel mid-pause call the last render's flush, with what the box says then
  const last = useRef(() => {});
  useEffect(() => { last.current = () => flush(text); });
  useEffect(() => () => last.current(), []);
  const props = {
    value: text, maxLength: max, placeholder, "aria-label": label,
    "aria-required": required, "aria-invalid": empty || undefined, "aria-describedby": empty ? hint : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setText(e.target.value); clearTimeout(timer.current); timer.current = setTimeout(() => last.current(), DEBOUNCE);
    },
    onBlur: () => flush(text),
    onKeyDown: (e: KeyboardEvent) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey || !long)) { e.preventDefault(); flush(text); } },
  };
  return (
    <>
      {long ? <TextArea rows={2} {...props} /> : <input className="cr-input" {...props} />}
      {empty && <span id={hint} className="cr-field-hint is-error">{t.system.briefPanel.required}</span>}
    </>
  );
}

/** Words or addresses as chips: typed and added with Enter or a comma, or picked from the suggestions. Leaving the box
 *  keeps the text in it unsaved, so a half word is never added by accident */
function Tags({ label, values, max, len, suggest = [], placeholder, parse, show = (v) => v, bad, onChange }: {
  label: string; values: string[]; max: number; len: number; suggest?: readonly string[]; placeholder: string;
  /** The value as kept, or null when it is not one */
  parse: (raw: string) => string | null;
  show?: (v: string) => string;
  bad: string;
  onChange: (next: string[]) => void;
}) {
  const { t } = useT();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);
  const id = useId();
  const fullId = useId();
  const full = values.length >= max;
  const add = (raw: string) => {
    const v = raw.trim() ? parse(raw.trim()) : "";
    if (v === null) { setError(true); return; }
    setDraft(""); setError(false);
    if (v && !values.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...values, v].slice(0, max));
  };
  const open = suggest.filter((x) => !values.some((v) => v.toLowerCase() === x.toLowerCase()));
  return (
    <>
      {(values.length > 0 || (!full && open.length > 0)) && (
        // Picking a suggestion keeps the cursor in the box
        <div className="pills pills--line" onMouseDown={(e) => e.preventDefault()}>
          {values.map((v) => <Chip key={v} pressed removeLabel={`${t.common.delete} ${show(v)}`} onRemove={() => onChange(values.filter((x) => x !== v))}>{show(v)}</Chip>)}
          {!full && open.map((x) => <Chip key={x} onClick={() => add(x)}><Icon name="plus" size={12} />{x}</Chip>)}
        </div>
      )}
      {/* Read-only when full, not gone: the box that just took the last one keeps the focus */}
      <input className="cr-input" aria-label={label} value={full ? "" : draft} maxLength={len} placeholder={full ? undefined : placeholder} readOnly={full}
        aria-invalid={error || undefined} aria-describedby={full ? fullId : error ? id : undefined}
        onChange={(e) => { setDraft(e.target.value); setError(false); }}
        onKeyDown={(e) => { if (!full && (e.key === "Enter" || e.key === ",")) { e.preventDefault(); add(draft); } }} />
      {full && <p id={fullId} className="brf__hint">{t.system.briefPanel.full(max)}</p>}
      {error && <p id={id} className="cr-field-hint is-error">{bad}</p>}
    </>
  );
}

/** Real copy of the brand, one box per text. An emptied box drops out on save */
function Samples({ values, onChange }: { values: string[]; onChange: (next: string[]) => void }) {
  const { t } = useT();
  const s = t.system.briefPanel;
  const n = useRef(0);
  const [rows, setRows] = useState(() => values.map((text) => ({ id: n.current++, text })));
  const commit = (next: { id: number; text: string }[]) => { setRows(next); onChange(next.map((r) => r.text).filter(Boolean)); };
  return (
    <>
      {rows.map((r) => (
        <div key={r.id} className="brf__sample">
          <TextBox long label={s.questions.voiceSamples} value={r.text} max={BRIEF_TEXT_MAX} placeholder={s.samplePlaceholder}
            onCommit={(text) => commit(rows.map((x) => (x.id === r.id ? { ...x, text } : x)))} />
          <IconButton icon="close" variant="quiet" size="s" label={s.removeSample} onClick={() => commit(rows.filter((x) => x.id !== r.id))} />
        </div>
      ))}
      {rows.length < BRIEF_LIMITS.voiceSamples && (
        <Button variant="quiet" size="s" icon="plus" className="brf__add" onClick={() => setRows((rs) => [...rs, { id: n.current++, text: "" }])}>{s.addSample}</Button>
      )}
    </>
  );
}
