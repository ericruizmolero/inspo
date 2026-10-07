import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { getCtxOrLogin } from "@/lib/workspace";
import { getT } from "@/lib/i18n";
import { originOfHeaders } from "@/lib/mcp/auth";
import { readAuthRequest } from "@/lib/mcp/oauth";
import { buttonVariants } from "@/components/ui/button";
import Logo from "@/components/Logo";
import AuthorizePanel from "./AuthorizePanel";
import AuthWindow from "@/components/AuthWindow";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.mcp.pageTitle, robots: { index: false } };
}

// Where an AI client (Claude, ChatGPT, Cursor) sends the person to let it in: the authorization endpoint of
// the MCP connector (lib/mcp/oauth.ts). The person is signed in (or signs in and comes back), sees which app
// asks and what it will be able to do, and says yes or no. Nothing is granted by opening this page.
export default async function AuthorizePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const query: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) { const one = Array.isArray(v) ? v[0] : v; if (typeof one === "string") query[k] = one; }
  const [ctx, { t }] = await Promise.all([getCtxOrLogin(`/mcp/authorize?${new URLSearchParams(query)}`), getT()]);
  const request = await readAuthRequest(query, originOfHeaders(await headers()));
  // Wrong, but the app is known and so is its address: the error goes back to it, as OAuth has it, but only
  // on a click. Anyone can register an app, so an automatic redirect would make our address a launch pad
  const back = "fatal" in request && !request.fatal && /^https?:/.test(request.redirect) ? request.redirect : null;

  return (
    <div className="auth auth--solo">
      <div className="auth__card">
        <div className="auth__brand"><Logo size={48} /></div>
        {"fatal" in request ? (
          <AuthWindow title={t.mcp.pageTitle} heading={t.mcp.cannot} status={t.invite.signedInAs(ctx.user.email)}
            footer={back
              ? <a href={back} rel="noreferrer" className={buttonVariants()}>{t.mcp.backTo(new URL(back).host)}</a>
              : <Link href="/" className={buttonVariants()}>{t.mcp.goToApp}</Link>}>
            <p className="auth__hint">{!request.fatal ? t.mcp.badRequest : request.reason === "redirect" ? t.mcp.badRedirect : t.mcp.badClient}</p>
          </AuthWindow>
        ) : (
          <AuthorizePanel
            app={request.clientName}
            returnsTo={/^https?:/.test(request.redirectUri) ? new URL(request.redirectUri).host : ""}
            workspaces={ctx.workspaces.map((w) => w.name)}
            youAre={ctx.user.email}
            query={query}
          />
        )}
      </div>
    </div>
  );
}
