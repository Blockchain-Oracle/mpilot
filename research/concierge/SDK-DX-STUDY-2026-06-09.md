# SDK Developer-Experience Study — 2026-06-09

**Trigger:** Abu, 2026-06-09: *"developer experience still also matters … you need to check how the best way those think research from people that are already doing this from the orgs from the ecosystem looks like … this is how they have been doing it in SDK, this is how they are building libraries."* Before locking the 15-package mPilot SDK architecture, study leading TS agent + non-AI SDKs for the patterns we should adopt verbatim, the ones we should reject, and the boundary calls that the audit didn't yet make.

**Method:** Context7 `query-docs` against current pinned versions (`/vercel/ai/ai_6.0.0-beta.128`, `/strands-agents/sdk-typescript`, `/mastra-ai/mastra`, `/anthropics/anthropic-sdk-typescript`, `/openai/openai-node/v6_1_0`, `/stripe/stripe-node`, `/coinbase/agentkit`, `/websites/langchain_oss_javascript`) + direct `WebFetch` of `package.json` files. No `node_modules` reads.

---

## 1. TL;DR — patterns mPilot adopts verbatim

1. **Provider abstraction = `LanguageModelV2` factory functions, NOT class wrappers.** Vercel AI SDK's pattern: `model: openai('gpt-5.1')` returns a `LanguageModelV2` instance; the `ai` core never depends on a specific provider. `@mpilot/sdk` accepts `model: LanguageModelV2` directly. We do NOT wrap providers — users bring their own. (Audit confirmed v6 ships `LanguageModelV3` interface; spec uses `V2`-style ergonomics for now since v2/v3/v4 all share the factory-function shape — pin to whatever beta is active at story time.)
2. **One core package + N provider/adapter packages, each independently versioned, all sharing a `peerDependency` on a thin contract package** (`@ai-sdk/provider` is Vercel's; ours is `@mpilot/tools`). Provider packages have a real `dependency` on the contract; only the `zod` peer is shared across all packages.
3. **Pure ESM, Node ≥22, no CJS dual.** That's Vercel AI SDK v6's `"type": "module"` + ESM-only exports. Anthropic and OpenAI SDKs still ship CJS dual for legacy consumers — they're SDKs for a 10-year-old REST API. We are not. Pure ESM.
4. **Env auto-detect is the canonical default; explicit config is the override.** Anthropic + OpenAI + Stripe (in modern v22+) all read `process.env['<VENDOR>_API_KEY']` lazily inside the client constructor. mPilot's `createmPilot({ model })` accepts `model` explicitly (it's the agent-level dial), but every provider package's factory (`openai()`, `anthropic()`) does env-auto-detect under the hood. The pokaldot/kwala `AI_MODEL="provider:model"` override is a *nice-to-have on top of env-auto-detect*, not a replacement.
5. **`tool({ description, inputSchema, execute })` is the consensus tool shape across Vercel AI SDK, Strands, Mastra, LangChain, and (with `.invoke` instead of `execute`) AgentKit's `customActionProvider`.** Adopt this shape for `@mpilot/tools` exactly. Add `outputSchema` (load-bearing — see AUDIT-2026-06-09 §2).

---

## 2. Side-by-side comparison

| Question | Vercel AI SDK v6 | LangChain JS | Mastra | Strands TS | Anthropic SDK | OpenAI SDK | Stripe Node | Coinbase AgentKit |
|---|---|---|---|---|---|---|---|---|
| **Model abstraction** | `LanguageModelV2`/V3/V4 factory: `openai('gpt-5.1')` | `new ChatOpenAI({ model })` class | Re-exports Vercel AI SDK's `openai()`; `Agent({ model: groq('...') })` | `new BedrockModel({...})` or string ID | n/a (single provider) | n/a (single provider) | n/a (no model) | `customActionProvider` + bring own framework |
| **Package boundary** | Separate `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/react` (~70 in monorepo) | `@langchain/core` + `@langchain/openai`, `@langchain/anthropic` separate npm pkgs | `@mastra/core` + `@mastra/memory`, `@mastra/rag`, `@mastra/evals`, `@mastra/mcp` separate | Single package + `/models/openai` subpath import (archived 2026-06-03; moved to harness-sdk monorepo) | Single `@anthropic-ai/sdk` | Single `openai` | Single `stripe` | `@coinbase/agentkit` core + abandoned framework-extension pkgs |
| **Module format** | Pure ESM, Node ≥22 | Dual ESM/CJS | Pure ESM | Single pkg | Dual ESM/CJS (modern `exports`) | Dual ESM/CJS (modern `exports`) | Dual ESM/CJS | Mixed |
| **Env auto-detect** | Yes — `openai()` reads `OPENAI_API_KEY` | Yes — each `Chat*` reads `<VENDOR>_API_KEY` | Inherits from Vercel AI SDK | n/a (Bedrock uses AWS chain) | Yes — `new Anthropic()` reads `ANTHROPIC_API_KEY` | Yes — `new OpenAI()` reads `OPENAI_API_KEY` | **No** — requires explicit `new Stripe(sk)` | n/a |
| **Tool definition shape** | `tool({ description, inputSchema, execute })` | `tool(fn, { name, description, schema })` | `createTool({ id, description, inputSchema, outputSchema, execute })` | `tool({ name, description, inputSchema, callback })` | `betaZodTool({ name, inputSchema, description, run })` | `{ type: 'function', function: { name, description, parameters } }` | n/a | `@CreateAction` class method OR `customActionProvider([{ name, schema, invoke }])` |
| **Error model** | Typed errors per-provider | `LangChainError` hierarchy | `MastraError` | `StrandsError` | `APIError` w/ status→class map (`RateLimitError`, `AuthenticationError`...) | Same as Anthropic (mirror) | `Stripe.errors.StripeError` w/ `err.type` discriminator | Throws |
| **Streaming shape** | `streamText()` returns `{ textStream, fullStream, ... }` — AsyncIterable + ReadableStream | `model.stream()` async iterator | Inherits Vercel AI SDK | Async iterator + `result.lastMessage` | `MessageStream` w/ `for await (event of stream)` AND `.on('text', ...)` event emitter | `ChatCompletionStreamingRunner` w/ both async iter + event emitter | n/a | n/a |
| **Adapter packages** | Community providers extend `LanguageModelV2`; Vercel ships first-party for OpenAI/Anthropic/Google | First-party per-provider pkgs | Uses Vercel AI SDK providers directly | First-class providers in-tree | n/a | n/a | n/a | Stale: `-vercel-ai-sdk`, `-langchain`, `-mcp` all ABANDONED 2025-03; recommend `customActionProvider` |
| **Decorators / classes** | None (factory + plain object) | Classes for models + `tool()` factory | Class + factory | Class + factory | Class | Class | Class | **Both decorators AND factory exist** — factory is the friction-free path |

---

## 3. Per-question recommendations

### A. Model-agnostic configuration → accept `LanguageModelV2` directly

```ts
// @mpilot/sdk
import type { LanguageModelV2 } from '@ai-sdk/provider';

export function createmPilot(opts: {
  model: LanguageModelV2;           // ← user brings ANY provider
  walletProvider: WalletProvider;
  registry: ConciergeRegistry;
}): mPilot { /* ... */ }
```

Cite: `LanguageModelV3` (and V4 on main) is the factory contract — `specificationVersion: 'v4' | 'V3'`, `provider: string`, `modelId: string`, `doGenerate(...)`, `doStream(...)`. Source: `packages/provider/src/language-model/v4/language-model-v4.ts` and `content/providers/03-community-providers/01-custom-providers.mdx`. Pin to whatever stable Vercel SDK ships at the time of `@mpilot/sdk` v1 release; ride the `@ai-sdk/provider` peer dep, never reinvent.

**Reject:** wrapping providers ourselves. Mastra tried this early then surrendered and just re-exports `openai()` / `anthropic()` from `@ai-sdk/openai` / `@ai-sdk/anthropic`. We do the same.

### B. Env auto-detect → YES, the pokaldot pattern is best-in-class

Every leading SDK does env-auto-detect inside the constructor (Anthropic verbatim: `readEnv('ANTHROPIC_API_KEY')` at `client.ts:490-589`; OpenAI same; Vercel AI SDK same in each provider). Stripe is the outlier requiring explicit — but Stripe predates the `dotenv`+`process.env` ecosystem maturity.

```ts
// @mpilot/sdk  — for env-driven setup
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

export function pickModel(spec = process.env.AI_MODEL): LanguageModelV2 {
  const [provider, model] = (spec ?? 'anthropic:claude-sonnet-4-6').split(':');
  switch (provider) {
    case 'anthropic': return anthropic(model);   // reads ANTHROPIC_API_KEY
    case 'openai':    return openai(model);      // reads OPENAI_API_KEY
    case 'google':    return google(model);      // reads GOOGLE_GENERATIVE_AI_API_KEY
    default: throw new Error(`Unknown provider: ${provider}`);
  }
}
```

The `AI_MODEL="provider:model"` override is **a free win** — keeps the model decision out of code without abandoning explicit-config users. Ship it as a helper, not as the only path.

### C. Multi-model per-task → per-call `model` override on `streamText`/`generateText`

Vercel AI SDK's pattern: every `streamText` call accepts its own `model`. The agent doesn't need a "default model" — phases pass their own.

```ts
// @mpilot/sdk/lib/tick.ts
const plan = await generateText({
  model: opts.models?.plan ?? defaultPlanModel,    // Opus
  prompt: '…plan…',
});
const sim = await generateText({
  model: opts.models?.simulate ?? defaultSimModel, // Sonnet
  prompt: '…simulate…',
});
const record = await generateText({
  model: opts.models?.record ?? defaultRecordModel, // Haiku
  prompt: '…record…',
});
```

**Reject:** sub-clients per phase. That's what Strands does (constructs an `Agent` per phase) and it forces ugly state-passing. Per-call is the consensus.

### D. Package structure → 15 separate packages, ESM-only, shared `zod` peer

Decisions:
- **Separate packages, not subpath exports.** Vercel AI SDK, LangChain JS, and Mastra all chose separate packages even when they could've used subpath. Reason: independent version cadence + smaller install footprint when the user wants `@mpilot/tools` + `@mpilot/vercel-ai` without dragging in `@mpilot/langchain`'s 600KB graph.
- **Peer dep on `zod` ^3.25 || ^4.1** (matches Vercel AI SDK v6, OpenAI SDK v6, audit-confirmed). NEVER bundle zod.
- **Peer dep on the framework adapter targets** (`ai`, `@langchain/core`, `@coinbase/agentkit`, `@modelcontextprotocol/sdk`) — each adapter package's peer, NOT its runtime dep. This is the Vercel pattern: `@ai-sdk/anthropic` peer-deps `zod`, runtime-deps `@ai-sdk/provider`. Same shape.
- **Pure ESM, no CJS dual, Node ≥22.** Vercel AI SDK's exact stance. Anyone who can't do ESM in 2026 is not our user.
- **`tsup` or `tshy` for declarations** — handcrafted `.d.ts` is malpractice. The audit doesn't pin a builder; recommend `tsup` (Vercel AI SDK uses it).
- **Tree-shakeable:** every package uses named exports only, `"sideEffects": false` in package.json. (LangChain JS lost tree-shakeability for years because of this; don't repeat.)

```jsonc
// packages/sdk/package.json (skeleton)
{
  "name": "@mpilot/sdk",
  "type": "module",
  "sideEffects": false,
  "engines": { "node": ">=22" },
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" }
  },
  "dependencies": {
    "@mpilot/tools": "workspace:*",
    "@mpilot/shared": "workspace:*"
  },
  "peerDependencies": {
    "ai": "^6.0.0",
    "zod": "^3.25.76 || ^4.1.8"
  }
}
```

### E. Type design → `ConciergeTool<TInput, TOutput>` with inference defaults

```ts
// @mpilot/tools
import type { z } from 'zod';

export interface ConciergeTool<
  TInputSchema extends z.ZodTypeAny = z.ZodTypeAny,
  TOutputSchema extends z.ZodTypeAny = z.ZodTypeAny,
> {
  name: string;
  description: string;
  inputSchema: TInputSchema;
  outputSchema: TOutputSchema;   // LOAD-BEARING — see AUDIT-2026-06-09 §2
  invoke(args: z.infer<TInputSchema>): Promise<z.infer<TOutputSchema>>;
}

export function tool<TIn extends z.ZodTypeAny, TOut extends z.ZodTypeAny>(
  def: ConciergeTool<TIn, TOut>
): ConciergeTool<TIn, TOut> { return def; }
```

This matches Vercel AI SDK's `tool()` helper signature exactly (which uses `z.ZodObject` style + `execute`). Strands uses `z.object` only as `inputSchema`; we follow that — `z.ZodTypeAny` allows non-object inputs (rare, but free).

**Reject:** `ConciergeTool` with `unknown`. Strands DID this as the no-schema fallback and immediately walked it back to `z.ZodTypeAny` because the callback received `unknown` and users hated it. (Source: `tool(config)` API doc.)

### F. Error handling → typed errors with status-discriminator, like Stripe + Anthropic

```ts
// @mpilot/sdk/lib/errors.ts
export class ConciergeError extends Error {
  constructor(public readonly type: ConciergeErrorType, message: string) { super(message); }
}
export type ConciergeErrorType =
  | 'EModeNotEnabled'        // Aave silent-fail trap
  | 'InsufficientLiquidity'
  | 'OracleUnavailable'
  | 'AttestationFailed'
  | 'UserRejected'
  | 'NetworkError';
```

Stripe's pattern: `err instanceof Stripe.errors.StripeError` then `switch (err.type)`. Anthropic's pattern: HTTP-status → specific class (`RateLimitError`, `AuthenticationError`). We blend: one base class + `type` discriminator (Stripe's discoverability) + a typed union type for IDE autocomplete.

**Reject:** `Result<T, E>` style. No major TS SDK does this (Stripe, OpenAI, Anthropic, Vercel AI SDK all throw). It's idiomatic in Rust-shaped TS only, and the consumer base (agent builders, hackathon judges) doesn't know it.

### G. Streaming → expose both `for await` AsyncIterable AND an event emitter, per the OpenAI+Anthropic pattern

```ts
// @mpilot/sdk
const tick = concierge.tick();  // returns ConciergeTickRunner

// (1) AsyncIterable
for await (const event of tick) {
  if (event.type === 'plan-delta') process.stdout.write(event.text);
  if (event.type === 'proposal') console.log(event.proposal);
  if (event.type === 'execute-done') break;
}

// (2) Event-emitter
tick.on('proposal', p => ui.showProposalCard(p));
tick.on('execute-done', r => ui.showReceipt(r));
const final = await tick.finalState();
```

Vercel AI SDK v6's `streamText` returns `{ textStream, fullStream, ... }` — pure AsyncIterable. OpenAI's `ChatCompletionStreamingRunner` and Anthropic's `MessageStream` add `.on(...)`. We follow OpenAI+Anthropic shape because mPilot ticks have **named event types** (`proposal`, `execute-done`, `record-done`) that map cleanly to events but awkwardly to a `fullStream` union. The async iterator is still the primary surface; events are syntactic sugar.

### H. Adapter packages → factory-from-core pattern with ~20-50 LOC each

The shape we already have in the audit is right:

```ts
// @mpilot/vercel-ai
import { tool as aiTool } from 'ai';
import { createConciergeTools } from '@mpilot/tools';

export function getVercelAITools(agent: ConciergeAgent) {
  return Object.fromEntries(
    createConciergeTools(agent).map(t => [t.name, aiTool({
      description: t.description,
      inputSchema: t.inputSchema,
      execute: (args) => t.invoke(args),
    })])
  );
}
```

```ts
// @mpilot/langchain
import { tool as lcTool } from '@langchain/core/tools';
export function getLangChainTools(agent: ConciergeAgent) {
  return createConciergeTools(agent).map(t =>
    lcTool(async args => JSON.stringify(await t.invoke(args)), {
      name: t.name, description: t.description, schema: t.inputSchema,
    })
  );
}
```

```ts
// @mpilot/agentkit  — escape hatch path, NOT the @CreateAction decorator path
import { customActionProvider } from '@coinbase/agentkit';
export function getConciergeActionProvider(agent: ConciergeAgent) {
  return customActionProvider(createConciergeTools(agent).map(t => ({
    name: t.name,
    description: t.description,
    schema: t.inputSchema,
    invoke: async args => JSON.stringify(await t.invoke(args)),
  })));
}
```

**Critical AgentKit clarification:** AgentKit docs RECOMMEND `@CreateAction` decorator + `class extends ActionProvider`. The decorator path requires `reflect-metadata`, decorators in `tsconfig`, and a class-per-action structure. The `customActionProvider` factory is the documented escape hatch and is what CDR-Kit / Pokaldot / Kwala all use. **mPilot takes `customActionProvider` — keeps our SDK class-free, decorator-free, identical to the Vercel AI SDK / LangChain shape.**

### I. Getting-started DX → 5 lines, env-driven default, model as the only required arg

```ts
import { createmPilot, defaultModel } from '@mpilot/sdk';
import { ConciergeRegistry } from '@mpilot/sdk/registry';

const concierge = createmPilot({
  model: defaultModel(),                  // env auto-detect: AI_MODEL || ANTHROPIC_API_KEY
  registry: ConciergeRegistry.mainnet(),  // bundled Mantle addresses
  goal: 'Earn ~6% APR on USDC; stay safe from sUSDe depeg.',
});

for await (const event of concierge.tick()) {
  console.log(event);
}
```

Stripe's bar: `new Stripe(key)` then `stripe.charges.create(...)`. Anthropic's bar: `new Anthropic()` (env) then `client.messages.create(...)`. Vercel AI SDK's bar: `streamText({ model, prompt })`. Ours: `createmPilot({ model })` then `concierge.tick()`. Same five-line shape, same env-auto-detect.

### J. Tool definition + zod v4 → `inputSchema: z.object(...)` is the consensus

Every modern TS SDK (Vercel AI SDK v6, Strands, Mastra, LangChain, AgentKit, Anthropic's `betaZodTool`) uses `inputSchema: z.object(...)` and accepts zod v3 || v4 (per Vercel AI SDK's verified `"zod": "^3.25.76 || ^4.1.8"` peer). For the schema generic, use `z.ZodTypeAny` (Strands' choice) so non-object inputs are allowed without `any`. **mPilot requires `outputSchema: z.ZodTypeAny` too** — load-bearing per AUDIT-2026-06-09 §2 because MCP's `structuredContent` field + Vercel AI SDK's `tool-${name}` discriminated-union `part.output` typing both depend on it.

---

## 4. What we should DEFINITELY NOT do

1. **Don't bundle a provider.** Every SDK that wrapped a single provider (Strands w/ Bedrock default, OpenAI Agents w/ OpenAI-only) got accused of vendor lock-in. mPilot's model is `LanguageModelV2`, user brings it.
2. **Don't ship class decorators (`@CreateAction`-style).** AgentKit has them and the audit (§5) shows the official docs RECOMMEND decorators but every real-world consumer uses `customActionProvider`. Decorators require `reflect-metadata`, `experimentalDecorators` in tsconfig, and break tree-shaking. Hard pass.
3. **Don't ship CJS dual.** Vercel AI SDK v6 doesn't. Modern Node-22-only ESM. Anthropic + OpenAI ship dual only because they have 5-year-old consumers; we don't.
4. **Don't use `unknown` for tool inputs.** Strands tried, walked back to Zod-required. Make schemas mandatory.
5. **Don't depend on stale adapter packages.** `@coinbase/agentkit-vercel-ai-sdk` (15 months stale), `@goat-sdk/adapter-vercel-ai` (15 months stale), `@openai/agents` (15 months stale) — all NPM-dead. Build our own ~30 LOC adapter against the core directly.
6. **Don't reinvent `LanguageModelV2`.** Mastra tried; surrendered; now re-exports from Vercel. We re-export from `@ai-sdk/*` providers in `@mpilot/sdk` defaults, but `model: LanguageModelV2` is the contract.
7. **Don't use `Result<T, E>`.** No major SDK does. Throws are idiomatic.
8. **Don't omit `outputSchema`.** Audit §2 makes this load-bearing. MCP `structuredContent`, Vercel `InferUITools`, and `@assistant-ui/tool-ui` all key off it.
9. **Don't make `goal` required at construction.** `createmPilot({ model, registry })` then `agent.setGoal(...)` keeps the React `usemPilot()` happy path clean. (Constructor side-effects = test-hell, see Stripe's lazy approach.)
10. **Don't subpath-export framework adapters from `@mpilot/sdk`.** Keep them separate packages. Subpath looks tidy at first then explodes peer-dep matrices.

---

## 5. Sources

- **Vercel AI SDK v6** — Context7 `/vercel/ai/ai_6.0.0-beta.128` (LanguageModelV3 interface, ProviderV3 interface, `tool()` helper signature, `streamText` return shape, `InferUITools`); `packages/ai/package.json` via WebFetch (ESM-only, Node ≥22, zod peer `^3.25.76 || ^4.1.8`); `packages/anthropic/package.json` (workspace deps on `@ai-sdk/provider`).
- **Vercel AI SDK provider main branch** — `packages/provider/src/language-model/v4/language-model-v4.ts` (LanguageModelV4 source).
- **LangChain JS** — Context7 `/websites/langchain_oss_javascript` (`tool()` helper from `@langchain/core/tools`, `ChatAnthropic` / `ChatOpenAI` separate packages, `bindTools` pattern).
- **Mastra** — Context7 `/mastra-ai/mastra` (`createTool({ id, description, inputSchema, outputSchema, execute })`, re-exports Vercel AI SDK providers); WebFetch `github.com/mastra-ai/mastra/tree/main/packages` (separate `@mastra/{memory,rag,evals,mcp}` packages).
- **Strands TS** — Context7 `/strands-agents/sdk-typescript` (`tool({ name, description, inputSchema, callback })`, `BedrockModel` default); WebFetch `package.json` (**ARCHIVED 2026-06-03 — moved to `strands-agents/harness-sdk` monorepo**). Treat as reference, not a live target.
- **Anthropic SDK** — Context7 `/anthropics/anthropic-sdk-typescript` (`src/client.ts:490-589` env auto-detect, `APIError.generate` status→class map, `MessageStream` event emitter + async iterator, `ToolError` w/ structured content); WebFetch `package.json` (dual ESM/CJS, modern `exports`, no `module` field).
- **OpenAI SDK v6** — Context7 `/openai/openai-node/v6_1_0` (`ChatCompletionStreamingRunner` event+iterator, `runTools` not `runFunctions`); WebFetch `package.json` (zod + ws as OPTIONAL peers, dual ESM/CJS).
- **Stripe Node** — Context7 `/stripe/stripe-node` (`Stripe.errors.StripeError` + `err.type` discriminator, `maxNetworkRetries` config); WebFetch README (**no env auto-detect**, `new Stripe(key)` required).
- **Coinbase AgentKit** — Context7 `/coinbase/agentkit` (`@CreateAction` decorator path documented as primary; `customActionProvider` factory is the documented escape hatch; both confirmed against `typescript/agentkit/README.md`).
- **mPilot Audit 2026-06-09** — `/Users/abu/dev/hackathon/mantel/research/concierge/AUDIT-2026-06-09.md` (`outputSchema` load-bearing, AgentKit framework extensions ABANDONED, zod v4 baseline, ESM-only path).

---

*Cutoff: Today 2026-06-09. Package versions cited match the audit; any drift between writing and story-time should re-verify via `npm view <pkg>` and `gh api`.*
