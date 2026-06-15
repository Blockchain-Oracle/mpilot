import { sql } from 'drizzle-orm';
import { check, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/** Mantle chain literal — enforced at the DB layer via pgEnum. */
export const agentChainEnum = pgEnum('agent_chain', ['mantle-mainnet', 'mantle-sepolia']);
export type AgentChain = (typeof agentChainEnum.enumValues)[number];

/**
 * The agent record — one per (user, smart-account) pair. The policy + goal JSON
 * blobs are the runtime contract the tick worker reads on every fire.
 */
export const agents = pgTable(
  'agents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    smartAccountAddr: text('smart_account_addr').notNull(),
    /**
     * ERC-8004 on-chain agent id (uint256). Stored as a decimal string — same
     * encoding as `attestations.agentId` — so cross-table joins/sorts agree and
     * the value round-trips through JSON without bigint. CHECK enforces the shape.
     */
    erc8004AgentId: text('erc8004_agent_id'),
    ownerEoa: text('owner_eoa').notNull(),
    /** Composed policy bundle (call permissions + spending limits + time-frame). */
    policyJson: jsonb('policy_json').notNull(),
    /** User-stated goal (autopilot intent: target APY, max drawdown, allowed protocols). */
    goalJson: jsonb('goal_json').notNull(),
    chain: agentChainEnum('chain').notNull(),
    activatedAt: timestamp('activated_at', { withTimezone: true, mode: 'date' }).notNull(),
    pausedAt: timestamp('paused_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    // uint256 decimal-string shape — same contract as attestations.agentId so
    // joins/sorts across the two tables agree. NULL is allowed (id unset before mint).
    erc8004AgentIdUint256: check(
      'agents_erc8004_agent_id_uint256',
      sql`${table.erc8004AgentId} IS NULL OR ${table.erc8004AgentId} ~ '^[0-9]+$'`,
    ),
  }),
);

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
