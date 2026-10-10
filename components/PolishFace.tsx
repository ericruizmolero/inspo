"use client";
import { useEffect, useRef, useState } from "react";
import type { InspoItem } from "@/types/inspo";
import { mediaKindOf, postOf, postThumbKind, videoEmbedOf } from "@/lib/url";
import type { Post } from "@/lib/posts";
import { cachedCardImage } from "./InspoCard";
import { PostBox } from "./PostView";
import LoopVideo from "./LoopVideo";
import { usePost } from "./post-cache";
import { useT } from "./I18nProvider";

/** The reference's picture, with the fallbacks a small thumbnail has (components/Thumb.tsx), or its initial */
export function Picture({ item, image, large }: { item: InspoItem; image: string | null; /** A bigger copy, laid over it once it loads (the card in front) */ large?: string | null }) {
  const [at, setAt] = useState(0);
  const [noLarge, setNoLarge] = useState(false);
  const embed = mediaKindOf(item.web) === "video" ? videoEmbedOf(item.web) : null;
  const srcs = [image, embed?.poster, cachedCardImage(item.web), `/api/og?url=${encodeURIComponent(item.web)}`].filter((x): x is string => !!x);
  const src = srcs[at];
  if (!src) return <span className="t-display polish__initial" aria-hidden>{item.name.slice(0, 1).toUpperCase()}</span>;
  return (
    <>
      <img key={src} src={src} alt="" draggable={false} decoding="async" onError={() => setAt((i) => i + 1)} />
      {large && large !== src && !noLarge && <img key={large} className="polish__hi" src={large} alt="" draggable={false} decoding="async" onError={() => setNoLarge(true)} />}
    </>
  );
}

/** A post's picture is a copy of its own media when it has any (lib/posts.ts: photo-1.jpg, poster-video.jpg); so
 *  its card knows without reading the post whether it has something to look at or only words */
export const postHasMedia = (image: string | null): image is string => !!image && /\/(photo-\d+|poster-(video|gif))\.\w+(\?.*)?$/.test(image);

/** Until the post is read, what its name already says ("Wilson · Ferndesk has been live…", lib/posts.ts postName),
 *  as a post with no picture and no date */
function postFromName(item: InspoItem): Post {
  const at = item.name.indexOf(" · ");
  const author = at > 0 ? item.name.slice(0, at) : item.name, text = at > 0 ? item.name.slice(at + 3) : "";
  return { id: item.web, url: item.web, author, handle: postOf(item.web)?.user ?? "", avatar: null, text, createdAt: null, media: [], savedAt: "" };
}

/** A post on its card: the same box its sheet shows (PostView's PostBox), read once per session (post-cache.ts).
 *  Only a card near the front asks for it; the rest show what the name says until they come round */
function PostCard({ item, near }: { item: InspoItem; near: boolean }) {
  const read = usePost(near ? item.web : null);
  // Longer than the card's cap (CSS): it fades out at the foot, as its card on the board does
  const ref = useRef<HTMLDivElement>(null);
  const [cut, setCut] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const look = () => setCut(el.scrollHeight > el.clientHeight + 1);
    look();
    const ro = new ResizeObserver(look);
    ro.observe(el);
    return () => ro.disconnect();
  });
  return <div ref={ref} className={`polish__post${cut ? " is-cut" : ""}`}><PostBox post={read?.post ?? postFromName(item)} playing={false} /></div>;
}

/** The reference as something to look at: a text is its page of words; a post with a photo or a video is that
 *  alone (its video loops, muted, on the card in front), and one that is only words is its post as the sheet shows
 *  it; anything else is its picture. `near` and `front` are for a post: whether to read it, and whether it plays */
export function Face({ item, image, large, text, near = true, front = false }: { item: InspoItem; image: string | null; large?: string | null; text: string; near?: boolean; front?: boolean }) {
  const { t } = useT();
  const kind = mediaKindOf(item.web);
  if (kind === "text") return <div className="polish__text"><span className="polish__text-kind">{t.card.text}</span><b className="t-title-s">{item.name}</b><p className="t-small">{text}</p></div>;
  if (kind === "post" && !postHasMedia(image)) return <PostCard item={item} near={near} />;
  // A post's copy of its video or gif sits next to its frame (lib/posts.ts): poster-video.jpg → video.mp4
  const loop = kind === "post" && front && image && postThumbKind(image) ? image.replace(/poster-(video|gif)\.\w+(\?.*)?$/, "$1.mp4") : null;
  return (
    <>
      <Picture item={item} image={image} large={large} />
      {loop && <LoopVideo src={loop} className="polish__loop" />}
    </>
  );
}
