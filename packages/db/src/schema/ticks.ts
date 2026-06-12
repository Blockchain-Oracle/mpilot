import { bigint, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { agents } from './agents.ts';

/** Lifecycle status of a single tick — one row per (agent, fire). */
export type TickStatus =
  | 'noop'
  | 'awaiting_approval'
  | 'awaiting_signature'
  | 'executed'
  | 'failed';

/**
 * One row per tick fire. `phase` is the human-readable label (`plan` | `simulate` | …)
 * the orchestrator transitioned through; `status` is the terminal disposition.
 * `payloadJson` carries phase outputs for replay / debugging.
 */
export const ticks = pgTable('ticks', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  phase: text('phase').notNull(),
  status: text('status').notNull().$type<TickStatus>(),
  payloadJson: jsonb('payload_json').notNull(),
  durationMs: bigint('duration_ms', { mode: 'number' }),
  completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
});

export type Tick = typeof ticks.$inferSelect;
export type NewTick = typeof ticks.$inferInsert;
