<p align="center">
  <a href="https://github.com/Blockchain-Oracle/mpilot">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner-dark.svg">
      <img alt="mPilot" src="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner.svg" width="100%">
    </picture>
  </a>
</p>

# @mpilot/llm

LLM client + per-phase model routing for the mPilot tick worker. Anthropic-first (Claude Agent SDK) with prompt-caching helpers. Internal to the worker; SDK consumers use `defaultModel()` from `@mpilot/sdk` for model-agnostic access.

## Quickstart

```ts
import { createLlmClient, routeModelForPhase, markPrefixForCaching } from '@mpilot/llm';

const client = createLlmClient({ apiKey: process.env.ANTHROPIC_API_KEY! });
const model = routeModelForPhase('plan'); // phase → Opus/Sonnet/Haiku per DEFAULT_MODEL_BY_PHASE
```

## Exports

- **`createLlmClient`** — configured Anthropic client with `mergeBetaHeader` + `PROMPT_CACHING_BETA`.
- **`routeModelForPhase` / `DEFAULT_MODEL_BY_PHASE` / `MODEL_OPUS|SONNET|HAIKU`** — per-tick-phase model selection.
- **`markPrefixForCaching`** — mark a stable prompt prefix for Anthropic prompt caching.

Part of [mPilot](https://github.com/Blockchain-Oracle/mpilot).
