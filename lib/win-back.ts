// "Your criterio is where you left it": one email to someone two weeks away from the app, naming their latest project
// with its link. From the morning's mail job (lib/job-run.ts), with the digest and the nudges.
//   - Away: their last heartbeat anywhere (activity_segment, as the digest reads it) is 14 to 21 days old. The week
//     of slack catches a morning the job missed; past it nobody hears, so a long silence is not a monthly email.
//   - Alone: a team where someone else was in these 14 days sends them its digest, which is reason enough to come back.
//   - With something to name: no project, no email. Someone who never started their first steps had the day 3 and
//     day 7 nudges (lib/first-use-mail.ts), and two weeks away means those are over.
//   - At most once every 60 days (mailEvery, key `win-back:<userId>`), and only with the digest on: it carries the
//     digest's stop link.
import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { unsubscribeHeaders, winBackMail } from "./mail";
import { mailEvery } from "./mail-once";
import { baseUrl, mailPath, projectPath, unsubscribeUrl } from "./notify";
import { toLocale } from "./i18n/locale";

const DAY = 24 * 60 * 60 * 1000;
export const AWAY_DAYS = 14;
const SLACK_DAYS = 7;
export const WIN_BACK_EVERY = 60 * DAY;

export const winBackKey = (userId: string) => `win-back:${userId}`;

/** Sends the win-backs due on the morning of `now`. `due` counts the people it would write to */
export async function sendWinBacks(now = new Date()): Promise<{ due: number; sent: number }> {
  const away = new Date(now.getTime() - AWAY_DAYS * DAY), gone = new Date(away.getTime() - SLACK_DAYS * DAY);
  const { rows } = await db.execute<{ id: string; email: string; language: string | null; project_id: string; project: string }>(sql`
    with seen as (
      select u.id, u.email, u.language, coalesce(max(s.last_seen_at), u.created_at) as last
      from "user" u left join activity_segment s on s.user_id = u.id
      where u.digest_emails
      group by u.id
    )
    select seen.id, seen.email, seen.language, p.id as project_id, p.name as project
    from seen
    cross join lateral (
      select p.id, p.name from project p join member m on m.organization_id = p.organization_id
      where m.user_id = seen.id and p.template is null
      order by p.updated_at desc limit 1
    ) p
    where seen.last <= ${away.toISOString()}::timestamptz and seen.last > ${gone.toISOString()}::timestamptz
      and not exists (
        select 1 from member m
        join organization o on o.id = m.organization_id and o.kind = 'team'
        join activity_segment s on s.organization_id = m.organization_id and s.user_id <> seen.id and s.last_seen_at > ${away.toISOString()}::timestamptz
        where m.user_id = seen.id
      )`);
  let sent = 0;
  for (const p of rows) {
    const stopUrl = unsubscribeUrl(p.id, "digest");
    const mail = winBackMail({ project: p.project, url: `${baseUrl()}${mailPath(projectPath(p.project_id))}` }, stopUrl, toLocale(p.language));
    if (await mailEvery(winBackKey(p.id), WIN_BACK_EVERY, [p.email], mail, { headers: unsubscribeHeaders(stopUrl) }, now)) sent++;
  }
  return { due: rows.length, sent };
}
