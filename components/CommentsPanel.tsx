"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { InspoItem, InspoComment } from "@/types/inspo";
import type { SessionUser } from "@/lib/workspace-core";

// Panel lateral de comentarios de un inspo, al estilo del hilo de un pin de Figma:
// la nota original de quien lo guardó abre el hilo y cualquier miembro responde debajo.

interface CommentsPanelProps {
  item: InspoItem;
  comments: InspoComment[];
  user: SessionUser;
  canManage: boolean;
  /** Avatares de los miembros por nombre (para la nota original, que no tiene autorId) */
  memberImages: Record<string, string>;
  /** Nombres de los miembros del workspace (para el vacío: quién verá el comentario) */
  memberNames?: string[];
  /** Miniatura del inspo para dar contexto arriba del hilo */
  image?: string | null;
  onPost: (body: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

const IcX = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 3l8 8M11 3l-8 8" /></svg>
);
const IcSend = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 7h10M8 3l4 4-4 4" /></svg>
);
const IcTrash = (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 4h9M5.5 4V2.5h3V4M4 4l.6 8h4.8L10 4" /></svg>
);
const IcArrow = (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l6-6M4 3h5v5" /></svg>
);

// Color estable por nombre para diferenciar a cada persona de un vistazo
const HUES = [212, 28, 152, 268, 88, 340, 190, 48];
export function hueFor(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
}

export function Avatar({ name, image, size = 26 }: { name: string; image?: string | null; size?: number }) {
  const hue = hueFor(name);
  return (
    <span
      className="cm-avatar"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42), background: image ? undefined : `hsl(${hue} 32% 26%)`, color: `hsl(${hue} 70% 82%)` }}
      aria-hidden
    >
      {image ? <img src={image} alt="" /> : name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function relTime(iso: string, now: number): string {
  const t = Date.parse(iso);
  if (isNaN(t)) return iso;
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 45) return "ahora";
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return "ayer";
  if (d < 7) return `hace ${d} días`;
  return new Date(t).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: d > 300 ? "numeric" : undefined });
}

function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

function esDateToIso(es: string): string {
  const m = es.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}T12:00:00` : es;
}

interface Msg {
  id: string;
  name: string;
  image: string | null;
  body: string;
  at: string;
  mine: boolean;
  /** true para la nota original y el subcomentario del item */
  original?: boolean;
  deletable?: boolean;
}

const PROMPTS = ["Me gusta el hero", "Ojo a la tipografía", "¿Lo usamos de referencia?", "El scroll es muy fino"];

export default function CommentsPanel({ item, comments, user, canManage, memberImages, memberNames = [], image, onPost, onDelete, onClose }: CommentsPanelProps) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => { document.removeEventListener("keydown", onKey); clearInterval(t); };
  }, [onClose]);

  useEffect(() => { textareaRef.current?.focus(); }, [item.id]);

  const msgs = useMemo<Msg[]>(() => {
    const out: Msg[] = [];
    const author = item.puestoPor || "Sin autor";
    const mine = author === user.name;
    if (item.comentarios) {
      out.push({ id: "nota", name: author, image: memberImages[author] ?? null, body: item.comentarios, at: esDateToIso(item.fecha), mine, original: true });
    }
    if (item.subcomentarios) {
      out.push({ id: "sub", name: author, image: memberImages[author] ?? null, body: item.subcomentarios, at: esDateToIso(item.fecha), mine, original: true });
    }
    for (const c of comments) {
      const own = c.authorId === user.id;
      out.push({ id: c.id, name: c.authorName, image: c.authorImage, body: c.body, at: c.createdAt, mine: own, deletable: own || canManage });
    }
    return out;
  }, [item, comments, user, canManage, memberImages]);

  // Al abrir o al llegar un mensaje nuevo, bajar al final del hilo
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length, item.id]);

  const submit = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true); setError(null);
    try {
      await onPost(body);
      setDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar");
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const others = memberNames.filter((n) => n && n !== user.name);
  // Filas fantasma con los avatares reales del equipo (tú incluido)
  const ghosts = [user.name || user.email, ...others].slice(0, 3).map((n, i) => ({
    name: n, image: n === user.name ? user.image ?? null : memberImages[n] ?? null,
    w1: ["72%", "58%", "80%"][i], w2: ["40%", "66%", "34%"][i],
  }));

  const domain = (() => { try { return new URL(item.web).hostname.replace(/^www\./, ""); } catch { return ""; } })();
  const replies = comments.length;

  return (
    <>
      <div className="cm-backdrop" onClick={onClose} />
      <aside className="cm-panel" role="dialog" aria-label={`Comentarios de ${item.empresa}`}>
        <header className="cm-panel__head">
          <div className="cm-panel__title">
            <span className="display">{item.empresa}</span>
            <a className="cm-panel__link" href={item.web} target="_blank" rel="noopener noreferrer">{domain}{IcArrow}</a>
          </div>
          <span className="cm-panel__count">{replies === 0 ? "Sin respuestas" : replies === 1 ? "1 respuesta" : `${replies} respuestas`}</span>
          <button className="btn-icon" onClick={onClose} aria-label="Cerrar">{IcX}</button>
        </header>

        <div ref={listRef} className="cm-list">
          {image && (
            <a className="cm-shot" href={item.web} target="_blank" rel="noopener noreferrer" title="Abrir la web">
              <img src={image} alt="" loading="lazy" />
            </a>
          )}
          {msgs.length === 0 && (
            <div className="cm-empty">
              <div className="cm-empty__ghosts" aria-hidden>
                {ghosts.map((g, i) => (
                  <div key={i} className="cm-empty__ghost" style={{ animationDelay: `${i * 90}ms` }}>
                    <Avatar name={g.name} image={g.image} size={22} />
                    <span className="cm-empty__bars">
                      <span style={{ width: g.w1 }} />
                      <span style={{ width: g.w2 }} />
                    </span>
                  </div>
                ))}
              </div>
              <span className="display cm-empty__title">Todavía no hay conversación</span>
              <span className="cm-empty__text">
                {others.length === 0
                  ? "Apunta qué te ha gustado y por qué. Queda guardado con la web."
                  : `Di qué te ha gustado de esta web. ${listNames(others)} lo ${others.length > 1 ? "verán" : "verá"} aquí.`}
              </span>
              <div className="cm-empty__prompts">
                {PROMPTS.map((p) => (
                  <button key={p} type="button" className="chip" onClick={() => { setDraft(p + " "); textareaRef.current?.focus(); }}>{p}</button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => {
            const prev = msgs[i - 1];
            const grouped = prev && prev.name === m.name && prev.original === m.original && Math.abs(Date.parse(prev.at) - Date.parse(m.at)) < 5 * 60000;
            return (
              <div key={m.id} className={`cm-msg${m.mine ? " is-mine" : ""}${m.original ? " is-original" : ""}${grouped ? " is-grouped" : ""}`}>
                {!grouped && (
                  <div className="cm-msg__head">
                    <Avatar name={m.name} image={m.image} />
                    <span className="cm-msg__name">{m.name}{m.mine && <span className="cm-msg__you">tú</span>}</span>
                    {m.original && <span className="cm-msg__tag">{m.id === "sub" ? "subcomentario" : "nota original"}</span>}
                    <span className="cm-msg__time" title={new Date(m.at).toLocaleString("es-ES")}>{relTime(m.at, now)}</span>
                  </div>
                )}
                <div className="cm-msg__row">
                  <p className="cm-msg__body">{m.body}</p>
                  {m.deletable && (
                    <button className="cm-msg__del" title="Borrar comentario" onClick={() => onDelete(m.id)}>{IcTrash}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <form className="cm-composer" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <Avatar name={user.name || user.email} image={user.image} />
          <div className="cm-composer__box">
            <textarea
              ref={textareaRef}
              className="input cm-composer__input"
              rows={2}
              value={draft}
              placeholder={replies === 0 && !item.comentarios ? "Escribe el primer comentario…" : "Responder…"}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); submit(); } }}
            />
            <div className="cm-composer__foot">
              {error ? <span className="cm-composer__error">{error}</span> : <span className="cm-composer__hint">⌘↩ para enviar</span>}
              <button type="submit" className="btn btn--primary btn--sm" disabled={!draft.trim() || sending}>
                {sending ? <span className="spinner spinner--sm" /> : <>Enviar {IcSend}</>}
              </button>
            </div>
          </div>
        </form>
      </aside>
    </>
  );
}
