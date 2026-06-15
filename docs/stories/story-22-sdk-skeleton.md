# Story — `@mpilot/sdk` skeleton + provider registration pattern

**ID:** story-22-sdk-skeleton
**Epic:** Epic E2 — Shared SDK Core
**Depends on:** story-20-shared-package-bootstrap, **story-300-tools-registry** (NEW)
**Estimate:** ~1h
**Status:** PENDING (AMENDED 2026-06-09)

---

## ⚠️ 2026-06-10 IMPLEMENTATION ADDENDUM — `@mpilot/agent` re-exports DEFERRED to Epic E5

The 2026-06-09 UPDATE below assumes `@mpilot/agent` exists (`createConcierge`,
`Concierge`, `tick()`, `setGoal()` re-exports + the tick/goal BDD criteria).
**No story in the corpus creates `packages/agent/` before Epic E5** — story-60
creates `@mpilot/llm`, and the runtime itself is assembled by stories 62-67,
all of which transitively depend on THIS story. Stubbing a fake runtime to
satisfy the criteria would be a banned hot-path mock, so story-22 shipped the
implementable subset:

- ✅ `packages/sdk/package.json` per ADR-018 (ESM-only, Node ≥22, peers `ai` /
  `@ai-sdk/provider` / `zod`; zod peer is `^4.1.0` matching `@mpilot/tools`,
  not the `^3.25 || ^4.1` below — the dependency chain can't honor zod 3)
- ✅ `src/defaultModel.ts` per ADR-016 (returns `LanguageModelV3` — the
  interface the installed `@ai-sdk/*` 3.x providers actually ship, per
  SDK-DX-STUDY §A's "pin to whatever is active at story time")
- ✅ `src/registry.ts` — `ConciergeRegistry.mainnet()/sepolia()`, frozen,
  sourcing `@mpilot/shared` by reference, `implements ConciergeAgentLike`
- ✅ `src/errors.ts` — `ConciergeError` + `ConciergeErrorType` per ADR-019
- ✅ Barrel re-exports of the EXISTING surface (`@mpilot/tools` +
  `@mpilot/vercel-ai`) + README
- ⏸️ DEFERRED to the E5 story that creates `@mpilot/agent`: the
  `createConcierge` / `Concierge` re-exports, the tick/goal BDD criteria
  (missing-goal `ConciergeError`, AsyncIterable + `.on()`, per-phase model
  override), and the ADR-019 five-line quickstart in the README.

## ⚠️ 2026-06-09 UPDATE — read this BEFORE the original story body

Per architecture.md ADR-014 + ADR-016 + ADR-019 (rework 2026-06-09), the `@mpilot/sdk` shape changed:

1. **`@mpilot/sdk` becomes a META PACKAGE** that re-exports `@mpilot/agent` + `@mpilot/tools` + `@mpilot/vercel-ai` for ergonomic single-import. The "main class" is `Concierge` exported from `@mpilot/agent`, not `@mpilot/sdk` directly.

2. **`createConcierge()` factory replaces the `new Concierge()` class constructor** (per SDK-DX-STUDY §I — factory functions, no class hierarchies needed):
   ```typescript
   export function createConcierge(opts: {
     model: LanguageModelV2;                      // user brings provider (ADR-016)
     registry: ConciergeRegistry;                  // bundled Mantle addresses
     models?: Partial<Record<TickPhase, LanguageModelV2>>;  // per-phase override
     walletProvider?: WalletProvider;
     rpcUrl?: string;
     attestation?: { erc8004: boolean };
   }): Concierge;
   ```

3. **`goal` is NOT a constructor arg.** `concierge.setGoal('...')` is a separate method. Constructor side-effects = test hell (SDK-DX-STUDY §I).

4. **Providers are NOT user-registered.** The 7 protocol packages (`@mpilot/aave-v3-mantle`, etc.) auto-register into `@mpilot/tools` when the agent is constructed. The `ProviderInterface` / `defineProvider()` pattern in the original story below is REPLACED by `ConciergeTool` from `@mpilot/tools` (story-200).

5. **Tick API: AsyncIterable + `.on()` events** (per ADR-019):
   ```typescript
   const tick = concierge.tick();
   for await (const event of tick) { /* primary surface */ }
   tick.on('proposal', p => ...);  // event-emitter sugar
   ```

6. **No model lock-in.** `model: LanguageModelV2` is the contract. `defaultModel()` helper does env auto-detect (`ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` / `XAI_API_KEY`) + `AI_MODEL="provider:model"` override. Strike the original `llm: { model: string }` field.

7. **Package config:** ESM-only, `"type": "module"`, `"sideEffects": false`, `"engines.node": ">=22"`, `peerDependencies: { ai: "^6", "@ai-sdk/provider": "*", zod: "^3.25 || ^4.1" }`. Runtime deps: `@mpilot/agent`, `@mpilot/tools`, `@mpilot/vercel-ai`, `@mpilot/shared` (all `workspace:*`).

### Updated file modification map (replaces the one below)

- `packages/sdk/package.json` — NEW per ADR-018 shape
- `packages/sdk/src/index.ts` — barrel re-exports: `createConcierge`, `defaultModel`, `ConciergeRegistry`, `Concierge` class type, `ConciergeError`, `ConciergeTool`, `tool()`, `SerializableConciergeXxxSchema`s
- `packages/sdk/src/registry.ts` — `ConciergeRegistry.mainnet()` / `ConciergeRegistry.sepolia()` bundled-addresses factory (sources from `@mpilot/shared`)
- `packages/sdk/src/defaultModel.ts` — env-auto-detect helper (per ADR-016)
- `packages/sdk/README.md` — the 5-line quickstart from ADR-019:
  ```typescript
  import { createConcierge, defaultModel, ConciergeRegistry } from '@mpilot/sdk';
  const concierge = createConcierge({ model: defaultModel(), registry: ConciergeRegistry.mainnet() });
  await concierge.setGoal('Max USDC yield, stay under 70% LTV');
  for await (const event of concierge.tick()) { console.log(event); }
  ```

### Updated BDD criteria (additive, not replacement)

```
Given env has ANTHROPIC_API_KEY set
When `defaultModel()` is called with no args
Then it returns a LanguageModelV2 from anthropic('claude-sonnet-4-6')

Given env has AI_MODEL="openai:gpt-5.1" + OPENAI_API_KEY set
When `defaultModel()` is called with no args
Then it returns a LanguageModelV2 from openai('gpt-5.1')

Given a Concierge instance is constructed without a goal
When `concierge.tick()` is called
Then it throws ConciergeError with type='UserRejected' and message hints to call setGoal() first

Given a Concierge instance with a goal and Sepolia registry
When `for await (const e of concierge.tick())` runs
Then the first event has type='plan-delta' or type='plan-done'
```

### Tests to ADD to the test suite

- env-auto-detect via `defaultModel()` for all 4 providers (mock `process.env`)
- per-phase model override via `models: { plan: customModel }` reaches `generateText({ model: customModel })`
- `goal` setter accepts plain-English string and stores it
- `tick()` returns both AsyncIterable AND emits `.on('proposal', ...)` events
- `ConciergeError` thrown on missing-goal `.tick()` call

### Drop from the original story

- The `ProviderInterface` + `defineProvider()` + provider-registration tests are REPLACED by `@mpilot/tools` per story-200. Delete those tests from this story.
- The `llm: { model: string }` config field is REPLACED by `model: LanguageModelV2`.
- The `c.registerProvider(name, provider)` API is GONE — providers self-register via `@mpilot/agent`'s `ConciergeAgent` constructor reading from `@mpilot/tools`.

---

## (original story preserved below for reference — see UPDATE above for current direction)

---

## User story

**As a** Mantle developer using Concierge
**I want to** `import { Concierge } from '@mpilot/sdk'` and register providers in 5 lines
**So that** I can ship my own agent without re-implementing the runtime contract

---

## File modification map

- `packages/sdk/package.json` — NEW — `name: "@mpilot/sdk"`, exports map, peer deps on `viem`, `zod`
- `packages/sdk/src/index.ts` — NEW — barrel exports
- `packages/sdk/src/Concierge.ts` — NEW — main `Concierge` class with `constructor(opts)`, `registerProvider(name, provider)`, `getProvider(name)`, `listProviders()`, `setGoal(goal)`, `activate()`, `deactivate()`, lifecycle events
- `packages/sdk/src/types.ts` — NEW — `ConciergeOptions`, `ProviderInterface`, `ActionDefinition`, `AgentLifecycle`
- `packages/sdk/src/provider.ts` — NEW — `defineProvider(name, actions)` helper for Mantle dev ergonomics
- `packages/sdk/src/Concierge.test.ts` — NEW — unit tests covering: construction, provider registration, action lookup, lifecycle transitions, invalid-config errors
- `packages/sdk/README.md` — NEW — quickstart: `npm install @mpilot/sdk` + 5-line example

---

## Acceptance criteria (BDD)

```
Given `@mpilot/sdk` package exists
When `node -e "const pkg = require('./packages/sdk/package.json'); console.log(pkg.name)"` runs
Then output is "@mpilot/sdk"

Given a Concierge instance is constructed
When `pnpm -e "import { Concierge } from './packages/sdk/src/index.ts'; const c = new Concierge({ chain: 'mantle-mainnet' }); console.log(c.listProviders())"` runs
Then output is "[]" (empty array — no providers registered yet)

Given a mock provider is registered
When the test registers a provider with one action and queries `c.getProvider('mock').actions.testAction`
Then the returned object has `inputSchema`, `description`, `execute`

Given a goal is set on an active agent
When `await c.setGoal("max yield"); await c.activate(); console.log(c.state)` runs
Then output is "active"

Given an invalid options object is passed
When `new Concierge({})` runs
Then it throws a Zod validation error with helpful message

Given test file runs
When `pnpm test packages/sdk/src/Concierge.test.ts` runs
Then ≥ 15 test cases pass
```

---

## Shell verification

```bash
test -f packages/sdk/package.json
test -f packages/sdk/src/Concierge.ts
test -f packages/sdk/src/types.ts
test -f packages/sdk/src/provider.ts
test -f packages/sdk/src/Concierge.test.ts
test -f packages/sdk/README.md

# Package name correct
node -e "
  const pkg = require('./packages/sdk/package.json');
  if (pkg.name !== '@mpilot/sdk') process.exit(1);
"

# Tests pass with ≥ 15 cases
pnpm test packages/sdk/src/Concierge.test.ts --reporter=verbose 2>&1 | grep -E "(✓|PASS)" | wc -l | awk '$1 >= 15 {exit 0} {exit 1}'

# Typecheck passes
pnpm run typecheck
test $? -eq 0

# README has the 5-line example
grep -q "npm install @mpilot/sdk" packages/sdk/README.md
grep -q "new Concierge" packages/sdk/README.md
grep -q "registerProvider" packages/sdk/README.md
```

---

## Notes for coding agent

- `Concierge` class is the dev-facing entrypoint. Internally it owns a `Map<string, ProviderInterface>`.
- `ProviderInterface` shape (locked):
  ```typescript
  interface ProviderInterface {
    name: string;
    actions: Record<string, ActionDefinition>;
    selectors: Record<string, (args: any) => Promise<any>>;
  }
  interface ActionDefinition {
    description: string;
    inputSchema: ZodSchema;
    execute: (input: unknown, ctx: ExecutionContext) => Promise<ActionResult>;
  }
  ```
- The `defineProvider(name, { actions })` helper validates the shape at register time so misuse fails fast.
- Lifecycle states: `idle | active | paused | error` — Zustand-style state machine internally.
- `setGoal()` accepts the plain-English string; LLM-extracted parameters come from the agent runtime (Epic E5), NOT from the SDK directly.
- Constructor options (Zod-validated):
  ```typescript
  ConciergeOptions = z.object({
    chain: z.enum(['mantle-mainnet', 'mantle-sepolia']),
    rpcUrl: z.string().url().optional(), // defaults to public Mantle RPC
    walletClient: z.unknown().optional(), // viem WalletClient | ZeroDev kernel
    llm: z.object({ model: z.string() }).optional(),
    attestation: z.object({ erc8004: z.boolean() }).default({ erc8004: true }),
  });
  ```
- 15 test cases minimum, covering: 3 happy-path construction tests, 3 provider registration tests, 3 action-lookup tests, 3 lifecycle tests, 3 invalid-config tests.
- README example MUST be runnable copy-paste (verify by following it manually).
