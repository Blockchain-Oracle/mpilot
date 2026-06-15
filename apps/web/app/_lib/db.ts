/**
 * Server-only Drizzle client. Each Next.js Node runtime worker holds one Pool
 * via a module-singleton. Edge runtime is unsupported (pg is Node-only).
 *
 * Routes that touch the DB MUST set `export const runtime = 'nodejs';`.
 */
import { createDbClient, type DbClient } from '@concierge-mantle/db';
import type { Pool } from 'pg';

let cached: { db: DbClient; pool: Pool } | null = null;

export function getDb(): { db: DbClient; pool: Pool } {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      '[apps/web/db] DATABASE_URL is required. Set in apps/web/.env.local (e.g. postgresql://postgres:postgres@127.0.0.1:54322/postgres).',
    );
  }
  cached = createDbClient(url);
  return cached;
}
