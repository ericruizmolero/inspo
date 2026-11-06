"use client";
// A project shared by link: its board, read only, as the team sees it (components/brand/ShareBoard.tsx). The link
// shares the board and nothing else: not criterio.md, not the brand (Eric, 06-11: "que se comparta solo el tablero,
// el MD no"). Links made when it also showed the brand (?view=system) open on the board.
import ShareBoard, { type ShareBoardData } from "./ShareBoard";

export default function SharePage({ token, name, board }: { token: string; name: string; board: ShareBoardData }) {
  return <ShareBoard token={token} name={name} data={board} />;
}
