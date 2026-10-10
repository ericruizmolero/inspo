// Uptime check for BetterStack: answers when the app is up, and touches nothing else.
// What the app depends on is checked in /api/health/deep.
export function GET() {
  return Response.json({ ok: true });
}
