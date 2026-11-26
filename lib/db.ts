import pg from 'pg';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/node-postgres';

interface CloudflareBindings {
  HYPERDRIVE?: { connectionString: string };
}

export function getErrorCode(error: unknown): string | undefined {
  if (error instanceof Error && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
}

export function getPool() {
  let connectionString: string | undefined;

  try {
    const env = getCloudflareContext().env as CloudflareBindings;
    connectionString = env.HYPERDRIVE?.connectionString;
  } catch {
    // next dev and standalone Node.js use DATABASE_URL from .env.
  }

  connectionString ??= process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is missing.');
  }

  const pool = new pg.Pool({
    connectionString,
    max: 1,
    maxUses: 1,
    connectionTimeoutMillis: 10_000,
  });
  pool.on('error', (error) => {
    console.error('A PostgreSQL connection failed.', getErrorCode(error) ?? 'connection error');
  });

  return pool;
}

export function getDb() {
  return drizzle({ client: getPool() });
}
