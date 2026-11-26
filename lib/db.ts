import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const globalDatabase = globalThis as typeof globalThis & { washboardPool?: pg.Pool };

export function getErrorCode(error: unknown): string | undefined {
  if (error instanceof Error && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
}

export function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing.');
  }

  if (!globalDatabase.washboardPool) {
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 10_000,
    });
    pool.on('error', (error) => {
      console.error('An idle PostgreSQL connection failed.', getErrorCode(error) ?? 'connection error');
    });
    globalDatabase.washboardPool = pool;
  }

  return globalDatabase.washboardPool;
}

let database: ReturnType<typeof drizzle> | undefined;

export function getDb() {
  return database ??= drizzle({ client: getPool() });
}
