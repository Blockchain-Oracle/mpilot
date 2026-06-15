# 06 — RealClaw Skill Distribution

**Purpose:** Concrete patterns for packaging Concierge as a RealClaw/OpenClaw-compatible Agent Skill. This is the Track 6 qualifier — must be solid. Read by `sahil-spec-writer` before generating the distribution story.

**Key insight:** Two real skills already published on Mantle-adjacent or sponsor-adjacent surfaces tell us *exactly* how to ship.
- **`byreal-git/byreal-agent-skills`** (TypeScript, MIT, 44★, pushed 2026-05-26) — the canonical "CLI as Agent Skill" shape; published by the **Byreal** team itself (sponsor surface for RealClaw).
- **`Magicianhax/mantle-active-trader`** (Python, pushed 2026-04-18) — a RealClaw skill for **Mantle DeFi swap execution**. Same target chain as us, real on-chain actions, scheduled monitoring. Reference implementation for our wedge.

---

## 1. What "RealClaw" actually is

RealClaw is an OpenClaw-based agent runtime distributed by Byreal. The skill ecosystem is the same as the broader OpenClaw / Anthropic Skills ecosystem — **a SKILL.md file in a Git repo, installable via a single CLI command**.

The installation primitive is the `skills` npm package: `npx skills add <owner>/<repo>`. From a GitHub search for the literal install string, there are dozens of public skill repos using this exact pattern:

```
duotify/GitHubClawToolkit          → npx skills add duotify/GitHubClawSkills
base/skills                         → npx skills add base/skills
coinbase/agentic-wallet-skills     → npx skills add coinbase/agentic-wallet-skills
ethglobal-skills/repo               → npx skills add ethglobal-skills/repo
byreal-git/byreal-agent-skills      → npx skills add byreal-git/byreal-agent-skills
... 50+ more
```

So the distribution rail is real and well-established. Coinbase ships agentic wallet skills via this exact mechanism — that's the company we're aligned with by following it.

---

## 2. The SKILL.md manifest — verbatim from a real Byreal repo

From `byreal-git/byreal-agent-skills/skills/byreal-cli/SKILL.md` (the actual file, fetched via `gh api`):

```markdown
---
name: byreal-cli
description: "Byreal DEX (Solana) all-in-one CLI: query pools/tokens/TVL, analyze pool APR & risk, open/close/claim CLMM positions, token swap, wallet & balance management. Use when user mentions Byreal, LP, liquidity, pools, DeFi positions, token swap, or Solana DEX operations."
metadata:
  openclaw:
    homepage: https://github.com/byreal-git/byreal-agent-skills
    requires:
      bins:
        - byreal-cli
      config:
        - ~/.config/byreal/keys/
    install:
      - kind: node
        package: "@byreal-io/byreal-cli"
        global: true
---

# Byreal LP Management

## Get Full Documentation
... (markdown body that the LLM reads at trigger time)
```

**Frontmatter fields used in production:**

| Field                           | Purpose                                                                 |
| ------------------------------- | ----------------------------------------------------------------------- |
| `name`                          | Skill identifier (stable slug).                                         |
| `description`                   | Trigger text — must include exact user-phrase triggers ("Use when…").   |
| `metadata.openclaw.homepage`    | Where the canonical source lives.                                       |
| `metadata.openclaw.requires.bins` | CLI binaries that must be on PATH.                                    |
| `metadata.openclaw.requires.config` | Config directories the skill expects.                               |
| `metadata.openclaw.install`     | One or more install kinds (`node`, `python`, `script`).                 |

**The body (everything after `---`)** is Markdown the LLM reads when the skill triggers. It's literally a runbook — pre-flight commands, hard rules, examples, the "Get Full Documentation" pattern that bootstraps the LLM into discovering full commands at runtime.

---

## 3. The Python / RealClaw shape — `mantle-active-trader`

From `Magicianhax/mantle-active-trader/SKILL.md` (fetched via `gh api`):

```markdown
---
name: mantle-active-trader
description: Use when a RealClaw agent needs to execute rotating DeFi swap activity on Mantle across Agni and Merchant Moe. Manages pre-flight approvals, live quoting with slippage guards, sequential sign-and-wait execution, state persistence, and scheduled monitoring via mantle-cli. Configurable cumulative-swap target (default ≥ $15,000 USD). Trigger when the user asks to "run the trader", "start trading", "execute swap cycles", or sets a volume/activity target on Mantle.
---

# Mantle Active Trader

## Goal
Execute disciplined swap cycles on Mantle to accumulate a configurable cumulative swap target...

## Pre-Flight (run once per session)
1. Check wallet health:
   ```
   mantle-cli chain status --json
   mantle-cli account balance <WALLET> --json
   ```
2. Load pair registry from references/pairs.md...

## Swap Loop (repeat until volume target hit)
Every cycle = ONE swap on ONE DEX. Never pipeline.
... full 8-step state machine ...

## Recommended Cron Schedule
| Interval | Job | Purpose |
| every 2 min | python scripts/monitor.py | Catch stuck txs and gas emergencies fast |
| every 15 min | read state.json + print summary | Heartbeat |
...

## Reference Files
- [references/signing.md](references/signing.md) — how to sign and broadcast
- [references/pairs.md](references/pairs.md) — all whitelisted pairs with routers
- [scripts/monitor.py](scripts/monitor.py) — state monitor (invoke on cron)
- [scripts/state.py](scripts/state.py) — state file read/write utility

## Hard Rules
1. Use `mantle-cli ... --json` for every on-chain build. Never hand-encode calldata.
2. Sign and wait for receipt between txs. No pipelining, no parallel.
...
```

**What this teaches us for Concierge:**

1. **Repo layout that RealClaw expects:**
   ```
   SKILL.md           ← the manifest + runbook
   references/        ← supporting docs the LLM reads ON DEMAND (not all upfront)
     signing.md
     pairs.md
     failures.md
   scripts/           ← executable helpers (state.py, monitor.py)
   ```
2. **Skills wrap a CLI; they don't embed business logic.** `mantle-active-trader` invokes `mantle-cli` and `python scripts/monitor.py`. The skill is the *playbook*, the CLI is the *runtime*.
3. **`--json` mode is mandatory** for everything the LLM parses. Tables are only for humans (the byreal-cli hard rule: "`-o json` only for parsing — when showing results to the user, omit it").
4. **State persistence is the skill's job, not the CLI's** (`scripts/state.py`, `state.json`). LLMs forget context; the skill explicitly tells the agent to re-read state every cycle.
5. **The skill prescribes the cron schedule.** RealClaw consumes a markdown schedule table and wires the jobs.
6. **Hard Rules section** at the bottom enumerates do-nots in plain English — what the model must never do. This is the safety budget for autonomous execution.

---

## 4. Concierge skill repo layout

```
concierge-skill/                                  ← repo: ajweb3dev/concierge-skill
├── SKILL.md                                      ← top-level manifest if monorepo, else under skills/
├── skills/
│   └── concierge/
│       └── SKILL.md                              ← Byreal pattern: skills/<name>/SKILL.md
├── README.md
├── package.json                                  ← publishes @mpilot/cli
├── scripts/
│   ├── tick.ts                                   ← invoke the agent runtime locally
│   ├── status.ts                                 ← read agent state
│   ├── approve.ts                                ← approve a pending proposal
│   └── revoke.ts                                 ← revoke session key on-chain
├── src/
│   ├── cli/                                      ← commander/yargs commands
│   ├── core/                                     ← types, constants
│   └── sdk/                                      ← exported npm SDK (Track 6 spec field "SDK")
└── references/
    ├── policies.md                               ← session-key policy taxonomy
    ├── attestations.md                           ← ERC-8004 schema + lookup
    └── failures.md                               ← revert reasons + recovery
```

### 4.1 SKILL.md for Concierge (draft)

```markdown
---
name: concierge
description: "Concierge: autonomous AI agent for Mantle DeFi. User sets a plain-English financial goal; the agent runs a continuous tick loop that plans, simulates, proposes, and executes on-chain actions across Aave V3, Mantle DEXes, Ethena sUSDe, Ondo USDY, mETH staking, Li.Fi bridging — with ERC-8004 reputation attested per action. Use when the user asks to automate their Mantle position, manage yield + risk, run an autonomous DeFi agent, set up a goal-driven portfolio agent, or sees the phrase 'autonomous DeFi agent' / 'agent runs it' / 'agentic wallet'."
metadata:
  openclaw:
    homepage: https://github.com/ajweb3dev/concierge-skill
    requires:
      bins:
        - concierge-cli
      config:
        - ~/.config/concierge/
    install:
      - kind: node
        package: "@mpilot/cli"
        global: true
---

# Concierge — Mantle Stablecoin Agent

## Get Full Documentation
Run these first:
```
concierge-cli skill        # full runbook + commands
concierge-cli catalog list # capability discovery
```

## Pre-Flight (run once per session)
1. Wallet health: `concierge-cli agent status --json`
2. Session-key policy: `concierge-cli policy show --json`
3. Yield landscape: `concierge-cli yields list --json`

## Tick Loop (run every 60s via cron, or manually)
Each tick: plan → simulate → propose → decide → execute → record. ...

## Hard Rules
1. Never approve a proposal that simulates a revert.
2. Never extend session-key validity past 30 days without re-approval.
3. Every executed action must produce an ERC-8004 attestation.
4. ...

## Reference Files
- [references/policies.md](references/policies.md)
- [references/attestations.md](references/attestations.md)
- [references/failures.md](references/failures.md)
```

---

## 5. The CLI binary — `concierge-cli`

Pattern from `byreal-git/byreal-agent-skills/src/index.ts` (verbatim):

```typescript
import { Command } from 'commander';
import chalk from 'chalk';

const program = new Command();
program
  .name('concierge-cli')
  .description('AI-friendly CLI for Concierge DeFi agent on Mantle')
  .version(VERSION, '-v, --version', 'Output the version number')
  .option('-o, --output <format>', 'Output format (json, table)', 'table')
  .option('--non-interactive', 'Disable interactive prompts');

program.addCommand(createAgentCommand());      // agent status, start, stop
program.addCommand(createPolicyCommand());     // policy show, update, revoke
program.addCommand(createProposalsCommand());  // proposals list, approve, reject
program.addCommand(createYieldsCommand());     // yields list, predict
program.addCommand(createCatalogCommand());    // capability discovery (for LLMs)
program.addCommand(createSkillCommand());      // print SKILL.md runbook
program.addCommand(createSetupCommand());      // first-time setup

program.parseAsync(process.argv);
```

**Mandatory commands per Byreal convention:**
- `catalog list` — emits JSON array of capabilities (LLM uses this to plan).
- `catalog show <id>` — full param schema for one capability.
- `skill` — prints the SKILL.md runbook (lets the LLM bootstrap context without GitHub).
- `setup` — interactive first-run (wallet, RPC, policy approval).
- Every write command supports `--dry-run` then `--confirm`.

---

## 6. JSON output — the LLM contract

Every command must support `-o json`. From the Byreal CLAUDE.md:
> "`-o json` only for parsing — when showing results to the user, omit it and let the CLI's built-in tables/charts render directly. Never fetch JSON then re-draw charts yourself."

JSON shape for Concierge (proposed):

```json
{
  "command": "agent.status",
  "ok": true,
  "data": {
    "agentId": "agt_01HG...",
    "smartAccount": "0xabc...",
    "policy": { "validUntil": 1740000000, "spendCapUsd": 500 },
    "state": { "phase": "idle", "lastTickAt": "2026-06-03T10:00:00Z" },
    "positions": [{ "protocol": "init-capital", "amountUsd": 1200, "apy": 0.082 }]
  },
  "ts": "2026-06-03T10:01:00Z"
}
```

Errors:
```json
{ "command": "agent.start", "ok": false, "error": { "code": "policy_expired", "message": "Session key valid_until passed; re-approve." } }
```

---

## 7. Installation flow for users

```bash
# Option A — full skill install (recommended for AI users)
npx skills add ajweb3dev/concierge-skill

# Option B — CLI-only install (for power users)
npm install -g @mpilot/cli

# Option C — Mantle Active Trader pattern (Python users)
# We do NOT ship Python; we are TypeScript-first for the npm SDK lane.
```

After `npx skills add`:
- The skill is registered in the local agent's skill index (Claude Code, OpenClaw, RealClaw all read this).
- LLM sees the `description` and auto-triggers on matching user intent ("set up a stablecoin yield agent on Mantle").
- LLM reads SKILL.md body, runs `concierge-cli setup`, then loops through pre-flight + tick.

---

## 8. Discovery — how do users find Concierge?

[UNVERIFIED] — there's no public "Byreal skill registry" page documented. Distribution channels in practice:
1. **GitHub repo with `npx skills add` in the README** — picked up by GitHub search + word of mouth.
2. **Awesome-lists** — `VoltAgent/awesome-openclaw-skills` (5,400+ skills), `LeoYeAI/openclaw-master-skills` (1,209+ skills, weekly updates). Submit a PR with our skill to land in those indexes.
3. **Sponsor amplification** — if Mantle and/or Byreal feature winning hackathon skills, that's the channel. Concierge being a Mantle DeFi skill aligned with the Byreal pattern makes it amplification-friendly.
4. **Direct Claude Code / Cursor / Codex install** — the `npx skills add` command is the universal install primitive across all of those agent harnesses.

---

## 9. Track 6 qualifying criteria

The Mantle hackathon Track 6 ("AI/Agent Infrastructure") explicitly rewards skills/SDKs/MCP. To qualify:

- [ ] **`SKILL.md` published in a public repo** under the `skills/<name>/` convention.
- [ ] **Repo installable via `npx skills add <owner>/<repo>`** (works because the skills CLI just clones + reads SKILL.md).
- [ ] **npm package published** (`@mpilot/cli`) — gives us the SDK surface.
- [ ] **CLI supports `-o json`** on every command (LLM-parseable).
- [ ] **CLI exposes `skill` and `catalog` commands** for LLM bootstrapping.
- [ ] **README has the install one-liner** at the top.
- [ ] **Aligned with the Byreal pattern** — `skills/<name>/SKILL.md`, `metadata.openclaw.requires.bins`, etc. (signals to Mantle/Byreal judges that we did the homework).
- [ ] (Bonus) MCP server published — see `07-mcp-server-pattern.md`.

---

## 10. Risks

| Risk                                                          | Mitigation                                                          |
| ------------------------------------------------------------- | ------------------------------------------------------------------- |
| `skills` CLI's exact behavior / install paths are undocumented | Mirror the Byreal repo structure 1:1 — they shipped, we follow.   |
| Skill description doesn't trigger on intended phrases         | Include 4–6 verbatim trigger phrases in the description string.    |
| LLM bypasses `concierge-cli` and tries to hand-encode calldata | Bold rule in SKILL.md "Hard Rules": "Never hand-encode calldata."  |
| npm package name `@mpilot/cli` taken                       | Fallback `@mpilot/cli` or `@ajweb3dev/concierge`.        |
| CLI ships with private keys in env                            | `setup` writes to `~/.config/concierge/` with `chmod 600`.         |
| Sessions / state leak between users in shared agent installs  | State file path includes wallet address hash; CLI refuses cross-key reads. |

---

## 11. Open questions for spec writer

1. **Skill name** — `concierge`? `concierge-mantle`? `mantle-agent`? Pick before publishing (frontmatter `name` is stable). Per ADR-013 + tracks doc, the install command is locked as `npx skills add @mpilot/mantle-agent`.
2. **npm package scope** — `@mpilot/cli`, `@ajweb3dev/concierge`, or unscoped `concierge-cli`? Check availability now.
3. **Should we wrap or write?** — The Mantle Active Trader skill wraps `mantle-cli` (an existing CLI). Do we wrap that too, or write our own CLI from scratch? Recommend write from scratch since Concierge needs ZeroDev session-key + ERC-8004 attest, neither of which `mantle-cli` does.
4. **Python parity?** — Mantle Active Trader is Python. Some RealClaw users may prefer Python. Recommend TypeScript-only for hackathon, document "Python wrapper coming" if asked.
5. **Where does the agent runtime live when installed via skill?** — Local node process spawned by the skill, or a hosted agent the CLI talks to over API? Recommend: local-process default ("self-custody" framing), with a flag `--remote https://api.concierge.app` for hosted mode.
6. **Trigger phrases to include in description** — locked set of 6 (no BNPL framing — that was the paused Patron wedge): "autonomous DeFi agent", "agentic wallet on Mantle", "goal-driven portfolio agent", "agent runs it", "ERC-8004 audit trail", "AI manages my Mantle position".
7. **`catalog list` JSON schema** — define before coding so the LLM and CLI agree.
8. **Where to land in awesome-lists** — PR `VoltAgent/awesome-openclaw-skills` and `LeoYeAI/openclaw-master-skills` post-launch.
