"use client";

import { useEffect } from "react";
import type { Post, PostMedia } from "@/lib/posts";
import { fmtDate } from "@/lib/i18n/format";
import { useT } from "./I18nProvider";
import { usePost } from "./post-cache";

// A post from X at the top of its thread, as it read there: who, what they wrote, and its
// photos, video or gif. The first time it is opened it gets imported (if the add didn't already),
// and its picture becomes the card's. The box itself (PostBox) is the same one Polish draws on
// the card in front: a post is shown the one way everywhere.
export default function PostView({ web, onThumb }: { web: string; onThumb?: (thumb: string) => void }) {
  const { t } = useT();
  const read = usePost(web);
  const thumb = read?.thumb ?? null;
  // The picture only reports back; the post depends on the address alone
  useEffect(() => { if (thumb) onThumb?.(thumb); }, [thumb]); // eslint-disable-line react-hooks/exhaustive-deps

  if (read === undefined) return <div className="pv pv--loading" aria-busy><span className="shimmer" /></div>;
  if (read.post === null) return <p className="pv pv--none">{t.card.postUnavailable}</p>;
  return <PostBox post={read.post} />;
}

/** The post as it read on X: who wrote it, when, its words and its pictures. `playing` false (a card going by in
 *  Polish) draws a video's frame instead of playing it */
export function PostBox({ post, playing = true }: { post: Post; playing?: boolean }) {
  const { locale } = useT();
  const photos = post.media.filter((m) => m.kind === "photo");
  const moving = post.media.filter((m) => m.kind !== "photo");
  return (
    <article className="pv">
      <header className="pv__head">
        {post.avatar && <img className="pv__avatar" src={post.avatar} alt="" referrerPolicy="no-referrer" />}
        <span className="pv__who"><b>{post.author}</b> <span>@{post.handle}</span></span>
        {post.createdAt && <time className="pv__date" dateTime={post.createdAt}>{fmtDate(post.createdAt, locale, { day: "numeric", month: "short", year: "numeric" })}</time>}
      </header>
      {post.text && <p className="pv__text">{post.text}</p>}
      {moving.map((m, i) => (playing ? <Moving key={i} m={m} /> : <Still key={i} m={m} />))}
      {photos.length > 0 && (
        <div className={`pv__photos pv__photos--${Math.min(photos.length, 4)}`}>
          {photos.map((m, i) => (
            <a key={i} href={m.src} target="_blank" rel="noopener noreferrer">
              <img src={m.src} alt="" loading="lazy" />
            </a>
          ))}
        </div>
      )}
    </article>
  );
}

/** A video or gif not playing: its frame, at its shape */
function Still({ m }: { m: PostMedia }) {
  const ratio = m.w && m.h ? `${m.w} / ${m.h}` : "16 / 9";
  if (!m.poster) return <span className="pv__video" style={{ aspectRatio: ratio }} aria-hidden />;
  return <img className="pv__video" style={{ aspectRatio: ratio }} src={m.poster} alt="" referrerPolicy="no-referrer" />;
}

/** A video plays X's own best file; if X no longer serves it, our lighter copy. Both loop on their own,
 *  silent, like on X; the controls are there for the sound. A gif loops the same way, without controls.
 *  X refuses its files to requests carrying another site's Referer, and <video> can't drop it on its own:
 *  X's file plays inside a tiny frame whose document sends no Referer. Our own copy plays directly. */
function Moving({ m }: { m: PostMedia }) {
  const gif = m.kind === "gif";
  const ratio = m.w && m.h ? `${m.w} / ${m.h}` : "16 / 9";
  const poster = m.poster ? m.poster : "";
  const backup = m.backup ? m.backup : "";
  if (!/^https:\/\/video\.twimg\.com\//.test(m.src)) {
    const src = m.src || m.backup || "";
    return <video className="pv__video" style={{ aspectRatio: ratio }} src={src} poster={poster || undefined}
      autoPlay loop muted {...(gif ? {} : { controls: true })} playsInline />;
  }
  const attr = (v: string) => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const doc = `<!doctype html><meta name="referrer" content="no-referrer"><style>html,body{margin:0;height:100%;background:#000}video{display:block;width:100%;height:100%;object-fit:contain}</style>`
    + `<video src="${attr(m.src)}" poster="${attr(poster)}" playsinline autoplay loop muted${gif ? "" : " controls"}></video>`;
  // The backup is wired from here: the frame shares our CSP, which allows no inline handler in it
  const onLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    const v = e.currentTarget.contentDocument?.querySelector("video");
    if (!v || !backup) return;
    const swap = () => { if (v.getAttribute("src") !== backup) { v.src = backup; void v.play().catch(() => {}); } };
    if (v.error) swap(); else v.addEventListener("error", swap, { once: true });
  };
  return <iframe className="pv__video pv__video--frame" style={{ aspectRatio: ratio }} srcDoc={doc} onLoad={onLoad} title="" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />;
}
