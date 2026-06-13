import { sql } from 'drizzle-orm';
import { boolean, check, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Audit table for IPFS pinning attempts (story-81). Every call to
 * `pinFeedback()` writes one row regardless of success/failure, so
 * post-hoc queries can answer:
 *   - "did we successfully pin every attested envelope?"
 *   - "which service was up when?"
 *   - "which CIDs are at risk of being unpinned if a service deletes data?"
 *
 * `cid` is NOT unique — re-pinning the same envelope produces the same
 * CID (content-addressed) and a separate receipt is the correct shape so
 * we know the second pin call happened.
 */
export const pinReceipts = pgTable(
  'pin_receipts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cid: text('cid').notNull(),
    /** Agent id (registry-side, decimal uint256 string — matches attestations.agentId). */
    agentId: text('agent_id').notNull(),
    /** bytes32 keccak256 of the canonical envelope content — the on-chain dataHash. */
    hash: text('hash').notNull(),
    primaryService: text('primary_service').notNull(),
    primaryPinId: text('primary_pin_id'),
    primaryOk: boolean('primary_ok').notNull(),
    primaryError: text('primary_error'),
    fallbackService: text('fallback_service').notNull(),
    fallbackPinId: text('fallback_pin_id'),
    fallbackOk: boolean('fallback_ok').notNull(),
    fallbackError: text('fallback_error'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    /** CID must be a CIDv1 (bafy...) or CIDv0 (Qm...). */
    cidShape: check('pin_receipts_cid_shape', sql`${table.cid} ~ '^(bafy|Qm)[A-Za-z0-9]+$'`),
    /** agent_id uint256 decimal string. */
    agentIdUint256: check('pin_receipts_agent_id_uint256', sql`${table.agentId} ~ '^[0-9]+$'`),
    /** hash is bytes32 hex. */
    hashBytes32: check('pin_receipts_hash_bytes32', sql`${table.hash} ~ '^0x[0-9a-fA-F]{64}$'`),
    /** At least ONE service must have succeeded — both-fail is the throw path, not a row. */
    atLeastOneOk: check(
      'pin_receipts_at_least_one_ok',
      sql`${table.primaryOk} = true OR ${table.fallbackOk} = true`,
    ),
  }),
);

export type PinReceipt = typeof pinReceipts.$inferSelect;
export type NewPinReceipt = typeof pinReceipts.$inferInsert;
