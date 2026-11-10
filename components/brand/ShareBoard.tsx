"use client";
// A project's board shared by link (app/s/[token]): the app's own board, as a deliverable the client or the team
// comments on and chooses from (Eric, 10-11: "que sirva como entregable intermedio e interactivo con cliente"). The
// same masonry and zoom (Grid), the same cards (InspoCard, the way BoardCard draws them) with no editing control, and
// each reference's sheet (ItemPanel) with its conversation (CommentsPanel, words only). Whoever comes in is a guest
// with a name (hooks/use-share-guest.ts): they comment, answer, and choose references with the card's own circle.
// What the team answers in the app comes back here. Every picture comes through the link (lib/share-board.ts).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Grid, { type ShotLevel } from "../Grid";
import InspoCard, { captionFor } from "../InspoCard";
import ItemPanel from "../ItemPanel";
import PageView from "../PageView";
import TextPage from "../TextPage";
import VideoPlayer from "../VideoPlayer";
import CommentsPanel from "../CommentsPanel";
import PersonAvatar from "../PersonAvatar";
import { useT } from "../I18nProvider";
import { Heart } from "@phosphor-icons/react/ssr";
import { useBoardRatios } from "@/hooks/use-board-ratios";
import { useKeptZoom } from "@/hooks/use-kept-zoom";
import { randomGuestName, useShareGuest } from "@/hooks/use-share-guest";
import { guestActivity, guestComment, guestFace, guestPick, guestRename, guestUncomment } from "@/app/actions/share";
import { keyOf } from "@/lib/board";
import { mediaKindOf } from "@/lib/url";
import type { ShareActivity } from "@/lib/share-guests";
import type { DesignIndex, InspoComment, InspoItem, InspoTags, PageShot } from "@/types/inspo";
import "./brand.css";

export interface ShareBoardData {
  items: InspoItem[];
  thumbs: Record<string, string>;
  cards: Record<string, string>;
  shots: Record<string, PageShot>;
  designs: DesignIndex;
  tags: Record<string, InspoTags>;
  texts: Record<string, string>;
  og: string[];
  /** The team's photos by name (a full link only) */
  people: Record<string, string>;
}

/** Room for the bar over the board (the project's name), and at the bottom for the board's end */
const INSETS = { top: 72, left: 0, right: 0, bottom: 24 };
/** With a subtitle under the name, the bar takes one line more */
const INSETS_SUB = { ...INSETS, top: 96 };
/** How often an open link asks for what others wrote, while the tab is in view */
const POLL_MS = 20_000;
const none = () => Promise.resolve();

export default function ShareBoard({ token, name, subtitle, data, activity: first, invited }: {
  token: string; name: string;
  /** A line under the name, if the team wrote one when sharing */
  subtitle: string; data: ShareBoardData; activity: ShareActivity;
  /** The invited person this address belongs to; null: the general address, a guest with a random name */
  invited: { key: string; name: string } | null;
}) {
  const { t, locale } = useT();
  const g = t.brand.share.guest;
  const { items, thumbs, cards, shots, designs, tags, texts } = data;
  const og = useMemo(() => new Set(data.og), [data.og]);
  const { measure, ratioOf } = useBoardRatios(shots, thumbs);
  const [zoom, setZoom] = useKeptZoom();
  const [open, setOpen] = useState<InspoItem | null>(null);
  const [activity, setActivity] = useState(first);
  const { guest, rename } = useShareGuest(invited, () => randomGuestName(g.names, g.colors, g.nameOf));
  const at = open ? items.findIndex((i) => keyOf(i) === keyOf(open)) : -1;

  // What others wrote and chose, again every little while, and as soon as the tab comes back
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") void guestActivity(token).then((r) => { if (r.ok) setActivity(r.data); }); };
    const timer = setInterval(refresh, POLL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [token]);

  const commentsOf = useMemo(() => {
    const map: Record<string, InspoComment[]> = {};
    for (const c of activity.comments) (map[c.itemId] ??= []).push(c);
    return map;
  }, [activity.comments]);
  const picksOf = useMemo(() => {
    const map: Record<string, { key: string; name: string }[]> = {};
    for (const p of activity.picks) (map[p.itemId] ??= []).push(p);
    return map;
  }, [activity.picks]);
  const hasNote = useCallback((item: InspoItem) => mediaKindOf(item.web) !== "text" && (!!item.note.trim() || !!(item.id && commentsOf[item.id]?.length)), [commentsOf]);

  const [error, setError] = useState("");
  const done = useCallback((r: { ok: true; data: ShareActivity } | { ok: false; error: string }) => {
    // The conversation shows its own error under the field
    if (r.ok) { setActivity(r.data); return; }
    throw new Error(r.error);
  }, []);
  const pick = useCallback(async (item: InspoItem) => {
    if (!guest || !item.id) return;
    const r = await guestPick(token, guest.secret, item.id, guest.name);
    if (r.ok) setActivity(r.data); else setError(r.error);
  }, [guest, token]);

  const renderCard = useCallback((item: InspoItem, level: ShotLevel) => {
    const web = item.web;
    const shot = shots[web], thumb = thumbs[web], design = designs[web];
    // As BoardCard draws it: a site shows the top of its page at the size it is seen, unless someone gave it a thumbnail
    const showsPage = !thumb && !!shot;
    const key = level === "thumb" ? "thumbUrl" : level === "tile" ? "tileUrl" : "topUrl";
    const card = level === "full" ? undefined : cards[web];
    const comments = item.id ? commentsOf[item.id] : undefined;
    const picks = item.id ? picksOf[item.id] ?? [] : [];
    const liked = !!guest && picks.some((p) => p.key === guest.key);
    const caption = captionFor(item, comments, data.people[item.addedBy]);
    return (
      <div className="sboard__cell">
        <InspoCard
          item={item}
          text={item.id ? texts[item.id] ?? null : null}
          tags={tags[web]}
          caption={caption}
          // The card draws the note and its thread only with somewhere to open them: here, the reference's sheet.
          // Without a note there is no line (no "add the first note" to a guest)
          onComments={caption ? () => setOpen(item) : undefined}
          commentCount={comments?.length ?? 0}
          spaceName={name}
          manualThumbnail={thumb}
          signedThumbnail={card ?? thumb}
          onUpload={none}
          onRemoveThumbnail={none}
          onOpen={() => setOpen(item)}
          designCover={showsPage ? shot![key] : design?.coverUrl}
          designScroll={design?.scrollUrl}
          readOnly
          // A like, in the card's own row at the bottom left, beside comments, the same strong IconButton s (Eric, 10-11:
          // "si alguien hace hovering en la card desde fuera pueda dar a me gusta en corazón"; the first try, a dark
          // circle up on the right, "no está del todo bien integrado"). The row stays once someone liked it
          goShown={picks.length > 0}
          goExtra={guest && item.id ? (
            <button type="button" className={`cr-iconbtn cr-iconbtn-strong cr-iconbtn-s sboard__like${liked ? " is-filed" : ""}${picks.length ? " has-likes" : ""}`}
              aria-pressed={liked} aria-label={liked ? g.unlike : g.like}
              data-tip={picks.length ? g.likedBy(picks.map((p) => (p.key === guest.key ? t.comments.you : p.name)).join(", ")) : g.like}
              onClick={(e) => { e.stopPropagation(); void pick(item); }}>
              <Heart size={16} weight={liked ? "fill" : "regular"} aria-hidden />
              {picks.length > 0 && <span>{picks.length}</span>}
            </button>
          ) : undefined}
          ogSrc={item.id && og.has(item.id) ? `/s/${token}/og?id=${encodeURIComponent(item.id)}` : undefined}
          board={{
            ratio: ratioOf(item),
            color: showsPage ? shot!.color : undefined,
            alternates: showsPage ? [shot!.tileUrl, shot!.thumbUrl, shot!.topUrl] : [card, thumb],
            thumb: card,
            onMeasure: showsPage ? undefined : (r) => measure(web, r),
          }}
        />
      </div>
    );
  }, [shots, thumbs, designs, cards, tags, texts, og, token, name, ratioOf, measure, commentsOf, picksOf, guest, pick, g, t, data.people]);

  const head = (
    <header className={`share-head${items.length ? " share-head--over" : ""}${subtitle ? " has-sub" : ""}`}>
      <hgroup className="share-head__title">
        <h1 className="share-head__name">{name}</h1>
        {subtitle && <p className="share-head__sub">{subtitle}</p>}
      </hgroup>
      <span className="share-head__end">
        {guest && <GuestName guest={guest} face={activity.faces[guest.key] ?? null} onRename={async (next) => {
          rename(next);
          const r = await guestRename(token, guest.secret, next);
          if (r.ok) setActivity(r.data.activity);
        }} onFace={async (image) => {
          const r = await guestFace(token, guest.secret, image);
          if (r.ok) setActivity(r.data); else setError(r.error);
        }} />}
      </span>
    </header>
  );

  if (!items.length) return <main className="share share--board">{head}<p className="sboard__empty">{t.brand.share.boardEmpty}</p></main>;
  return (
    <main className="share share--board">
      {head}
      <Grid items={items} ratioOf={ratioOf} hasNote={hasNote} insets={subtitle ? INSETS_SUB : INSETS} zoom={zoom} onZoom={setZoom}
        fitKey="share" focusKey={open ? keyOf(open) : null} renderCard={renderCard} />
      {open && (
        <ItemPanel
          item={open}
          isSite={mediaKindOf(open.web) === "web"}
          page={<SharedPage item={open} shot={shots[open.web]} thumb={thumbs[open.web]} text={open.id ? texts[open.id] : undefined}
            poster={open.id && og.has(open.id) ? `/s/${token}/og?id=${encodeURIComponent(open.id)}` : undefined} />}
          thread={open.id && guest ? (
            <CommentsPanel
              key={open.id}
              item={open}
              comments={commentsOf[open.id] ?? []}
              user={{ id: guest.key, name: guest.name, email: "", image: activity.faces[guest.key] ?? null, language: locale }}
              canManage={false}
              memberImages={data.people}
              image={null}
              showMedia={false}
              noFiles
              emptyLine={g.emptyLine}
              onPost={async (body) => done(await guestComment(token, guest.secret, { itemId: open.id!, body, name: guest.name }))}
              onReply={async (parentId, body) => done(await guestComment(token, guest.secret, { itemId: open.id!, body, parentId, name: guest.name }))}
              onDelete={async (id) => done(await guestUncomment(token, guest.secret, id))}
            />
          ) : null}
          onClose={() => setOpen(null)}
          onPrev={at > 0 ? () => setOpen(items[at - 1]) : undefined}
          onNext={at >= 0 && at < items.length - 1 ? () => setOpen(items[at + 1]) : undefined}
          libraryName={name}
        />
      )}
      {error && <p className="sboard__error" role="alert">{error}</p>}
    </main>
  );
}

/** A photo from the guest's device, made small enough to keep as text: a 160 px square, WebP (JPEG where WebP is not made) */
async function facePhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 160;
  canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 160, 160);
  bitmap.close();
  const webp = canvas.toDataURL("image/webp", 0.8);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.8);
}

/** Who you are on the link: your avatar, which you press to put your photo on it, and your name, which you press to
 *  write another (Eric, 10-11: "que si quieren que suban su foto") */
function GuestName({ guest, face, onRename, onFace }: { guest: { name: string }; face: string | null; onRename: (name: string) => Promise<void>; onFace: (image: string | null) => Promise<void> }) {
  const { t } = useT();
  const g = t.brand.share.guest;
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const save = () => {
    const next = (draft ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
    setDraft(null);
    if (next && next !== guest.name) void onRename(next);
  };
  return (
    <span className="sboard__me">
      <button type="button" className="sboard__face" aria-label={face ? g.changePhoto : g.addPhoto} data-tip={face ? g.changePhoto : g.addPhoto}
        aria-busy={busy || undefined} onClick={() => file.current?.click()}>
        <PersonAvatar name={guest.name} image={face} size={28} />
      </button>
      <input ref={file} type="file" accept="image/*" hidden onChange={async (e) => {
        const f = e.currentTarget.files?.[0];
        e.currentTarget.value = "";
        if (!f) return;
        setBusy(true);
        try { await onFace(await facePhoto(f)); } catch { /* the error line says it */ } finally { setBusy(false); }
      }} />
      {draft === null ? (
        <button type="button" className="sboard__name" data-tip={g.rename} onClick={() => { setDraft(guest.name); requestAnimationFrame(() => input.current?.select()); }}>
          {g.you(guest.name)}
        </button>
      ) : (
        <input ref={input} className="sboard__name sboard__name--edit" value={draft} maxLength={40} aria-label={g.nameLabel} autoFocus
          onChange={(e) => setDraft(e.currentTarget.value)} onBlur={save}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); save(); } if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setDraft(null); } }} />
      )}
    </span>
  );
}

/** A reference's page in its sheet, as the app shows it (components/RefPage.tsx), read only and through the link */
function SharedPage({ item, shot, thumb, text, poster }: { item: InspoItem; shot?: PageShot; thumb?: string; text?: string; poster?: string }) {
  const kind = mediaKindOf(item.web);
  if (kind === "video") return <div className="ip-media"><VideoPlayer web={item.web} title={item.name} /></div>;
  if (kind === "text") return <TextPage key={item.id} title={item.name} body={text} />;
  const src = kind === "image" ? item.web : shot?.shotUrl || thumb || null;
  return <PageView key={item.web} src={src} alt={item.name} fit={kind === "image"}
    posters={kind === "image" ? undefined : [poster, shot?.tileUrl, thumb].filter((x): x is string => !!x)} />;
}
