"use server";
// Settings → Invite: the personal invites a person hands out (lib/access.ts). Access to the product, never a seat.
import { revalidatePath } from "next/cache";
import { withCtx, HttpError } from "@/lib/workspace";
import { appBase } from "@/lib/admin-action";
import { inviteLink } from "@/lib/waves";
import { createPersonalInvite, revokePersonalInvite } from "@/lib/access";
import { personalInviteMail, sendMail } from "@/lib/mail";
import { getErrors } from "@/lib/i18n";
import { log } from "@/lib/log";

/** Spends one invite. With an email, mails the link there too. The link comes back either way, and only now: the code is stored hashed */
export async function createMyInvite(email: string | null) {
  return withCtx(async (ctx) => {
    const errors = await getErrors();
    const mail = typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;
    if (mail && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail) || mail.length > 254)) throw new HttpError(400, errors.badEmail);
    const made = await createPersonalInvite(ctx.user.id, mail);
    if (!made.ok) throw new HttpError(409, made.reason === "none_left" ? errors.noInvitesLeft : errors.inviteHasAccount);
    const link = inviteLink(await appBase(), made.code);
    let mailed = false;
    if (mail) {
      // The address has no account, so no language of its own: the inviter's, also on the link so /login matches the email
      const locale = ctx.user.language;
      try {
        await sendMail(mail, personalInviteMail(`${link}&lang=${locale}`, ctx.user.name || ctx.user.email, ctx.user.email, mail, locale));
        mailed = true;
      } catch (err) { log.warn("invites.mail_not_sent", { err }); }
    }
    revalidatePath("/settings/invite");
    return { link, email: mail, mailed, left: made.left };
  });
}

/** Only an unused invite of your own; it comes back to your balance */
export async function revokeMyInvite(id: string) {
  return withCtx(async (ctx) => {
    if (typeof id !== "string" || !(await revokePersonalInvite(ctx.user.id, id))) throw new HttpError(409, (await getErrors()).inviteNotRevocable);
    revalidatePath("/settings/invite");
  });
}
