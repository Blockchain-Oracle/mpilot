# Concierge — Frontend Brief Addendum (gaps the prototype surfaced)

**Companion to `docs/FRONTEND-BRIEF.md`.** Not about generative UI specifically. This is the gap list: everything I learned from the designer's prototype at `/Users/abu/Downloads/mentale/` that was missing or wrong in the original brief.

> **Boundary rule unchanged:** colors / typography / spacing / motion / density = designer's domain. This addendum locks data, states, transitions, flows, and behaviors only.

---

## 0. Two corrections to the v1 framing (read these first)

1. **There is no chat interface.** The original brief implied a chat surface. The prototype confirms: the user sets ONE goal at onboarding, configures per-category policies, and then **watches** the autonomous agent stream ticks. No message-input box exists anywhere in the user-facing surface.
2. **The user does not pick the LLM.** The SDK consumer (the developer wiring the package into their own product) picks the model via `createConcierge({ llm: { plan: 'claude-sonnet-4.5' } })`. The end user of the consumer dashboard does not see a model picker. The prototype's `settings.jsx` shows an "LLM models" section — that section is for SDK-tier dashboards (developer-facing), HIDE for the production consumer surface `apps/web`.

---

## 1. Onboarding flow — full 6-step spec

The original brief named onboarding but did not lock the step sequence. The prototype's `onboarding.jsx` + `onboarding2.jsx` lock it as:

```
1. connect  → 2. account  → 3. identity  → 4. goal  → 5. policy  → 6. activate
```

Shell chrome: minimal header with step dots + counter ("Step N of 6") + theme toggle + Exit link. No "Back" on step 1.

### 1.1 Step `connect`
Three wallet options as selectable buttons:
- **Privy** — email / social / embedded wallet
- **Reown** — WalletConnect v2, 400+ wallets
- **Browser wallet** — MetaMask / Rabby / Coinbase Wallet

One must be chosen to continue.

### 1.2 Step `account`
**Deploy ERC-4337 smart account (gas sponsored by Pimlico).** Reusable `PhaseRunner` runs three phases:
- Deploying ERC-4337 smart account
- Sponsoring gas via Pimlico paymaster
- Linking session-key module

Each row animates idle → running (pulsing dot) → done (green check). Terminal state shows `Account ready · 0x4f…91c4 · gas sponsored`.

### 1.3 Step `identity`
**Mint ERC-8004 identity NFT.** Large NFT artwork (grid background + gradient + Concierge glyph + agent number). Tap → `PhaseRunner` with:
- Minting ERC-8004 identity
- Registering on reputation registry

Terminal: `Agent #4200 minted · reputation starts at 0`.

### 1.4 Step `goal` — the load-bearing step
Plain-English textarea with **live parser** + **editable chips** + **examples carousel**:

```ts
function parseGoal(text: string): Chip[] {
  // Extracts up to ~6 chips, debounced 280ms:
  // - "Max Aave LTV"        from  '70% LTV' / 'LTV under 70%'
  // - "Keep liquid"         from  '$200 liquid' / 'keep $200' / 'reserve $200'
  // - "Min health factor"   from  'health factor above 2.0' / 'HF > 2.0'
  // - "Autopay"             from  '5 USDC/day' / 'autopay 5'
  // - "Objective"           from  'max yield' | 'depeg/preserve/safe' | 'grow/reward'
  //                              → 'Max yield' | 'Capital preservation' | 'Grow rewards'
  // - "Focus"               from  'stablecoin/usdc/usdt' | 'meth/staking/eth' | 'rwa/usdy/ondo'
  //                              → 'Stablecoins' | 'ETH staking' | 'RWA yield'
}
```

**EditableChip** — each parsed chip is tappable. Tapping converts the chip to an inline input; Enter or blur commits an override stored in `overrides[chipKey]`. The override surfaces in the activate step's review.

**Examples carousel** — 4 example goals in a horizontally scrollable strip. Tapping replaces the textarea value (and the parser re-runs).

Cannot advance until `goal.trim()` is non-empty.

### 1.5 Step `policy`
Five categories, each a 2-state segmented control (manual | autopilot):
- Aave actions
- DEX swaps
- Bridge
- Yield
- Restaking

Default: all manual. Plus two `CapField` inputs: **Per transaction** (default `$300`) + **Per day** (default `$300`). Numeric only.

### 1.6 Step `activate`
Read-only review card with rows for: Wallet · Agent · Goal (quoted) · Parameters (chips with overrides applied) · Autopilot (comma-list or "None — every action asks you first") · Caps. Then **Activate agent** button (full-width primary) → navigates to `/app`, first tick fires within 60s.

---

## 2. Dashboard layout — the 2-column grid

`app-main.jsx` locks this:

```
┌──────────────────────────────────────────────────────────────┐
│ AppHeader [logo] [agent #N] [theme] [Emergency Stop]         │
├──────────────────────────────────────────────────────────────┤
│ StoppedBanner   (only when emergency-stopped)                │
│ Greeting        ("Hello, alice.eth")                         │
│                                                              │
│ ┌────────────────────────┐ ┌─────────────────────────┐       │
│ │ TickStream (1.55fr)    │ │ AgentNFTCard            │       │
│ │  live tick on top      │ │ PortfolioSnapshot       │       │
│ │  history list below    │ │ GoalCard                │       │
│ │  hover-pauses engine   │ │  (1fr column stack)     │       │
│ └────────────────────────┘ └─────────────────────────┘       │
│                                                              │
│                                       EmergencyFab (sticky)  │
└──────────────────────────────────────────────────────────────┘
```

Grid: `minmax(0, 1.55fr) minmax(0, 1fr)`, 22px gap. Stacks on narrow.

**Hover-pause** — mouseenter on the TickStream column → engine pauses; mouseleave → resumes. The user is reading; cards shouldn't move under the cursor.

**EmergencyFab + EmergencyModal + StoppedBanner** — sticky FAB always visible. Click opens modal with explicit confirm. Confirm sets `stopped: true` → shows `StoppedBanner` with Resume CTA + halts engine. Resume from banner OR account settings.

---

## 3. TickStream — list semantics + history shape

The original brief named a TickStream but didn't specify the data shape. Per `app-data.jsx`:

```ts
interface HistoryEntry {
  id: string;        // short, e.g. '0xc7e2'
  action: string;    // 'Restake 0.8 mETH'
  time: string;      // 'HH:MM' clock time
  value: string;     // attestation value, e.g. '+0.06' or '—'
  status: 'attested' | 'rejected' | 'failed';
  delta: string;     // human delta, e.g. '+$94.20/yr' or 'timed out'
}
```

Layout: **live tick** at top (full detail), **history list** below (~10 condensed rows: id + action + time + status pill + delta). Tap a history row → `/app/ticks/:tickId` (TickDetail page in §6).

Behavior:
- New tick mounts at top with scale + fade animation.
- Live tick completes → demotes to compact row, slides into history.
- Hover-pause on the column (see §2).

---

## 4. TickCard — three variants

The original brief had one TickCard. The prototype ships **three**:

```ts
type TickCardVariant = 'ledger' | 'terminal' | 'timeline';
```

- **ledger** — light financial card, horizontal phase chips.
- **terminal** — dark console, reasoning + tx hashes feel like a debugger.
- **timeline** — vertical phase rail, explicit nodes for every state (designed for the demo video).

All three render the same data, pass through the same states. Variant choice is presentation-only and is tweakable from the landing-page demo controls (see §11).

### 4.1 State taxonomy (more granular than the 5-phase loop)

```ts
type TickState =
  | 'pending'               // queued for next tick window
  | 'planning'              // LLM reasoning over goal + portfolio
  | 'simulating'            // forking chain, predicting outcome
  | 'proposing'             // proposal authored, deciding routing
  | 'awaiting-approval'     // manual category — user must approve
  | 'auto-approved'         // autopilot category — bypassed approval gate
  | 'executing'             // tx submitted, awaiting receipt
  | 'confirmed'             // tx mined, before attestation
  | 'attesting'             // writing ERC-8004 feedback
  | 'attested'              // terminal success
  | 'rejected-by-user'      // terminal failure (manual decline)
  | 'failed-execution';     // terminal failure (revert / timeout / paymaster)
```

State metadata table (label / tone / pulse) from `tick-data.jsx:64-77`:

| state | label | tone | pulse |
|---|---|---|---|
| `pending` | Pending | neutral | — |
| `planning` | Planning | primary | yes |
| `simulating` | Simulating | primary | yes |
| `proposing` | Proposing | warn | — |
| `awaiting-approval` | Awaiting approval | warn | yes |
| `auto-approved` | Auto-approved | primary | — |
| `executing` | Executing | primary | yes |
| `confirmed` | Confirmed | signal | — |
| `attesting` | Attesting | primary | yes |
| `attested` | Attested | signal | — |
| `rejected-by-user` | Rejected | neutral | — |
| `failed-execution` | Failed | danger | — |

### 4.2 Card data shape (verbatim from `tick-data.jsx`)

```ts
interface TickActionData {
  id: string;                        // short tick id, e.g. '0x9f4c'
  action: string;                    // 'Supply 100 USDC → Aave V3'
  protocol: 'Aave V3' | 'Ethena' | 'mETH' | 'Ondo' | 'Mantle DEX' | 'Li.Fi' | 'ERC-8004';
  summary: string;
  reasoning: string;                 // streamed agent thinking
  sim: {
    target: string;                  // 'AavePool.supply(USDC, 100e6, owner, 0)'
    usdDelta: string;                // pre-formatted: '+$3.41 / yr'
    hf: string;                      // '2.10' or '—'
    hfDir: 'up' | 'down' | 'flat';
    flags: readonly string[];        // ['sUSDe redemption has a 7-day cooldown']
    checks: readonly string[];       // ['LTV floor 70% — ok', 'Liquid floor $200 — ok', ...]
  };
  exec: {
    txHash: string;                  // 0x… 64 hex
    block: string;                   // formatted with commas
    gas: string;                     // '0.0021 MNT'
  };
  attest: {
    hash: string;                    // 0x… ERC-8004 receipt hash
    cid: string;                     // IPFS CID
    value: string;                   // '+0.05'
    rep: string;                     // '+1.74'
  };
}
```

**All strings are pre-formatted by the runtime.** The React layer is purely presentation — never numerical formatting in the card.

### 4.3 Nested components inside TickCard

- **`ReasoningBlock({ text, revealed, streaming })`** — streamed agent thinking. `text.slice(0, revealed)` reveals characters over time; while `streaming`, blinking `cc-cursor` follows the last character. `aria-live="polite"`.
- **`SimWell({ sim })`** — simulation summary. Shows `target`, two `Metric`s (Expected delta + Health factor), badge-wrapped `sim.flags`, and a collapsible **"Why? · constraint checks"** disclosure listing `sim.checks` with green checks.
- **`Metric({ k, v, good, dir })`** — single tabular-nums metric pair.
- **`MantleScanLink({ hash, label })`** — pre-styled `0x…1234 ↗` link to `sepolia.mantlescan.xyz/tx/<hash>`.
- **`CopyHash({ text, display })`** — clickable hash with copy button + 1.2s "Copied ✓" state.
- **`EditParamsModal({ open, onClose, action, onResimulate })`** — the Edit flow on `awaiting-approval`. Modal with Amount slider (25% → 200% of base) + Max slippage slider (0.1% → 2%). Save fires `onResimulate(newParams)`.
- **`CCModal({ open, onClose, labelledBy })`** — modal primitive. Backdrop click + Escape close; focus moves in; previous element refocused on close.

### 4.4 What happens at each state

| state | visual | key affordance |
|---|---|---|
| `pending` | Phase chip "pending" + queued banner | "Next window: HH:MM" |
| `planning` | Pulsing chip + ReasoningBlock streams | watch agent think |
| `simulating` | SimWell mounts; delta + HF visible | "Why?" disclosure |
| `proposing` | Proposal summary; routing label | — |
| `awaiting-approval` | Approve / Reject / **Edit** buttons | EditParamsModal opens on Edit |
| `auto-approved` | Banner "Auto-approved · category on autopilot" | proceed to executing |
| `executing` | Pulsing primary; pending-tx MantleScanLink | open MantleScan |
| `confirmed` | Signal; gas + block visible | hash → MantleScan |
| `attesting` | Pulsing; ERC-8004 write in flight | — |
| `attested` | Terminal signal; hash + CID + value + rep | hash + CID both copyable |
| `rejected-by-user` | Terminal neutral; "Rejected" badge | "Why I rejected" optional note |
| `failed-execution` | Terminal danger; sanitized error + CTA | retry button |

---

## 5. The four other dashboard cards

### 5.1 AgentNFTCard

```ts
interface AgentNFTCardData {
  id: string;                           // '4200'
  owner: string;                        // 0x… 40 hex
  ens?: string;                         // 'alice.eth'
  created: string;                      // 'May 31, 2026'
  reputation: {
    count: number;                      // attestation count, e.g. 27
    average: number;                    // value per tick, e.g. 0.064
    rep: number;                        // current reputation score, e.g. 1.87
    decimals: number;
  };
}
```

NFT artwork prototype: grid background + gradient + Concierge glyph + agent number. Designer owns artwork; data is fixed.

### 5.2 PortfolioSnapshot

```ts
interface PortfolioSnapshotData {
  totalUsd: number;                     // 2808.41
  delta24h: number;                     // signed, $USD
  delta24hPct: number;                  // decimal, e.g. 0.068
  hf: number;                           // global health factor, 2.10
  positions: readonly {
    provider: 'Aave V3' | 'Ethena' | 'mETH' | 'Ondo' | 'Mantle DEX';
    asset: string;                      // 'USDC' / 'sUSDe' / 'mETH' / 'USDY'
    sub: 'supplied' | 'staked' | 'restaked' | 'held';
    amount: string;                     // '218.00'
    usd: number;
    apr: number;
    hf?: number;                        // Aave only
  }[];
}
```

Row glow when the most recent tick affected the position. Mobile: table → cards.

### 5.3 GoalCard

```ts
interface GoalCardData {
  text: string;                         // user's plain-English goal
  activatedAt: string;                  // '14 days ago'
  policies: {
    aave:      'manual' | 'autopilot';
    dex:       'manual' | 'autopilot';
    bridge:    'manual' | 'autopilot';
    yield:     'manual' | 'autopilot';
    restaking: 'manual' | 'autopilot';
  };
  caps: { perDay: string; perTx: string };   // '$300' / '$300'
  paused: boolean;
}
```

Quoted goal + per-category policy chips + caps + pause toggle. Tapping a policy chip opens inline editor; saving fires re-policy signal but does NOT modify goal text.

### 5.4 ReputationCard (`/agent/:agentId` route)

```ts
interface ReputationCardData {
  agentId: string;
  ownerAddress: string;
  registeredAt: string;
  attestations: readonly {
    attestationUid: string;
    schemaId: string;                   // 'concierge.aave.v3.repay.v1'
    issuedAt: string;
    txHash: string;
    summary: string;                    // 'Repaid 30 USDC on Aave V3'
    outcomeOk: boolean;
  }[];
  totalActions: number;
  successRate: number;                  // 0..1
}
```

The public-facing `concierge.xyz/agent/:agentId` page. Anyone can audit any agent's history.

---

## 6. TickDetail page — `/app/ticks/:tickId`

This page wasn't fully specified in the original brief. Per `tick-detail.jsx`:

1. **Header** — date / chain / `StatusPill`.
2. **Decision card** — `decision.by` (`'user' | 'autopilot'`) + label + timestamp + note. Explains WHY this ran without (autopilot) or with (manual + approver) approval.
3. **DiffRow section** — every metric that changed: label + before → after + direction. Neutral flag for moves that aren't good/bad (wallet USDC down because supplied).

```ts
interface DiffRow {
  label: string;
  before: string;
  after: string;
  dir: 'up' | 'down';
  neutral?: boolean;
}
```

4. **Reasoning** — full streamed reasoning text (no cursor, static).
5. **SimWell** — full simulation with checks expanded.
6. **Exec card** — txHash + block + gas + MantleScan link.
7. **Attest card** — feedbackHash + IPFS CID + reputation delta.
8. **Replay section** — **Replay in dev mode** button. Fires a dev-mode re-run of `plan → simulate → execute` against current chain state. No on-chain effect, no gas. Used to debug "why did this happen?" after the fact.

---

## 7. Settings page — `/app/settings`

Six sections per `settings.jsx`. Reuse `AppHeader` + sidebar nav.

```
1. Network          — segmented Mantle Sepolia (active) / Mantle Mainnet (disabled · soon)
2. LLM models       — HIDE in consumer surface (developer-only)
3. Cadence          — slider for tick frequency (default 60s)
4. API keys         — ApiKeyRow with reveal + copy buttons; masked by default
5. MCP install      — tabbed snippet block (see §8)
6. Account          — disconnect wallet, deactivate agent
```

### 7.1 ApiKeyRow component

```ts
interface ApiKeyRowProps {
  label: string;
  value: string;                        // full key
  // Renders:
  // - 'masked' default:  value.slice(0,7) + '••••••••••••••' + value.slice(-4)
  // - 'reveal' state:    full value
  // - copy button:       1.2s "Copied ✓" feedback
}
```

### 7.2 LLM model picker (HIDE for consumer surface)

```ts
const MODELS = ['claude-sonnet-4.5', 'claude-opus-4.1', 'gpt-5.1', 'gpt-5-mini', 'llama-4-70b'];
```

Hidden in `apps/web`. Visible in SDK-tier developer dashboards (the showcase template, sample apps, etc.).

---

## 8. MCP install snippet — 10 hosts (not 5)

Per `settings.jsx:74-85`:

```ts
const MCP_HOSTS = [
  ['Claude Code',     'claude mcp add concierge -- npx @concierge-mantle/mcp',  '...'],
  ['Claude Desktop',  'Add to claude_desktop_config.json...',                    '...'],
  ['Cursor',          'npx @concierge-mantle/mcp --install cursor',              '...'],
  ['Windsurf',        'npx @concierge-mantle/mcp --install windsurf',            '...'],
  ['VS Code Copilot', "code --add-mcp '{...}'",                                  '...'],
  ['Zed',             'Add concierge to ~/.config/zed/settings.json...',         '...'],
  ['Cline',           'npx @concierge-mantle/mcp --install cline',               '...'],
  ['Goose',           "goose session --with-extension '...'",                    '...'],
  ['OpenCode',        'npx @concierge-mantle/mcp --install opencode',            '...'],
  ['Codex',           'npx @concierge-mantle/mcp --install codex',               '...'],
];
```

Tab bar across 10 hosts → per-host: shell command in `<copyline>` + 1-line install note. Copy: idle → 1.2s "Copied" → idle. Default selection: **Claude Code**.

Used in both settings (§7) AND the docs site MCP page.

---

## 9. Docs surface — Mintlify-style primitives

Per `docs-ui.jsx` + `docs-pages.jsx`. NO in-docs code playground; the marketing landing-page demo IS the playground.

### 9.1 Primitives (window globals)

- `DCodeBlock({ lang, file, code })` — code block with mac-style window chrome + file label + lang badge + copy button.
- `DCallout({ type, title, children })` — 5 variants: `info` / `tip` / `warning` / `danger` / `success`.
- `DApiTable({ rows })` — parameter / type / description table for API reference. `rows: { name, type, required?, desc, default? }[]`.
- `DTabs({ tabs })` — tab bar + body switcher. `tabs: { label, body }[]`.
- Prose: `Lead`, `P`, `H2`, `H3`, `UL`, `Code`, `XLink` (internal), `ELink` (external).

### 9.2 Navigation (4 groups, 9 pages)

```
Getting started:  Overview · Quickstart
SDK:              API reference · Providers · Agent runtime
Integrations:     MCP server · RealClaw skill
Guides:           Recipes · Architecture · Contributing
```

### 9.3 Where the live preview lives

There is **no in-docs playground**. The marketing landing page (`apps/web/`) ships the live TickStream demo against mocked data. Docs pages link to the landing demo when the reader wants to "see it run." The "preview" for code is the running landing-page demo.

---

## 10. PhaseRunner — reusable progress component

Used in onboarding §1.2 + §1.3 + the dashboard's "Replay in dev mode" + anywhere else multi-step progress needs to render. Per `onboarding.jsx:93-122`:

```ts
interface PhaseRunnerProps {
  phases: readonly string[];
  running: boolean;
  done?: () => void;
}

// Each row animates idle → running → done
// running: pulsing dot + "working…"
// done:    green check + "done"
// idle when paused: full opacity
// idle when other rows running: 0.5 opacity
```

850ms per row. Calls `done()` when last row completes.

---

## 11. Tweaks panel — designer / demo only

`app.jsx` + `app-main.jsx` ship a `TweaksPanel` with controls for:
- Theme (light / dark)
- Card layout variant (ledger / terminal / timeline)
- Decision mode (autopilot / manual)
- Engine speed slider (0.5× → 2×)

**This is the prototype-side / demo-side control surface only:**
- Designer uses it to flex states for screenshots.
- Marketing landing page uses it for the tweakable demo.
- Production consumer app (`apps/web/app/page.tsx` on the `/app` route) does NOT show it.

---

## 12. Mock data shapes (so the designer can flex every state)

Prototype exports `window.{PORTFOLIO, REPUTATION, GOAL, AGENT, HISTORY}` from `app-data.jsx` and `window.{TICK_ACTIONS}` from `tick-data.jsx`. The runtime cycles through 3 realistic tick actions:

- Supply 100 USDC → Aave V3 (full reasoning + sim + exec + attest)
- Rebalance 250 USDC → Ethena sUSDe (with warning flag for 7-day cooldown)
- Restake 0.8 mETH

The reasoning text shows the agent's thought process explicitly: *"Goal is X. Wallet holds Y. Protocol Z offers W%. Policy permits up to N$. Therefore I'll do this. Constraints check pass. Simulating."* This is the **product's voice**: precise, numerate, never marketing-y.

---

## 13. ConciergeError surfacing (the `failed-execution` state)

When a tick lands in `failed-execution`, the card surfaces the sanitized `ConciergeError` from the SDK with a canonical CTA per type:

```ts
type ConciergeErrorType =
  | 'RpcError'              // → retry CTA
  | 'SimulationError'       // → "Why?" disclosure with reason
  | 'PolicyViolation'       // → policy diff link
  | 'PaymasterError'        // → "Fund MNT" CTA
  | 'AttestationError'      // → "Retry queued" badge
  | 'SessionKeyExpired'     // → "Re-authorize" CTA
  | 'UserSignatureRequired' // → WalletConnect prompt
  | 'InternalError';        // → "Try again later"
```

Designer can collapse the visual but cannot drop the CTA — losing it strands the user.

---

## 14. Cross-cutting behaviors to lock

1. **All numerical strings use `font-variant-numeric: tabular-nums`** — alignment matters when stacking transaction values, gas, USD deltas.
2. **`prefers-reduced-motion` respected throughout** — card transitions become immediate swaps; `ReasoningBlock`'s streaming cursor disappears; phase chips don't pulse; `useReveal()` immediately shows all reveal-targets.
3. **Hover-pause on TickStream** (§2) — engine freezes while user hovers; resumes on leave.
4. **Keyboard + screen reader on every CTA** — especially `EmergencyFab`. Tab order must reach Approve / Reject / Edit without skipping any of the three.
5. **All hashes are copyable** — every `0x…` displayed has a copy affordance.
6. **All hashes link to MantleScan** — tx hashes link to `sepolia.mantlescan.xyz/tx/<hash>`; agent IDs link to `/agent/:id` internal.

---

## 15. What's already built on the code side (don't redesign)

- `packages/agent/src/types.ts` — `ORCHESTRATED_PHASES`, `EXECUTE_OUTCOMES`, `RECORD_OUTCOMES`, `AgentState`, `Plan`, `Sim`, `Proposal`, `Exec`, `Attestation`.
- `packages/tools/src/types.ts` — `ConciergeTool` interface, `UICardId` enum.
- `packages/sdk/src/errors.ts` — `ConciergeError` taxonomy in §13.
- `packages/providers/*/src/attestation.ts` — per-provider AttestationPayloadSchema (the data ReputationCard shows).
- `packages/providers/*/src/actions/*.ts` — 25 tools across 7 providers.
- `packages/mcp/src/server.ts` — MCP server core; install snippets in §8 hit this binary.
- `apps/worker/` — BullMQ tick worker; engine driving the prototype is mocked but the production wiring is here.

What needs designer + implementation:
- `@concierge-mantle/ui` (story-099) — brand tokens (the prototype uses `var(--primary)` / `var(--ink)` / `var(--card)` / `var(--paper-2)` / `var(--mono)` / `var(--display)` etc. — those are the export targets).
- `@concierge-mantle/react` (story-310) — headless tool-part hooks.
- `@concierge-mantle/react-ui` (story-311) — 3 TickCard variants + the other 4 cards + EmergencyFab/Modal + McpInstallSnippet + onboarding components + PhaseRunner.
- `apps/web` (story-100 + 312) — Next.js app dogfooding `@concierge-mantle/react-ui` for `/`, `/app`, `/app/ticks/:id`, `/app/settings`, `/agent/:id`, `/docs/*`.

---

## 16. Contract for the designer

For every card / flow / component in this addendum:

1. **Design every state row in the §4.1 state table.** Skipping `auto-approved` or `failed-execution` is not optional.
2. **Use the data shapes verbatim.** No field renames — schemas are the contract with the LLM upstream.
3. **Three TickCard variants must all render the same data.** No state should only exist on one variant.
4. **Hover-pause on the TickStream.**
5. **Keyboard + screen reader on every CTA.** `EmergencyFab` especially.
6. **Mobile responsive.** Portfolio table → cards; TickCard chips → vertical; settings tabs stack.
7. **`prefers-reduced-motion` respected throughout.**
8. **Tabular-nums for all numbers.**

---

## 17. References

- `/Users/abu/Downloads/mentale/` — designer's prototype source-of-truth.
- `docs/FRONTEND-BRIEF.md` — the main brief; this addendum supplements it.
- `docs/architecture.md` — 19 ADRs (especially 014, 015, 017, 011 amended).
- `docs/ux-spec.md` — route shape + which package owns each surface.
- `research/concierge/AUDIT-2026-06-09.md` — Vercel AI SDK v6 / MCP Elicitation / `@assistant-ui/tool-ui` investigation note.
- `packages/agent/src/types.ts`, `packages/tools/src/types.ts`, `packages/sdk/src/errors.ts` — source-of-truth types.

---

## 18. Round 2 — what I missed on first pass + Abu's callouts (2026-06-14)

After Abu pushed back ("you didn't mention API keys at all, and we shouldn't let users pick models"), I re-read the rest of `settings.jsx` + `app-screens.jsx`. Four things to correct:

### 18.1 LLM models — KILL the user-facing surface entirely

§7.2 said "hide for consumer." Stronger position: **drop the LLM picker UI from the consumer surface entirely.** The prototype shows three per-phase model selects (Plan / Simulate / Decide, defaulting to `claude-sonnet-4.5` / `gpt-5-mini` / `claude-sonnet-4.5`), which matches ADR-016's per-phase override. **That is an SDK-consumer choice made in code via `createConcierge({ llm: { plan, simulate, decide } })`**, not an end-user setting. End users never choose; they never see the picker.

The prototype's §02 "LLM models" section in settings.jsx is a developer-tier showcase. In `apps/web` (production consumer), omit the section entirely. The settings nav becomes: Network · ~~LLM models~~ · Cadence · API keys · MCP install · Account → 5 items.

### 18.2 API keys — three classes, all user-visible

The original addendum mentioned ApiKeyRow but didn't name the keys. Per `settings.jsx:161-164` there are **two Concierge-issued keys** + a third class of **user-supplied LLM provider keys** the prototype omitted.

**Decision (locked 2026-06-14):** **BYOK — Bring Your Own LLM Key.** The user supplies their Anthropic / OpenAI / Google / xAI key. Rationale:

- Per-tick cost on Sonnet 4.5 is ~$0.10; a 60s cadence = 1440 ticks/day ≈ $144/day per agent. Concierge cannot subsidize this at scale without becoming a billing/metering product.
- ADR-016 already implements env-driven resolution (`ANTHROPIC_API_KEY` etc via `defaultModel()`); BYOK extends the same pattern to a paste-in-UI flow.
- Matches Concierge's "you stay the principal — we are non-custodial" trust story. The SDK signer is the user's; the LLM key is the user's; only the agent's *behavior* is Concierge's product.
- Hackathon-friendly: judges paste a key from their own account, demo runs, no billing infrastructure.

**Three key classes, all in settings:**

```ts
type ApiKey =
  | { class: 'concierge-sdk'; label: 'SDK key';            prefix: 'sk_live_'; issuer: 'concierge' }
  | { class: 'concierge-mcp'; label: 'MCP server key';     prefix: 'mcp_';     issuer: 'concierge' }
  | { class: 'llm-provider'; label: 'Anthropic / OpenAI / Google / xAI'; issuer: 'user' };
```

- **`concierge-sdk`** (`sk_live_*`) — Concierge issues. Third parties use to call Concierge's hosted API.
- **`concierge-mcp`** (`mcp_*`) — Concierge issues. Bearer auth for MCP server.
- **`llm-provider`** — User supplies. One row per provider (Anthropic, OpenAI, Google, xAI). Paste, mask, verify-on-paste (call the provider's `models.list` endpoint to confirm valid), reveal + copy + remove buttons. At least one provider must be set before the agent can run.

**Two surfaces** that show LLM-provider keys:

1. **Onboarding `Step 4.5 — Bring your LLM`** (NEW step, between `goal` and `policy`): paste at least one provider key. Verify in real-time. Skip-if-already-set (env detection).
2. **Settings → `API providers` section** (NEW, sits between `Cadence` and `MCP install`): same component, lets the user add / rotate / remove keys.

Both Concierge-issued keys (`sk_live_*`, `mcp_*`) need a `[Rotate]` button with confirm modal.

### 18.3 WalletMenu — missed in §2

`app-screens.jsx:31-61` defines a `WalletMenu` dropdown component inside the `AppHeader`. I had it as just "wallet button." It's actually:

```ts
interface WalletMenuProps {
  agent: { owner: string; ens?: string };
}

// Renders a button: [avatar dot] [ens or shortened address] [chevron-down]
// Click → dropdown with:
//   - Header: "Smart account" eyebrow + full address (mono)
//   - Items: Settings (→ /app/settings) · Copy address · Disconnect (danger color)
// Click-outside or item-select closes.
```

Add to `@concierge-mantle/react-ui` as a peer of EmergencyFab.

### 18.4 HealthFactorGauge — separate component from PortfolioSnapshot

`app-screens.jsx`'s window-export list includes `HealthFactorGauge` as its own component, peer to `PortfolioSnapshot`. I lumped HF into `PortfolioSnapshot` in §5.2. Correction:

```ts
interface HealthFactorGaugeProps {
  hf: number;              // 2.10 = safe; 1.0 = liquidation
  zone: 'safe' | 'caution' | 'danger';   // designer-defined thresholds
  ltv?: number;            // current LTV %, if available
}
```

Separate component renders the radial gauge / progress arc for the Aave health factor (`hf`). Shown when the user has an Aave borrow position. PortfolioSnapshot may compose it as a child, OR they may sit side by side. Designer's choice.

### 18.5 AppHeader badge

The AppHeader includes a sticky **network badge** ("Mantle Sepolia" with dot). When the agent is `stopped`, the badge swaps to "Agent stopped" in danger color. This dynamic header state was missing from my §2 layout sketch.

### 18.6 StoppedBanner — full copy

The banner text is locked: *"Agent stopped. Existing positions remain — resume to schedule new ticks."* + Resume CTA. Don't paraphrase — this is product voice.

### 18.7 Product-logic decisions (not designer questions)

These were answered before locking the brief — designer doesn't need to weigh in:

- **`StoppedBanner` Resume** — one-tap if the session key is still valid; if expired, surface the `SessionKeyExpired` error (§13) with the `Re-authorize` CTA instead of a plain resume.
- **Concierge SDK + MCP key rotation** — `[Rotate]` button next to each masked key in settings; opens a confirm modal ("This invalidates the old key. Anything still using it will 401."); on confirm, swaps the value with a new one + auto-copies the new value to clipboard with a "Copy & close" CTA.
- **`/agent/:agentId` public page** — already in §5.4; data shape locked, designer composes within the same chrome as the dashboard.

---

## 19. Third-party brand assets — logos for the designer to source

The brief references ~25 third-party brands. Don't make the designer Google each one. Below are the canonical brand domains; **the designer should pull official SVG / press-kit assets from these**, NOT mock up text-only chips. Where a brand has a press kit / brand page, that's the first URL.

### 19.1 LLM providers (shown in onboarding §1.4.5 + settings API providers)
- **Anthropic** — `anthropic.com` (logo: stylized A; press kit at `anthropic.com/news`)
- **OpenAI** — `openai.com/brand` (official brand kit + ChatGPT mark)
- **Google AI (Gemini)** — `gemini.google.com` + `ai.google.dev` (Gemini sparkle mark)
- **xAI (Grok)** — `x.ai` (Grok mark)

Mask-input pattern for each: prefix the row with the brand mark (16-20px), label "Anthropic API key" (or matching provider), paste field with the provider's documented prefix as the placeholder. Validate format client-side, verify-on-paste server-side.

### 19.2 Mantle protocols (shown in PortfolioSnapshot §5.2, TickCard §4, ReputationCard §5.4)
- **Mantle** — `mantle.xyz/brand` (chain mark)
- **Aave** — `aave.com` + `governance.aave.com/t/proposal-aave-brand-guidelines/...`
- **Ethena (sUSDe)** — `ethena.fi`
- **Ondo (USDY)** — `ondo.finance`
- **mETH / Mantle LSP** — `meth.mantle.xyz`
- **Merchant Moe** — `merchantmoe.com`
- **Agni Finance** — `agni.finance`
- **FusionX** — `fusionx.finance`
- **Li.Fi** — `li.fi/brand` (bridge logo)

Each protocol gets a 20-24px mark in PortfolioSnapshot rows + TickCard headers + ReputationCard timeline entries.

### 19.3 Wallets (shown in onboarding §1.1)
- **Privy** — `privy.io`
- **Reown / WalletConnect** — `walletconnect.network/brand` + `reown.com`
- **MetaMask** — `metamask.io/brand` (fox mark, official)
- **Rabby** — `rabby.io`
- **Coinbase Wallet** — `coinbase.com/wallet` (square wallet mark)

### 19.4 Account abstraction (shown in onboarding `account` step §1.2 + tooltips)
- **Pimlico** — `pimlico.io` (paymaster)
- **ZeroDev** — `zerodev.app` (kernel + session keys)
- **ERC-4337** — no logo; use Ethereum mark if needed (`ethereum.org/brand`)

### 19.5 On-chain explorers + infra
- **MantleScan** — `mantlescan.xyz` (subdomain link badge)
- **IPFS / Filecoin** — `ipfs.tech/brand` (for the IPFS CID chips on attested ticks)
- **ENS** — `ens.domains/brand` (for `alice.eth` display)

### 19.6 ERC-8004
- No project-level brand — it's a standard. Use a generic NFT/identity mark + the literal text "ERC-8004" in product voice.

### 19.7 MCP hosts (shown in MCP install snippet §8 — 10 tabs)
- **Claude Code** — Anthropic mark + "Code" label
- **Claude Desktop** — Anthropic mark + "Desktop" label
- **Cursor** — `cursor.com` (cursor arrow mark)
- **Windsurf** — `codeium.com/windsurf` (Codeium brand)
- **VS Code Copilot** — `code.visualstudio.com/brand` (VS Code mark + GitHub mark for Copilot)
- **Zed** — `zed.dev` (Z mark)
- **Cline** — `github.com/cline/cline` (project mark in repo)
- **Goose** — `github.com/block/goose` (Block's Goose; bird mark)
- **OpenCode** — `github.com/sst/opencode`
- **Codex** — OpenAI Codex (OpenAI mark)

Tab chrome: 18px mark + host name. Active tab → brand color underline. Inactive → grayscale mark.

### 19.8 Dev infra (only on the Quickstart / Architecture docs pages)
- **npm** — `npmjs.com/brand` (red square + "npm" mark)
- **GitHub** — `github.com/logos` (Octocat + wordmark)
- **Vercel** — `vercel.com/design/brands`
- **pnpm** — `pnpm.io/brand` (orange mark)
- **TypeScript** — `typescriptlang.org/branding`
- **Node.js** — `nodejs.org/en/about/branding`

### 19.9 Concierge's own brand (the designer is producing this)
- Mark + wordmark sit on every header (AppHeader §2, MinimalHeader §1) + landing nav + docs chrome.
- Concierge owns its mark; designer is the source of truth here.
- ENS-like display: prefer ENS (`alice.eth`) with `WalletMenu` fallback to `0x4f…91c4`.

### 19.10 Format rules for all logos

- **SVG preferred** for all marks — sharp at any size + theme-tintable.
- **Dual variant** where the brand provides one — light bg + dark bg.
- **Bundled in `@concierge-mantle/ui`** under `src/assets/brands/` — re-exported as React components (`<AnthropicMark />`, `<MantleMark />`, etc.).
- **No remote fetching** — every mark ships with the bundle; CDN-free.
- **Attribution** — when a brand requires it (e.g., WalletConnect logo usage policy), the docs site footer credits.

---

*Addendum authored 2026-06-14. §18 added round-2 corrections (no LLM picker, 3 API key classes). §19 added round-3 brand assets list per Abu — designer pulls real marks, not text-only chips. §18.7 cleaned up: product-logic items moved to inline answers, not designer questions.*
