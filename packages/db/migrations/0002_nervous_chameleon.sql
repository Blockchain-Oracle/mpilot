ALTER TABLE "agents" ALTER COLUMN "erc8004_agent_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_erc8004_agent_id_uint256" CHECK ("agents"."erc8004_agent_id" IS NULL OR "agents"."erc8004_agent_id" ~ '^[0-9]+$');
