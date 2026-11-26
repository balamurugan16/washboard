import { sql } from 'drizzle-orm';
import { boolean, check, date, index, integer, numeric, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';

export const weightTable = pgTable('weight', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
  weight: numeric({ precision: 7, scale: 3, mode: 'number' }).notNull(),
  units: text({ enum: ['kg', 'lb'] }).notNull().default('kg'),
}, (table) => [
  check('weight_weight_check', sql`${table.weight} > 0 AND ${table.weight} <= 9999`),
  check('weight_units_check', sql`${table.units} IN ('kg', 'lb')`),
  index('weight_recorded_at_idx').on(table.recordedAt.desc(), table.id.desc()),
]);

export const habitPeriodTable = pgTable('habit_period', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  habits: text().array().notNull(),
}, (table) => [
  check('habit_period_dates_check', sql`${table.startDate} <= ${table.endDate}`),
  check('habit_period_habit_count_check', sql`cardinality(${table.habits}) BETWEEN 1 AND 10`),
]);

export const habitCheckInTable = pgTable('habit_check_in', {
  periodId: integer('period_id').notNull().references(() => habitPeriodTable.id),
  date: date().notNull(),
  habitIndex: integer('habit_index').notNull(),
  completed: boolean().notNull(),
}, (table) => [
  primaryKey({ columns: [table.periodId, table.date, table.habitIndex] }),
  check('habit_check_in_index_check', sql`${table.habitIndex} BETWEEN 1 AND 10`),
]);
