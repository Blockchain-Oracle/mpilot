import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema/index.ts';

export type DbClient = NodePgDatabase<typeof schema>;

/**
 * Creates a Drizzle client backed by a node-postgres connection pool.
 * Pool is exposed on the returned object so consumers (worker, web, mcp) can
 * call `pool.end()` during graceful shutdown.
 */
export function createDbClient(databaseUrl: string): { db: DbClient; pool: Pool } {
  if (!databaseUrl) {
    throw new Error(
      '[@concierge/db] createDbClient: databaseUrl is required (expected a Postgres connection string).',
    );
  }
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });
  return { db, pool };
}
