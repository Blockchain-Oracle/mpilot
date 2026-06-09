# Story 45 — Tool: `byreal-cli` bash invocation wrapper (Track 6 qualifier)

**Epic:** Epic 3 — Agent Decision Engine
**Estimated:** ~1.5h
**Depends on:** story-40-claude-agent-sdk-bootstrap

## BDD Acceptance Criteria

```
Given the api container has `@byreal-io/byreal-cli` installed globally
When `which byreal-cli` runs at container boot
Then it returns a non-empty path
And `byreal-cli --version` exits 0 and prints a semver

Given the agent registry is initialized
When `registerByrealTool()` is called at boot
Then a single tool `byrealCli` is registered with input schema { subcommand: enum, args: record<string, string|number> }
And the tool description explicitly says: "Use for Solana-side source-of-funds operations. Returns parsed JSON. NEVER passes user input as a flag value without sanitization."

Given the agent calls `byrealCli({ subcommand: 'quote', args: { in: 'USDC', out: 'sUSDe', amount: '100' } })`
When the handler runs
Then it invokes `byreal-cli quote --in USDC --out sUSDe --amount 100 -o json` via Node `child_process.execFile` (NOT shell=true)
And the `-o json` flag is appended automatically by the wrapper so the agent never needs to remember it (per AUDIT-2: byreal-cli's JSON flag is `-o json`, NOT `--json`)
And it enforces a 15s timeout via the `timeout` option
And stdout is parsed as JSON; on parse failure returns `{ error: 'invalid_cli_output', raw: <stdout-truncated-to-2k> }`
And stderr non-empty causes `{ error: 'cli_stderr', stderr: <truncated>, exitCode: <number> }`

Given a subcommand or arg value contains shell metacharacters (`;`, `|`, `` ` ``, `$`)
When the handler runs argument validation BEFORE spawning
Then it throws ByrealInvalidArgumentError and the tool returns `{ error: 'invalid_argument', field: <name> }`
And no child process is spawned

Given the byreal-cli binary is not installed
When the tool handler runs
Then it returns `{ error: 'byreal_cli_not_installed', hint: 'install @byreal-io/byreal-cli globally in the container' }`
And the agent loop continues — does NOT crash
```

## File modification map

- `apps/api/src/agent/tools/byreal/byrealCli.ts` — NEW — tool def + handler using `child_process.execFile` with strict allowlist of subcommands (`quote`, `swap`, `bridge`, `balance`); 15s timeout; JSON parse; structured errors
- `apps/api/src/agent/tools/byreal/argSanitizer.ts` — NEW — pure function `sanitizeArg(value)` that rejects any string containing shell metacharacters, NUL bytes, or values > 256 chars; rejects subcommand values not in the allowlist
- `apps/api/src/agent/tools/byreal/schemas.ts` — NEW — Zod input + output schemas; subcommand is `z.enum(['quote','swap','bridge','balance'])`
- `apps/api/src/agent/tools/byreal/registerByreal.ts` — NEW — `registerByrealTool(registry)`
- `apps/api/src/agent/bootstrap.ts` — UPDATE — call `registerByrealTool` after external tools
- `Dockerfile` — UPDATE (apps/api) — add `RUN npm i -g @byreal-io/byreal-cli` step; verify `byreal-cli --version` in the build
- `apps/api/src/agent/tools/byreal/__tests__/byreal.test.ts` — NEW — Vitest: (1) happy path with stubbed execFile returning valid JSON, (2) shell-metachar arg rejected before spawn, (3) cli-not-installed path, (4) timeout (15s mocked), (5) invalid JSON output

## Shell verification

```bash
cd apps/api

# Files exist
test -f src/agent/tools/byreal/byrealCli.ts
test -f src/agent/tools/byreal/argSanitizer.ts

# Uses execFile, NOT exec/spawn with shell:true
grep -q "execFile" src/agent/tools/byreal/byrealCli.ts
! grep -q "shell: true\|child_process.exec\b" src/agent/tools/byreal/byrealCli.ts

# Timeout is set
grep -q "15000\|15_000" src/agent/tools/byreal/byrealCli.ts

# Subcommand allowlist enforced
grep -q "quote\|swap\|bridge\|balance" src/agent/tools/byreal/schemas.ts

# Dockerfile installs the cli
grep -q "byreal-cli\|@byreal-io/byreal-cli" Dockerfile

# Tests pass with mocked execFile
pnpm vitest run src/agent/tools/byreal/__tests__/byreal.test.ts
test $? -eq 0

# Typecheck
pnpm typecheck
test $? -eq 0
```

## Notes

- Per ADR-005, `@byreal-io/byreal-cli` is the Track 6 qualifier. The agent invokes it as a bash tool call when a user has USDC on Solana and chooses the Source-Funds-from-Solana flow.
- Per security domain §3.3 (tool / skill substitution): the CLI's behavior could change between versions. Pin a specific version in `Dockerfile` (`npm i -g @byreal-io/byreal-cli@<version>`) and surface the version in the tool's response so receipts are reproducible.
- **`execFile` not `exec`** is critical: `exec` runs through a shell so shell metacharacter injection is possible. `execFile` does not invoke a shell; args are passed as a process argv array.
- Argument sanitization (`argSanitizer.ts`) is defense-in-depth even though `execFile` does not interpret shell metas — it ensures the agent can't smuggle weird input through that confuses the CLI itself (e.g., a `--flag` that the CLI happens to accept but we don't want).
- The subcommand allowlist (`quote`, `swap`, `bridge`, `balance`) is what limits blast radius. To add new commands, update both the Zod enum AND the test fixtures explicitly.
- Track 6 qualification per submission checklist requires the agent to demonstrably invoke `byreal-cli` in the demo flow. Story-117 (DoraHacks submission) calls out this tool's usage; this story is what makes that claim true.
- File MUST stay under 400 LOC each.
