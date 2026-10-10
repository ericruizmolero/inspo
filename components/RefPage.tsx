"use client";

import type { Dispatch, SetStateAction } from "react";
import dynamic from "next/dynamic";
import PageView from "./PageView";
import TextPage from "./TextPage";
import { mediaKindOf } from "@/lib/url";
import type { InspoItem, PageShot } from "@/types/inspo";

// A video's or a post's own view, in the reference sheet's page card; only loaded when one opens
const VideoPlayer = dynamic(() => import("./VideoPlayer"), { ssr: false });
const PostView = dynamic(() => import("./PostView"), { ssr: false });

/** The page card of a reference's sheet: the page itself, or the video, the post or the text it is */
export default function RefPage({ panelItem, textBodies, saveTextBody, renameTextItem, setThumbMap, pageShots, thumbMap }: {
  panelItem: InspoItem;
  textBodies: Record<string, string | null>;
  saveTextBody: (item: InspoItem, text: string) => Promise<void>;
  renameTextItem: (item: InspoItem, title: string) => Promise<void>;
  setThumbMap: Dispatch<SetStateAction<Record<string, string>>>;
  pageShots: Record<string, PageShot>;
  thumbMap: Record<string, string>;
}) {
  // Uncompiled, as it was inside InspoClient (which the React Compiler skips): the same renders and closures
  "use no memo";
  const kind = mediaKindOf(panelItem.web);
  // A video or a post is its own page: it fills the page card
  if (kind === "video") return <div className="ip-media"><VideoPlayer web={panelItem.web} title={panelItem.name} /></div>;
  if (kind === "text") return <TextPage key={panelItem.id} title={panelItem.name} body={panelItem.id ? textBodies[panelItem.id] : undefined} onSave={(text) => saveTextBody(panelItem, text)} onRename={(title) => renameTextItem(panelItem, title)} />;
  if (kind === "post") return <div className="ip-media"><PostView web={panelItem.web} onThumb={(thumb: string) => setThumbMap((prev) => (prev[panelItem.web] ? prev : { ...prev, [panelItem.web]: thumb }))} /></div>;
  // An image shows whole in the panel: its card copy (cardCopy) is for the board
  const src = kind === "image"
    ? panelItem.web
    : pageShots[panelItem.web]?.shotUrl ?? thumbMap[panelItem.web] ?? `/api/shot?url=${encodeURIComponent(panelItem.web)}&v=2`;
  return (
    <PageView key={panelItem.web} src={src} alt={panelItem.name} fit={kind === "image"} />
  );
}
