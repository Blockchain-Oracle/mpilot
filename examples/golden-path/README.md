# golden-path — internal dev test loop

Not user-facing. This is the developer scratch harness for exercising the
agent loop against real Mantle Sepolia + real LLM to catch bugs that don't
show up in unit tests (Vercel AI SDK schema marshalling, EVM RPC quirks,
model tool-call behavior).

The harness is INTERNAL — DO NOT promote to the docs site or the deploy
runbook. It exists so we can quickly answer "does the agent actually
achieve goal X?" and fix the bug it surfaces before moving on.

Run with `pnpm run` after setting `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY`)
in `apps/worker/.env` and `GOLDEN_PRIVATE_KEY` in `.env.local` (the harness
auto-loads both).
