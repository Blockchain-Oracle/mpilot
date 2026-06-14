# Concierge — Frontend Brief Addendum: MCP UI Cards

**Companion to `docs/FRONTEND-BRIEF.md` §10.39.** Locks the four `ui://concierge/*` HTML resources Claude Desktop / ChatGPT / Goose / VS Code Insiders render inline in the chat (MCP Apps SEP-1865, draft 2026-01-28). The main brief named them at the surface level (§10.39: "MCPProposalCard", "MCPTickCard", "MCPPortfolioCard", "MCPReputationCard"); this addendum gives them the §10.1-depth per-card spec the designer needs to actually produce them.

> **Boundary rule unchanged:** colors / typography / spacing / motion / density = designer's domain. This addendum locks data shapes, states, transitions, the iframe postMessage wire protocol, and the SEP-1865 origin-validation constraints. Visual identity ≠ in-app cards (the iframe can't reach the web app's CSS tokens); these are *cousins* of `<TickCard>` / `<PortfolioSnapshot>` / `<ReputationCard>` rendered in a different container with different platform constraints.

---

## §0 — Two product-truth corrections (read first)

1. **The MCP cards are NOT the web app cards.** The web app (`apps/web` per main brief §8) renders React components from `@concierge-mantle/react-ui` that reach into the app's design tokens, motion system, and live SSE stream. The MCP cards are **isolated HTML documents** loaded into a **sandboxed iframe** inside the host's chat surface. They can't reach the web app's CSS tokens, fonts, JS bundle, network — anything. The shared identity is a *visual family resemblance*, not a code or token share.

2. **The cards are one-shot, not live.** The web app's `<TickCard>` (main brief §10.1) streams reasoning character-by-character via SSE and re-renders on every state transition. An MCP card receives **ONE** `concierge.data` payload from the host at iframe-load time and renders the **current snapshot** of that data. There is no SSE inside the iframe. Refreshing the card requires the host to re-render. State transitions across a tick's lifecycle (planning → executing → attested) happen as **separate, independent render passes** of the same card type — each pass gets a fresh snapshot. Design states as snapshots, not animations.

---

## §1 — The iframe contract (what the host gives the card)

The four cards are rendered by MCP hosts that support SEP-1865 (Claude Desktop today; ChatGPT / Goose / VS Code Insiders rolling out). Hosts that don't support it fall back to rendering the tool's `structuredContent` JSON as text — the LLM summarizes it. The cards are an enhancement, not a requirement; **the designer ships visuals that work but the data text-fallback works too**.

### §1.1 The render container

```
┌─────────────────────────────────────────┐
│ Host chat message bubble                │
│  ┌───────────────────────────────────┐  │
│  │ <iframe sandbox="allow-scripts"   │  │
│  │   srcdoc="<…our HTML…>"           │  │
│  │   style="…host decides…"          │  │
│  │ >                                  │  │
│  │   ┌─────────────────────────────┐ │  │
│  │   │ Our HTML (~5KB, no network) │ │  │
│  │   │ inline CSS, inline JS, no   │ │  │
│  │   │ external <script src=…>     │ │  │
│  │   └─────────────────────────────┘ │  │
│  │ </iframe>                          │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

Constraints we can't violate:

- **No external resources.** No remote fonts, no remote CSS, no remote JS, no remote images (with one carveout: `data:` URIs are OK per our CSP). The browser sandbox blocks all of them and the test suite asserts none are present in the bundled HTML.
- **No persistence.** `localStorage` / `sessionStorage` / `IndexedDB` / cookies are blocked by the sandbox. Each render is fresh; the card has no memory of past renders.
- **Width is host-controlled.** Claude Desktop typically renders ~680px wide. ChatGPT narrower. The card must render legibly anywhere from 320px to 800px wide.
- **Height is content-driven.** The iframe is auto-sized by the host based on document height; do not assume a fixed height or scroll.
- **CSP enforced** (engineering ships it; designer doesn't override): `default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:;`
- **Size budget: 50KB per HTML document.** Strict. Tested at build time.
- **One inline `<script>` block** that runs the postMessage handshake (locked; engineering owns it).

### §1.2 The postMessage wire protocol (locked)

```ts
// From HOST → IFRAME (host injects the data on iframe load)
{ type: 'concierge.data'; payload: <card-specific shape, see §3-§6> }

// From IFRAME → HOST (only proposal-card emits these; the other three are read-only)
{ type: 'concierge.approve'; payload: { proposalId: string } }
{ type: 'concierge.reject';  payload: { proposalId: string } }
```

### §1.3 Origin discipline (SEP-1865; engineering owns; designer needs to know the rendered states)

The iframe code:

1. Listens for `message` events from `window.parent`.
2. Requires `event.source === window.parent` (structural identity).
3. Captures `event.origin` from the first valid message; rejects every subsequent message from a different origin.
4. Refuses to `postMessage` back if origin is the string `'null'` (sandboxed iframe without `allow-same-origin`).

This produces TWO designer-visible states that must be designed:

- **Normal state.** Host injects data → render. proposal-card buttons work; read-only cards just render.
- **`null-origin` state.** Host sandboxed the iframe without `allow-same-origin` (e.g., Claude Desktop strict mode). proposal-card detects this and **disables Approve / Reject + shows a remediation hint**. Read-only cards render normally (they never postMessage back).

Locked copy for the null-origin state (proposal-card only): *"This host does not support inline approval (sandboxed iframe without allow-same-origin). Approve from the chat surface instead."*

Designer may restyle the message, but must keep the **disabled-button state** + a **visible status row** + **`role="status"`** for screen readers.

---

## §2 — Visual family resemblance (the four cards' shared identity)

The four cards must read as "from the same product as the web app," but they live in a foreign container (the host's chat bubble). Constraints + intent:

- **Inline CSS-only.** No `@concierge-mantle/ui` tokens (no way to reach them). The token set must be **inlined** into each HTML document. Keep it small (~12–20 CSS custom properties: bg / fg / muted / accent / border / good / bad / radii / fonts).
- **Light + dark scheme via `color-scheme: light dark;`** + `@media (prefers-color-scheme: dark)`. The host decides which mode it renders in; the card adapts. Both modes are designed.
- **System font stack.** No webfont. `font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;`. Numbers use `font-variant-numeric: tabular-nums;` (consistent with the web app brief §14).
- **No animations beyond hover / focus.** Sandboxed iframes have unpredictable composition costs in chat surfaces; no entrance animations, no streaming cursors, no pulsing pills. State changes are snapshot swaps. `prefers-reduced-motion` is respected by default since there's nothing to reduce.
- **One `<main>` per document.** Single ARIA region. `role="region"` + `aria-label` = the card's title.

Designer ships ONE token set + ONE CSS rules block per card type; the four cards reuse identical primitives (`.row`, `.label`, `.val`, `.pill`, `.mono`, `.empty`, `.actions`, `button.primary`, `button.danger`) so the visual family is consistent without coordination overhead.

---

## §3 — `<MCPProposalCard>` — the interactive one

**Card name:** `proposal-card`
**Resource URI:** `ui://concierge/proposal-card`
**Mode:** **Interactive** — emits `concierge.approve` / `concierge.reject` back to the host on button click.
**Cousin in app:** `<ActionApprovalCard>` (main brief §10.5) nested inside `<TickCard>` during `proposing` / `awaiting-approval`.

### §3.1 Purpose

Renders a single proposed action the agent wants to take, with one-click Approve / Reject inside the chat. The user does not have to leave Claude Desktop to confirm.

### §3.2 Data shape (locked at story-137)

```ts
interface MCPProposalCardData {
  proposalId: string;                 // 'prop-42' — round-trips back to the host on approve/reject
  title?: string;                     // 'Aave V3 borrow' — shown in card header; defaults to "Proposal"
  // Either of these forms is accepted; engineering renders both the same way.
  // Designer can rely on Object.entries(payload) producing rows for the visible fields.
  fields?: Record<string, string | number | boolean>;
  // Convenience: if `fields` is absent, the iframe walks the payload itself
  // (skipping `title`, `proposalId`, `fields`) and renders the remaining
  // key/value pairs as rows.
  [k: string]: unknown;
}
```

Typical payload (Aave V3 borrow):

```json
{
  "proposalId": "prop-42",
  "title": "Aave V3 borrow",
  "amount": "1000 USDC",
  "asset": "USDC",
  "healthFactorBefore": "2.10",
  "healthFactorAfter": "1.85",
  "estGas": "0.002 MNT",
  "rationale": "Goal is max-yield. HF stays above 1.8 floor. Capacity available."
}
```

The agent always pre-formats values to user-readable strings (verbatim from main brief §4.2 — "the React layer is purely presentation; never numerical formatting in the card").

### §3.3 States

Snapshot states, one render per state:

| state | when | visual | affordance |
|---|---|---|---|
| `awaiting-data` | iframe loaded; host hasn't sent `concierge.data` yet (< ~50ms typically) | `<h1>` empty placeholder ("Awaiting proposal…") + `<div class="empty">` "No data received yet." + `actions` hidden | nothing |
| `rendered` | host has injected `concierge.data`; origin is a normal URL | title + field rows + Approve / Reject buttons visible | Approve → `concierge.approve` to host; Reject → `concierge.reject` to host |
| `null-origin` | host sandboxed without `allow-same-origin` | title + field rows + buttons visible but DISABLED + remediation row | nothing (intentional) |
| `pre-data-click-guard` | user clicks Approve / Reject BEFORE any data arrived | no-op silently (currentProposal === null) | nothing |
| `post-action` | user clicked Approve OR Reject (the postMessage was sent) | optional — designer may visually confirm ("Sent" + buttons disabled), engineering does not require it but won't render any new data | — |

Note: there is **no "second message from a different origin" visible state**. That case is silently dropped by the iframe code (SEP-1865 origin-lock); it's logged but invisible to the user.

### §3.4 Behavior

- **Approve button**: posts `{ type: 'concierge.approve', payload: { proposalId } }` to `window.parent` with the captured origin. Same shape for Reject. No third button shape; engineering does not currently surface "Edit." (That belongs to the web app's `<EditParamsModal>`, not the MCP card — Elicitation forms cover the edit case; see §7 of the main addendum.)
- **Default visual state** when title is missing: render "Proposal" as the title fallback.
- **Field rendering**: any payload key whose value is a primitive (string / number / boolean) becomes a row in the body. Keys whose value is `null` or an object are skipped (engineering decision; designer-visible).
- **proposalId display**: the proposalId itself renders as the LAST row in mono-font with `word-break: break-all`. This anchors the user's mental model ("the thing being approved is THIS specific proposal").

### §3.5 Accessibility

- `<main role="region" aria-label="Concierge proposal">`.
- Each button has explicit `aria-label` ("Approve proposal" / "Reject proposal") so screen readers don't just announce "button."
- Buttons are keyboard-reachable in source order: **Reject first, Approve second**. Locked: Approve is the rightmost, primary action. (Engineering already wired this; designer may not swap.)
- `button:focus-visible` rule must be present in the inlined CSS (engineering ships a default; designer can restyle but cannot remove).
- Null-origin remediation row uses `role="status"` so screen readers announce "this host does not support inline approval" when the state is reached.

### §3.6 Responsive

- 320–480px: title + rows stack as table-flow; buttons stack vertically (Reject on top, Approve bottom — primary action thumb-reachable on mobile-chat surfaces).
- 480px+: buttons sit side-by-side; rows render with label left / value right (current default).

---

## §4 — `<MCPTickCard>` — the 6-phase tick snapshot

**Card name:** `tick-card`
**Resource URI:** `ui://concierge/tick-card`
**Mode:** **Read-only** — listens for `concierge.data`, renders, no postback.
**Cousin in app:** `<TickCard>` (main brief §10.1) — but this is a **snapshot**, not a stream.

### §4.1 Purpose

Renders the current state of a single tick's 6-phase lifecycle as a snapshot. The host calls the `get_tick` / `get_recent_ticks` MCP tool; the response includes a tool-result and a `ui://concierge/tick-card` reference. The iframe receives the tick state at that moment.

### §4.2 Data shape (locked)

```ts
interface MCPTickCardData {
  tickId?: string;                                // '0x9f4c'
  title?: string;                                 // override header; defaults to "Concierge tick"
  status?: Partial<Record<TickPhase, TickPhaseStatus>>;
  startedAt?: string;                             // ISO-8601 UTC string
  completedAt?: string;                           // ISO-8601 UTC string
}

type TickPhase = 'plan' | 'simulate' | 'propose' | 'execute' | 'record';
// Note: `record` is the canonical phase name; the web app's `<TickCard>`
// shows `attesting` + `attested` as two states of the same `record` phase.
// In the MCP card, we collapse to one row per phase = 5 rows total.

type TickPhaseStatus =
  | 'pending'           // not started; rendered as muted "pending" pill
  | 'success'           // completed OK; rendered as good (green) pill
  | 'error';            // failed; rendered as bad (red) pill
// Any other string value is rendered as a muted pill with the literal text.
```

Typical payload (mid-tick — execute pending):

```json
{
  "tickId": "tick-7",
  "status": {
    "plan": "success",
    "simulate": "success",
    "propose": "success",
    "execute": "pending"
  },
  "startedAt": "2026-06-14T16:00:00Z"
}
```

Final-state payload:

```json
{
  "tickId": "tick-7",
  "status": {
    "plan": "success",
    "simulate": "success",
    "propose": "success",
    "execute": "success",
    "record": "success"
  },
  "startedAt": "2026-06-14T16:00:00Z",
  "completedAt": "2026-06-14T16:00:42Z"
}
```

### §4.3 States

Render is purely a function of the `status` object. The five phase rows render in lockstep, with their pill style derived from `status[phase]`:

| `status[phase]` | pill style | label text |
|---|---|---|
| (absent / undefined) | muted | "pending" |
| `'pending'` | muted | "pending" |
| `'success'` | good | "success" |
| `'error'` | bad | "error" |
| any other string | muted | (literal value) |

Engineering pre-formats the literal string; designer renders the pill backdrop and the text uniformly.

### §4.4 Behavior

- Five phase rows, in lockstep order: **plan, simulate, propose, execute, record**.
- `tickId`, `startedAt`, `completedAt` append as additional rows IF present.
- `tickId` renders in mono with `word-break: break-all`.
- No interaction. No postback.

### §4.5 Accessibility

- `<main role="region" aria-label="Concierge tick">`.
- Each phase row is a single `<div class="row">`; the phase name (label) and the pill (value) are semantically a key/value pair.
- The pill content is text; not an icon-only signal. Color is reinforcement, not the primary channel.

---

## §5 — `<MCPPortfolioCard>` — the positions snapshot

**Card name:** `portfolio-snapshot`
**Resource URI:** `ui://concierge/portfolio-snapshot`
**Mode:** **Read-only.**
**Cousin in app:** `<PortfolioSnapshot>` (main addendum §5.2).

### §5.1 Purpose

Renders the agent's current portfolio: per-position breakdown + total USD value + net APR. The host calls `get_portfolio`; the response carries the snapshot.

### §5.2 Data shape (locked — accepts both `symbol`/`asset` + both `balance`/`amount`)

```ts
interface MCPPortfolioCardData {
  title?: string;                                 // defaults to "Portfolio"
  positions?: readonly MCPPortfolioRow[];
  totalUsd?: string | number;                     // pre-formatted, e.g. '763'
  netApr?: string | number;                       // pre-formatted, e.g. '8.2'
}

interface MCPPortfolioRow {
  // either field is accepted; engineering normalizes via `pos.symbol || pos.asset || '?'`
  symbol?: string;                                // 'sUSDe'
  asset?: string;                                 // 'sUSDe'
  // either field is accepted; `pos.balance ?? pos.amount`
  balance?: string;
  amount?: string;
  valueUsd?: string | number;                     // pre-formatted; rendered as '$510'
}
```

Typical payload:

```json
{
  "positions": [
    { "symbol": "sUSDe", "balance": "500", "valueUsd": "510" },
    { "symbol": "USDY",  "balance": "250", "valueUsd": "253" }
  ],
  "totalUsd": "763",
  "netApr": "8.2"
}
```

### §5.3 States

- **`empty`** — `positions` absent or `[]` → render only the totalUsd / netApr rows (or `<div class="empty">` "No positions" if those are also absent).
- **`populated`** — one row per position + total row + APR row.
- **`partial`** — positions present but `totalUsd` / `netApr` absent — render positions only; suppress the absent summary rows.

### §5.4 Behavior

- One row per position. Symbol (or asset) is the label; `<balance/amount> $<valueUsd>` is the value.
- Final two rows: "total (USD)" + `$<totalUsd>` and "net APR" + `<netApr>%`.
- Protocol mark (small per-provider logo, see main addendum §19.2) renders inline next to the symbol — **designer decision**. Engineering can wire it in if designer ships a brand-mark sprite as inlined SVG.
- No interaction. No postback.

### §5.5 Accessibility

- `<main role="region" aria-label="Concierge portfolio">`.
- Each position is a row pair (key=symbol, value=amount + USD). Screen readers announce both.
- If protocol marks are included, each carries `role="img"` + `aria-label` with the protocol name.

---

## §6 — `<MCPReputationCard>` — the on-chain receipt

**Card name:** `reputation-receipt`
**Resource URI:** `ui://concierge/reputation-receipt`
**Mode:** **Read-only.**
**Cousin in app:** `<AttestationCard>` (main brief §10.7) + `<ReputationChart>` (main brief §10.12).

### §6.1 Purpose

Renders an ERC-8004 reputation receipt: tx hash, dataHash (the canonical-JSON keccak commitment), IPFS CID (where the canonical bytes live), schema, attested-at timestamp. The host calls `get_attestation`; the response carries one receipt.

### §6.2 Data shape (locked)

```ts
interface MCPReputationCardData {
  title?: string;                                 // defaults to "Reputation receipt"
  agentId?: string | number;                      // '7' / 7n.toString() / etc.
  feedbackIndex?: string | number;                // ERC-8004 feedback array index, e.g. '12'
  schema?: string;                                // 'concierge.aave.v3.borrow.v1'
  txHash?: `0x${string}`;                         // tx that wrote the attestation
  feedbackHash?: `0x${string}`;                   // bytes32 dataHash from giveFeedback
  cid?: string;                                   // 'bafkreid7sx5cf…' — base32 CIDv1
  attestedAt?: string;                            // ISO-8601 UTC string
}
```

Typical payload:

```json
{
  "agentId": "7",
  "feedbackIndex": "12",
  "schema": "concierge.aave.v3.borrow.v1",
  "txHash": "0xabc123…",
  "feedbackHash": "0xdef456…",
  "cid": "bafkreid7sx5cfilfppz6gqi3w4yfd5ny6zhywfmnh6n2cgcyfb56l4w7y4",
  "attestedAt": "2026-06-14T16:00:42Z"
}
```

### §6.3 States

- **`partial`** — most production responses ship some-but-not-all fields. Render only the rows whose fields are present.
- **`empty`** — no recognized fields → `<div class="empty">` "No attestation data."
- **`complete`** — all 7 rows rendered.

### §6.4 Behavior

- One row per field, in this order: agent · feedback # · schema · tx · dataHash · ipfs cid · attested.
- `schema`, `txHash`, `feedbackHash`, `cid` all render in mono with `word-break: break-all` (they're long; designer should make them legible across both desktop and mobile chat widths).
- **No tx-hash link to MantleScan by default** — the iframe sandbox can't open external URLs without user gesture in many hosts, and the LLM already names MantleScan in the surrounding chat. If designer wants to add a "↗" anchor, it MUST use `target="_blank" rel="noopener noreferrer"` and must not be the only way to reach the explorer (text-channel mention is the canonical path).
- **No copy buttons by default** — same constraint (sandboxed iframe + clipboard write requires permissions a host may not grant). The values themselves are text; users select+copy from the rendered text.

### §6.5 Accessibility

- `<main role="region" aria-label="Concierge reputation receipt">`.
- Mono-font rows for hashes have `aria-label` on the row that reads the field name ("transaction hash") — screen readers don't try to spell 0x prefixes character-by-character without context.

---

## §7 — Visual primitives shared across all four cards

These are the CSS classes engineering wires into every card by default. Designer can restyle but must not remove (the test suite + the screen-reader contract depend on them):

```css
.card    /* the outer container; padding + max-width + flow */
.row     /* one key/value pair; flex with space-between */
.label   /* the key text; muted color */
.val     /* the value text; tabular-nums */
.pill    /* status badge — variants .good / .bad / .muted */
.empty   /* placeholder for no-data; centered + muted */
.mono    /* hash-style font; word-break: break-all */
.actions /* footer button row (proposal-card only); flex + gap */
button.primary / button.danger    /* approve / reject (proposal-card only) */
```

Designer ships these classes + their per-state variants once, applied uniformly to every card. The MCP UI design system is a sub-set of the web app's, scoped to the iframe context.

---

## §8 — What NOT to design in this addendum

To avoid scope creep:

- **No host chrome.** The host (Claude Desktop, ChatGPT, etc.) decides the iframe's bounding box, the surrounding message bubble, the avatar / role indicator, the timestamp. Designer does not influence any of that.
- **No live streaming.** That's the web app's `<TickCard>` story. The MCP `tick-card` is a snapshot of whatever the host injects.
- **No "Edit" affordance on proposal-card.** Edit means re-simulate with new params, which means a multi-turn interaction with the agent. That belongs to MCP Elicitation forms (main addendum §10.40), not the card.
- **No external resources.** Tempting to load a single inline brand-mark sprite from `concierge.xyz/assets/marks.svg` — DON'T. CSP blocks it; the test suite asserts no external src; the bundle is offline-first.
- **No motion design beyond default browser focus rings + hover states.** State changes are snapshot swaps, not animations.

---

## §9 — Mock payloads (so designer can flex every state)

Mock data the designer should use to render each state in mockup tool of choice:

### §9.1 proposal-card mocks

```json
// awaiting-data
{}

// rendered (Aave V3 borrow)
{
  "proposalId": "prop-42",
  "title": "Aave V3 borrow",
  "amount": "1000 USDC",
  "asset": "USDC",
  "healthFactorBefore": "2.10",
  "healthFactorAfter": "1.85",
  "estGas": "0.002 MNT"
}

// rendered (mETH restake)
{
  "proposalId": "prop-43",
  "title": "Restake 0.8 mETH",
  "asset": "mETH",
  "amount": "0.8",
  "estApr": "4.2%",
  "estGas": "0.0018 MNT"
}

// rendered (Ondo USDY subscribe)
{
  "proposalId": "prop-44",
  "title": "Subscribe USDY",
  "asset": "USDC",
  "amount": "500 USDC",
  "yieldEstimate": "5.1% APY",
  "lockupWarning": "Subject to T+1 settlement"
}

// null-origin (designer renders the disabled+remediation state)
// Trigger: same payload as "rendered" + the host sandboxed without allow-same-origin.
// Visual difference: buttons are disabled + an extra .empty row appears with the locked copy.
```

### §9.2 tick-card mocks

```json
// just-started (only plan running)
{ "tickId": "tick-7", "status": { "plan": "pending" }, "startedAt": "2026-06-14T16:00:00Z" }

// mid-execution (3 successes + 1 pending)
{
  "tickId": "tick-7",
  "status": { "plan": "success", "simulate": "success", "propose": "success", "execute": "pending" },
  "startedAt": "2026-06-14T16:00:00Z"
}

// success
{
  "tickId": "tick-7",
  "status": { "plan": "success", "simulate": "success", "propose": "success", "execute": "success", "record": "success" },
  "startedAt": "2026-06-14T16:00:00Z",
  "completedAt": "2026-06-14T16:00:42Z"
}

// execution-failed (designer must render the .bad pill)
{
  "tickId": "tick-7",
  "status": { "plan": "success", "simulate": "success", "propose": "success", "execute": "error" },
  "startedAt": "2026-06-14T16:00:00Z",
  "completedAt": "2026-06-14T16:00:35Z"
}
```

### §9.3 portfolio-snapshot mocks

```json
// populated (typical case)
{
  "positions": [
    { "symbol": "USDC",   "balance": "218.00", "valueUsd": "218" },
    { "symbol": "sUSDe",  "balance": "500.00", "valueUsd": "510" },
    { "symbol": "USDY",   "balance": "250.00", "valueUsd": "253" },
    { "symbol": "mETH",   "balance": "0.80",   "valueUsd": "2200" }
  ],
  "totalUsd": "3181",
  "netApr": "6.8"
}

// empty (designer must render the .empty state)
{ "positions": [], "totalUsd": "0", "netApr": "0" }

// partial (no positions; just summary)
{ "totalUsd": "0", "netApr": "0" }
```

### §9.4 reputation-receipt mocks

```json
// complete
{
  "agentId": "7",
  "feedbackIndex": "12",
  "schema": "concierge.aave.v3.borrow.v1",
  "txHash": "0xabc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "feedbackHash": "0xdef4567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12",
  "cid": "bafkreid7sx5cfilfppz6gqi3w4yfd5ny6zhywfmnh6n2cgcyfb56l4w7y4",
  "attestedAt": "2026-06-14T16:00:42Z"
}

// partial (tx + dataHash only)
{
  "txHash": "0xabc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "feedbackHash": "0xdef4567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12"
}

// empty
{}
```

---

## §10 — Contract for the designer

For every MCP card in this addendum:

1. **Design ALL the states in §3.3 / §4.3 / §5.3 / §6.3.** Including `null-origin` for proposal-card. Including `empty` for portfolio-snapshot. Including `error` pill for tick-card.
2. **Both light + dark color schemes.** Hosts decide the surrounding chat's color scheme; the card adapts via `@media (prefers-color-scheme: dark)`.
3. **Inlined CSS token set ONLY.** No `@concierge-mantle/ui` imports inside the iframe; the token block is rewritten into the HTML at engineering build time. ~12–20 custom properties is typical.
4. **System font stack + tabular-nums.** No webfont.
5. **Each HTML document must stay under 50KB.** Engineering test asserts this.
6. **Buttons keyboard-reachable in source order: Reject first, Approve second.** Locked.
7. **`<main role="region" aria-label="…">` on every card** + per-button `aria-label` on proposal-card.
8. **Family resemblance with the web app's cousins, not a clone.** The MCP cards are flatter, denser, smaller. They live inside a chat bubble.
9. **No external resources of any kind.** Inline SVG only if used; no remote fonts; no remote scripts; no remote images.
10. **Designer reviews the engineering-shipped HTML strings** in `packages/mcp/src/ui-resources/*.ts` after handoff and adjusts inline CSS until visuals match the mocks. Designer does NOT touch the JS or the postMessage protocol.

---

## §11 — Visual continuity table (per-component cousins to design against)

| MCP card | Cousin in app | What to keep | What to change |
|---|---|---|---|
| proposal-card | `<ActionApprovalCard>` (main brief §10.5) | Approve / Reject button visual identity; rationale row treatment | No Edit button; no nested SimWell; no progressive reveal; snapshot only |
| tick-card | `<TickCard>` (main brief §10.1) header + phase chips | Phase-chip color tokens (pending / success / error); status pill family | No streaming reasoning; no nested simulation card; collapse `attesting + attested` to one `record` row |
| portfolio-snapshot | `<PortfolioSnapshot>` (addendum §5.2) | Per-position row layout; protocol marks; HF row treatment | No 24h-delta arrows; no hover affordances; designer decides whether to include HF (engineering's default doesn't surface it but the data shape allows extension) |
| reputation-receipt | `<AttestationCard>` (main brief §10.7) | Hash row treatment; mono-font signal | No MantleScan auto-link (text-channel mention is canonical); no copy buttons by default; partial-state rendering must work without rendering empty rows |

The web app's design tokens (light / dark mode variables) should be re-derived for the iframe context as the inlined CSS custom properties. Same look, ported to a constrained container.

---

## §12 — Round-2 notes from the engineering side (2026-06-14 post-handoff)

Things the engineering implementation locked that designer must align with:

### §12.1 The HTML files are NOT `.html` files on disk

For Cloudflare Workers portability (ADR-011 amended: stdio-first stdio bin + optional Cloudflare Worker hosted variant), the HTML strings live in `packages/mcp/src/ui-resources/*.ts` as template-literal exports. Designer hands off the visual mockup; engineering inlines the styles + bytes into the `.ts` export. Same self-contained HTML semantics; only the on-disk extension changes from `.html` to `.ts`.

### §12.2 The CSP meta tag is mandatory in every card

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:;" />
```

Designer can rely on inline `<style>` and inline `<script>` (the iframe wouldn't work otherwise). Anything else (remote fonts, remote scripts, remote images, frames, fetches) is CSP-blocked. Engineering test asserts this tag is present + that the document parses without it being weaker.

### §12.3 Engineering owns the `<script>` block

The inline `<script>` that handles `concierge.data` / `concierge.approve` / `concierge.reject` + the SEP-1865 origin discipline is shipped + tested by engineering. Designer doesn't author it. The script is ~50–100 lines per card and the size budget already accounts for it.

### §12.4 The four cards correspond 1:1 to four `UICardId` enum values

```ts
// packages/tools/src/types.ts
type UICardId = 'proposal' | 'tick' | 'portfolio' | 'reputation';
```

A ConciergeTool's `uiCardId` field determines which MCP card the host renders. Engineering's `registerUIResources(server)` registers all four resources unconditionally; the per-tool wiring is automatic.

### §12.5 Hosts that don't support MCP Apps fall back to text

If a user opens the MCP server in a host that doesn't render `ui://` resources (today: anything other than Claude Desktop + ChatGPT in MCP Apps preview), they see the tool's `structuredContent` JSON summarized by the LLM. The card visuals matter only on Apps-capable hosts; designer doesn't need to design a text fallback (the JSON IS the fallback and the LLM does the summarization).

---

## §13 — Reference

- `docs/FRONTEND-BRIEF.md` §10.39 — the surface-level mention this addendum expands.
- `docs/FRONTEND-BRIEF-ADDENDUM.md` §10.1 / §5.2 / §10.7 / §10.12 — the in-app cousin specs to draw visual continuity from.
- `packages/mcp/src/ui-resources/proposalCard.ts` — the locked engineering implementation of proposal-card (full HTML + script + states).
- `packages/mcp/src/ui-resources/_renderOnly.ts` — the shared HTML template for tick-card, portfolio-snapshot, reputation-receipt.
- `packages/mcp/src/ui-resources/_shared.ts` — `ConciergeUiResource` shape + `MCP_APP_MIME = 'text/html; profile=mcp-app'` + `UI_HTML_MAX_BYTES = 50 * 1024`.
- `packages/mcp/src/registerUIResources.ts` — how the 4 cards get registered on the McpServer; `uiCardId` → `ui://` URI mapping.
- `packages/mcp/src/server.ts` — `_meta.ui.resourceUri` propagation on tools with `uiCardId`.
- `packages/mcp/src/__tests__/ui-resources.test.ts` + `ui-resources-dom.test.ts` — the test contract; designer's mockups must match the rendered behavior (especially proposal-card's null-origin + origin-lock states).
- `research/concierge/AUDIT-2026-06-09.md` §3 — SEP-1865 origin-validation discipline notes.
- ADR-011 amended — MCP transport strategy (stdio bin + Cloudflare Worker variant).
- ADR-014 — `ConciergeTool` + `uiCardId` enum (the source of truth for which card a tool maps to).
- ADR-017 — three-rail generative UI: Rail 1 (web), Rail 2 (MCP Apps, this addendum), Rail 3 (Elicitation, main addendum §10.40).
- Story-137 PR #149 — the engineering implementation of all four cards + the test contract.

---

*Addendum authored 2026-06-14 in response to: "you should have put the MCP UI cards in the brief so the designer could design them." Apologized; this is the fix. The original FRONTEND-BRIEF.md §10.39 named the four cards at the surface level. This addendum gives them the per-card spec depth of §10.1 + locks the wire shapes from the engineering implementation in story-137. Designer can produce mocks against §9's payloads + design against §3.3 / §4.3 / §5.3 / §6.3's state tables.*
