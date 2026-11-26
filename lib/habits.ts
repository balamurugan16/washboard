import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { habitCheckInTable, habitPeriodTable } from '@/db/schema';
import { getDb } from './db';

export type HabitPeriod = typeof habitPeriodTable.$inferSelect;

export async function createHabitPeriod(period: Omit<HabitPeriod, 'id'>) {
  const [created] = await getDb().insert(habitPeriodTable).values(period).returning();
  return created;
}

export function listHabitPeriods() {
  return getDb().select().from(habitPeriodTable)
    .orderBy(desc(habitPeriodTable.startDate), desc(habitPeriodTable.id));
}

export function listHabitCheckIns(periodId: number, from: string, to: string) {
  return getDb().select({ date: habitCheckInTable.date, habitIndex: habitCheckInTable.habitIndex })
    .from(habitCheckInTable)
    .where(and(
      eq(habitCheckInTable.periodId, periodId),
      eq(habitCheckInTable.completed, true),
      gte(habitCheckInTable.date, from),
      lte(habitCheckInTable.date, to),
    ))
    .orderBy(habitCheckInTable.date, habitCheckInTable.habitIndex);
}

export async function setHabitCompletion({ periodId, date, habitIndex, completed }: typeof habitCheckInTable.$inferInsert) {
  const result = await getDb().execute(sql`
    INSERT INTO ${habitCheckInTable} (period_id, date, habit_index, completed)
    SELECT id, ${date}::date, ${habitIndex}::integer, ${completed}::boolean
    FROM ${habitPeriodTable}
    WHERE id = ${periodId}
      AND ${date}::date BETWEEN start_date AND end_date
      AND ${habitIndex}::integer BETWEEN 1 AND cardinality(habits)
    ON CONFLICT (period_id, date, habit_index)
    DO UPDATE SET completed = excluded.completed
  `);
  return result.rowCount === 1;
}

export function endOfHabitPeriod(startDate: string, months: number) {
  const end = new Date(startDate);
  const day = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + months + 1, 0);
  end.setUTCDate(Math.min(day, end.getUTCDate()) - 1);
  return end.toISOString().split('T')[0];
}
