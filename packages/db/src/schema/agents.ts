import { bigint, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/** Mantle chain literal — kept narrow at the DB layer for query-time correctness. */
export type AgentChain = 'mantle-mainnet' | 'mantle-sepolia';

/**
 * The agent record — one per (user, smart-account) pair. The policy + goal JSON
 * blobs are the runtime contract the tick worker reads on every fire.
 */
export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  smartAccountAddr: text('smart_account_addr').notNull(),
  /** ERC-8004 on-chain agent id. Bigint because the registry uses uint256. */
  erc8004AgentId: bigint('erc8004_agent_id', { mode: 'bigint' }),
  ownerEoa: text('owner_eoa').notNull(),
  /** Composed policy bundle (call permissions + spending limits + time-frame). */
  policyJson: jsonb('policy_json').notNull(),
  /** User-stated goal (autopilot intent: target APY, max drawdown, allowed protocols). */
  goalJson: jsonb('goal_json').notNull(),
  chain: text('chain').notNull().$type<AgentChain>(),
  activatedAt: timestamp('activated_at', { withTimezone: true, mode: 'date' }).notNull(),
  pausedAt: timestamp('paused_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
