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

export async function renameHabitPeriod(periodId: number, name: string) {
  const [period] = await getDb().update(habitPeriodTable).set({ name })
    .where(eq(habitPeriodTable.id, periodId)).returning();
  return period;
}

export function editFutureHabits(periodId: number, habits: string[]) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  now.setUTCDate(now.getUTCDate() + 1);
  const tomorrow = now.toISOString().slice(0, 10);

  return getDb().transaction(async (tx) => {
    const [period] = await tx.select().from(habitPeriodTable)
      .where(eq(habitPeriodTable.id, periodId)).for('update');
    if (!period) return { error: 'Choose an existing period.' };
    if (period.endDate <= today) return { error: 'This period has no future dates to edit.' };

    const isFuture = period.startDate > today;
    const effectiveDate = isFuture ? period.startDate : tomorrow;
    if (period.habits.length === habits.length && period.habits.every((habit, index) => habit === habits[index])) {
      return { period, effectiveDate };
    }

    const futureCheckIns = and(eq(habitCheckInTable.periodId, periodId), gte(habitCheckInTable.date, effectiveDate));
    const [completed] = await tx.select({ date: habitCheckInTable.date }).from(habitCheckInTable)
      .where(and(futureCheckIns, eq(habitCheckInTable.completed, true))).limit(1);
    if (completed) return { error: 'Clear recorded completions on the affected future dates before editing the list.' };

    await tx.delete(habitCheckInTable).where(futureCheckIns);
    if (isFuture) {
      const [updated] = await tx.update(habitPeriodTable).set({ habits })
        .where(eq(habitPeriodTable.id, periodId)).returning();
      return { period: updated, effectiveDate };
    }

    const [previousPeriod] = await tx.update(habitPeriodTable).set({ endDate: today })
      .where(eq(habitPeriodTable.id, periodId)).returning();
    const [nextPeriod] = await tx.insert(habitPeriodTable).values({
      name: period.name,
      startDate: effectiveDate,
      endDate: period.endDate,
      habits,
    }).returning();
    return { period: nextPeriod, previousPeriod, effectiveDate };
  });
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
    FOR SHARE
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
