import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { weightTable } from '@/db/schema';
import { getDb } from './db';

type WeightRow = typeof weightTable.$inferSelect;
export type WeightUnit = WeightRow['units'];
export type WeightEntry = Omit<WeightRow, 'recordedAt'> & { recordedAt: string };

type WeightMeasurement = Pick<WeightEntry, 'weight'> & Partial<Pick<WeightEntry, 'units' | 'recordedAt'>>;
type WeightEdit = Pick<WeightEntry, 'id'> & Partial<WeightMeasurement>;

interface WeightQuery {
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

function timestampParameter(value: string) {
  return sql`${value}::timestamptz`;
}

export async function listWeights({ from, to, limit, offset = 0 }: WeightQuery = {}) {
  const query = getDb().select().from(weightTable)
    .where(and(
      from ? gte(weightTable.recordedAt, timestampParameter(from)) : undefined,
      to ? lte(weightTable.recordedAt, timestampParameter(to)) : undefined,
    ))
    .orderBy(desc(weightTable.recordedAt), desc(weightTable.id))
    .offset(offset);

  const rows = limit === undefined ? await query : await query.limit(limit);
  return rows.map(serializeEntry);
}

export async function addWeights(measurements: WeightMeasurement[]) {
  const entries = await getDb().insert(weightTable)
    .values(measurements.map(({ weight, units, recordedAt }) => ({
      weight,
      units,
      recordedAt: recordedAt ? timestampParameter(recordedAt) : undefined,
    })))
    .returning();

  return entries.map(serializeEntry);
}

export async function addWeight(measurement: WeightMeasurement) {
  const [entry] = await addWeights([measurement]);
  return entry;
}

export async function editWeight({ id, weight, units, recordedAt }: WeightEdit) {
  const [entry] = await getDb().update(weightTable)
    .set({ weight, units, recordedAt: recordedAt ? timestampParameter(recordedAt) : undefined })
    .where(eq(weightTable.id, id))
    .returning();

  return entry ? serializeEntry(entry) : null;
}

function serializeEntry(entry: WeightRow): WeightEntry {
  return { ...entry, recordedAt: entry.recordedAt.toISOString() };
}
