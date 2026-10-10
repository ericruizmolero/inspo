// Whether signup is invite-only: the landing page and the extension popup switch their call to action with it.
// Public and cacheable for 30 seconds, the same time the flag itself is cached (lib/access.ts).
import { getSignupMode } from "@/lib/access";

export async function GET() {
  return Response.json({ mode: await getSignupMode() }, {
    headers: { "Cache-Control": "public, max-age=30", "Access-Control-Allow-Origin": "*" },
  });
}
