<p align="center">
  <a href="https://github.com/Blockchain-Oracle/mpilot">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner-dark.svg">
      <img alt="mPilot" src="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner.svg" width="100%">
    </picture>
  </a>
</p>

# @mpilot/agent

The mPilot agent runtime: the 5-phase tick loop and the streaming chat handler. Framework-agnostic and fully dependency-injected — you supply the phase implementations, locks, and tools.

## Tick loop

`plan → simulate → propose → execute → record`, sequenced under a Redis NX lock with per-phase abort:

```ts
import { tick, runPlan, runSimulate, runPropose, runExecute, runRecord, createLock } from '@mpilot/agent';

const result = await tick({
  agentId,
  loadState, plan, simulate, propose, execute, record, // your DI'd phase fns
  lock: createLock(redis),
});
```

The exported `runPlan` / `runSimulate` / `runPropose` / `runExecute` / `runRecord` are the real phase
implementations; compose them with your model, providers, executor, and attestation writer.

## Chat handler

A framework-agnostic `Request → Response` handler (Vercel AI SDK v6 UI-message stream). Slots into
Next.js App Router, Workers, Hono, Bun, Deno:

```ts
import { createChatHandler } from '@mpilot/agent';

export const POST = createChatHandler({
  model: defaultModel(),
  agent: { chainId: 5003 },
  providerToolFactories,        // from @mpilot/runtime
  getSystemPromptContext,
  authGate: { auth: 'verify', verify },
});
```

Part of [mPilot](https://github.com/Blockchain-Oracle/mpilot).
