import { bigint, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { proposals } from './proposals.ts';

/** Lifecycle status of an on-chain execution receipt. */
export type ExecutionStatus = 'submitted' | 'confirmed' | 'failed';

/**
 * One row per execute-phase submission. `attestationUid` + `attestationTxHash`
 * link to the matching ERC-8004 record() per ADR-004 — every successful execute
 * MUST be followed by a record() writing giveFeedback.
 */
export const executions = pgTable('executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  proposalId: uuid('proposal_id')
    .notNull()
    .references(() => proposals.id, { onDelete: 'cascade' }),
  txHash: text('tx_hash').notNull(),
  blockNumber: bigint('block_number', { mode: 'bigint' }),
  gasUsed: bigint('gas_used', { mode: 'bigint' }),
  attestationUid: text('attestation_uid'),
  attestationTxHash: text('attestation_tx_hash'),
  status: text('status').notNull().$type<ExecutionStatus>(),
  recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export type Execution = typeof executions.$inferSelect;
export type NewExecution = typeof executions.$inferInsert;
