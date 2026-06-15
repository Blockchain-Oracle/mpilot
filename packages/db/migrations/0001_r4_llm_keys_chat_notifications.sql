CREATE TABLE IF NOT EXISTS "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" jsonb NOT NULL,
	"tool_calls" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_messages_role_known" CHECK ("chat_messages"."role" IN ('user','assistant','tool','system'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ipfs_cache" (
	"cid" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ipfs_cache_cid_shape" CHECK ("ipfs_cache"."cid" ~ '^ba[a-z2-7]{56,256}$' OR "ipfs_cache"."cid" ~ '^Qm[1-9A-HJ-NP-Za-km-z]{44}$'),
	CONSTRAINT "ipfs_cache_content_size" CHECK (length("ipfs_cache"."content") <= 1048576)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "llm_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"ciphertext" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "llm_keys_agent_provider_unique" UNIQUE("agent_id","provider"),
	CONSTRAINT "llm_keys_provider_known" CHECK ("llm_keys"."provider" IN ('anthropic','openai','google','xai'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_prefs" (
	"agent_id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"on_stale_approval" boolean DEFAULT true NOT NULL,
	"on_daily_summary" boolean DEFAULT false NOT NULL,
	"on_emergency_stop" boolean DEFAULT true NOT NULL,
	"on_welcome" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_prefs_email_shape" CHECK ("notification_prefs"."email" ~* '^[^s@]+@[^s@]+.[^s@]+$')
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pin_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cid" text NOT NULL,
	"agent_id" text NOT NULL,
	"hash" text NOT NULL,
	"cid_divergence" boolean DEFAULT false NOT NULL,
	"primary_service" text NOT NULL,
	"primary_cid" text,
	"primary_pin_id" text,
	"primary_ok" boolean NOT NULL,
	"primary_error" text,
	"primary_not_configured" boolean DEFAULT false NOT NULL,
	"fallback_service" text NOT NULL,
	"fallback_cid" text,
	"fallback_pin_id" text,
	"fallback_ok" boolean NOT NULL,
	"fallback_error" text,
	"fallback_not_configured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pin_receipts_cid_shape" CHECK ("pin_receipts"."cid" ~ '^ba[a-z2-7]{56,256}$' OR "pin_receipts"."cid" ~ '^Qm[1-9A-HJ-NP-Za-km-z]{44}$'),
	CONSTRAINT "pin_receipts_primary_cid_shape" CHECK ("pin_receipts"."primary_cid" IS NULL OR "pin_receipts"."primary_cid" ~ '^ba[a-z2-7]{56,256}$' OR "pin_receipts"."primary_cid" ~ '^Qm[1-9A-HJ-NP-Za-km-z]{44}$'),
	CONSTRAINT "pin_receipts_fallback_cid_shape" CHECK ("pin_receipts"."fallback_cid" IS NULL OR "pin_receipts"."fallback_cid" ~ '^ba[a-z2-7]{56,256}$' OR "pin_receipts"."fallback_cid" ~ '^Qm[1-9A-HJ-NP-Za-km-z]{44}$'),
	CONSTRAINT "pin_receipts_agent_id_uint256" CHECK ("pin_receipts"."agent_id" ~ '^[0-9]+$'),
	CONSTRAINT "pin_receipts_hash_bytes32" CHECK ("pin_receipts"."hash" ~ '^0x[0-9a-fA-F]{64}$'),
	CONSTRAINT "pin_receipts_at_least_one_ok" CHECK ("pin_receipts"."primary_ok" = true OR "pin_receipts"."fallback_ok" = true)
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "llm_keys" ADD CONSTRAINT "llm_keys_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_prefs" ADD CONSTRAINT "notification_prefs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_messages_by_agent_recent_idx" ON "chat_messages" USING btree ("agent_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ipfs_cache_last_accessed" ON "ipfs_cache" USING btree ("last_accessed_at");