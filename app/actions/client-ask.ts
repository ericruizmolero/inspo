"use server";
// The link that asks a client a project's open questions (lib/client-ask.ts). Answering takes no session: the token is the proof.
import { withCtx } from "@/lib/workspace";
import { clientAskToken, submitClientAnswers } from "@/lib/client-ask";

export async function makeClientAsk(projectId: string) {
  return withCtx(async (ctx) => clientAskToken(ctx.workspace.id, String(projectId), ctx.user.id));
}

export async function answerClientAsk(token: string, answers: Record<string, unknown>) {
  return submitClientAnswers(String(token), answers && typeof answers === "object" ? answers : {});
}
