# Story 35 — User profile endpoints (POST /users + GET /users/me)

**Epic:** Epic 2 — Backend Foundation
**Estimated:** ~2h
**Depends on:** story-32-db-schema-users-merchants-orders

## BDD Acceptance Criteria

```
Given a signed SIWE (Sign-In with Ethereum / EIP-4361) message from a wallet
When `curl -X POST http://localhost:3001/users -H 'content-type: application/json' -d '{"message":"...","signature":"0x..."}'` runs
Then the request returns 201 on first connect (new user row created)
And the body matches Zod schema UserResponse (id, walletAddress, agentId, frozen, ...)
And a Set-Cookie or Authorization header carries a session token (HMAC-signed JWT)

Given the same wallet POSTs /users again
When the message validates
Then the response is 200 (not 201) with the existing user row
And `pnpm --filter @patron/api test --run routes/users.test.ts` exits 0

Given a SIWE signature does not verify against the message's expected address
When the handler runs
Then the response is 401
And the body is `{"error":"signature_invalid"}`

Given a valid session token in the Authorization header
When `curl -H "authorization: Bearer <token>" http://localhost:3001/users/me` runs
Then the response is 200
And the body matches UserResponse for the authenticated user

Given no session token (or an expired one)
When `curl http://localhost:3001/users/me` runs
Then the response is 401
And the body is `{"error":"unauthorized"}`
```

## File modification map

- `apps/api/src/routes/users.ts` — NEW — Hono router: `POST /users` + `GET /users/me`; mounted at `/users` in `apps/api/src/app.ts`
- `apps/api/src/schemas/users.ts` — NEW — Zod schemas:
  - `UserSignInRequest` (message, signature)
  - `UserResponse` (id, walletAddress, agentId, frozen, spendCapPerDay, createdAt)
- `apps/api/src/services/users.ts` — NEW — business logic:
  - `verifySignIn({message, signature})`: uses viem's `verifyMessage` (or `verifySiweMessage` from a SIWE lib); parses the message to extract `address`, `nonce`, `expirationTime`; checks nonce freshness against a short-lived Redis-backed nonce store; returns address on success
  - `findOrCreateUser(walletAddress)`: idempotent upsert; returns `{ user, created: boolean }`
  - `getUserById(id)`: returns user row
- `apps/api/src/middleware/auth.ts` — NEW — `requireAuth` middleware: reads `Authorization: Bearer <token>`, verifies JWT (HMAC HS256 with `JWT_SECRET`), sets `c.set('userId', payload.sub)` and `c.set('walletAddress', payload.wallet)`
- `apps/api/src/lib/jwt.ts` — NEW — `signJwt({sub, wallet})` + `verifyJwt(token)`; uses `jose` library; 24h expiry; HS256
- `apps/api/src/lib/siwe.ts` — NEW — wrapper around the SIWE library (`siwe` npm pkg or hand-rolled with viem); exposes `parseSiweMessage(string)` + `verifySiwe(message, signature)`
- `apps/api/src/lib/nonceStore.ts` — NEW — Redis-backed nonce store (uses Upstash Redis client; nonce TTL 5min); methods: `issueNonce()`, `consumeNonce(nonce)` (returns false if already consumed)
- `apps/api/src/lib/env.ts` — UPDATE — add `JWT_SECRET: z.string().min(32)`, `SESSION_TTL_SECONDS: z.coerce.number().default(86400)`
- `apps/api/src/routes/auth.ts` — NEW — `GET /auth/nonce` endpoint that issues a fresh nonce for the SIWE flow (frontend calls this first, then signs)
- `apps/api/src/__tests__/routes/users.test.ts` — NEW — Vitest tests:
  - happy path (sign nonce → POST /users → 201 + JWT → GET /users/me → 200)
  - re-signin returns 200 (existing user)
  - invalid signature → 401
  - replayed nonce → 401
  - expired JWT → 401
- `apps/api/src/__tests__/helpers/signSiwe.ts` — NEW — test helper that crafts a SIWE message + signs it with a Vitest-generated private key (using `viem/accounts.privateKeyToAccount`)
- `apps/api/src/app.ts` — UPDATE — mount users + auth routers; apply `requireAuth` to `/users/me`

## Shell verification

```bash
cd apps/api

# Tests pass
pnpm test --run routes/users routes/auth services/users
test $? -eq 0

# Boot + e2e probe (uses test helper to sign)
pnpm dev &
DEV_PID=$!
sleep 3

# Issue nonce
NONCE=$(curl -sf http://localhost:3001/auth/nonce | jq -r '.nonce')
test -n "$NONCE"

# (the actual sign step requires a JS one-liner using viem; skip in shell smoke and rely on Vitest e2e)

# Unauthenticated /users/me → 401
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/users/me | grep -q '^401$'

kill $DEV_PID
wait $DEV_PID 2>/dev/null || true
```

## Notes

- Per architecture.md stack: **wagmi v2 + RainbowKit** on web + **Privy** on mini. Both support SIWE on the client; backend doesn't care which one signed — just verifies the signature.
- SIWE (EIP-4361) is the 2026 standard for wallet-based auth. Use the canonical `siwe` npm package (verify via Context7) or roll a verifier with viem's `verifyMessage`.
- Nonce store: Upstash Redis (per architecture.md ADR + story-06 env). 5-minute TTL is the standard SIWE recommendation. Single-use enforcement is critical — replay attacks bypass everything if nonces are reusable.
- JWT format: HS256 (symmetric) is fine for v1; v2 may move to asymmetric (RS256) if we add an external auth issuer.
- `JWT_SECRET` MUST be >= 32 bytes. Generate via `openssl rand -base64 48` and store in Railway env per story-06.
- The user row is created BEFORE the ERC-8004 Identity NFT is minted; `agentId` is null at first. Agent mint happens in a separate downstream flow (Epic 3 / agent bootstrap). The frontend should show an "Agent provisioning..." state when `agentId` is null.
- `frozen` field is mirrored from the on-chain `AgentAuthorizer.frozenAt` value by the indexer (story-38). API never sets `frozen` from a request body.
- Privy users hit the same endpoint — Privy's embedded wallet signs SIWE messages identically to a regular EOA. No code branching needed for wallet provenance.
- Per architecture.md "Banned patterns": no `any` types — every Zod schema is exported and reused by frontends via `@patron/shared`.
- File MUST stay under 400 LOC each.
