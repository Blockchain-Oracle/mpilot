import { sql } from 'drizzle-orm';
import { bigint, check, jsonb, pgEnum, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { agents } from './agents.ts';

/** Phase of the orchestrator state machine — enforced via pgEnum. */
export const tickPhaseEnum = pgEnum('tick_phase', [
  'plan',
  'simulate',
  'propose',
  'execute',
  'record',
]);
export type TickPhase = (typeof tickPhaseEnum.enumValues)[number];

/** Lifecycle status of a single tick — enforced via pgEnum. */
export const tickStatusEnum = pgEnum('tick_status', [
  'noop',
  'awaiting_approval',
  'awaiting_signature',
  'executed',
  'failed',
]);
export type TickStatus = (typeof tickStatusEnum.enumValues)[number];

/**
 * One row per tick fire. `phase` is which orchestrator phase ran last;
 * `status` is the terminal disposition. `payloadJson` carries phase outputs
 * for replay / debugging.
 */
export const ticks = pgTable(
  'ticks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    phase: tickPhaseEnum('phase').notNull(),
    status: tickStatusEnum('status').notNull(),
    payloadJson: jsonb('payload_json').notNull(),
    durationMs: bigint('duration_ms', { mode: 'number' }),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => ({
    /**
     * Terminal statuses (noop, executed, failed) require completedAt + durationMs.
     * Non-terminal (awaiting_*) leave them NULL until resolved. Catches "executed
     * but never completed" rows from a worker crashed mid-write.
     */
    terminalHasCompletedAt: check(
      'ticks_terminal_has_completed_at',
      sql`(${table.status} IN ('noop','executed','failed')) = (${table.completedAt} IS NOT NULL)`,
    ),
    /** completedAt cannot precede startedAt. */
    completedAfterStarted: check(
      'ticks_completed_after_started',
      sql`${table.completedAt} IS NULL OR ${table.completedAt} >= ${table.startedAt}`,
    ),
  }),
);

export type Tick = typeof ticks.$inferSelect;
export type NewTick = typeof ticks.$inferInsert;
