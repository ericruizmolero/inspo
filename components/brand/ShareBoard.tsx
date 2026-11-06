"use client";
// A project's board shared by link (app/s/[token]): the app's own board, read only (Eric, 06-11: "el tablero se tiene
// que ver igual con todas sus características y todo igual que en la app", "solo que es modo preview que no puedes
// editar nada"). The same masonry and zoom (Grid), the same cards (InspoCard, the way BoardCard draws them) with no
// editing control, and each reference's sheet (ItemPanel) without its conversation tools. Every picture comes
// through the link (lib/share-board.ts); nothing here needs a session.
import { useCallback, useMemo, useState } from "react";
import Grid, { type ShotLevel } from "../Grid";
import InspoCard, { captionFor } from "../InspoCard";
import ItemPanel from "../ItemPanel";
import PageView from "../PageView";
import TextPage from "../TextPage";
import VideoPlayer from "../VideoPlayer";
import PersonAvatar from "../PersonAvatar";
import { useT } from "../I18nProvider";
import { useBoardRatios } from "@/hooks/use-board-ratios";
import { useKeptZoom } from "@/hooks/use-kept-zoom";
import { keyOf } from "@/lib/board";
import { mediaKindOf } from "@/lib/url";
import type { DesignIndex, InspoItem, InspoTags, PageShot } from "@/types/inspo";
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
}

/** Room for the bar over the board (the project's name), and at the bottom for the board's end */
const INSETS = { top: 72, left: 0, right: 0, bottom: 24 };
const none = () => Promise.resolve();

export default function ShareBoard({ token, name, data }: { token: string; name: string; data: ShareBoardData }) {
  const { t } = useT();
  const { items, thumbs, cards, shots, designs, tags, texts } = data;
  const og = useMemo(() => new Set(data.og), [data.og]);
  const { measure, ratioOf } = useBoardRatios(shots, thumbs);
  const [zoom, setZoom] = useKeptZoom();
  const [open, setOpen] = useState<InspoItem | null>(null);
  const hasNote = useCallback((item: InspoItem) => mediaKindOf(item.web) !== "text" && !!item.note.trim(), []);
  const at = open ? items.findIndex((i) => keyOf(i) === keyOf(open)) : -1;

  const renderCard = useCallback((item: InspoItem, level: ShotLevel) => {
    const web = item.web;
    const shot = shots[web], thumb = thumbs[web], design = designs[web];
    // As BoardCard draws it: a site shows the top of its page at the size it is seen, unless someone gave it a thumbnail
    const showsPage = !thumb && !!shot;
    const key = level === "thumb" ? "thumbUrl" : level === "tile" ? "tileUrl" : "topUrl";
    const card = level === "full" ? undefined : cards[web];
    return (
      <InspoCard
        item={item}
        text={item.id ? texts[item.id] ?? null : null}
        tags={tags[web]}
        caption={captionFor(item, undefined, undefined)}
        spaceName={name}
        manualThumbnail={thumb}
        signedThumbnail={card ?? thumb}
        onUpload={none}
        onRemoveThumbnail={none}
        onOpen={() => setOpen(item)}
        designCover={showsPage ? shot![key] : design?.coverUrl}
        designScroll={design?.scrollUrl}
        readOnly
        ogSrc={item.id && og.has(item.id) ? `/s/${token}/og?id=${encodeURIComponent(item.id)}` : undefined}
        board={{
          ratio: ratioOf(item),
          color: showsPage ? shot!.color : undefined,
          alternates: showsPage ? [shot!.tileUrl, shot!.thumbUrl, shot!.topUrl] : [card, thumb],
          thumb: card,
          onMeasure: showsPage ? undefined : (r) => measure(web, r),
        }}
      />
    );
  }, [shots, thumbs, designs, cards, tags, texts, og, token, name, ratioOf, measure]);

  if (!items.length) return <main className="share share--board"><header className="share-head"><h1 className="share-head__name">{name}</h1></header><p className="sboard__empty">{t.brand.share.boardEmpty}</p></main>;
  return (
    <main className="share share--board">
      <header className="share-head share-head--over">
        <h1 className="share-head__name">{name}</h1>
        <a className="share-head__by" href="https://criterio.design" rel="noreferrer">criterio.design</a>
      </header>
      <Grid items={items} ratioOf={ratioOf} hasNote={hasNote} insets={INSETS} zoom={zoom} onZoom={setZoom}
        fitKey="share" focusKey={open ? keyOf(open) : null} renderCard={renderCard} />
      {open && (
        <ItemPanel
          item={open}
          isSite={mediaKindOf(open.web) === "web"}
          page={<SharedPage item={open} shot={shots[open.web]} thumb={thumbs[open.web]} text={open.id ? texts[open.id] : undefined}
            poster={open.id && og.has(open.id) ? `/s/${token}/og?id=${encodeURIComponent(open.id)}` : undefined} />}
          thread={open.note.trim() && open.addedBy ? (
            // A link that hands out everything: the note of whoever saved it, as its card says. Nothing to write here
            <p className="tile__note sboard__note">
              <PersonAvatar name={open.addedBy} image={null} size={20} />
              <span className="tile__note-text"><span className="tile__note-who">{open.addedBy}</span> {open.note}</span>
            </p>
          ) : null}
          onClose={() => setOpen(null)}
          onPrev={at > 0 ? () => setOpen(items[at - 1]) : undefined}
          onNext={at >= 0 && at < items.length - 1 ? () => setOpen(items[at + 1]) : undefined}
          libraryName={name}
        />
      )}
    </main>
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
