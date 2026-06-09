# Story 06 — ENV examples + Vercel/Railway secrets wiring + secrets docs

**Epic:** Epic 0 — Foundation
**Estimated:** ~1h
**Depends on:** story-00-monorepo-scaffold

## BDD Acceptance Criteria

```
Given the repo is freshly cloned
When a developer runs `cp .env.example .env` at the root
Then a complete .env template is available
And all required env vars are listed with sample values + comments

Given a developer attempts to start the api package without setting MANTLE_RPC_URL
When `pnpm dev` runs in apps/api
Then it fails fast with a clear error message: "Missing required env var MANTLE_RPC_URL"

Given env validation runs at app startup (via zod schema)
When all required vars are present and valid
Then the app starts successfully

Given the Vercel project for apps/web has env vars set
When a preview deploy runs
Then the deploy succeeds and the deployed app can read its env vars

Given the Railway project for apps/api has env vars set
When the api deploys
Then it boots successfully and connects to the configured Postgres + Redis
```

## File modification map

- `.env.example` (root) — NEW — comprehensive template covering all env vars across all packages
- `apps/web/.env.local.example` — NEW — web-specific subset (NEXT_PUBLIC_* vars + Privy + WalletConnect project IDs)
- `apps/mini/.env.local.example` — NEW — mini-specific subset
- `apps/api/.env.example` — NEW — backend secrets (Anthropic API key, Postgres URL, Redis URL, Mantle private key for ops-only ops, etc.)
- `packages/shared/src/env.ts` — NEW — zod schema for shared env vars used at runtime
- `apps/api/src/lib/env.ts` — NEW — zod schema for api env (fails fast on boot if missing)
- `apps/web/src/lib/env.ts` — NEW — zod schema for web env (NEXT_PUBLIC_* only on client; server-only vars validated separately)
- `apps/mini/src/lib/env.ts` — NEW — zod schema for mini env
- `docs/SECRETS.md` — NEW — how to obtain each secret (Anthropic key, Privy project ID, Neon DB URL, Upstash Redis URL, Vercel/Railway tokens, etc.)
- `scripts/vercel-env-upload.sh` — NEW — `vercel env add` calls to push secrets into the Vercel project (read from .env)
- `scripts/railway-env-upload.sh` — NEW — `railway variables set` calls to push secrets into Railway project

## Shell verification

```bash
# .env.example exists and lists required keys
test -f .env.example
grep -q "MANTLE_RPC_URL" .env.example
grep -q "ANTHROPIC_API_KEY" .env.example
grep -q "POSTGRES_URL" .env.example
grep -q "REDIS_URL" .env.example
grep -q "PRIVY_APP_ID" .env.example

# zod env validation works
cd apps/api
cp .env.example .env
node -e "require('./src/lib/env.ts').env" || echo "env validation hook"

# Missing var fails fast
unset MANTLE_RPC_URL
pnpm dev 2>&1 | grep -i "missing.*MANTLE_RPC_URL"

# Vercel script is executable
test -x scripts/vercel-env-upload.sh
```

## Env vars to include in `.env.example` (canonical list)

```
# === Chain ===
MANTLE_RPC_URL=https://rpc.mantle.xyz
MANTLE_SEPOLIA_RPC_URL=https://rpc.sepolia.mantle.xyz
MANTLE_CHAIN_ID=5000

# === Anthropic ===
ANTHROPIC_API_KEY=sk-ant-...

# === Privy ===
PRIVY_APP_ID=...
PRIVY_APP_SECRET=...
NEXT_PUBLIC_PRIVY_APP_ID=...

# === WalletConnect (RainbowKit) ===
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...

# === Postgres (Neon) ===
POSTGRES_URL=postgresql://...

# === Redis (Upstash) ===
REDIS_URL=rediss://...

# === Nansen ===
NANSEN_API_KEY=...

# === Allora ===
ALLORA_API_KEY=...

# === Operations wallet (for protocol fee collection, NOT user funds) ===
OPS_PRIVATE_KEY=0x...  # use a fresh wallet; never reuse personal

# === Etherscan / Mantlescan verification ===
MANTLESCAN_API_KEY=...

# === Telegram (Mini App) ===
TELEGRAM_BOT_TOKEN=...
NEXT_PUBLIC_TELEGRAM_BOT_NAME=PatronBot

# === SaaS deploy tokens ===
TURBO_TOKEN=...
TURBO_TEAM=...
VERCEL_TOKEN=...
RAILWAY_TOKEN=...

# === Sentry ===
SENTRY_DSN=...

# === App config ===
NEXT_PUBLIC_APP_URL=https://patron.xyz
NODE_ENV=development
```

## Notes

- All env vars validated via zod schema at app startup. Missing required vars fail fast with clear error messages.
- NEVER commit `.env`; only `.env.example`. `.gitignore` already covers this from story-00.
- For local dev, use Neon's free tier (per-PR branch DB available via Neon dashboard).
- For Redis, Upstash's free tier covers v1 needs.
- Vercel + Railway env vars must be set BEFORE deploy stories run. The upload scripts make this idempotent.
- `OPS_PRIVATE_KEY` is for protocol fee collection only — NEVER hold user funds. Treat as production secret.
- Document in `SECRETS.md` how to ROTATE each secret (especially for the hackathon: rotate after demo if compromised).
