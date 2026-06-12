import { bigint, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { agents } from './agents.ts';

/** Lifecycle status of an EOA-fallback queued transaction. */
export type EoaTxStatus = 'pending' | 'signed' | 'confirmed' | 'failed';

/**
 * EOA-fallback queue (per ADR-010): if the ERC-4337 path fails on Day 1 the
 * agent enqueues an unsigned tx here for the user to sign client-side later.
 * Loses the autopilot UX but the tick loop survives.
 */
export const eoaTxQueue = pgTable('eoa_tx_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  to: text('to').notNull(),
  data: text('data').notNull(),
  /** wei, stored as text — bigint would overflow JS Number on display; numeric is wasteful. */
  value: text('value').notNull(),
  status: text('status').notNull().$type<EoaTxStatus>(),
  signedTx: text('signed_tx'),
  txHash: text('tx_hash'),
  blockNumber: bigint('block_number', { mode: 'bigint' }),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export type EoaTx = typeof eoaTxQueue.$inferSelect;
export type NewEoaTx = typeof eoaTxQueue.$inferInsert;
