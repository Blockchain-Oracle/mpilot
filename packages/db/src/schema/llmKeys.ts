import { sql } from 'drizzle-orm';
import { check, customType, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { agents } from './agents.ts';

/** BYTEA column — see schema/sessionKeys.ts for rationale. */
const bytea = customType<{ data: Buffer; driverData: Buffer; default: false }>({
  dataType() {
    return 'bytea';
  },
});

/**
 * Per-agent encrypted LLM provider keys. The user pastes their Anthropic /
 * OpenAI / Google / xAI key during onboarding; `/api/agents` verifies it via
 * `/api/llm-verify` then writes it here encrypted with AES-256-GCM (see
 * `packages/smart-account/src/crypto/sessionKeyEnvelope.ts`).
 *
 * Encryption AAD binds `{agentId, provider}` (same IDOR-mitigation pattern as
 * `session_keys.encrypted_private_key`). Per-user KMS derivation: actual key
 * material = `HKDF-SHA256(CONCIERGE_KMS_ROOT, salt=agents.userId, info='llm-key')`.
 * If `CONCIERGE_KMS_ROOT` is compromised the blast radius is bounded by the
 * userId set; if a single ciphertext is leaked the attacker still needs the
 * user-specific derived key.
 */
export const llmKeys = pgTable(
  'llm_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    ciphertext: bytea('ciphertext').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    providerKnown: check(
      'llm_keys_provider_known',
      sql`${table.provider} IN ('anthropic','openai','google','xai')`,
    ),
    // One key per (agent, provider) — re-pasting overwrites via DO UPDATE.
    agentProviderUnique: unique('llm_keys_agent_provider_unique').on(table.agentId, table.provider),
  }),
);
