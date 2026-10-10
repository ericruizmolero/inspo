// Error reports: the Sentry SDK, sending to BetterStack (one account for errors, uptime and the status page).
// The same options in the browser (instrumentation-client.ts) and on the server (instrumentation.ts).
// Without NEXT_PUBLIC_SENTRY_DSN the SDK is never started, so local runs and previews send nothing.
import type { ErrorEvent } from "@sentry/nextjs";

export const REPORT_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

// A report never carries what a person wrote or who they are: request bodies (feedback, notes, comments),
// cookies and headers go; addresses and the signature of an R2 URL are blanked wherever they turn up.
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const SIGNED = /([?&])X-Amz-[^&\s"'\\]*/g;

function scrub(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.query_string;
  }
  delete event.user;
  // The console says what the code printed, and that can be a note
  event.breadcrumbs = event.breadcrumbs?.filter((b) => b.category !== "console");
  return JSON.parse(JSON.stringify(event).replace(EMAIL, "[email]").replace(SIGNED, "$1[signed]"));
}

export const reportOptions = {
  dsn: REPORT_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  sendDefaultPii: false,
  // Errors only. Traces would bill every request and say nothing the uptime checks don't
  tracesSampleRate: 0,
  beforeSend: scrub,
};
