import { sql } from 'drizzle-orm';
import { check, customType, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { agents } from './agents.ts';

/**
 * BYTEA column — Drizzle's stock `text()` would silently encode the AES blob
 * via the connection's client encoding and corrupt it on retrieval. Per
 * CLAUDE.md no-silent-failures.
 */
const bytea = customType<{ data: Buffer; driverData: Buffer; default: false }>({
  dataType() {
    return 'bytea';
  },
});

/**
 * Issued session keys — the per-tick credential the agent uses to sign UserOps
 * within the policy bundle composed in story-52. `encryptedPrivateKey` is the
 * KMS-wrapped secret (NEVER stored as plaintext, NEVER as text — bytea forces
 * byte fidelity). `signature` is the user's EOA approval over the policy bundle.
 */
export const sessionKeys = pgTable(
  'session_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    publicAddress: text('public_address').notNull(),
    encryptedPrivateKey: bytea('encrypted_private_key').notNull(),
    policyJson: jsonb('policy_json').notNull(),
    signature: text('signature').notNull(),
    validUntil: timestamp('valid_until', { withTimezone: true, mode: 'date' }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    /** publicAddress must look like an EVM address. */
    publicAddressIsAddress: check(
      'session_keys_public_address_is_address',
      sql`${table.publicAddress} ~ '^0x[0-9a-fA-F]{40}$'`,
    ),
    /** signature must be 0x-prefixed hex with byte parity. */
    signatureIsHex: check(
      'session_keys_signature_is_hex',
      sql`${table.signature} ~ '^0x([0-9a-fA-F]{2})*$'`,
    ),
    /** validUntil must be after createdAt (session keys cannot be born expired). */
    validUntilAfterCreated: check(
      'session_keys_valid_until_after_created',
      sql`${table.validUntil} > ${table.createdAt}`,
    ),
    /** revokedAt must be >= createdAt when set. */
    revokedAfterCreated: check(
      'session_keys_revoked_after_created',
      sql`${table.revokedAt} IS NULL OR ${table.revokedAt} >= ${table.createdAt}`,
    ),
  }),
);

export type SessionKey = typeof sessionKeys.$inferSelect;
export type NewSessionKey = typeof sessionKeys.$inferInsert;
