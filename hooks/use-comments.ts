"use client";

import type { Dispatch, SetStateAction } from "react";
import { postComment as postCommentAction, removeComment, editNote as editNoteAction } from "@/app/actions/library";
import type { useConfirm } from "@/components/useConfirm";
import type { Dict } from "@/lib/i18n/en";
import type { CommentAttachment, CommentMap, InspoItem } from "@/types/inspo";

// ─── Comments ──────────────────────────────────────────────────────────────
// Each page brings the threads of its references, and the pulse what others write or delete afterwards
export function useComments({ t, commentMap, setCommentMap, setItems, setPanelItem, confirm }: {
  t: Dict;
  commentMap: CommentMap;
  setCommentMap: Dispatch<SetStateAction<CommentMap>>;
  setItems: Dispatch<SetStateAction<InspoItem[]>>;
  setPanelItem: Dispatch<SetStateAction<InspoItem | null>>;
  confirm: ReturnType<typeof useConfirm>[0];
}) {
  const postComment = async (itemId: string, body: string, attachments: CommentAttachment[], parentId?: string) => {
    const r = await postCommentAction(itemId, body, attachments, parentId);
    if (!r.ok) throw new Error(r.error);
    setCommentMap((prev) => ({ ...prev, [itemId]: [...(prev[itemId] ?? []), r.data] }));
  };
  const editNote = async (itemId: string, field: "note" | "subNote", text: string) => {
    const r = await editNoteAction(itemId, field, text);
    if (!r.ok) throw new Error(r.error);
    const patch = { note: r.data.note, subNote: r.data.subNote };
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, ...patch } : i)));
    // The panel keeps its own copy of the item, so its thread needs the new text too
    setPanelItem((cur) => (cur?.id === itemId ? { ...cur, ...patch } : cur));
  };
  // A comment goes with its replies: when others answered it, ask first
  const deleteComment = async (itemId: string, id: string) => {
    const replies = (commentMap[itemId] ?? []).filter((c) => c.parentId === id).length;
    if (replies && !(await confirm({ title: t.comments.deleteThread, description: t.comments.deleteThreadHint(replies), action: t.common.delete, danger: true }))) return;
    const r = await removeComment(id).catch(() => null);
    if (r?.ok) setCommentMap((prev) => ({ ...prev, [itemId]: (prev[itemId] ?? []).filter((c) => c.id !== id && c.parentId !== id) }));
  };
  return { postComment, editNote, deleteComment };
}
