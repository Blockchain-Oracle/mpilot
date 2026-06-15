# Story — Model-agnostic provider abstraction (`defaultModel()` + env auto-detect)

**ID:** story-320-model-agnostic-provider
**Epic:** Epic E13 — Composable Primitive
**Depends on:** story-22-sdk-skeleton (amended)
**Estimate:** ~1h
**Status:** PENDING (NEW 2026-06-09)

---

## User story

**As a** developer adopting Concierge with my OWN LLM provider (OpenAI / Google / xAI, not just Anthropic)
**I want to** set `OPENAI_API_KEY=sk-... AI_MODEL="openai:gpt-5.1"` and have `createConcierge({ model: defaultModel() })` just work
**So that** I'm not locked into Anthropic and Concierge is genuinely multi-provider per ADR-016

---

## File modification map

- `packages/sdk/package.json` — UPDATE — add peer deps on `ai ^6`, `@ai-sdk/provider ^2`, `@ai-sdk/anthropic ^2`, `@ai-sdk/openai ^2`, `@ai-sdk/google ^2`, `@ai-sdk/xai ^2`. (All optional peers — user installs whichever provider they use; bundler/tree-shaker eliminates the rest.)
- `packages/sdk/src/defaultModel.ts` — NEW — `defaultModel(spec?: string): LanguageModelV2` helper. Parses `AI_MODEL` env, switches on provider, returns provider factory result.
- `packages/sdk/src/__tests__/defaultModel.test.ts` — NEW — ≥ 12 cases.
- `packages/sdk/README.md` — UPDATE — env table at the top:

  | Env | Required? | Purpose |
  |---|---|---|
  | One of `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` / `XAI_API_KEY` | YES | LLM provider auth (`defaultModel()` auto-detects which is set) |
  | `AI_MODEL` | NO | Override provider + model. Format: `"provider:model"`. Default: `"anthropic:claude-sonnet-4-6"` |
  | `CONCIERGE_RPC_URL` | NO | Override default Mantle RPC. Default: `https://rpc.mantle.xyz` (Mainnet) |

---

## Acceptance criteria (BDD)

```
Given env has ANTHROPIC_API_KEY="sk-ant-..." and no AI_MODEL
When `defaultModel()` runs
Then it returns a LanguageModelV2 with `.provider === 'anthropic'` and `.modelId === 'claude-sonnet-4-6'`

Given env has AI_MODEL="openai:gpt-5.1" and OPENAI_API_KEY="sk-..."
When `defaultModel()` runs
Then it returns a LanguageModelV2 with `.provider === 'openai'` and `.modelId === 'gpt-5.1'`

Given env has AI_MODEL="google:gemini-3" and GOOGLE_GENERATIVE_AI_API_KEY="..."
When `defaultModel()` runs
Then it returns a LanguageModelV2 with `.provider === 'google'`

Given env has AI_MODEL="xai:grok-4"
When `defaultModel()` runs (with XAI_API_KEY set)
Then it returns a LanguageModelV2 with `.provider === 'xai'`

Given env has AI_MODEL="unsupported:foo"
When `defaultModel()` runs
Then it throws ConciergeError with type='NetworkError' and message includes "Unknown provider: unsupported"

Given env has no API key set
When `defaultModel()` runs
Then it throws a clear error from the provider SDK explaining which env var to set

Given an explicit spec string is passed
When `defaultModel('anthropic:claude-opus-4-7')` runs
Then it uses that model regardless of AI_MODEL env

Given a Concierge instance with no per-phase model override
When `concierge.tick()` runs
Then EVERY `generateText` call inside uses the same model (the constructor's `model`)

Given a Concierge instance with `models: { plan: customModel }`
When the tick's plan phase runs
Then `generateText({ model: customModel })` is called for plan AND `generateText({ model: defaultModel })` for all other phases

Given the tick worker (apps/worker/) still uses @anthropic-ai/claude-agent-sdk
When the tick runs in production
Then the autonomous loop is Anthropic-only (NOT model-agnostic) per ADR-016 — this is intentional, INTERNAL only

Given typecheck and tests
When `pnpm typecheck && pnpm --filter @mpilot/sdk test` runs
Then both exit 0 with ≥ 12 test cases passing
```

---

## Shell verification

```bash
test -f packages/sdk/src/defaultModel.ts
test -f packages/sdk/src/__tests__/defaultModel.test.ts

# Peer deps declared
node -e "
  const p = require('./packages/sdk/package.json');
  for (const dep of ['ai', '@ai-sdk/provider', '@ai-sdk/anthropic', '@ai-sdk/openai', '@ai-sdk/google', '@ai-sdk/xai']) {
    if (!p.peerDependencies?.[dep]) { console.error('missing peer:', dep); process.exit(1); }
  }
"

# Anti-regression: no hardcoded Anthropic in @mpilot/sdk public surface
! grep -E "import.*@anthropic-ai/(sdk|claude-agent-sdk)" packages/sdk/src/index.ts
! grep -E "import.*@anthropic-ai" packages/sdk/src/defaultModel.ts  # uses @ai-sdk/anthropic not raw SDK

# README env table present
grep -q "ANTHROPIC_API_KEY" packages/sdk/README.md
grep -q "AI_MODEL" packages/sdk/README.md
grep -q "provider:model" packages/sdk/README.md

pnpm --filter @mpilot/sdk test 2>&1 | grep -cE "(✓|PASS)" | awk '$1 >= 12 {exit 0} {exit 1}'
pnpm typecheck
```

---

## Notes for coding agent

- Implementation per architecture.md ADR-016 (verbatim):

  ```typescript
  import { anthropic } from '@ai-sdk/anthropic';
  import { openai } from '@ai-sdk/openai';
  import { google } from '@ai-sdk/google';
  import { xai } from '@ai-sdk/xai';
  import type { LanguageModelV2 } from '@ai-sdk/provider';
  import { ConciergeError } from './errors';  // from story-23

  export function defaultModel(spec = process.env.AI_MODEL): LanguageModelV2 {
    const [provider, model] = (spec ?? 'anthropic:claude-sonnet-4-6').split(':');
    switch (provider) {
      case 'anthropic': return anthropic(model);
      case 'openai':    return openai(model);
      case 'google':    return google(model);
      case 'xai':       return xai(model);
      default: throw new ConciergeError('NetworkError', `Unknown provider: ${provider}`);
    }
  }
  ```

- **`@ai-sdk/*` provider packages are PEER deps, not runtime.** Users install only the ones they use. The bundler tree-shakes the imports they don't.
- **Tick worker stays Anthropic-only** (ADR-016) — this story does NOT change `apps/worker/`. The model-agnostic surface is the PUBLIC SDK + MCP + chat API ONLY.
- Cross-ref: ADR-016, SDK-DX-STUDY-2026-06-09 §B.
