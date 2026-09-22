import "server-only";
import { cookies } from "next/headers";

// shadcn's SidebarProvider writes this cookie on every toggle. Reading it on the server renders the
// sidebar in its saved state on the first paint, so a collapsed sidebar never flashes open.
export async function sidebarOpen(): Promise<boolean> {
  return (await cookies()).get("sidebar_state")?.value !== "false";
}
