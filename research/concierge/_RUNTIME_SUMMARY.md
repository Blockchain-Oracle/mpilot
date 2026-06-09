# Concierge Runtime Research — Summary

Four deep-domain files for the agent runtime + distribution surfaces, consumed by `sahil-spec-writer`.

## Files

1. **[`04-agent-runtime.md`](04-agent-runtime.md)** — Vercel AI SDK 5 (`streamText`, `tool()`, Zod, four-state UI parts, `useChat`) + Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) + the six-phase tick loop (`plan → simulate → propose → decide → execute → record`) + Postgres/Drizzle state + Upstash Redis locks + BullMQ repeatable jobs. Risks + open questions.

2. **[`05-zerodev-erc4337.md`](05-zerodev-erc4337.md)** — ZeroDev Kernel v3.1 smart account + permission validator (session keys with `toCallPolicy` + `toTimestampPolicy` + `toSpendingLimitPolicy`) + ERC-4337 v0.7 EntryPoint on Mantle + Pimlico bundler (Mantle support verified) + viem `mantle` chain + EOA fallback path. Risks + open questions.

3. **[`06-realclaw-skill-pkg.md`](06-realclaw-skill-pkg.md)** — RealClaw/OpenClaw skill format reverse-engineered from two real shipped skills (`byreal-git/byreal-agent-skills` TypeScript + `Magicianhax/mantle-active-trader` Python). Exact SKILL.md frontmatter spec, `skills/<name>/SKILL.md` layout, `concierge-cli` Commander shape, `-o json` LLM contract, `npx skills add ajweb3dev/concierge-skill` install, Track 6 qualifying checklist. Risks + open questions.

4. **[`07-mcp-server-pattern.md`](07-mcp-server-pattern.md)** — Model Context Protocol via `@modelcontextprotocol/sdk` v2 API (`McpServer.registerTool` + Zod inputSchema), Streamable HTTP transport (stateless + stateful), Hono on Cloudflare Workers as the recommended host (no Vercel 10s SSE limit), bearer-token v0 + OAuth v1, integration with Claude Code / Claude Desktop / Cursor / OpenClaw, why MCP is the strategic distribution moat for hackathon judges. Risks + open questions.

## Verified facts (citations included in files)

- **Vercel AI SDK 5 four tool-part states**: `input-streaming`, `input-available`, `output-available`, `output-error` — from `https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage`.
- **`stopWhen: stepCountIs(N)`** caps multi-step tool loops — from same docs.
- **Claude Agent SDK package**: `@anthropic-ai/claude-agent-sdk` (successor to Claude Code SDK) — verified from `anthropics/claude-agent-sdk-typescript` README.
- **Tool-use loop pattern** (`stop_reason: "tool_use"` → `tool_result`) — verified from `platform.claude.com/docs/en/docs/build-with-claude/tool-use`.
- **ZeroDev Kernel + permission validator API** — verified from `docs.zerodev.app/sdk/permissions/transaction-automation` + `/sdk/advanced/session-keys`.
- **Pimlico supports Mantle (5000)** — verified from `docs.pimlico.io/infra/platform/supported-chains`. EntryPoint V07 + Kernel 0.3.0-beta/0.3.1 supported. Endpoint `https://api.pimlico.io/v2/mantle/rpc?apikey=…`.
- **BullMQ repeatable jobs API** — verified from `docs.bullmq.io/guide/jobs/repeatable`.
- **`npx skills add <owner>/<repo>`** — verified as the canonical install pattern; gh search shows ~50+ public skill repos using it, including `coinbase/agentic-wallet-skills` and `base/skills`.
- **`byreal-git/byreal-agent-skills` SKILL.md frontmatter** — fetched verbatim via gh API; pattern documented in `06-realclaw-skill-pkg.md` §2.
- **`Magicianhax/mantle-active-trader` SKILL.md** — fetched verbatim; pattern documented in §3 (RealClaw on Mantle DeFi, the closest analog to Concierge).
- **MCP TypeScript SDK v2 `registerTool`** — verified from `modelcontextprotocol/typescript-sdk` README + migration docs.
- **MCP Streamable HTTP transport** with stateless mode (`sessionIdGenerator: undefined`) — verified from `typescript-sdk` Express middleware README.

## UNVERIFIED items (flagged in the files, need human check before spec)

1. **ZeroDev hosted bundler/paymaster on Mantle.** ZeroDev claims "50+ networks" but no documented Mantle support page surfaced via web search or their `/sdk/faqs/chains` / `/meta-infra/networks` pages. The SDK source shows test configs for Sepolia and Optimism Sepolia only. **Workaround documented:** use ZeroDev SDK for account + permissions but route bundler/paymaster through Pimlico (verified Mantle support). This is fine — ZeroDev SDK is chain-agnostic. Action: confirm at integration time, or just commit to the Pimlico routing path.

2. **Pimlico ERC-20 paymaster supports USDC-on-Mantle as gas token.** Pimlico supports Mantle as a chain; whether their paymaster accepts USDC on Mantle is unconfirmed. Fallback documented: sponsor with MNT (cheap) or have user pre-fund a small MNT balance.

3. **Giza's MCP server stack details (`https://mcp.gizatech.xyz/api/sse`).** Could not fetch their docs (404 on direct paths, homepage didn't expose technical info). Initial brief claims it's Next.js + OAuth + Redis sessions on Vercel. Treated as a directional reference, not a load-bearing detail.

4. **The official npm `skills` CLI canonical source.** GitHub search confirms 50+ repos use `npx skills add <owner>/<repo>` in their READMEs (including Coinbase and Base) so it is a real distribution rail. The npm package page (`npmjs.com/package/skills`) returned 403 during research. Action: install locally and inspect before publishing the Concierge skill — likely owned by Anthropic or a closely-affiliated party.

5. **RealClaw's skill index / discovery surface.** No public registry URL documented. Distribution in practice is via README + awesome-lists (`VoltAgent/awesome-openclaw-skills`, `LeoYeAI/openclaw-master-skills`). Action: PR those lists after launching.

6. **RealClaw MCP discovery path.** Whether RealClaw users get our MCP automatically when they install the skill, or if they need a separate MCP config step. Safe path documented: ship both rails (skill + MCP) and document both install paths.

## Decisions for the spec writer to make (consolidated)

| # | Decision                                                        | Recommendation                          |
| - | --------------------------------------------------------------- | --------------------------------------- |
| 1 | Per-tick token budget cap                                       | 20k tokens, ~$0.10/tick on Sonnet 4.5  |
| 2 | Auto-approval $ threshold                                       | $50 or 1% position, whichever lower    |
| 3 | Tick cadence                                                    | 60s default + manual "tick now"        |
| 4 | BullMQ worker host                                              | Fly.io dedicated process                |
| 5 | Postgres host                                                   | Neon (Vercel-native + branching)        |
| 6 | Model per phase                                                 | Opus plan / Sonnet sim+exec / Haiku rec |
| 7 | Bundler on Mantle                                               | Pimlico (verified)                      |
| 8 | Paymaster strategy                                              | Sponsor with MNT (demo), ERC-20 fallback|
| 9 | Session-key lifetime                                            | 30 days default + revoke button         |
| 10 | Session-key PK storage                                         | Worker env var (demo); KMS for v1       |
| 11 | Spending cap location                                          | On-chain via `toSpendingLimitPolicy`    |
| 12 | EOA fallback                                                   | Keep behind feature flag                |
| 13 | Kernel version                                                 | V3.1 (Pimlico-verified)                 |
| 14 | EntryPoint version                                             | V0.7                                    |
| 15 | Skill name                                                     | `concierge` (verify npm scope)          |
| 16 | CLI language                                                   | TypeScript only (Python wrapper later)  |
| 17 | Skill agent runtime                                            | Local process default + `--remote` flag |
| 18 | MCP hosting target                                             | Cloudflare Workers + Hono               |
| 19 | MCP auth for v0                                                | Bearer token (OAuth in v1)              |
| 20 | MCP endpoint                                                   | `mcp.concierge.app/mcp`                 |

## What the spec writer can now produce

With these 4 files plus the existing `01-wedge-locked.md`, `02-architecture.md`, `03-providers/`, and `research/mantle-turing-test-2026/CONTEXT.md`, the spec writer has enough to generate:

- **`docs/PRD.md`** — wedge + user stories + Track 3/6 alignment.
- **`docs/architecture.md`** — components, data flow, ERC-4337 path, MCP rail.
- **`docs/ux-spec.md`** — chat surface, proposal cards, approval UX, MCP install flow.
- **`docs/epics.md`** — runtime epic, on-chain epic, skill+CLI epic, MCP epic, attestation epic.
- **`docs/stories/*`** — phase-scoped BDD stories per epic.
