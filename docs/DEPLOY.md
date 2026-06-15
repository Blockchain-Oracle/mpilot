# Deploying mPilot (Coolify + Nixpacks + Cloudflare)

Two services off one repo + one `nixpacks.toml`, selected by `APP_NAME`.

## Coolify services

Create **two** applications pointing at this repo, Build Pack = **Nixpacks**, Base Directory = `/`.

| Service | `APP_NAME` (build + runtime env) | Port | Domain |
|---|---|---|---|
| **web** | `@mpilot/web` | `3000` | `mpilot.xyz` |
| **worker** | `@mpilot/worker` | — (no port; long-running tick loop) | — |

> The worker still throws the `runTick` stub until the production loop is wired
> (Phase 2). Deploy it as the harness; it won't process ticks yet.

## Environment variables (set in each service's Environment tab — never commit)

**web** (`@mpilot/web`):
- `APP_NAME=@mpilot/web`
- `NEXT_PUBLIC_PRIVY_APP_ID`, `PRIVY_APP_SECRET` — chat auth + client signing
- `ANTHROPIC_API_KEY` (or another provider key) + `AI_MODEL=anthropic:claude-sonnet-4-6` — chat LLM
- `NEXT_PUBLIC_MPILOT_CHAIN=mantle-sepolia` (or `mantle-mainnet`) — chat target chain
- `DATABASE_URL`, `REDIS_URL` — if the onboarding/agents routes are used
- `CONCIERGE_KMS_ROOT`, Pimlico key, `RESEND_*` — as needed by the onboarding flow

**worker** (`@mpilot/worker`):
- `APP_NAME=@mpilot/worker`
- `REDIS_URL` (required), `DATABASE_URL`, the Mantle RPCs, Pimlico key, `CONCIERGE_KMS_ROOT`

## Cloudflare DNS

- Add an **A record**: `mpilot.xyz` → your VPS IP.
- **DNS only / grey cloud (NOT proxied).** Coolify provisions TLS via Let's Encrypt
  HTTP-01, which fails behind Cloudflare's orange-cloud proxy. Once issued, you may
  switch to proxied if you prefer (with Cloudflare SSL mode = Full/strict).
- In Coolify, set the web service's domain to `https://mpilot.xyz`; it auto-provisions
  the cert.

## MCP

`@mpilot/mcp` stays npm-published (`npx -y @mpilot/mcp`). Optionally add a third Coolify
service later for a hosted SSE endpoint at `mcp.mpilot.xyz` reusing `packages/mcp`.

## Verify

`https://mpilot.xyz` loads the app over HTTPS; `/chat` connects a Privy wallet and streams
cards. Worker logs show `worker ready` in Coolify.
