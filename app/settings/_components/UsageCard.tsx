// AI spend of the workspace over the last days, by action and by person
import type { UsageSummary } from "@/lib/usage";
import { getT, fmtUsd } from "@/lib/i18n";
import { EmptyState, SettingsWindow } from "@/components/criterio";
import PersonAvatar from "@/components/PersonAvatar";
import CappedList from "./CappedList";

export default async function UsageCard({ usage, images }: { usage: UsageSummary; images: Record<string, string | null> }) {
  const { locale, t } = await getT();
  const usd = (n: number) => fmtUsd(n, locale);
  return (
    <SettingsWindow title={t.team.aiUsage} figure={usd(usage.totalUsd)} description={t.team.lastDays(usage.sinceDays)}
      note={usage.byAction.length > 0 ? t.team.costNote : undefined}>
      {usage.byAction.length === 0 ? (
        <EmptyState title={t.team.noCallsTitle}>{t.team.noCalls}</EmptyState>
      ) : (
        <>
          <CappedList>
            {usage.byAction.map((a) => (
              <li key={a.action} className="list__row">
                <span className="list__main">
                  <span className="list__name t-ui"><span className="list__text">{t.labels.action[a.action as keyof typeof t.labels.action] ?? a.action}</span></span>
                  <span className="list__sub t-small">{a.action.startsWith("jev_") && a.units ? t.team.itemsInCalls(a.units, a.calls) : t.team.calls(a.calls)}</span>
                </span>
                <span className="list__figure t-small">{usd(a.usd)}</span>
              </li>
            ))}
          </CappedList>
          {usage.byUser.length > 1 && (
            <section className="setting-sub">
              <h3 className="t-title-s">{t.team.perPerson}</h3>
              <CappedList>
                {usage.byUser.map((u) => (
                  <li key={u.userId ?? "sys"} className="list__row">
                    <PersonAvatar name={u.name ?? t.team.system} system={!u.userId} image={u.userId ? images[u.userId] : null} size={32} />
                    <span className="list__main">
                      <span className="list__name t-ui"><span className="list__text">{u.name ?? t.team.system}</span></span>
                      <span className="list__sub t-small">{t.team.calls(u.calls)}</span>
                    </span>
                    <span className="list__figure t-small">{usd(u.usd)}</span>
                  </li>
                ))}
              </CappedList>
            </section>
          )}
        </>
      )}
    </SettingsWindow>
  );
}
