import { sql } from 'drizzle-orm';
import { check, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Mirror of on-chain ERC-8004 attestations for fast off-chain queries (reputation
 * timelines, agent reputation scoring without re-reading the registry every tick).
 * Primary key is the on-chain UID — uniqueness guaranteed by the registry contract.
 *
 * `agentId` is `text` to preserve flexibility if the registry ever issues
 * non-numeric ids, but a CHECK constraint enforces the uint256-shape contract
 * with `agents.erc8004AgentId` (also a uint256 decimal string). Without this, two writers using
 * different encodings ('10' vs '0xa') silently miss each other in joins, and
 * `ORDER BY agent_id` sorts lexicographically (silently wrong since `'10' < '2'`).
 */
export const attestations = pgTable(
  'attestations',
  {
    uid: text('uid').primaryKey(),
    schemaUid: text('schema_uid').notNull(),
    /** Agent id (registry-side). NOT a FK because attestations can outlive a local agent record. */
    agentId: text('agent_id').notNull(),
    payloadJson: jsonb('payload_json').notNull(),
    txHash: text('tx_hash').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    /** agent_id must be a uint256 decimal string — matches agents.erc8004AgentId encoding. */
    agentIdUint256: check('attestations_agent_id_uint256', sql`${table.agentId} ~ '^[0-9]+$'`),
    /** uid is bytes32 hex from the on-chain registry. */
    uidIsBytes32: check('attestations_uid_bytes32', sql`${table.uid} ~ '^0x[0-9a-fA-F]{64}$'`),
    /** schema_uid is bytes32 hex from the on-chain registry. */
    schemaUidIsBytes32: check(
      'attestations_schema_uid_bytes32',
      sql`${table.schemaUid} ~ '^0x[0-9a-fA-F]{64}$'`,
    ),
    /** tx_hash is bytes32 hex. */
    txHashIsBytes32: check(
      'attestations_tx_hash_bytes32',
      sql`${table.txHash} ~ '^0x[0-9a-fA-F]{64}$'`,
    ),
  }),
);

export type Attestation = typeof attestations.$inferSelect;
export type NewAttestation = typeof attestations.$inferInsert;
