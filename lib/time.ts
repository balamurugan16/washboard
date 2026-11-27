import { desc, eq, sql } from 'drizzle-orm';
import { timeEntryTable } from '@/db/schema';
import { getDb } from './db';

type TimeEntryInput = { startAt: string; endAt: string; activity: string; tag: string };
export type SleepDay = { date: string; hours: number };

export async function addTimeEntry({ startAt, endAt, activity, tag }: TimeEntryInput) {
  const [entry] = await getDb().insert(timeEntryTable).values({
    startAt: sql`${startAt}::timestamptz`,
    endAt: sql`${endAt}::timestamptz`,
    activity,
    tag,
  }).returning();
  return entry;
}

export function listTimeEntries(limit: number, offset: number) {
  return getDb().select().from(timeEntryTable)
    .orderBy(desc(timeEntryTable.startAt), desc(timeEntryTable.id))
    .limit(limit).offset(offset);
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
