import { sql } from 'drizzle-orm';
import { check, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { agents } from './agents.ts';

/**
 * Per-agent chat message history. Used by /app/chat (r6) to render
 * cross-session conversation context — the dashboard mounts and loads the
 * tail of this table for the current agent.
 *
 * `content` carries the Vercel AI SDK UIMessage shape (role + parts[]).
 * `toolCalls` is non-null only when `role === 'assistant'` and the message
 * fired tool calls; persists the call list for replay + audit.
 */
export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    content: jsonb('content').notNull(),
    toolCalls: jsonb('tool_calls'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    roleKnown: check(
      'chat_messages_role_known',
      sql`${table.role} IN ('user','assistant','tool','system')`,
    ),
    byAgentRecent: index('chat_messages_by_agent_recent_idx').on(table.agentId, table.createdAt),
  }),
);
