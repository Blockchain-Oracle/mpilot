import { sql } from 'drizzle-orm';
import { boolean, check, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { agents } from './agents.ts';

/**
 * Per-agent notification preferences. Drives the Resend transactional email
 * channel + (later) web-push notifications. One row per agent; user creates
 * via `/api/notifications/preferences` after activation.
 */
export const notificationPrefs = pgTable(
  'notification_prefs',
  {
    agentId: uuid('agent_id')
      .primaryKey()
      .references(() => agents.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    onStaleApproval: boolean('on_stale_approval').notNull().default(true),
    onDailySummary: boolean('on_daily_summary').notNull().default(false),
    onEmergencyStop: boolean('on_emergency_stop').notNull().default(true),
    onWelcome: boolean('on_welcome').notNull().default(true),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    emailShape: check(
      'notification_prefs_email_shape',
      sql`${table.email} ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'`,
    ),
  }),
);
