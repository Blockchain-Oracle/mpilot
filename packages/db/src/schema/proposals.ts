import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { agents } from './agents.ts';
import { ticks } from './ticks.ts';

/** Action class — enforced via pgEnum (discriminates planJsonb shape). */
export const proposalKindEnum = pgEnum('proposal_kind', ['supply', 'borrow', 'swap', 'bridge']);
export type ProposalKind = (typeof proposalKindEnum.enumValues)[number];

/** Source protocol — enforced via pgEnum (CLAUDE.md 7-provider list). */
export const proposalProtocolEnum = pgEnum('proposal_protocol', [
  'aave',
  'merchant-moe',
  'agni',
  'fusionx',
  'ethena',
  'ondo',
  'meth-staking',
  'lifi',
]);
export type ProposalProtocol = (typeof proposalProtocolEnum.enumValues)[number];

/** Lifecycle status of a proposal — enforced via pgEnum. */
export const proposalStatusEnum = pgEnum('proposal_status', [
  'pending',
  'approved',
  'rejected',
  'expired',
]);
export type ProposalStatus = (typeof proposalStatusEnum.enumValues)[number];

/**
 * The propose-phase output. `kind` + `protocol` discriminate the planJsonb shape.
 *
 * Unique partial index `(agent_id) WHERE status='pending'` enforces the
 * idempotence guard: a re-tick before the user resolves the prior proposal
 * cannot insert a duplicate (per research/concierge/04-agent-runtime.md § 4).
 */
export const proposals = pgTable(
  'proposals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    tickId: uuid('tick_id')
      .notNull()
      .references(() => ticks.id, { onDelete: 'cascade' }),
    kind: proposalKindEnum('kind').notNull(),
    /** USD-denominated trade size, stored as numeric for precision (no float drift). */
    amountUsd: numeric('amount_usd', { precision: 30, scale: 8 }).notNull(),
    protocol: proposalProtocolEnum('protocol').notNull(),
    planJson: jsonb('plan_json').notNull(),
    simJson: jsonb('sim_json').notNull(),
    status: proposalStatusEnum('status').notNull(),
    /** True ⇒ user must click-through; false ⇒ falls under auto-approve threshold. */
    requiresApproval: boolean('requires_approval').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => ({
    /**
     * At most one pending proposal per agent — the propose phase must wait for
     * the user to resolve before generating a new one. Catches the
     * duplicate-proposal regression from a re-tick mid-resolution.
     */
    onePendingPerAgent: uniqueIndex('proposals_one_pending_per_agent')
      .on(table.agentId)
      .where(sql`${table.status} = 'pending'`),
    /**
     * Reject NaN and negative values. Postgres `numeric` accepts the literal 'NaN'
     * by default; downstream aggregations would silently propagate it. NOTE: the
     * IEEE-754 `x = x` idiom does NOT work for Postgres numeric — NaN equals
     * itself AND is greater than every other value. Use explicit comparison
     * against `'NaN'::numeric`.
     */
    amountUsdNotNan: check(
      'proposals_amount_usd_finite_nonneg',
      sql`${table.amountUsd} <> 'NaN'::numeric AND ${table.amountUsd} >= 0`,
    ),
    /** Sanity guard: a proposal must expire after it's created. */
    expiresAfterCreated: check(
      'proposals_expires_after_created',
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
    /** Terminal status (non-pending) requires resolvedAt; pending requires it to be NULL. */
    resolvedAtCoPresent: check(
      'proposals_resolved_at_co_present',
      sql`(${table.status} = 'pending') = (${table.resolvedAt} IS NULL)`,
    ),
  }),
);

export type Proposal = typeof proposals.$inferSelect;
export type NewProposal = typeof proposals.$inferInsert;
