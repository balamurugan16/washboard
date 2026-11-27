import { and, asc, desc, eq, gt, lt, sql } from 'drizzle-orm';
import { timeEntryTable } from '@/db/schema';
import { getDb } from './db';

type TimeEntryInput = { startAt: string; endAt: string; activity: string; tag: string };
export type SleepDay = { date: string; hours: number };

export function addTimeEntries(entries: TimeEntryInput[]) {
  return getDb().insert(timeEntryTable).values(entries.map(({ startAt, endAt, activity, tag }) => ({
    startAt: sql`${startAt}::timestamptz`,
    endAt: sql`${endAt}::timestamptz`,
    activity,
    tag,
  }))).returning();
}

export async function addTimeEntry(input: TimeEntryInput) {
  const [entry] = await addTimeEntries([input]);
  return entry;
}

export function listTimeEntries(limit: number, offset: number) {
  return getDb().select().from(timeEntryTable)
    .orderBy(desc(timeEntryTable.startAt), desc(timeEntryTable.id))
    .limit(limit).offset(offset);
}

export function listTimeEntriesInRange(from: string, to: string) {
  return getDb().select().from(timeEntryTable)
    .where(and(
      lt(timeEntryTable.startAt, sql`${to}::date::timestamp AT TIME ZONE 'Asia/Kolkata'`),
      gt(timeEntryTable.endAt, sql`${from}::date::timestamp AT TIME ZONE 'Asia/Kolkata'`),
    ))
    .orderBy(asc(timeEntryTable.startAt), asc(timeEntryTable.id));
}

export async function editTimeEntry(id: number, { startAt, endAt, activity, tag }: Partial<TimeEntryInput>) {
  const [entry] = await getDb().update(timeEntryTable)
    .set({
      startAt: startAt === undefined ? undefined : sql`${startAt}::timestamptz`,
      endAt: endAt === undefined ? undefined : sql`${endAt}::timestamptz`,
      activity,
      tag,
    })
    .where(eq(timeEntryTable.id, id))
    .returning();
  return entry ?? null;
}

export async function listDailySleep(now: Date = new Date()) {
  const zone = 'Asia/Kolkata';
  const result = await getDb().execute<SleepDay>(sql`
    WITH today AS (
      SELECT (${now.toISOString()}::timestamptz AT TIME ZONE ${zone})::date AS date
    ), days AS (
      SELECT today.date - offsets.days_ago AS date
      FROM today CROSS JOIN generate_series(0, 13) AS offsets(days_ago)
    ), bounds AS (
      SELECT date,
        date::timestamp AT TIME ZONE ${zone} AS day_start,
        (date + 1)::timestamp AT TIME ZONE ${zone} AS day_end
      FROM days
    )
    SELECT to_char(bounds.date, 'YYYY-MM-DD') AS date,
      COALESCE((
        SELECT SUM(EXTRACT(EPOCH FROM upper(period) - lower(period))) / 3600
        FROM unnest((
          SELECT range_agg(tstzrange(
            greatest(entry.start_at, bounds.day_start),
            least(entry.end_at, bounds.day_end)
          ))
          FROM ${timeEntryTable} AS entry
          WHERE lower(entry.tag) = 'sleep'
            AND entry.start_at < bounds.day_end
            AND entry.end_at > bounds.day_start
        )) AS periods(period)
      ), 0)::double precision AS hours
    FROM bounds
    ORDER BY bounds.date
  `);
  return result.rows;
}

export async function listTagTotals(date: string, weekStart: string) {
  const result = await getDb().execute<{ tag: string; day: number; week: number; month: number; overall: number }>(sql`
    WITH dates AS (
      SELECT ${date}::date AS day, ${weekStart}::date AS week,
        date_trunc('month', ${date}::date::timestamp) AS month
    ), bounds AS (
      SELECT
        tstzrange(day::timestamp AT TIME ZONE 'Asia/Kolkata', (day + 1)::timestamp AT TIME ZONE 'Asia/Kolkata') AS day,
        tstzrange(week::timestamp AT TIME ZONE 'Asia/Kolkata', (week + 7)::timestamp AT TIME ZONE 'Asia/Kolkata') AS week,
        tstzrange(month AT TIME ZONE 'Asia/Kolkata', (month + interval '1 month') AT TIME ZONE 'Asia/Kolkata') AS month
      FROM dates
    ), tags AS (
      SELECT min(tag) AS tag, range_agg(tstzrange(start_at, end_at)) AS periods
      FROM ${timeEntryTable}
      GROUP BY lower(tag)
    )
    SELECT tag, totals.*
    FROM tags CROSS JOIN bounds
    CROSS JOIN LATERAL (
      SELECT
        coalesce(sum(extract(epoch FROM upper(period * day) - lower(period * day))), 0)::double precision / 3600 AS day,
        coalesce(sum(extract(epoch FROM upper(period * week) - lower(period * week))), 0)::double precision / 3600 AS week,
        coalesce(sum(extract(epoch FROM upper(period * month) - lower(period * month))), 0)::double precision / 3600 AS month,
        sum(extract(epoch FROM upper(period) - lower(period)))::double precision / 3600 AS overall
      FROM unnest(tags.periods) AS items(period)
    ) AS totals
    ORDER BY lower(tag)
  `);
  return result.rows;
}
