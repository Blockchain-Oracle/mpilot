# Story — SDK config loader (env validation via Zod)

**ID:** story-24-sdk-config-loader
**Epic:** Epic E2 — Shared SDK Core
**Depends on:** story-22-sdk-skeleton
**Estimate:** ~30min
**Status:** PENDING

---

## User story

**As a** Concierge runtime operator
**I want to** missing env vars fail at boot (not at first tick) with clear messages
**So that** misconfigured deployments never silently corrupt state

---

## File modification map

- `packages/sdk/src/config.ts` — NEW — `loadConfig(env?: NodeJS.ProcessEnv)` function with Zod schema, returns typed config
- `packages/sdk/src/config.test.ts` — NEW — tests covering: happy path, missing required vars, invalid URLs, invalid chain ids, type coercion
- `packages/sdk/src/index.ts` — UPDATE — export `loadConfig` + `ConfigSchema`
- `apps/web/.env.example` — NEW — documented env var list (used by web app)
- `apps/worker/.env.example` — NEW — documented env var list (used by worker)
- `apps/mcp/.env.example` — NEW — documented env var list (used by MCP server)

---

## Acceptance criteria (BDD)

```
Given all required env vars are set
When `loadConfig({ ANTHROPIC_API_KEY: 'sk-ant-xxx', DATABASE_URL: 'postgres://...', REDIS_URL: 'redis://...', MANTLE_RPC_URL: 'https://rpc.mantle.xyz', MANTLE_CHAIN_ID: '5000' })` runs
Then it returns a typed object with `anthropicApiKey`, `databaseUrl`, `redisUrl`, `mantleRpcUrl`, `mantleChainId: 5000`

Given a required env var is missing
When `loadConfig({ ANTHROPIC_API_KEY: '' })` runs
Then it throws `ConfigError` with code `CONCIERGE_CONFIG_ERROR` and message listing the missing fields

Given MANTLE_CHAIN_ID is invalid
When `loadConfig({ ..., MANTLE_CHAIN_ID: '999' })` runs
Then it throws `ConfigError` (only 5000 + 5003 are allowed)

Given numeric coercion works
When `loadConfig({ ..., MANTLE_CHAIN_ID: '5000' })` runs (string input)
Then `config.mantleChainId` is the number `5000` (not the string)

Given URL validation works
When `loadConfig({ ..., MANTLE_RPC_URL: 'not-a-url' })` runs
Then it throws `ConfigError`

Given .env.example files exist
When `grep -q ANTHROPIC_API_KEY apps/web/.env.example apps/worker/.env.example apps/mcp/.env.example` runs
Then exit code is 0 (all three reference the var)

Given tests pass
When `pnpm test packages/sdk/src/config.test.ts` runs
Then ≥ 10 test cases pass
```

---

## Shell verification

```bash
test -f packages/sdk/src/config.ts
test -f packages/sdk/src/config.test.ts
test -f apps/web/.env.example
test -f apps/worker/.env.example
test -f apps/mcp/.env.example

# .env.example files are version-controlled (NOT in .gitignore)
git check-ignore apps/web/.env.example && exit 1 || true

# Env example files reference critical vars
for f in apps/web/.env.example apps/worker/.env.example apps/mcp/.env.example; do
  grep -q "ANTHROPIC_API_KEY" "$f" || exit 1
  grep -q "DATABASE_URL" "$f" || exit 1
  grep -q "MANTLE_RPC_URL" "$f" || exit 1
done

# Tests pass with ≥ 10 cases
pnpm test packages/sdk/src/config.test.ts --reporter=verbose 2>&1 | grep -E "(✓|PASS)" | wc -l | awk '$1 >= 10 {exit 0} {exit 1}'

# Typecheck passes
pnpm run typecheck
test $? -eq 0
```

---

## Notes for coding agent

- Required env vars (per `research/concierge/02-architecture.md`):
  ```typescript
  ConfigSchema = z.object({
    // LLM
    ANTHROPIC_API_KEY: z.string().min(20).regex(/^sk-ant-/),

    // Database + cache
    DATABASE_URL: z.string().url(), // Neon Postgres connection string
    REDIS_URL: z.string().url(),    // Upstash Redis connection string

    // Mantle network
    MANTLE_RPC_URL: z.string().url().default('https://rpc.mantle.xyz'),
    MANTLE_SEPOLIA_RPC_URL: z.string().url().default('https://rpc.sepolia.mantle.xyz'),
    MANTLE_CHAIN_ID: z.coerce.number().refine(n => n === 5000 || n === 5003),

    // ZeroDev + Pimlico (for smart account layer in E4)
    ZERODEV_PROJECT_ID: z.string().optional(),
    PIMLICO_API_KEY: z.string().optional(),

    // Externals
    LIFI_API_KEY: z.string().optional(),
    PINATA_JWT: z.string().optional(),
    WEB3_STORAGE_TOKEN: z.string().optional(),

    // Observability
    SENTRY_DSN: z.string().url().optional(),

    // Auth (web/MCP)
    PRIVY_APP_ID: z.string().optional(),
    PRIVY_SERVER_KEY: z.string().optional(),

    // Misc
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  });
  ```
- Throw `ConfigError` (from story-23) on validation failure, with the `metadata` field listing the Zod issues.
- `.env.example` files are documentation — they list each var with a comment explaining it. Real `.env` files are git-ignored.
- The function signature is `loadConfig(env?: NodeJS.ProcessEnv): ConciergeConfig` — accepts optional override for testing.
- Output type is exported as `ConciergeConfig` for downstream consumption.
