import type { Metadata } from "next";
import ActivityPing from "@/components/ActivityPing";
import SettingsHeading from "@/components/SettingsHeading";
import { Card, CardContent } from "@/components/ui/card";
import { getCtxOrLogin } from "@/lib/workspace";
import { feedbackHistory } from "@/lib/feedback";
import { batchStatus } from "@/lib/feedback-core";
import { getT, fmtDateTime } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.settings.sections.feedback };
}

// Everything this person has left with the feedback tool (issue #8): sent, dealt with by a
// partner, or still a draft. Read-only: notes are edited and sent from the page they are about.
export default async function FeedbackHistoryPage() {
  const [ctx, { t, locale }] = await Promise.all([getCtxOrLogin("/settings/feedback"), getT()]);
  const batches = await feedbackHistory(ctx.user.id);
  const h = t.feedbackHistory;
  return (
    <>
      <ActivityPing area="settings" organizationId={ctx.workspace.id} />
      <SettingsHeading title={t.settings.sections.feedback} lead={t.settings.leads.feedback} />
      <Card>
        <CardContent className="card-stack">
          {batches.length === 0 ? (
            <p className="card-note">{h.empty}</p>
          ) : (
            <ul className="fb-list">
              {batches.map((b) => {
                const status = batchStatus(b);
                const when = fmtDateTime(b.sentAt ?? b.updatedAt, locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
                return (
                  <li key={b.key} className="fb">
                    <div className="fb__head">
                      <span className="list__main">
                        <span className="list__name">
                          <a className="fb__path" href={b.url} title={h.openPage}>{b.path}</a>
                        </span>
                        <span className="list__sub">
                          {b.sentAt ? h.sentOn(when) : h.draftOn(when)}
                          {b.resolvedAt ? ` · ${h.resolvedOn(fmtDateTime(b.resolvedAt, locale, { day: "numeric", month: "short" }))}` : ""}
                          {` · ${h.notes(b.notes.length)}`}
                        </span>
                      </span>
                      <span className={`fb__tag fb__tag--${status}`}>{h.status[status]}</span>
                    </div>
                    <ol className="fb__notes">
                      {b.notes.map((n) => (
                        <li key={n.id} className="fb__note">
                          <span className="fb__el" title={n.elementPath}>{n.element}</span>
                          {n.selectedText && <q className="fb__quote">{n.selectedText}</q>}
                          <p className="fb__comment">{n.comment}</p>
                        </li>
                      ))}
                    </ol>
                  </li>
                );
              })}
            </ul>
          )}
          {batches.length > 0 && <p className="card-note">{h.hint}</p>}
        </CardContent>
      </Card>
    </>
  );
}
