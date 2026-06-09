# 04 — Agent Runtime: Vercel AI SDK + Claude Agent SDK + Tick Loop

> **⚠️ 2026-06-09 — partial supersession:** Specific version references in this file (`Vercel AI SDK 5`) are SUPERSEDED by `AUDIT-2026-06-09.md` §1 (now on v6) + `SDK-DX-STUDY-2026-06-09.md` (model-agnostic via `LanguageModelV2`). The **patterns** below (six-phase tick loop, streamText shape, useChat tool-parts) are still correct; the **VERSIONS** are pinned in `architecture.md` stack table + `AUDIT-2026-06-09.md`. Trust the audit/architecture for version specifics; trust this file for the runtime/architecture patterns.

**Purpose:** Concrete patterns for the Concierge agent runtime. Read by `sahil-spec-writer` before generating `docs/architecture.md` and the tick-loop stories.

**Stack:** Next.js (App Router) on Vercel + Vercel AI SDK 5 (`ai`) for the chat surface + `@anthropic-ai/claude-agent-sdk` for the autonomous loop + Postgres (Drizzle) for state + Redis (Upstash) for in-flight locks + BullMQ for cron ticks.

---

## 1. Vercel AI SDK 5 — chat surface

Package: `ai` (v5+). Docs: https://ai-sdk.dev/docs

### 1.1 `streamText` + `tool()` server pattern

The canonical server-side tool-calling pattern, from `https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage`:

```typescript
import {
  type InferUITools,
  type ToolSet,
  type UIDataTypes,
  type UIMessage,
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
} from 'ai';
import { z } from 'zod';

const tools = {
  proposeAction: tool({
    description: 'Propose an on-chain action for user approval.',
    inputSchema: z.object({
      kind: z.enum(['deposit', 'withdraw', 'rebalance', 'pay_lender']),
      amountUsd: z.number().positive(),
      protocol: z.string(),
      reason: z.string(),
    }),
    execute: async ({ kind, amountUsd, protocol, reason }) => {
      const proposal = await db.insert(proposals).values({
        kind, amountUsd, protocol, reason, status: 'pending',
      }).returning();
      return { proposalId: proposal[0].id, status: 'awaiting_user' };
    },
  }),
  // ...other tools
} satisfies ToolSet;

export type ChatTools = InferUITools<typeof tools>;
export type ChatMessage = UIMessage<never, UIDataTypes, ChatTools>;

export async function POST(req: Request) {
  const { messages }: { messages: ChatMessage[] } = await req.json();
  const result = streamText({
    model: 'anthropic/claude-sonnet-4-5',
    system: 'You are Concierge — a stablecoin yield agent...',
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(8),   // multi-step tool loop ceiling
    tools,
  });
  return result.toUIMessageStreamResponse();
}
```

Key details:
- **`stopWhen: stepCountIs(N)`** caps the multi-step loop. Without it, a single user turn does at most one tool call, then stops.
- **`inputSchema: z.object(...)`** — Zod is the SDK's Standard-Schema bridge. Field `.describe()` strings flow straight into the tool's JSON schema and meaningfully steer the LLM's argument choices.
- **`satisfies ToolSet`** preserves literal types so `InferUITools` can emit `tool-proposeAction` typed message parts on the client.

### 1.2 Three tool-part UI states

From the same docs page, the React-side state machine for each tool invocation:

| State              | Semantics                                                |
| ------------------ | -------------------------------------------------------- |
| `input-streaming`  | LLM is still emitting JSON args (token by token).        |
| `input-available`  | Args fully assembled; `execute()` not yet started.       |
| `output-available` | `execute()` returned successfully; `part.output` ready.  |
| `output-error`     | `execute()` threw; `part.errorText` populated.           |

```typescript
{message.parts.map((part) => {
  switch (part.type) {
    case 'tool-proposeAction':
      switch (part.state) {
        case 'input-streaming':
          return <Spinner label="Thinking…" />;
        case 'input-available':
          return <ProposalCardSkeleton input={part.input} />;
        case 'output-available':
          return <ProposalCard proposal={part.output} />;
        case 'output-error':
          return <ErrorBanner text={part.errorText} />;
      }
  }
})}
```

This is the entire foundation of the Concierge approval card UX — every proposal renders mid-stream from these four states, no extra plumbing.

### 1.3 `useChat` + SSE wire format

Client hook (App Router):

```typescript
'use client';
import { useChat } from '@ai-sdk/react';

export function ConciergeChat() {
  const { messages, sendMessage, status } = useChat<ChatMessage>({
    api: '/api/agent/chat',
  });
  // ... render messages.parts
}
```

The transport is a custom SSE framing (`x-vercel-ai-ui-message-stream: v1`). On Vercel deployment it works on Edge or Node runtimes. **Hobby plan SSE timeout is 25 seconds; Pro plan is 60 seconds for default fluid compute.** For the chat surface this is fine — the agent tick loop runs out-of-band (see §3).

### 1.4 Server Actions

For one-shot calls outside the chat surface (e.g. "open this approval inline from the dashboard"), use `generateText` from a server action. Same `tool()` shape, no streaming.

```typescript
'use server';
import { generateText, tool } from 'ai';
import { z } from 'zod';

export async function explainProposal(proposalId: string) {
  const proposal = await db.query.proposals.findFirst({ where: eq(proposals.id, proposalId) });
  const { text } = await generateText({
    model: 'anthropic/claude-haiku-4-5',
    system: 'Explain DeFi proposals in 2 sentences to non-technical users.',
    prompt: JSON.stringify(proposal),
  });
  return text;
}
```

---

## 2. Claude Agent SDK — autonomous loop

Package: `@anthropic-ai/claude-agent-sdk` (successor to `@anthropic-ai/sdk` for agent workflows). Repo: `anthropics/claude-agent-sdk-typescript`. Docs: https://docs.claude.com/en/api/agent-sdk/overview

The Vercel AI SDK is great for the *interactive* surface (user-in-the-loop chat). For the *autonomous* tick-loop running on a cron, the Claude Agent SDK is purpose-built: it owns the message history, the tool-execution loop, system prompts, and prompt caching natively.

Install:

```bash
npm install @anthropic-ai/claude-agent-sdk
```

### 2.1 Tool-use loop primitives (Anthropic API directly)

From `https://platform.claude.com/docs/en/docs/build-with-claude/tool-use`, the underlying primitive is:

1. Client sends `messages.create({ tools, messages })`.
2. Claude returns `stop_reason: "tool_use"` + one or more `tool_use` blocks.
3. Client executes each tool, returns `tool_result` blocks in next user turn.
4. Loop until `stop_reason: "end_turn"`.

The Agent SDK wraps this loop so we don't hand-roll it. The bare `@anthropic-ai/sdk` shape (still used for one-shot calls):

```typescript
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic();

const response = await client.messages.create({
  model: 'claude-opus-4-8',
  max_tokens: 1024,
  tools: [{ name: 'get_pool_apy', description: '...', input_schema: { ... } }],
  messages: [{ role: 'user', content: '...' }],
});
```

### 2.2 Prompt caching for the tick loop

Prompt caching is the single biggest cost lever. The Concierge system prompt + tool schemas + policy doc will be ~6–10k tokens; caching them drops per-tick cost by ~10x at the cache-hit rate Claude advertises.

Pattern (from Anthropic docs): mark long stable prefixes with `cache_control: { type: 'ephemeral' }` on the last content block of the prefix. Reads cost 0.1× input price; cache lifetime is 5 minutes (refreshes on hit). For Concierge, the tick interval (e.g. 60s) keeps the cache hot.

### 2.3 System prompt skeleton

```
You are Concierge, an autonomous DeFi agent on Mantle.

You manage one user's stablecoin position. Your job each tick:
1. Read current state (balances, debt, yield positions, pending bills).
2. Decide if any action is needed (rebalance, top up reserve, pay lender, swap).
3. For risky/large actions, PROPOSE only — user must approve.
4. For routine/under-threshold actions, EXECUTE via session key.
5. Attest every execution via ERC-8004.

Hard rules:
- Never exceed the per-tick spend cap ($CAP_USD).
- Never propose an action you can't simulate successfully first.
- If simulation reverts, log and skip — never retry blindly.
- If yield APY < loan APR + 100 bps for 3 consecutive ticks, propose unwind.

Available tools: <generated>
```

---

## 3. The tick loop — six phases

Each tick is a single Agent SDK conversation with a fresh context (except for cached prefix). Phases:

| Phase       | Tools available                                               | Output                                  |
| ----------- | ------------------------------------------------------------- | --------------------------------------- |
| `plan()`    | `get_state`, `get_yields`, `get_loan_terms`                   | `Plan { intent, hypothesis }`           |
| `simulate()`| `simulate_tx` (uses `eth_call` / Tenderly / Mantle node)      | `Sim { ok, gasUsed, deltaState }`       |
| `propose()` | `create_proposal`                                             | `Proposal { id, requiresApproval }`     |
| `decide()`  | (out-of-loop) user clicks approve or auto-approve kicks in    | `Decision { approved, expiresAt }`      |
| `execute()` | `send_userop` (ZeroDev kernel client, session key signer)     | `Exec { txHash, blockNumber }`          |
| `record()`  | `attest_erc8004`, `write_audit_row`                           | `Attestation { uid, schemaUid }`        |

Implementation sketch:

```typescript
async function tick(agentId: string) {
  const lock = await redis.set(`lock:${agentId}`, '1', 'NX', 'EX', 60);
  if (!lock) return { skipped: 'already_running' };
  try {
    const state = await loadState(agentId);
    const plan = await runPhase('plan', state);
    if (plan.intent === 'noop') return { phase: 'plan', noop: true };

    const sim = await runPhase('simulate', plan);
    if (!sim.ok) return { phase: 'simulate', error: sim.error };

    const proposal = await runPhase('propose', { plan, sim });
    if (proposal.requiresApproval) return { phase: 'propose', awaiting: proposal.id };

    const exec = await runPhase('execute', proposal);
    const attestation = await runPhase('record', { proposal, exec });
    return { phase: 'record', attestationUid: attestation.uid };
  } finally {
    await redis.del(`lock:${agentId}`);
  }
}
```

`runPhase` is one `streamText` (or Agent SDK equivalent) call with a phase-scoped subset of tools, a phase-scoped system prompt segment, and `stopWhen: stepCountIs(3)`. Narrow toolsets per phase dramatically reduce wrong-tool hallucinations.

---

## 4. State persistence

**Postgres (Drizzle).** Tables:
- `agents` — id, user_id, smart_account_addr, policy_json, created_at.
- `ticks` — id, agent_id, started_at, phase, status, payload_jsonb.
- `proposals` — id, agent_id, kind, amount_usd, protocol, status, expires_at, sim_jsonb.
- `executions` — id, proposal_id, tx_hash, block, gas_used, attestation_uid.
- `attestations` — uid, schema_uid, recipient, payload_json, tx_hash, recorded_at.

**Redis (Upstash).** Two namespaces:
- `lock:<agentId>` — 60s NX lock so two ticks can't run simultaneously.
- `inflight:<txHash>` — short TTL marker between `execute()` and confirmation.

Drizzle migrations: `drizzle-kit push`. Hosted Postgres on Neon (Vercel-native) or Supabase.

---

## 5. Cron / scheduler — BullMQ

Docs: https://docs.bullmq.io/guide/jobs/repeatable

Concierge needs a per-agent cron tick (e.g. every 60s). BullMQ's repeatable jobs handle this:

```typescript
import { Queue, Worker } from 'bullmq';
const q = new Queue('agent-tick', { connection });

await q.add(
  'tick',
  { agentId },
  { repeat: { every: 60_000, key: `tick-${agentId}` } },
);

new Worker('agent-tick', async (job) => {
  return tick(job.data.agentId);
}, { connection, concurrency: 5 });
```

Important:
- Use `repeat.key` so re-adding the same agent updates the schedule instead of duplicating.
- `concurrency: 5` lets up to 5 agents tick simultaneously per worker process.
- The Redis `lock:` from §4 is the per-agent safety belt against double-ticks across workers.

For dev: a single Node process running `Worker` + Next.js dev server. For prod: a separate Node worker on Fly.io / Railway / a Vercel Cron + serverless function. **Vercel Cron** alone can drive the scheduler if jobs fit in serverless limits (~10s default, 60–300s on Pro Fluid), but BullMQ on a dedicated process is cleaner for the 6-phase tick.

---

## 6. Risks + guardrails

| Risk                              | Mitigation                                                                  |
| --------------------------------- | --------------------------------------------------------------------------- |
| LLM hallucinates tool args        | Strict Zod schemas + `tool_choice` + simulate-before-execute hard gate.     |
| Tool selection error              | Phase-scoped toolsets — `execute` phase has no `propose` tool, etc.         |
| Runaway loop (token blowup)       | `stopWhen: stepCountIs(N)`. Per-tick token budget (e.g. 20k tokens max).    |
| Per-tick cost blows up            | Prompt caching on system prompt + tool schemas. Track $/tick metric.        |
| Double-tick race                  | Redis NX lock with 60s TTL.                                                 |
| Stale state mid-tick              | Re-read state at the start of `execute()`; abort if changed since `plan()`. |
| Sim passes, real tx reverts       | Catch revert in `execute()`, write failure to `executions` table, alert.    |
| Wallet hijack via leaked SK       | Session key is policy-scoped (call policy + spend cap + expiry). See `05-`. |
| User approval expires             | `proposals.expires_at`; auto-cancel + re-plan next tick.                    |

---

## 7. Open questions for spec writer

1. **Per-tick token budget cap** — what's the dollar/token ceiling we enforce in code? (Suggest: 20k tokens, ~$0.10/tick on Sonnet 4.5 with caching.)
2. **Auto-approval threshold** — under what proposal `amountUsd` do we skip user approval and rely purely on session-key policy? (Suggest: $50 or 1% of position, whichever lower.)
3. **Tick cadence** — 60s default OK? Or event-driven (price moves > X%)? Default to cron with manual "tick now" override.
4. **Where does the BullMQ worker run?** — Vercel Cron + serverless, or dedicated Fly.io worker? (Recommend Fly.io for clean separation + no 10s limit risk.)
5. **Postgres host** — Neon (Vercel-native, branching) or Supabase (Auth bundled)?
6. **Model selection per phase** — Opus for `plan`, Sonnet for `simulate`/`execute`, Haiku for `record`? Decide cost vs latency.
7. **Audit-log immutability** — write `ticks` + `attestations` to Postgres only, or also mirror to S3/IPFS for tamper evidence? (Track 3 may want IPFS.)
8. **Conversation memory across ticks** — do we feed the prior tick's summary in the next tick's prefix, or is each tick stateless? (Recommend stateless + DB read; simpler + cheaper cache.)
