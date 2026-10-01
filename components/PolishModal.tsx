"use client";
// Polish a project's board (step 3 of Curar). First the brief, one question per screen with the
// tabs as its index, the way a client is asked before a project starts; then the games, where a
// model proposes what repeats and what pulls away from the brief and the person decides. Nothing
// here deletes a reference: taking one out means it leaves the project and stays in the library.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { InspoItem, Project, TagMap } from "@/types/inspo";
import { AUDIENCES, BRIEF_TEXT_MAX, EMPTY_POLISH, pendingOf, type Audience, type DupeGroup, type OffTone, type PolishBrief, type PolishState } from "@/types/polish";
import { SECTORS, STYLES } from "@/lib/taxonomy";
import { loadPolish, savePolishBrief, decidePolish } from "@/app/actions/polish";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";
import { cachedCardImage } from "./InspoCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";

const STEPS = ["project", "audience", "tone", "avoid", "seconds", "games"] as const;
type Step = (typeof STEPS)[number];

type Draft = Omit<PolishBrief, "updatedAt" | "updatedBy">;
const EMPTY_DRAFT: Draft = { sector: null, about: "", audience: [], audienceNote: "", tone: [], avoidItems: [], avoid: "", firstSeconds: "" };

interface Props {
  project: Project;
  /** The references in the project, as the grid shows them */
  board: InspoItem[];
  /** The whole library, for the tone examples when the board has none with that look */
  library: InspoItem[];
  tagMap: TagMap;
  imageOf: (item: InspoItem) => string | null;
  /** Takes references out of the project (they stay in the library). Resolves when done. */
  onDiscard: (items: InspoItem[]) => Promise<void>;
  onClose: () => void;
}

function Thumb({ item, image, className = "" }: { item: InspoItem; image: string | null; className?: string }) {
  // What the grid already downloaded; otherwise the og:image (a 204 without one falls back to the initial)
  const [src, setSrc] = useState(() => image ?? cachedCardImage(item.web) ?? `/api/og?url=${encodeURIComponent(item.web)}`);
  const [failed, setFailed] = useState(false);
  useEffect(() => { if (image) { setSrc(image); setFailed(false); } }, [image]);
  return (
    <span className={`pl-thumb ${className}`} aria-hidden>
      {failed ? item.name.slice(0, 1).toUpperCase() : <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />}
    </span>
  );
}

function Counter({ value }: { value: string }) {
  const { t } = useT();
  return <span className="pl-counter">{t.polish.counter(value.length, BRIEF_TEXT_MAX)}</span>;
}

export default function PolishModal({ project, board, library, tagMap, imageOf, onDiscard, onClose }: Props) {
  const { t } = useT();
  const [state, setState] = useState<PolishState | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [dirty, setDirty] = useState(false);
  const [step, setStep] = useState<Step>("project");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [busyIds, setBusyIds] = useState<Set<string>>(() => new Set());

  // The saved brief opens on the games; a project without one starts at the first question
  useEffect(() => {
    let alive = true;
    loadPolish(project.id).then((r) => {
      if (!alive) return;
      if (!r.ok) { setError(r.error); setState(EMPTY_POLISH); return; }
      setState(r.data);
      if (r.data.brief) { const { updatedAt: _a, updatedBy: _b, ...rest } = r.data.brief; setDraft(rest); setStep("games"); }
    });
    return () => { alive = false; };
  }, [project.id]);

  const patch = useCallback((p: Partial<Draft>) => { setDraft((d) => ({ ...d, ...p })); setDirty(true); }, []);
  const toggleIn = (list: string[], key: string, max = Infinity) =>
    list.includes(key) ? list.filter((k) => k !== key) : list.length >= max ? [...list.slice(1), key] : [...list, key];

  const save = useCallback(async (): Promise<PolishState | null> => {
    setSaving(true); setError("");
    const r = await savePolishBrief(project.id, draft).catch((e) => ({ ok: false as const, error: String(e) }));
    setSaving(false);
    if (!r.ok) { setError(r.error); return null; }
    setState(r.data); setDirty(false);
    return r.data;
  }, [project.id, draft]);

  const run = useCallback(async () => {
    setRunning(true); setError("");
    try {
      const res = await fetch("/api/polish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: project.id }) });
      const json = await res.json().catch(() => ({})) as PolishState & { error?: string };
      if (!res.ok || json.error) throw new Error(json.error || t.polish.failed);
      setState(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setRunning(false); }
  }, [project.id, t]);

  const go = async (next: Step) => {
    if (next === "games" && dirty) { if (!(await save())) return; }
    setStep(next);
  };
  const idx = STEPS.indexOf(step);
  const close = () => { if (dirty) void save(); onClose(); };

  // ─── Decisions ───────────────────────────────────────────────────────────
  const byId = useMemo(() => new Map(board.filter((i) => i.id).map((i) => [i.id!, i])), [board]);
  const boardIds = useMemo(() => new Set(byId.keys()), [byId]);
  const pending = useMemo(() => (state ? pendingOf(state, boardIds) : { dupes: [], offTone: [] }), [state, boardIds]);
  const withBusy = async (ids: string[], fn: () => Promise<void>) => {
    setBusyIds((s) => new Set([...s, ...ids]));
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusyIds((s) => { const n = new Set(s); ids.forEach((id) => n.delete(id)); return n; }); }
  };
  const decide = async (d: { notDupes?: string[]; keptTone?: string[] }) => {
    const r = await decidePolish(project.id, d).catch((e) => ({ ok: false as const, error: String(e) }));
    if (!r.ok) throw new Error(r.error);
    setState(r.data);
  };
  const keepOne = (g: DupeGroup, keep: string) => withBusy(g.ids, () => onDiscard(g.ids.filter((id) => id !== keep).map((id) => byId.get(id)!).filter(Boolean)));
  const notDupes = (g: DupeGroup) => withBusy(g.ids, () => decide({ notDupes: g.ids }));
  const takeOut = (o: OffTone) => withBusy([o.id], () => onDiscard([byId.get(o.id)!].filter(Boolean)));
  const keepTone = (o: OffTone) => withBusy([o.id], () => decide({ keptTone: [o.id] }));

  // ─── Tone examples: a reference of the team's with that look, the board first ─
  const exampleFor = useCallback((style: string): InspoItem | null => {
    const pick = (list: InspoItem[]) => list
      .map((i) => ({ i, p: tagMap[i.web]?.style === style ? tagMap[i.web].styleP : 0 }))
      .filter((x) => x.p > 0).sort((a, b) => b.p - a.p)[0]?.i ?? null;
    return pick(board) ?? pick(library);
  }, [board, library, tagMap]);
  const [toneShown, setToneShown] = useState<string>(() => STYLES[0].key);
  useEffect(() => { if (draft.tone[0]) setToneShown(draft.tone[0]); }, [draft.tone]);

  const run0 = state?.run ?? null;
  const stale = !!(run0 && state?.brief && state.brief.updatedAt > run0.at);
  const newSince = run0 ? [...boardIds].filter((id) => !run0.itemIds.includes(id)).length : 0;
  const nothingPending = !pending.dupes.length && !pending.offTone.length;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="modal--polish" aria-busy={!state}>
        <div className="pl-head">
          {idx > 0 && step !== "games" ? (
            <Button variant="icon" aria-label={t.polish.back} onClick={() => setStep(STEPS[idx - 1])}><span className="pl-back">{Icons.arrow}</span></Button>
          ) : <span className="pl-head__spacer" />}
          <DialogTitle className="sr-only">{t.polish.title(project.name)}</DialogTitle>
          <nav className="pl-tabs" aria-label={t.polish.title(project.name)}>
            {STEPS.map((s) => (
              <button key={s} type="button" className={`pl-tab${s === step ? " is-active" : ""}`}
                disabled={!state || (s === "games" && !state.brief && !dirty)}
                aria-current={s === step ? "step" : undefined}
                onClick={() => void go(s)}>{t.polish.tabs[s]}</button>
            ))}
          </nav>
          <DialogClose render={<Button variant="icon" aria-label={t.common.close} />}>{Icons.x}</DialogClose>
        </div>

        <div className={`pl-body${step === "games" ? " pl-body--wide" : ""}`}>
          {!state ? <div className="pl-loading"><span className="spinner" /></div> : <>
            {step === "project" && (
              <section className="pl-step">
                <h2 className="display pl-h">{t.polish.intro}</h2>
                <p className="pl-lead">{t.polish.introHint}</p>
                <div className="field">
                  <span className="field__label">{t.polish.sectorLabel}</span>
                  <div className="pl-cards" role="group" aria-label={t.polish.sectorLabel}>
                    {SECTORS.map((s) => (
                      <button key={s.key} type="button" className={`pl-card${draft.sector === s.key ? " is-on" : ""}`}
                        aria-pressed={draft.sector === s.key}
                        onClick={() => patch({ sector: draft.sector === s.key ? null : s.key })}>
                        {t.taxonomy.sector[s.key as keyof typeof t.taxonomy.sector]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="pl-about">{t.polish.aboutLabel}</label>
                  <textarea id="pl-about" className="input pl-text" rows={4} maxLength={BRIEF_TEXT_MAX} value={draft.about}
                    placeholder={t.polish.aboutPlaceholder} onChange={(e) => patch({ about: e.target.value })} />
                  <Counter value={draft.about} />
                </div>
              </section>
            )}

            {step === "audience" && (
              <section className="pl-step">
                <h2 className="display pl-h">{t.polish.audienceLabel}</h2>
                <div className="pl-chips" role="group" aria-label={t.polish.audienceLabel}>
                  {AUDIENCES.map((a) => (
                    <button key={a} type="button" className={`chip pl-chip${draft.audience.includes(a) ? " is-active" : ""}`}
                      aria-pressed={draft.audience.includes(a)}
                      onClick={() => patch({ audience: toggleIn(draft.audience, a) as Audience[] })}>{t.polish.audiences[a]}</button>
                  ))}
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="pl-audience">{t.polish.audienceNoteLabel}</label>
                  <textarea id="pl-audience" className="input pl-text" rows={3} maxLength={BRIEF_TEXT_MAX} value={draft.audienceNote}
                    placeholder={t.polish.audienceNotePlaceholder} onChange={(e) => patch({ audienceNote: e.target.value })} />
                  <Counter value={draft.audienceNote} />
                </div>
              </section>
            )}

            {step === "tone" && (() => {
              const shown = STYLES.find((s) => s.key === toneShown) ?? STYLES[0];
              const example = exampleFor(shown.key);
              const on = draft.tone.includes(shown.key);
              return (
                <section className="pl-step pl-step--tone">
                  <h2 className="display pl-h">{t.polish.toneLabel}</h2>
                  <p className="pl-lead">{t.polish.toneHint}</p>
                  <div className={`pl-tone__stage${on ? " is-on" : ""}`}>
                    {example ? <Thumb item={example} image={imageOf(example)} className="pl-tone__img" /> : <span className="pl-tone__none">{t.polish.toneNoExample}</span>}
                    <div className="pl-tone__caption">
                      <span className="display pl-tone__name">{t.taxonomy.style[shown.key as keyof typeof t.taxonomy.style]}</span>
                      {example && <span className="pl-tone__from">{t.polish.toneFrom(example.name)}</span>}
                    </div>
                    <Button variant={on ? "default" : "primary"} className="pl-tone__pick" aria-pressed={on}
                      onClick={() => patch({ tone: toggleIn(draft.tone, shown.key, 2) })}>
                      {on ? <>{Icons.check} {t.polish.toneUsed}</> : t.polish.toneUse}
                    </Button>
                  </div>
                  <div className="pl-tone__picker" role="tablist" aria-label={t.polish.toneLabel}>
                    {STYLES.map((s) => {
                      const ex = exampleFor(s.key);
                      const picked = draft.tone.includes(s.key);
                      return (
                        <button key={s.key} type="button" role="tab" aria-selected={s.key === toneShown}
                          className={`pl-tone__dot${s.key === toneShown ? " is-shown" : ""}${picked ? " is-on" : ""}`}
                          title={t.taxonomy.style[s.key as keyof typeof t.taxonomy.style]} onClick={() => setToneShown(s.key)}>
                          {ex ? <Thumb item={ex} image={imageOf(ex)} /> : <span className="pl-thumb">Aa</span>}
                          {picked && <span className="pl-tone__tick">{Icons.check}</span>}
                          <span className="pl-tone__label">{t.taxonomy.style[s.key as keyof typeof t.taxonomy.style]}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })()}

            {step === "avoid" && (
              <section className="pl-step pl-step--wide">
                <h2 className="display pl-h">{t.polish.avoidLabel}</h2>
                <p className="pl-lead">{t.polish.avoidHint}</p>
                <div className="pl-picks" role="group" aria-label={t.polish.avoidLabel}>
                  {board.filter((i) => i.id).map((i) => {
                    const on = draft.avoidItems.includes(i.id!);
                    return (
                      <button key={i.id} type="button" className={`pl-pick${on ? " is-on" : ""}`} aria-pressed={on} title={i.name}
                        onClick={() => patch({ avoidItems: toggleIn(draft.avoidItems, i.id!) })}>
                        <Thumb item={i} image={imageOf(i)} />
                        <span className="pl-pick__name">{i.name}</span>
                        <span className="pl-pick__mark" aria-hidden>{Icons.x}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="pl-avoid">{t.polish.avoidNoteLabel}</label>
                  <textarea id="pl-avoid" className="input pl-text" rows={3} maxLength={BRIEF_TEXT_MAX} value={draft.avoid}
                    placeholder={t.polish.avoidNotePlaceholder} onChange={(e) => patch({ avoid: e.target.value })} />
                  <Counter value={draft.avoid} />
                </div>
              </section>
            )}

            {step === "seconds" && (
              <section className="pl-step">
                <h2 className="display pl-h">{t.polish.secondsLabel}</h2>
                <div className="field">
                  <textarea id="pl-seconds" className="input pl-text" rows={5} maxLength={BRIEF_TEXT_MAX} value={draft.firstSeconds}
                    aria-label={t.polish.secondsLabel} placeholder={t.polish.secondsPlaceholder} onChange={(e) => patch({ firstSeconds: e.target.value })} />
                  <Counter value={draft.firstSeconds} />
                </div>
              </section>
            )}

            {step === "games" && (
              <section className="pl-step pl-step--wide pl-games">
                {running ? (
                  <div className="pl-running" role="status" aria-live="polite"><span className="spinner" /> {t.polish.running}</div>
                ) : !run0 || stale ? (
                  <div className="pl-run">
                    <h2 className="display pl-h">{t.polish.tabs.games}</h2>
                    {stale && <p className="pl-lead">{t.polish.briefChanged}</p>}
                    <p className="pl-lead">{board.length < 2 ? t.polish.tooFew : t.polish.runHint(board.length)}</p>
                    <Button variant="primary" onClick={() => void run()} disabled={board.length < 2}>{Icons.spark} {run0 ? t.polish.rerun : t.polish.run}</Button>
                  </div>
                ) : (
                  <>
                    {pending.dupes.length > 0 && (
                      <div className="pl-game">
                        <h3 className="display pl-game__title">{t.polish.dupesTitle} <span className="pl-game__n">{pending.dupes.length}</span></h3>
                        <p className="pl-lead">{t.polish.dupesHint}</p>
                        {pending.dupes.map((g) => {
                          const busy = g.ids.some((id) => busyIds.has(id));
                          return (
                            <div key={g.ids.join("|")} className={`pl-group${busy ? " is-busy" : ""}`}>
                              <p className="pl-group__reason">{g.reason}</p>
                              <div className="pl-group__refs">
                                {g.ids.map((id) => byId.get(id)).filter((i): i is InspoItem => !!i).map((i) => (
                                  <div key={i.id} className="pl-ref">
                                    <Thumb item={i} image={imageOf(i)} />
                                    <span className="pl-ref__name">{i.name}</span>
                                    <Button size="sm" disabled={busy} onClick={() => void keepOne(g, i.id!)}>{t.polish.keepThis}</Button>
                                  </div>
                                ))}
                              </div>
                              <div className="pl-group__foot">
                                <Button variant="ghost" size="sm" disabled={busy} onClick={() => void notDupes(g)}>{t.polish.notDupes}</Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {pending.offTone.length > 0 && (
                      <div className="pl-game">
                        <h3 className="display pl-game__title">{t.polish.toneTitle} <span className="pl-game__n">{pending.offTone.length}</span></h3>
                        <p className="pl-lead">{t.polish.toneGameHint}</p>
                        <div className="pl-tones">
                          {pending.offTone.map((o) => {
                            const i = byId.get(o.id);
                            if (!i) return null;
                            const busy = busyIds.has(o.id);
                            return (
                              <div key={o.id} className={`pl-group pl-group--row${busy ? " is-busy" : ""}`}>
                                <Thumb item={i} image={imageOf(i)} />
                                <div className="pl-group__main">
                                  <span className="pl-ref__name">{i.name}</span>
                                  <p className="pl-group__reason">{o.reason}</p>
                                </div>
                                <div className="pl-group__actions">
                                  <Button variant="ghost" size="sm" disabled={busy} onClick={() => void keepTone(o)}>{t.polish.keep}</Button>
                                  <Button size="sm" className="is-danger" disabled={busy} onClick={() => void takeOut(o)}>{t.polish.remove}</Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {nothingPending && (
                      <div className="pl-run">
                        <span className="pl-clean__icon" aria-hidden>{Icons.check}</span>
                        <h2 className="display pl-h">{t.polish.clean}</h2>
                        <p className="pl-lead">{t.polish.cleanHint}</p>
                      </div>
                    )}
                    <div className="pl-again">
                      {newSince > 0 && <span className="pl-again__note">{t.polish.newSince(newSince)}</span>}
                      <Button variant="ghost" size="sm" onClick={() => void run()} disabled={board.length < 2}>{t.polish.rerun}</Button>
                    </div>
                  </>
                )}
              </section>
            )}
          </>}
        </div>

        {state && step !== "games" && (
          <div className="pl-foot">
            {error && <p className="modal__error">{error}</p>}
            {state.brief && !dirty && <span className="pl-foot__saved">{t.polish.saved}</span>}
            {step === "seconds" ? (
              <Button variant="primary" disabled={saving} onClick={() => void go("games")}>{saving ? <span className="spinner" /> : null} {t.polish.saveAndPolish}</Button>
            ) : (
              <Button variant="primary" onClick={() => setStep(STEPS[idx + 1])}>{t.polish.continue} {Icons.arrow}</Button>
            )}
          </div>
        )}
        {state && step === "games" && error && <div className="pl-foot"><p className="modal__error">{error}</p></div>}
      </DialogContent>
    </Dialog>
  );
}
