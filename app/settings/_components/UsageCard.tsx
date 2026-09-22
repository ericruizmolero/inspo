// AI spend of the workspace over the last days, by action and by person
import type { UsageSummary } from "@/lib/usage";
import { UserAvatar } from "@/components/WorkspaceMenu";
import { getT, fmtUsd } from "@/lib/i18n";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function UsageCard({ usage, images }: { usage: UsageSummary; images: Record<string, string | null> }) {
  const { locale, t } = await getT();
  const usd = (n: number) => fmtUsd(n, locale);
  return (
      <Card>
        <CardHeader>
          <CardTitle>{t.team.aiUsage}</CardTitle>
          <CardDescription>{t.team.lastDays(usage.sinceDays)}</CardDescription>
          <CardAction className="card-figure">{usd(usage.totalUsd)}</CardAction>
        </CardHeader>
        <CardContent>
          {usage.byAction.length === 0 ? (
            <p className="card-note">{t.team.noCalls}</p>
          ) : (
            <>
              <ul className="list">
                {usage.byAction.map((a) => (
                  <li key={a.action} className="list__row">
                    <span className="list__main">
                      <span className="list__name">{t.labels.action[a.action as keyof typeof t.labels.action] ?? a.action}</span>
                      <span className="list__sub">{a.action.startsWith("jev_") && a.units ? t.team.itemsInCalls(a.units, a.calls) : t.team.calls(a.calls)}</span>
                    </span>
                    <span className="list__role">{usd(a.usd)}</span>
                  </li>
                ))}
              </ul>
              {usage.byUser.length > 1 && (
                <>
                  <Separator className="my-3" />
                  <h3 className="card-subhead">{t.team.perPerson}</h3>
                  <ul className="list">
                    {usage.byUser.map((u) => (
                      <li key={u.userId ?? "sys"} className="list__row">
                        <UserAvatar name={u.name ?? t.team.system} image={u.userId ? images[u.userId] : null} small />
                        <span className="list__main"><span className="list__name">{u.name ?? t.team.system}</span><span className="list__sub">{t.team.calls(u.calls)}</span></span>
                        <span className="list__role">{usd(u.usd)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </CardContent>
        {usage.byAction.length > 0 && <CardFooter><p className="card-note">{t.team.costNote}</p></CardFooter>}
      </Card>
  );
}
