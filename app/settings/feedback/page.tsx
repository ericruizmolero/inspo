import type { Metadata } from "next";
import ActivityPing from "@/components/ActivityPing";
import SettingsHeading from "@/components/SettingsHeading";
import { getCtxOrLogin } from "@/lib/workspace";
import { feedbackHistory } from "@/lib/feedback";
import { batchStatus } from "@/lib/feedback-core";
import { getT, fmtDateTime } from "@/lib/i18n";
import { Chip, EmptyState, SettingsWindow } from "@/components/criterio";

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
      <div className="page__body">
        <SettingsWindow title={h.windowTitle} figure={batches.length || undefined} note={batches.length > 0 ? h.hint : undefined}>
          {batches.length === 0 ? (
            <EmptyState title={h.emptyTitle}>{h.empty}</EmptyState>
          ) : (
            <ul className="fb-list">
              {batches.map((b) => {
                const status = batchStatus(b);
                const when = fmtDateTime(b.sentAt ?? b.updatedAt, locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
                return (
                  <li key={b.key} className="fb">
                    <div className="fb__head">
                      <span className="list__main">
                        <span className="list__name t-ui">
                          <a className="fb__path list__text" href={b.url} data-tip={h.openPage}>{b.path}</a>
                        </span>
                        <span className="list__sub t-small">
                          <span>{b.sentAt ? h.sentOn(when) : h.draftOn(when)}</span>
                          {b.resolvedAt && <span>{h.resolvedOn(fmtDateTime(b.resolvedAt, locale, { day: "numeric", month: "short" }))}</span>}
                          <span>{h.notes(b.notes.length)}</span>
                        </span>
                      </span>
                      <Chip className="t-label" tone={status === "resolved" ? "moss" : status === "sent" ? "paper" : "butter"}>{h.status[status]}</Chip>
                    </div>
                    <ol className="fb__notes">
                      {b.notes.map((n) => (
                        <li key={n.id} className="fb__note">
                          <span className="fb__el t-small" data-tip={n.elementPath}>{n.element}</span>
                          {n.selectedText && <q className="fb__quote t-small">{n.selectedText}</q>}
                          <p className="fb__comment">{n.comment}</p>
                        </li>
                      ))}
                    </ol>
                  </li>
                );
              })}
            </ul>
          )}
        </SettingsWindow>
      </div>
    </>
  );
}
