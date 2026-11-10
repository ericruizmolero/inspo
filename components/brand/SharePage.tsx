"use client";
// A project shared by link: its board, for people outside the team to comment on and choose from
// (components/brand/ShareBoard.tsx). The link shares the board and nothing else: not criterio.md, not the brand
// (Eric, 06-11: "que se comparta solo el tablero, el MD no"). Links made when it also showed the brand (?view=system)
// open on the board.
import ShareBoard, { type ShareBoardData } from "./ShareBoard";
import type { ShareActivity } from "@/lib/share-guests";

export default function SharePage({ token, name, subtitle, board, activity, guest }: { token: string; name: string; subtitle: string; board: ShareBoardData; activity: ShareActivity; guest: { key: string; name: string } | null }) {
  return <ShareBoard token={token} name={name} subtitle={subtitle} data={board} activity={activity} invited={guest} />;
}
