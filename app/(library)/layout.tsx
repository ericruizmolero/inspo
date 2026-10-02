import { getSession, getCtx } from "@/lib/workspace";
import type { ReactNode } from "react";
import { loadLibrary } from "@/lib/library";
import LibraryHost from "@/components/LibraryHost";

// The library lives in this layout so it stays mounted between / and /i/[id]: opening a DESIGN.md
// changes the URL (history.pushState) without a remount, and a refresh keeps the running jobs.
// No session: the pages decide (/ shows the guest start, /i/[id] sends to login).
export default async function LibraryLayout({ children }: { children: ReactNode }) {
  if (!(await getSession())) return children;
  const ctx = await getCtx();
  // Everything the library needs on open, before painting
  const library = await loadLibrary(ctx.user, ctx.workspace);

  return (
    <>
      {/* The host shows this workspace and, on a switch, another one at once (components/LibraryHost.tsx) */}
      <LibraryHost
        library={library}
        user={ctx.user}
        workspaces={ctx.workspaces}
        aiEnabled={!!process.env.TYPESAFE_API_KEY}
      />
      {children}
    </>
  );
}
