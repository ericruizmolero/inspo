"use client";

import { memo, useCallback, useMemo, type RefObject } from "react";
import InspoCard, { captionFor } from "./InspoCard";
import type { ShotLevel } from "./Grid";
import { cardCopyOf } from "@/lib/board";
import type { DesignIndexEntry, InspoComment, InspoItem, InspoTags, PageShot, Project, TagStatus } from "@/types/inspo";
import type { SystemArea } from "@/types/system";

export interface GridActions {
  select: (item: InspoItem, range: boolean) => void;
  openItem: (item: InspoItem) => void;
  deleteItem: (item: InspoItem) => Promise<void>;
  handleThumbnailUpload: (web: string, file: File) => void;
  handleThumbnailRemove: (web: string) => void;
  toggleFiled: (item: InspoItem, projectId: string, on: boolean) => void;
  createAndFile: (item: InspoItem, name: string) => Promise<void>;
  toggleArea: (item: InspoItem, area: SystemArea, on: boolean) => void;
  measure: (web: string, ratio: number) => void;
}

/** One card with its handlers bound. Memoised on its own data: moving the camera or another card leaves it alone. */
const BoardCard = memo(function BoardCard({ item, level, ratio, tags, tagJob, score, reason, comments, authorImage, manualThumbnail, signedThumbnail, signedCard, designMd, signedCover, signedScroll, shot, projects, projectIds, backs, areasIn, selected, selecting, deletable, spaceName, takeOutOf, actions }: {
  item: InspoItem; level: ShotLevel; ratio: number; tags: InspoTags | undefined; tagJob: TagStatus | undefined; score: number | undefined; reason: string | undefined;
  /** Inside a project: the areas of its system this reference backs */
  backs?: SystemArea[];
  /** In every project: the areas it backs there */
  areasIn?: Record<string, SystemArea[]>;
  comments: InspoComment[] | undefined; authorImage: string | undefined;
  manualThumbnail: string | undefined; designMd: DesignIndexEntry | undefined; shot: PageShot | undefined;
  /** The signed bucket links of the thumbnail it shows and of the DESIGN.md pictures, when the library sent them */
  signedThumbnail: string | undefined; signedCover: string | undefined; signedScroll: string | undefined;
  /** The signed link of the thumbnail's card copy (lib/board.ts cardCopyOf), when the library sent it */
  signedCard: string | undefined;
  projects: Project[]; projectIds: string[] | undefined;
  selected: boolean; selecting: boolean;
  /** Whether this person may delete the card: theirs, or they manage the workspace */
  deletable: boolean;
  spaceName: string;
  /** The project whose board this is: the bin takes the card out of it instead of deleting */
  takeOutOf: string | undefined;
  actions: RefObject<GridActions>;
}) {
  // The handlers are read when used, never kept from this render: the card re-renders only with its own data
  const act = () => actions.current;
  const onMeasure = useCallback((r: number) => actions.current.measure(item.web, r), [actions, item.web]);
  const caption = useMemo(() => captionFor(item, comments, authorImage), [item, authorImage, comments]);
  // The page's top, at the size it is seen: a site someone gave a thumbnail keeps that thumbnail
  const showsPage = !manualThumbnail && !!shot;
  const key = level === "thumb" ? "thumbUrl" : level === "tile" ? "tileUrl" : "topUrl";
  const page = showsPage ? shot![key] : signedCover ?? designMd?.coverUrl;
  // The same page at the other sizes: whichever is already decoded stands in while this one loads
  const alternates = useMemo(() => (shot ? [shot.tileUrl, shot.thumbUrl, shot.topUrl] : undefined), [shot]);
  // A picture is drawn from its card copy until the zoom makes the card wider than the copy; then the original
  const picture = manualThumbnail ?? item.web;
  const card = level === "full" ? null : cardCopyOf(picture);
  const pictureAlternates = useMemo(() => [signedCard, signedThumbnail, cardCopyOf(picture), picture], [signedCard, signedThumbnail, picture]);
  const open = () => act().openItem(item);
  // Always the whole card, at every zoom: its note and its thread are always there. Only the copy of the
  // page changes with the zoom (288, 720 or 1440px), swapped without a blank frame.
  return (
    <InspoCard
      item={item}
      tags={tags}
      tagJob={tagJob}
      score={score}
      reason={reason}
      commentCount={comments?.length ?? 0}
      caption={caption}
      onComments={item.id ? open : undefined}
      onDelete={item.id && deletable ? () => act().deleteItem(item) : undefined}
      onTakeOut={item.id && takeOutOf ? () => act().toggleFiled(item, takeOutOf, false) : undefined}
      spaceName={spaceName}
      manualThumbnail={manualThumbnail}
      signedThumbnail={card ? signedCard : signedThumbnail}
      onUpload={(file) => { act().handleThumbnailUpload(item.web, file); return Promise.resolve(); }}
      onRemoveThumbnail={() => { act().handleThumbnailRemove(item.web); return Promise.resolve(); }}
      onOpen={open}
      designCover={page}
      designCoverFallback={showsPage ? shot!.paths?.[key] : signedCover && designMd?.coverUrl}
      designScroll={signedScroll ?? designMd?.scrollUrl}
      designScrollFallback={signedScroll && designMd?.scrollUrl}
      projects={item.id ? projects : undefined}
      projectIds={projectIds}
      onToggleProject={(projectId, on) => act().toggleFiled(item, projectId, on)}
      onCreateProject={(name) => act().createAndFile(item, name)}
      backs={backs}
      onToggleArea={backs && item.id ? (area, on) => act().toggleArea(item, area, on) : undefined}
      areasIn={areasIn}
      selected={selected}
      selecting={selecting}
      onSelect={item.id ? (range) => act().select(item, range) : undefined}
      board={{ ratio, color: showsPage ? shot!.color : undefined, alternates: showsPage ? alternates : pictureAlternates, thumb: card ?? undefined, onMeasure: showsPage ? undefined : onMeasure }}
    />
  );
});

export default BoardCard;
