import { sql } from 'drizzle-orm';
import { check, index, integer, numeric, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

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
