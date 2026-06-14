# Story — Skill install flow (`npx skills add @concierge-mantle/mantle-agent`)

**ID:** story-152-skill-install-flow
**Epic:** Epic E9 — RealClaw Skill
**Depends on:** story-151-skill-manifest-yaml
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** new Concierge user with Claude Code installed
**I want to** running `npx skills add @concierge-mantle/mantle-agent` installs the skill, runs the post-install configuration script, walks me through OAuth, and verifies the MCP connection works
**So that** the skill experience is one command, from "I want to try Concierge" to "the agent is wired into my Claude Code"

---

## File modification map

- `packages/skill-mantle-agent/scripts/install.ts` — NEW (replaces install.sh placeholder from story-150) — TypeScript install script: checks Claude Code installed → adds MCP server config → runs OAuth → verifies tools/list returns
- `packages/skill-mantle-agent/scripts/verify-mcp.ts` — NEW — standalone verification: connects to MCP server, runs initialize + tools/list, reports OK/FAIL with diagnostics
- `packages/skill-mantle-agent/scripts/lib/claude-code-config.ts` — NEW — reads/writes Claude Code's MCP server config file (~/.claude/mcp.json or platform-specific path)
- `packages/skill-mantle-agent/scripts/lib/oauth-cli.ts` — NEW — CLI OAuth flow: opens browser to authorize URL, listens on localhost callback, exchanges code for token, stores in OS keychain
- `packages/skill-mantle-agent/scripts/__tests__/install.test.ts` — NEW — integration test (mocks Claude Code config + OAuth callback)

---

## Acceptance criteria (BDD)

```
Given `npx skills add @concierge-mantle/mantle-agent` is run
When the install script executes
Then it: (1) detects Claude Code config location, (2) adds the MCP server entry, (3) opens browser for OAuth, (4) on callback stores token in keychain, (5) runs verify-mcp, (6) reports success

Given Claude Code is NOT installed
When the install script runs
Then it exits with code 1 AND a clear message "Claude Code not detected — install Claude Code first: https://claude.ai/code"

Given the user closes the browser before completing OAuth
When the callback server times out after 5min
Then the install script exits with "OAuth timed out — re-run installation to try again"

Given the OAuth callback succeeds
When the token is received
Then it is stored in the OS keychain (NOT in plaintext config file)

Given the verify-mcp step
When the MCP server responds successfully
Then "Installation complete — try `concierge agent status` in Claude Code" is shown

Given the verify-mcp step
When the MCP server fails to respond
Then the script reports the specific failure (network? auth? server down?) with a diagnostic + suggestion

Given the script is run AGAIN (already installed)
When it detects an existing config
Then it offers to: (a) update token, (b) reinstall, (c) cancel — does NOT silently overwrite

Given the script is run in a CI environment (no browser)
When OAuth would open browser
Then it falls back to printing the authorize URL + a prompt to paste the code (headless flow)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd packages/skill-mantle-agent
test -f scripts/install.ts
test -f scripts/verify-mcp.ts
test -f scripts/lib/claude-code-config.ts
test -f scripts/lib/oauth-cli.ts

cd ../..

# Build install script
pnpm --filter @concierge-mantle/skill-mantle-agent run build
test $? -eq 0

# OS keychain used (not plaintext)
grep -qE "(keychain|keytar|credential-manager)" packages/skill-mantle-agent/scripts/lib/oauth-cli.ts

# Headless fallback
grep -qE "(headless|CI|no.browser)" packages/skill-mantle-agent/scripts/install.ts

# Tests pass
pnpm --filter @concierge-mantle/skill-mantle-agent run test 2>&1 | grep "install" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **OS keychain for token storage** is non-negotiable. Use `keytar` (Node) or platform-specific bindings. NEVER store the OAuth token in plaintext config — it's the equivalent of a long-lived password.
- **Browser-based OAuth callback** uses ephemeral localhost server. Pattern: spawn http.Server listening on a random port, include that port in the redirect_uri, wait for callback, kill server. Standard CLI OAuth pattern.
- **5-minute timeout** on the OAuth callback. Long enough for slow users; short enough to fail fast on abandoned flows.
- **Headless fallback** matters for SSH-only environments + CI usage. Print the authorize URL; instruct the user to open it in any browser, paste the callback code back to the script. Less convenient but unblocked.
- **`verify-mcp` is the smoke test.** If it fails, the user is stuck — provide ACTIONABLE diagnostics: network issue ("can't reach mcp.concierge.xyz; check your internet"), auth issue ("token rejected; try re-installing"), server down ("the MCP server is unreachable; check status at status.concierge.xyz").
- **Reinstall scenario** is common (token expired, config corrupted). Offer choices instead of silently overwriting — preserves user intent.
- **Add to PATH or use npx**: per Node convention. `npx skills add ...` ensures latest version pulled.
- **Idempotence**: re-running the install with the same args should produce the same result (modulo OAuth re-prompt). No "config corruption from repeated installs."
- Cross-ref: `research/concierge/06-realclaw-skill-pkg.md` § install flow, story-134 (OAuth flow this script consumes).
