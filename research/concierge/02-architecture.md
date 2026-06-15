# Concierge — Architecture (Locked)

> **⚠️ 2026-06-09 — partial supersession:** This was the 2026-06-03 research doc that fed the original `docs/architecture.md` draft. Several stack choices have since been amended per `AUDIT-2026-06-09.md` + `SDK-DX-STUDY-2026-06-09.md`:
> - **Monorepo manager:** Bun workspaces → **pnpm workspaces** (per ADR-018 — pnpm's strict peer-dep handling matches our adapter package strategy, aligned with cdr-kit/pokaldot/kwala)
> - **Module format:** dual ESM/CJS → **pure ESM, Node ≥ 22, `sideEffects: false`**
> - **Vercel AI SDK:** v5 → **v6** (released 2026-06-08)
> - **LLM lock:** Anthropic-only → **model-agnostic via `LanguageModelV2`** (tick worker stays Anthropic; public SDK accepts any)
>
> The **patterns** in this doc (provider architecture, tick loop shape, attestation flow) are still authoritative. For **version specifics**, defer to `docs/architecture.md` + `AUDIT-2026-06-09.md`.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Monorepo manager | **Bun workspaces** | Fast install, native TS, ships modern out of the box |
| Frontend framework | **Next.js 15 (App Router)** | RSC + server actions + SSE for streaming; same code can render landing + app + docs |
| Styling | **Tailwind CSS v4** | Modern, JIT, atomic; designer composes brand tokens on top |
| Component library | **Designer's choice** | The specs (`08-ux-component-intent.md`) describe what every component must DO — states, transitions, streaming behavior, accessibility, mobile responsiveness. The designer agent picks the implementation library based on what fits the intent + brand. No framework lock-in from architecture |
| Agent runtime | **Vercel AI SDK** (`ai` package) with `streamText` + `tool()` + `createTool` patterns | TS-native streaming foundation, three-state tool-call protocol (`input-available` / `output-available` / `output-error`), generative-UI built in |
| LLM | **Claude Sonnet 4.6** for ticks (default), **Claude Opus 4.7** for goal-decomposition + risk analysis (gated by complexity) | Sonnet is fast + cheap enough for high-frequency ticks; Opus reserves for hard reasoning |
| LLM SDK | **`@anthropic-ai/sdk`** + Anthropic-compatible adapter in Vercel AI SDK | First-party SDK, prompt caching, streaming, tool use |
| Smart account | **ZeroDev SDK** ERC-4337 with session keys (Mantle support to verify Day 1 — fallback: EOA + signed-tx queue) | Time-bound, action-scoped permissions = unattended execution without full key custody |
| On-chain reads/writes | **viem 2.x** | Modern, tree-shakeable, typed; no ethers |
| Smart contracts | **Solidity 0.8.26** + **Foundry** + **OpenZeppelin Contracts v5.1** | Standard, errors-not-strings (v5), `forge fuzz/invariant` for safety |
| ERC-8004 ABI source | `erc-8004/erc-8004-contracts` canonical repo | Reuse vs reimplement |
| Backend API | **Next.js API routes + server actions** (or Hono if we need decoupling) | Co-located with frontend, simpler ship |
| ORM | **Drizzle ORM** + **Postgres (Neon)** | Type-safe queries, free tier, migrations |
| Job queue | **BullMQ** on **Redis (Upstash)** | Tick scheduler, in-flight locks, retry semantics |
| Validation | **Zod** | Schema for tool inputs/outputs + env vars |
| MCP server | **`@modelcontextprotocol/sdk`** + Next.js API + OAuth + Redis sessions | Mirrors Giza's MCP server shape (`mcp.gizatech.xyz/api/sse`) — proven pattern |
| RealClaw skill packaging | Custom skill manifest + `npx skills add @mpilot/mantle-agent` distribution | Pattern from `byreal-git/byreal-agent-skills` (TypeScript MIT) — Track 6 qualifier |
| Testing | **Vitest** (unit + integration) + **Playwright** (e2e) + **Foundry forge fuzz/invariant** (contracts) | Standard, all TS-native |
| Linting + formatting | **Biome** | Single tool (lint + format), 10× faster than ESLint+Prettier, `noExcessiveLinesPerFile: { maxLines: 400 }` rule for hygiene |
| Observability | **Pino** for structured logs, **Sentry** for errors | Production-grade |
| Deployment | **Vercel** for web + API + MCP server SSE | Free tier sufficient; if SSE execution limits hit, fall back to Cloudflare Workers or Fly.io for MCP only |

## Routing (locked)

Single Next.js project, three top-level routes, one Vercel deploy:

- `concierge.xyz/` — landing (marketing + hero + how-it-works + CTA)
- `concierge.xyz/app` — application (sign-in + onboarding + tick stream + dashboard + settings)
- `concierge.xyz/docs` — developer documentation (Fumadocs or similar — designer's pick)

Plus auxiliary routes:
- `concierge.xyz/agent/:agentId` — public ERC-8004 reputation viewer
- `concierge.xyz/api/*` — backend routes
- `mcp.concierge.xyz/api/sse` — MCP server (separate subdomain due to SSE long-lived connection needs)

**Rationale:** subdomains add auth-cookie + SSL + DNS complexity for solo-12-day; single domain unifies brand, simplifies analytics, faster ship. MCP-server-on-subdomain only because SSE may need different runtime than the main app.

## Multi-surface map

```
                    ┌─────────────────────────────────────────────┐
                    │              ONE CORE                       │
                    │  · Tick loop                                │
                    │  · 7 action providers                       │
                    │  · ERC-8004 attestation                     │
                    │  · ZeroDev smart account + session keys     │
                    │  · Postgres + Redis state                   │
                    └─────────────────────────────────────────────┘
                                       │
                ┌──────────────────────┼──────────────────────────┐
                │                      │                          │
       ┌────────┴────────┐  ┌──────────┴──────────┐   ┌──────────┴──────────┐  ┌─────────┐
       │  Web app        │  │  npm SDK            │   │  MCP server         │  │ RealClaw│
       │ concierge.xyz   │  │  @mpilot/sdk     │   │ mcp.concierge.xyz   │  │  skill  │
       │      /app       │  │  @mpilot/<7>     │   │   /api/sse          │  │         │
       │                 │  │                     │   │                     │  │  npx    │
       │ Consumer        │  │ Mantle devs build   │   │ Claude Code /       │  │ skills  │
       │ users + judges  │  │ their own agents    │   │ Claude Desktop /    │  │  add    │
       │ Tambo cards     │  │ Composable          │   │ OpenClaw / RealClaw │  │         │
       │ Real-time UX    │  │                     │   │ users               │  │         │
       └─────────────────┘  └─────────────────────┘   └─────────────────────┘  └─────────┘
```

## Architecture Decision Records (ADRs)

### ADR-001 — Greenfield TypeScript monorepo (NOT a fork)

**Status:** Accepted 2026-06-03.
**Context:** Considered forking Giza's giza-hub (closed-source brain → useless), Eliza (overkill for 12-day solo), Coinbase AgentKit (TS pattern good but no Mantle providers), Hive AI's Solana-side codebase (cross-chain mismatch). All require us to fight someone else's runtime opinions in a 12-day window.
**Decision:** Greenfield Bun monorepo using proven primitives (Vercel AI SDK + viem + ZeroDev + Foundry). Steal the *patterns* from Giza (MCP server shape, tick loop, session keys) but write our own runtime.
**Consequences:** Higher Day-1 spike risk (must validate each primitive) but no vendor lock + each layer swappable when something breaks. Component-proven primitives mitigate greenfield risk.

### ADR-002 — Vercel AI SDK as agent foundation (not LangGraph/Eliza/CopilotKit)

**Status:** Accepted 2026-06-03.
**Context:** LangGraph is Python-heavy + adds polyglot complexity. Eliza is massive runtime with cognitive overhead. CopilotKit's AG-UI Protocol is enterprise-grade but overkill for solo 12 days.
**Decision:** Vercel AI SDK + custom tick orchestrator in Next.js API route. Tool-call pattern (`createTool` + Zod schema + React component matching output shape) is the de-facto standard generative-UI pattern.
**Consequences:** Stays TS-native + matches Coinbase AgentKit's pattern (which we borrow for action providers). Card-rendering layer (Tambo vs assistant-ui vs custom shadcn) is the designer's call — Vercel AI SDK is the foundation regardless.

### ADR-003 — Track 6 via RealClaw skill packaging (NOT Byreal Skills CLI)

**Status:** Accepted 2026-06-03.
**Context:** Byreal Skills CLI is **Solana-only** (verified: byreal-git/byreal-agent-skills 44★ MIT TS, "CLMM DEX on Solana"). Byreal Perps CLI is **Hyperliquid-only**. Both are wrong-chain for our Mantle product.
**Decision:** Satisfy Track 6 ("must use core capabilities of at least one of: Byreal Agent Skills / Byreal Perps CLI / RealClaw") via the **RealClaw** path. Package Concierge as a RealClaw-compatible TypeScript skill installable via `npx skills add @mpilot/mantle-agent`. Pattern verified by byreal-agent-skills itself (TS, MIT, distributable) and Magicianhax/mantle-active-trader (Python RealClaw skill for Mantle DeFi).
**Consequences:** Track 6 qualified without depending on wrong-chain CLIs. Strategic upgrade: we ship into Byreal's official distribution channel (`npx skills add`) which is the surface Byreal/Mantle judges actually use. See `06-realclaw-skill-pkg.md` for implementation details.

### ADR-004 — ERC-8004 attestation as verifiability (NOT zkML)

**Status:** Accepted 2026-06-03.
**Context:** Giza's original zkML (Orion/LuminAIR Cairo/Rust) is decoupled from their consumer product. Adding zkML to Concierge would consume weeks for marginal Innovation score gain. Allora (judge) cares about verifiable *output*, not runtime proofs.
**Decision:** Every successful tick writes an ERC-8004 `giveFeedback` attestation to the agent's identity NFT. This is the canonical "verifiability" claim — a public, permanent record of what the agent did and what the outcome was, queryable by anyone.
**Consequences:** No zkML rabbit hole. ERC-8004 reputation NFTs become Concierge's flagship trust artifact. The `/agent/:id` page renders the reputation history visually = demo wow + judge thesis match.

### ADR-005 — Single-domain routing (concierge.xyz/app, not app.concierge.xyz)

**Status:** Accepted 2026-06-03.
**Context:** Subdomains add auth-cookie + SSL + DNS + Vercel project complexity for solo-12-day budget.
**Decision:** Single Next.js project at `concierge.xyz` with `/app`, `/docs`, `/agent/:id` as top-level routes. MCP server on `mcp.concierge.xyz` as the only subdomain (because SSE long-lived connections may need a different runtime).
**Consequences:** Faster ship, unified brand + analytics, single Vercel deploy. Auth cookies just work across routes.

### ADR-006 — Sonnet 4.6 default + Opus 4.7 for hard reasoning

**Status:** Accepted 2026-06-03.
**Context:** Every tick burns LLM tokens. Sonnet 4.6 is 5× cheaper than Opus 4.7 and fast enough for routine `plan()` decisions. Goal-decomposition (interpreting a user's plain-English goal into a policy JSON) and risk analysis (deciding if a proposed action is safe) benefit from Opus's depth.
**Decision:** Default LLM is Sonnet 4.6. Route goal-decomposition + risk-analysis prompts to Opus 4.7 conditionally. Use prompt caching aggressively.
**Consequences:** Lower per-tick cost + reasonable demo polish. Quality budget intact for the two high-stakes prompts.

### ADR-007 — Biome as the single quality tool with `noExcessiveLinesPerFile: { maxLines: 400 }`

**Status:** Accepted 2026-06-03 (lifted from Patron ADR-007 which was re-revised after the audit-of-audit caught Biome's nursery rule).
**Context:** ESLint + Prettier is two tools, slower CI, more config. Biome is single-tool (lint + format), 10× faster, TypeScript-native.
**Decision:** Biome as the canonical lint+format tool. `linter.rules.nursery.noExcessiveLinesPerFile: { level: "error", options: { maxLines: 400 } }` enforces file-size hygiene at pre-commit + CI. Pin to a specific minor (nursery rules can drift between minors).
**Consequences:** 400-LOC budget enforced automatically. Generated files excluded via `biome.json` `files.ignore`. `scripts/check-file-loc.mjs` is defense-in-depth secondary check.

### ADR-008 — Postgres + Redis for state (NOT just on-chain)

**Status:** Accepted 2026-06-03.
**Context:** Tick history + goal/policy state + audit trail must live somewhere queryable. Pure on-chain would be slow + expensive + privacy-hostile. ERC-8004 is the canonical reputation layer; everything else lives off-chain.
**Decision:** Postgres (Neon free tier) for durable agent state + tick history + user goals + portfolio snapshots. Redis (Upstash free tier) for in-flight tick locks + MCP OAuth sessions + LLM response cache.
**Consequences:** Two managed services to monitor; both have free tiers sufficient for hackathon scale. ERC-8004 + Postgres complement each other (on-chain = canonical reputation, off-chain = rich detail).

## What's NOT in this architecture (deferred / explicit cuts)

- Multi-tenant SaaS billing (out of scope — judge demo, not production)
- Real KYC for USDY (we document the constraint; users must already hold USDY)
- Multi-LLM provider abstraction (Anthropic only; defer multi-provider to v1.1)
- Internationalization / i18n (English only for v1)
- Email notifications (in-app + on-chain receipts only)
- Mobile native app (web app responsive only; mobile PWA defer to v1.1)
- A separate web server for backend (Next.js API routes are sufficient; Hono is fallback if scaling)
