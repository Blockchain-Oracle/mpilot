# Story — `npm create concierge-app@latest` scaffolder

**ID:** story-330-scaffolder
**Epic:** Epic E15 — Distribution (NEW)
**Depends on:** stories 200-204, 210-214 (all packages publishable)
**Estimate:** ~2h
**Status:** PENDING (NEW 2026-06-09)

---

## User story

**As a** Mantle developer who heard about Concierge in a hackathon X-thread
**I want to** run `npm create concierge-app@latest` and pick a template (vercel-ai-agent / langchain-agent / mcp-only / react-embed / starter) to get a working Concierge integration in 30 seconds
**So that** my adoption friction is "one command + answer 2 prompts" rather than "read 5 packages' READMEs"

---

## File modification map

- `packages/create-concierge-app/package.json` — NEW — CLI bin entry `create-concierge-app`
- `packages/create-concierge-app/src/cli.ts` — NEW — prompts via `@clack/prompts`; copies template directory + writes `package.json`
- `packages/create-concierge-app/templates/starter/` — NEW — minimal Node + `@concierge/sdk` 5-line tick loop
- `packages/create-concierge-app/templates/vercel-ai-agent/` — NEW — Next.js + Vercel AI SDK + `@concierge/vercel-ai` + `@concierge/react-ui` (the canonical chat app)
- `packages/create-concierge-app/templates/langchain-agent/` — NEW — `@concierge/langchain` + LangChain agent executor
- `packages/create-concierge-app/templates/mcp-only/` — NEW — Cloudflare Worker wrapping `packages/mcp` for hosted MCP
- `packages/create-concierge-app/templates/react-embed/` — NEW — Drop-in React component example (consumes `@concierge/react-ui`)
- `packages/create-concierge-app/README.md` — NEW

---

## Acceptance criteria (BDD)

```
Given `npm create concierge-app@latest my-app` runs in an empty directory
When the user selects "vercel-ai-agent" template
Then a directory `my-app/` is created with package.json, src/, .env.example, README.md AND `cd my-app && pnpm install && pnpm dev` brings up the demo at localhost:3000

Given the starter template
When `pnpm install && pnpm dev` runs
Then concierge.tick() executes against Mantle Sepolia using ANTHROPIC_API_KEY from .env.example (user fills in)

Given the mcp-only template
When `pnpm install && pnpm build && pnpm deploy` runs
Then a Cloudflare Worker is deployed with the Concierge MCP server reachable at the wrangler URL

Given the create-concierge-app CLI
When `npx create-concierge-app@<version> --template starter --name foo` (non-interactive) runs
Then exit code is 0 AND the foo directory exists

Given each template
When the template is reviewed
Then it contains a working README, .env.example, and a SCRIPT that demonstrates the core flow within 5 minutes of clone-to-running

Given tests + publish
When tests run AND the package is publishable
Then ≥ 8 e2e CLI tests pass (mock filesystem) AND `npm pack` produces a tarball with all 5 templates included
```

---

## Shell verification

```bash
test -f packages/create-concierge-app/package.json
test -f packages/create-concierge-app/src/cli.ts

for t in starter vercel-ai-agent langchain-agent mcp-only react-embed; do
  test -d packages/create-concierge-app/templates/${t} || { echo "missing template: $t"; exit 1; }
  test -f packages/create-concierge-app/templates/${t}/package.json
  test -f packages/create-concierge-app/templates/${t}/README.md
  test -f packages/create-concierge-app/templates/${t}/.env.example
done

# bin entry
node -e "
  const p = require('./packages/create-concierge-app/package.json');
  if (!p.bin?.['create-concierge-app']) process.exit(1);
"

# Each template's package.json should reference concrete @concierge/* deps (proves cross-package linkage)
for t in starter vercel-ai-agent langchain-agent react-embed; do
  grep -q '"@concierge/' packages/create-concierge-app/templates/${t}/package.json || { echo "template $t lacks @concierge/* dep"; exit 1; }
done

pnpm --filter create-concierge-app build
pnpm --filter create-concierge-app test 2>&1 | grep -cE "(✓|PASS)" | awk '$1 >= 8 {exit 0} {exit 1}'
```

---

## Notes for coding agent

- **`@clack/prompts`** is a minimal CLI prompt library used by `create-next-app`, `create-vite`, etc. Adopt it for consistency with the ecosystem.
- **Templates use `pnpm`** by default but `npm`/`yarn` should also work (detect via `npm_config_user_agent`).
- **`.env.example`** in every template documents which API keys / RPC URLs are needed.
- **Mantle Sepolia is the default chain** for all templates (zero-capital onboarding for new devs).
- **Each template's README** must include:
  - `pnpm install && pnpm dev` quickstart
  - Link to relevant Concierge package docs
  - Mantle faucet link for Sepolia gas
- Cross-ref: ADR-014 + 015 (the packages templates consume), CDR-Kit's `create-cdr-kit-app` (the canonical reference pattern, 9 templates).
