# Story — `@concierge/mcp` stdio publish + `npx skills add` smoke test

**ID:** story-136-mcp-stdio-publish
**Epic:** Epic E8 — MCP Server
**Depends on:** story-130-mcp-server-bootstrap (amended)
**Estimate:** ~1h
**Status:** PENDING (NEW 2026-06-09)

---

## User story

**As a** Claude Code / Claude Desktop / Cursor / Windsurf / Goose / OpenCode / Codex user
**I want to** run `claude mcp add concierge -- npx -y @concierge/mcp` and have Concierge's tools available in my chat client
**So that** I can drive Concierge from my IDE without leaving it, with zero infrastructure setup

---

## File modification map

- `packages/mcp/package.json` — UPDATE — `bin: { "concierge-mcp": "./dist/stdio.js" }`, publish config with provenance, npm tag `latest`
- `packages/mcp/src/stdio.ts` — UPDATE — proper shebang `#!/usr/bin/env node` at top of compiled output (`tsup` config: `banner: { js: '#!/usr/bin/env node' }`)
- `packages/mcp/src/wallet-bootstrap.ts` — NEW — auto-generate ephemeral session key on first run, persist to `~/.concierge/config.json` (per pokaldot pattern)
- `packages/mcp/README.md` — UPDATE — install snippets for 10+ MCP hosts (Claude Code / Claude Desktop / Cursor / Windsurf / VS Code Copilot / Zed / Cline / Goose / OpenCode / Codex)
- `.github/workflows/publish-packages.yml` — UPDATE — npm publish job for `@concierge/mcp` with provenance enabled

---

## Acceptance criteria (BDD)

```
Given the package is built
When `pnpm --filter @concierge/mcp build && head -1 packages/mcp/dist/stdio.js` runs
Then output is "#!/usr/bin/env node"

Given the package is `npm pack`ed
When `cd packages/mcp && npm pack && tar -tzf concierge-mcp-*.tgz` runs
Then the tarball contains `dist/stdio.js`, `dist/index.d.ts`, `README.md`, AND `package.json`

Given the stdio bin runs with a fresh ~/.concierge/ directory
When `node packages/mcp/dist/stdio.js` is launched and sent `{"jsonrpc":"2.0","id":1,"method":"initialize",...}` via stdin
Then it responds with valid `initialize` result on stdout AND `~/.concierge/config.json` is created with a generated session key AND NO stdout output occurs except MCP messages

Given the stdio bin runs with ANTHROPIC_API_KEY env var unset
When the bin starts
Then it logs to STDERR a clear error message "Set one of ANTHROPIC_API_KEY / OPENAI_API_KEY / ... or configure AI_MODEL" AND exits with code 2

Given a smoke test
When `claude mcp add concierge -- npx -y @concierge/mcp@<published-version>` runs in a clean shell with ANTHROPIC_API_KEY set
Then Claude Code reports the server is connected AND `claude mcp list` shows "concierge: connected"

Given the publish CI runs
When `gh workflow run publish-packages.yml` is triggered against a tag
Then `npm view @concierge/mcp version` returns the tag version within 2 minutes
```

---

## Shell verification

```bash
test -f packages/mcp/package.json
test -f packages/mcp/src/wallet-bootstrap.ts

# bin entry present
node -e "
  const p = require('./packages/mcp/package.json');
  if (p.bin?.['concierge-mcp'] !== './dist/stdio.js') process.exit(1);
  if (p.publishConfig?.provenance !== true) process.exit(2);
  if (p.type !== 'module') process.exit(3);
"

pnpm --filter @concierge/mcp build

# Shebang on bin output
head -1 packages/mcp/dist/stdio.js | grep -q "^#!/usr/bin/env node"

# Anti-regression: bin must NOT log to stdout (reserved for MCP)
! grep -E "console\.(log|info)" packages/mcp/src/stdio.ts

# README has the 10+ install snippets
for host in "Claude Code" "Claude Desktop" "Cursor" "Windsurf" "Goose" "OpenCode" "Codex"; do
  grep -q "$host" packages/mcp/README.md || { echo "missing: $host"; exit 1; }
done
```

---

## Notes for coding agent

- **Stdout is reserved for MCP messages.** Every log MUST go to stderr (`process.stderr.write` or `pino.stderr`). One stray `console.log` corrupts the MCP transport.
- **Wallet bootstrap** auto-generates an ephemeral session key + RPC URL on first run, stored at `~/.concierge/config.json`. Schema:
  ```json
  { "sessionKey": "0x...", "rpcUrl": "https://rpc.mantle.xyz", "chainId": 5000, "agentId": "agt_..." }
  ```
  Per pokaldot's `~/.portaldot-mcp/config.json` pattern. NEVER commit a key. NEVER log the key.
- **Real Mainnet session-key import flow** (where user pastes a real key) is story-138 (Elicitation `mode: 'url'`).
- **`tsup` config** must include `banner: { js: '#!/usr/bin/env node' }` so the compiled bin has a shebang.
- **Provenance** must be enabled in `publishConfig` (supply-chain safety per CLAUDE.md). Uses GitHub OIDC.
- Cross-ref: ADR-011 (amended), story-130 (amended), AUDIT-2026-06-09 §12 (skills CLI verified `vercel-labs/skills`).
