"use client";

import { useEffect, useState } from "react";
import type { Post, PostMedia } from "@/lib/posts";
import { fmtDate } from "@/lib/i18n/format";
import { useT } from "./I18nProvider";

// A post from X at the top of its thread, as it read there: who, what they wrote, and its
// photos, video or gif. The first time it is opened it gets imported (if the add didn't already),
// and its picture becomes the card's.
export default function PostView({ web, onThumb }: { web: string; onThumb?: (thumb: string) => void }) {
  const { t, locale } = useT();
  const [post, setPost] = useState<Post | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ web }), signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setPost(d?.post ?? null); if (d?.thumb) onThumb?.(d.thumb); })
      .catch(() => { if (!ctrl.signal.aborted) setPost(null); });
    return () => ctrl.abort();
    // onThumb only reports back; the post depends on the address alone
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [web]);

  if (post === undefined) return <div className="pv pv--loading" aria-busy><span className="shimmer" /></div>;
  if (post === null) return <p className="pv pv--none">{t.card.postUnavailable}</p>;

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
      {moving.map((m, i) => <Moving key={i} m={m} />)}
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

/** A video plays X's own best file; if X no longer serves it, our lighter copy. A gif loops, silent, like on X.
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
      {...(gif ? { autoPlay: true, loop: true, muted: true } : { controls: true, preload: "metadata" })} playsInline />;
  }
  const attr = (v: string) => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const doc = `<!doctype html><meta name="referrer" content="no-referrer"><style>html,body{margin:0;height:100%;background:#000}video{display:block;width:100%;height:100%;object-fit:contain}</style>`
    + `<video src="${attr(m.src)}" poster="${attr(poster)}" data-backup="${attr(backup)}" playsinline ${gif ? "autoplay loop muted" : "controls preload=\"metadata\""}`
    + ` onerror="var b=this.dataset.backup;if(b&&this.getAttribute('src')!==b){this.src=b;${gif ? "this.play()" : ""}}"></video>`;
  return <iframe className="pv__video pv__video--frame" style={{ aspectRatio: ratio }} srcDoc={doc} title="" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />;
}
