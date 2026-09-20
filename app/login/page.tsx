import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/workspace";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Entrar — Inspo" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  if (await getSession()) redirect(next && next.startsWith("/") ? next : "/");
  return (
    <div className="auth">
      <div className="auth__card">
        <div className="auth__brand">
          <span className="display auth__title">Inspo</span>
          <span className="auth__by">savvia.studio</span>
        </div>
        <LoginForm next={next} initialError={error === "INVALID_TOKEN" || error === "EXPIRED_TOKEN" ? "El enlace ha caducado o ya se ha usado. Pide otro." : undefined} />
      </div>
    </div>
  );
}
