import { sql } from 'drizzle-orm';
import { bigint, check, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { proposals } from './proposals.ts';

/** Lifecycle status of an on-chain execution receipt — enforced via pgEnum. */
export const executionStatusEnum = pgEnum('execution_status', ['submitted', 'confirmed', 'failed']);
export type ExecutionStatus = (typeof executionStatusEnum.enumValues)[number];

/**
 * One row per execute-phase submission. `attestationUid` + `attestationTxHash`
 * link to the matching ERC-8004 record() per ADR-004 — every successful execute
 * MUST be followed by a record() writing giveFeedback.
 *
 * **DB-enforced invariant (round-2):** `status='confirmed'` requires both
 * `attestationUid` and `attestationTxHash` to be non-null. ADR-004 is the
 * verifiability claim that justifies Track 6 — without this constraint the only
 * thing keeping the project's reputation story alive is the worker remembering
 * to call record(). That's the silent-failure shape CLAUDE.md forbids.
 */
export const executions = pgTable(
  'executions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    proposalId: uuid('proposal_id')
      .notNull()
      .references(() => proposals.id, { onDelete: 'cascade' }),
    txHash: text('tx_hash').notNull(),
    blockNumber: bigint('block_number', { mode: 'bigint' }),
    gasUsed: bigint('gas_used', { mode: 'bigint' }),
    attestationUid: text('attestation_uid'),
    attestationTxHash: text('attestation_tx_hash'),
    status: executionStatusEnum('status').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    /** ADR-004: every confirmed execute MUST have a paired record() attestation. */
    confirmedHasAttestation: check(
      'executions_confirmed_has_attestation',
      sql`${table.status} <> 'confirmed' OR (${table.attestationUid} IS NOT NULL AND ${table.attestationTxHash} IS NOT NULL)`,
    ),
    /** Attestation fields are independently nullable but must be co-present. */
    attestationCoPresent: check(
      'executions_attestation_co_present',
      sql`(${table.attestationUid} IS NULL) = (${table.attestationTxHash} IS NULL)`,
    ),
    /** Bytes32 hex format on tx hashes. */
    txHashIsBytes32: check(
      'executions_tx_hash_bytes32',
      sql`${table.txHash} ~ '^0x[0-9a-fA-F]{64}$'`,
    ),
    attestationTxHashIsBytes32: check(
      'executions_attestation_tx_hash_bytes32',
      sql`${table.attestationTxHash} IS NULL OR ${table.attestationTxHash} ~ '^0x[0-9a-fA-F]{64}$'`,
    ),
    attestationUidIsBytes32: check(
      'executions_attestation_uid_bytes32',
      sql`${table.attestationUid} IS NULL OR ${table.attestationUid} ~ '^0x[0-9a-fA-F]{64}$'`,
    ),
  }),
);

export type Execution = typeof executions.$inferSelect;
export type NewExecution = typeof executions.$inferInsert;
