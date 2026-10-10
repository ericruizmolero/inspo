// Runs in the browser before the app: errors on a page go to BetterStack (lib/error-reports.ts).
import * as Sentry from "@sentry/nextjs";
import { REPORT_DSN, reportOptions } from "@/lib/error-reports";

if (REPORT_DSN) Sentry.init(reportOptions);
