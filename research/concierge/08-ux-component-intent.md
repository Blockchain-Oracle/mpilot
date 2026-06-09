# Concierge — UX Component Intent (Designer's Brief)

**Audience:** the designer agent who will produce the visual implementation. **This file describes what every component must DO** — purpose, states, transitions, streaming behavior, accessibility, mobile responsiveness. **No frameworks are named** — pick whatever (Tambo / assistant-ui / Vercel AI SDK gen-UI + custom shadcn / CopilotKit / your own) fits the intent and the brand. The agent runtime is invariant; the implementation library is the designer's call.

---

## Design constraints (carry into every decision)

- **Three surfaces, one brand:** Landing (`/`), App (`/app`), Docs (`/docs`). All at `concierge.xyz`. Shared design tokens (color, type, motion, spacing). Each surface optimizes for its own conversion goal.
- **Real-time agent visibility is the demo wow factor.** Users (and judges) must SEE the agent thinking → simulating → proposing → executing → confirming on-chain → attesting reputation. Status changes animate; reasoning text streams character-by-character; status pills transition between phases. Calm, dense, premium. NOT a busy dashboard.
- **Accessibility is non-negotiable.** Keyboard-navigable every interactive surface. Screen-reader-friendly. `prefers-reduced-motion` respected (no animations when set; final states render directly). Color contrast WCAG AA minimum. Focus rings visible always.
- **Mobile-first responsive.** Every flow works on a 375px viewport. Tap targets ≥ 44×44 px. Action cards stack vertically on mobile; horizontal on desktop where space allows.
- **Dark mode primary, light mode supported.** Brand is designed for dark; light is the alternative. Both ship from Day 1.
- **No marketing-buzzword copy.** Every label is functional + plain English. "Activate your agent" not "Unleash AI-powered autonomous DeFi optimization."
- **The agent is a *steward*, not a *hero*.** Tone is calm + confident, not aggressive or hype-y. The user is the principal; the agent works for them.

---

## Surface 1 — Landing (`concierge.xyz/`)

### Purpose
Convince a tired hackathon judge or curious dev in 5 seconds that Concierge is real, well-built, and worth clicking "Try on Sepolia."

### Components

#### `<Hero>`
- **Purpose:** State the wedge in one sentence with a visual proof of life.
- **Content:** Single-sentence headline + supporting line + 1 primary CTA + 1 secondary CTA + embedded live demo of a real tick streaming.
- **Behavior:** the embedded demo shows an actual tick (planning → simulating → proposing → executing → confirmed → attested) playing on loop, sourced from a live Sepolia agent that ticks every 60s. Judges see the product working before they click anything.
- **States:**
  - `loading` — skeleton hero while live demo data fetches
  - `live` — real-time demo running, status pill animating
  - `interaction-pause` — user hovers/focuses inside the demo, animation pauses to let them read
- **Accessibility:** static fallback for `prefers-reduced-motion` (single screenshot of a confirmed tick).
- **Mobile:** demo shrinks below the headline; CTAs stack vertically.

#### `<HowItWorks>` (3-step explainer)
- **Purpose:** Make the agent loop legible.
- **Content:** 3 numbered steps. Step 1: "Set a goal." Step 2: "Your agent ticks." Step 3: "Verify every move on-chain."
- **Each step is a card** with: number, headline, 1-line description, optional icon, optional mini-animation showing the step.
- **States:** `idle`, `inViewport` (mini-animation plays once when scrolled into view).
- **Mobile:** vertical stack; mini-animations replaced with static illustrations.

#### `<KlarnaComparison>`
- **Purpose:** Cost-of-credit-floor framing vs traditional finance.
- **Content:** Side-by-side: "Klarna 23.99% APR" vs "Concierge — your collateral covers the loan interest (live rate, refreshed on every render)."
- **Behavior:** the "live rate" number fetches from `/api/rates` (Aave Oracle + DefiLlama proxy) and updates per render. NEVER hardcoded.
- **States:** `loading`, `loaded`, `spread-positive` (success styling), `spread-compressed` (neutral styling with explanatory tooltip), `spread-negative` (warning styling).

#### `<DeveloperCTA>`
- **Purpose:** Pitch the SDK to Mantle devs.
- **Content:** Code block (`npm install @concierge/sdk`), 3-line example showing an agent being spun up, "Read the docs" CTA.
- **Behavior:** code block has copy-to-clipboard button; on copy, brief success animation.

#### `<TrustSignals>`
- **Purpose:** Establish credibility.
- **Content:** Mantle Mainnet contract addresses linkable to MantleScan, GitHub repo link with star count, "Open-source MIT" badge, "Composes 7 Mantle protocols" mini-grid showing Aave / Mantle DEXes / Ethena / Ondo / mETH / Li.Fi / ERC-8004 logos.
- **Behavior:** addresses are copyable on click; logos link to each protocol's page.

#### `<Footer>`
- Primary nav back to all sections, GitHub link, X link, Docs link, MCP server install snippet (`npx skills add @concierge/mantle-agent`), copyright + MIT license note.

### Landing-level interactions

- Smooth scroll between sections (respects `prefers-reduced-motion`).
- Header is sticky after scroll, condensed (compact logo + minimal nav + CTA).
- 404 page is branded (not Next.js default).

---

## Surface 2 — App (`concierge.xyz/app`)

The product. Where users actually interact with Concierge.

### Pages

#### `/app` (Dashboard — first authed landing)
- Greeting line.
- Agent identity card (ERC-8004 agent NFT visual + agent ID + creation date + reputation summary).
- Live tick stream (most recent N ticks, top of feed).
- Portfolio snapshot (current positions across all 7 providers + total USD + 24h delta).
- Active goal card (current goal text + activation status + autopilot toggles).
- Emergency Stop button (always visible, never below the fold).

#### `/app/onboarding` (first-run flow — 4 steps)
1. Connect wallet (or sign in with Privy / Reown)
2. Create smart account (ZeroDev kernel deploy)
3. Mint ERC-8004 identity NFT (agent's permanent record)
4. Set first goal in plain English

#### `/app/goal` (Goal-setting screen)
- Plain-English text input ("max stablecoin yield, never breach 70% Aave LTV")
- Structured parameters extracted by LLM (rendered as editable chips)
- Autopilot policy per category (toggles)
- Active/Pause toggle for the agent itself
- Spending caps (per-day, per-tx, per-category)
- Save & activate CTA

#### `/app/ticks` (Full tick history)
- Paginated list of all ticks (newest first)
- Filter by status / provider / outcome
- Each tick is a clickable card → opens `/app/ticks/:tickId` for full detail

#### `/app/ticks/:tickId` (Single tick detail)
- Full reasoning text (the LLM's plan in full, not just streamed snippet)
- Simulation output (dry-run result + risk flags)
- Decision record (user-approved or autopilot-auto, timestamp)
- Execution record (tx hash + MantleScan link + gas + outcome)
- Attestation record (ERC-8004 feedback hash + link to view on Reputation Registry)
- Replay button (re-runs a copy of the tick in dev mode, no on-chain)

#### `/app/portfolio` (Position detail view)
- One section per provider with active positions
- Per-position: amount, USD value, APR (supply or borrow), health-factor contribution (if Aave)
- Aggregated health factor across all Aave positions (large gauge)
- Net effective yield calculator (sum positions × their APRs)

#### `/app/agent` (Agent identity + reputation viewer)
- Agent NFT visual (tokenURI rendered)
- Agent ID + owner wallet
- Reputation summary (count + average score + decimals)
- Reputation history visualization (chart of attested ticks over time with positive/negative values)
- Public share link (`/agent/:id`) which is the same page but unauthenticated

#### `/app/settings`
- Network selector (Mainnet ↔ Sepolia)
- LLM model overrides (Sonnet 4.6 default, Opus 4.7 for hard reasoning)
- Tick cadence override (default 60s)
- API key management (for SDK + MCP server)
- Disconnect / delete account flow
- MCP install instructions for Claude Code / Claude Desktop / OpenClaw / RealClaw

### Components (in `/app`)

#### `<TickCard>` — **THE central UI primitive**

**Purpose:** Render a single tick's lifecycle in real time. This is the demo wow.

**Lifecycle states (ALL must be visually distinct):**

| State | Visual treatment | What's shown |
|---|---|---|
| `pending` | muted, low opacity | "Queued for next tick window" |
| `planning` | active, animated spinner near status pill | Streaming LLM reasoning text |
| `simulating` | animated dry-run indicator | Simulation results appearing as nested mini-cards (risk flag, expected APR, health-factor projection) |
| `proposing` | full visibility, Approve/Reject controls visible | Action summary, expected outcome, "Approve" / "Reject" / "Edit" buttons |
| `awaiting-approval` | same as proposing, with timeout countdown | "Auto-rejects in 4m 23s" — only if manual mode |
| `auto-approved` | green checkmark micro-animation | "Autopilot approved — executing" |
| `executing` | active, pulsing execution indicator | "Sending tx via session key…" + spinner |
| `confirmed` | tx hash visible + MantleScan link | Block number, gas used, real outcome |
| `attesting` | brief loading state | "Writing ERC-8004 attestation…" |
| `attested` | final state, collapsible | Compact summary view + expand-for-detail |
| `failed-simulation` | warning style | Reason for refusal (constraint violation) |
| `failed-execution` | error style | Revert reason + retry button |
| `rejected-by-user` | neutral muted | "Rejected by user at 14:23" |

**Transitions:** smooth pill-color morph (pending→planning→simulating→…→attested). Reasoning text streams character-by-character via SSE. When a state changes, brief animation draws attention (subtle, not bouncy).

**Internal layout:**
- Header: status pill, tick ID, timestamp, agent name
- Body: reasoning text (streamed), simulation card (when present), action card (when proposing), tx card (when executing/confirmed), attestation link (when attested)
- Footer: collapse/expand toggle, "View full detail" link to `/app/ticks/:tickId`

**Streaming behavior:**
- Reasoning text streams from the API as the LLM generates it (`streamText` from Vercel AI SDK or equivalent). User sees the agent think.
- Status pill transitions are pushed via SSE from the backend; client updates immediately.
- Mid-card content (simulation card, action card) renders progressively as data arrives.

**Accessibility:**
- Status changes are announced via ARIA live region (`role="status"`).
- All interactive controls (Approve/Reject/Edit/Expand) are keyboard-accessible (Tab + Enter/Space).
- Reasoning text region is `aria-live="polite"` so screen readers narrate the stream without interrupting.
- Reduced motion: status changes are instant, no transition animations.

**Mobile:**
- Cards stack vertically with full width.
- Action buttons stack vertically below the body.
- Expand/collapse remains tap-friendly.

#### `<StatusPill>` — Reusable pill for tick states
- Color + label combination per state (per the table above)
- Animation: tween between states with `prefers-reduced-motion` fallback
- Size variants: small (inline) / medium (card header) / large (page title)

#### `<ReasoningStream>` — Streaming text component
- Character-by-character render of LLM output
- Cursor animation while streaming
- Pause/resume control for user
- Markdown rendering (bold/lists/code) on completed segments

#### `<SimulationCard>` — Nested mini-card inside `<TickCard>`
- Renders dry-run output: tx preview, expected USD delta, health-factor projection, risk flags
- Visual diff: "before" state vs "after" state for each affected position
- "Why?" expandable section showing constraint checks (LTV floor, slippage, etc.)

#### `<ActionApprovalCard>` — Nested inside `<TickCard>` during `proposing`
- Action description (1 line, plain English)
- Approve / Reject / Edit buttons
- Edit opens a modal with constrained parameter tweaks
- Approval countdown if autopilot disabled (default 5 min)

#### `<TxConfirmationCard>` — Nested inside `<TickCard>` during `executing`/`confirmed`
- Tx hash (truncated, copyable, links to MantleScan)
- Block number, gas used, success/revert indicator
- "Replay" button to re-run as dry-run

#### `<AttestationCard>` — Final state in `<TickCard>`
- Feedback hash (links to ReputationRegistry on MantleScan)
- IPFS content link (or `ipfs://` URI)
- Value contribution (e.g., "+0.05 → agent reputation now +1.74")

#### `<GoalCard>` — Active goal view
- Goal text (large, readable)
- Activation timestamp
- "Active for 14 days" runtime indicator
- Autopilot category toggles (Aave actions, DEX swaps, Bridge, Yield positions, Restaking)
- Spending caps display
- Pause / Resume toggle

#### `<GoalInput>` — Plain-English goal entry
- Large text area
- LLM-extracted parameters render as chips below as the user types (debounced)
- Chips are editable (e.g., user changes "70% LTV" to "65% LTV" by clicking the chip)
- Example goals carousel (clickable, fills input)

#### `<PortfolioPositionRow>` — One row per active position
- Provider logo + asset symbol
- Amount + USD value
- APR (signed: positive = earning, negative = paying)
- Optional: health-factor contribution (Aave only)
- Click expands to full position detail

#### `<HealthFactorGauge>` — Visual health indicator
- Large radial gauge showing current HF (1.0 = liquidatable, 2.0 = comfortable)
- Color zones: red (< 1.2), amber (1.2–1.5), green (≥ 1.5)
- Tooltip on hover explaining HF mechanics
- Live update on tick state changes

#### `<ReputationChart>` — Time series of attested ticks
- X-axis: time (last 30 days default, zoomable)
- Y-axis: cumulative reputation value
- Each tick = a point (color-coded by value)
- Click point to open the specific tick detail

#### `<EmergencyStop>` — Persistent kill switch
- Always visible (sticky in dashboard header or floating action button)
- Confirms via modal ("Stop all autopilot — existing positions remain")
- On confirm: revokes session keys, deactivates autopilot, halts cron schedule
- Visual state: "Active" (button visible) vs "Stopped" (banner across top + "Resume" button)

#### `<AgentNFTCard>` — Agent identity visualization
- Renders the `tokenURI` JSON manifest (name, image, capabilities, owner)
- Owner wallet address (shortened, copyable)
- Agent ID
- Reputation badge (count + avg)
- Share link

#### `<MCPInstallSnippet>` — Code block for MCP install
- Tab variants: Claude Code / Claude Desktop / OpenClaw / RealClaw / Custom MCP client
- Copy-to-clipboard button
- "After install" instructions

#### `<EmptyState>` — When user has no active goal / no ticks yet
- Illustration + 1-line copy + primary CTA back to onboarding/goal-set

#### `<ToastNotification>` — Transient confirmations
- Success, info, warning, error variants
- Auto-dismiss after 5s, hover pauses dismiss
- Bottom-right corner, stack newest-on-top
- Screen-reader announcement via ARIA live region

#### `<Modal>` — Confirmation / edit dialogs
- Backdrop with `prefers-reduced-motion` aware fade
- Focus trap (returns focus to trigger on close)
- ESC and click-outside both close (with optional confirm-on-close for destructive flows)

---

## Surface 3 — Docs (`concierge.xyz/docs`)

### Purpose
Make a Mantle developer `npm install @concierge/sdk` and ship their own agent in 90 seconds.

### Pages

- `/docs` — Overview + table of contents
- `/docs/quickstart` — `git clone` to first running agent in 10 minutes
- `/docs/sdk` — `@concierge/sdk` API reference
- `/docs/providers` — `@concierge/<provider>` per-provider reference (mirrors `03-providers/` content)
- `/docs/runtime` — agent runtime concepts (tick loop, session keys, attestation)
- `/docs/skill` — RealClaw skill packaging guide (`npx skills add` install)
- `/docs/mcp` — MCP server setup + connect from Claude Code
- `/docs/recipes` — copy-paste examples (yield optimizer, depeg-resistant treasury, autopay)
- `/docs/architecture` — full system diagram
- `/docs/contributing` — open-source contributor guide

### Components

#### `<DocsNav>` — Left sidebar with hierarchical navigation
- Collapsible sections
- Active page highlighted
- Search input at top
- Mobile: drawer (hamburger toggle)

#### `<DocsSearch>` — Full-text search
- Keyboard shortcut to focus (Cmd/Ctrl-K)
- Suggestions list with title + breadcrumb path
- Highlights match in result snippets

#### `<DocsCodeBlock>` — Syntax-highlighted code with copy button
- Language label
- Copy-to-clipboard with success animation
- Filename header (optional)
- Line numbers (optional, off by default)
- Diff highlighting (for migration guides)

#### `<DocsAPITable>` — Function / parameter reference
- Function signature header
- Parameters table (name, type, required, description, default)
- Returns section
- Example code block

#### `<DocsCallout>` — Inline emphasis box
- Variants: info, tip, warning, danger, success
- Optional title + icon
- Renders nested markdown

#### `<DocsLiveExample>` — Embedded runnable example
- Code on left, live output on right
- "Open in CodeSandbox" or "Open in Replit" link
- Fallback to static output if iframe blocked

#### `<DocsFooter>` — Edit on GitHub link + last-updated date + nav to prev/next

---

## Cross-cutting components (shared across all three surfaces)

#### `<Logo>` — Brand mark + wordmark
- Multiple size variants (icon-only / icon+wordmark / wordmark-only)
- Color variants (full / monochrome dark / monochrome light)
- Links to `/` by default

#### `<NetworkBadge>` — Sticky network indicator
- "Mantle Mainnet" / "Mantle Sepolia (Demo)" / "Disconnected"
- Color-coded
- Click opens network switcher modal

#### `<WalletConnectButton>` — Wallet connect / account display
- Disconnected state: "Connect" CTA
- Connected state: address (truncated) + ENS/avatar + dropdown to disconnect
- Embedded ZeroDev smart account indicator when applicable

#### `<MantleScanLink>` — Address / tx-hash link
- Truncated display (e.g., `0x458F…1422`)
- External icon
- Copy-to-clipboard on click (with click-and-hold to follow link)

#### `<SkeletonLoader>` — Loading placeholder
- Multiple variants matching the shape of the content being loaded
- Respects `prefers-reduced-motion` (no shimmer animation)

#### `<ErrorBoundary>` — Crash recovery
- Catches React errors, renders friendly fallback
- "Reload" button + GitHub issue link with auto-populated stack trace

---

## Flows

### Flow 1: Onboarding (first-time user)

1. User lands at `concierge.xyz/`
2. Clicks "Try on Sepolia" CTA
3. `/app` redirects to `/app/onboarding/connect`
4. Wallet connect prompt (Privy / Reown / WalletConnect)
5. `/app/onboarding/account` — explains ERC-4337 smart account, deploys via ZeroDev (sponsored by Concierge paymaster), shows progress
6. `/app/onboarding/identity` — mints ERC-8004 identity NFT, explains what the NFT represents, shows MantleScan link
7. `/app/onboarding/goal` — first goal-set screen with examples
8. `/app/onboarding/policy` — autopilot toggles per category (default: all off, manual approval)
9. `/app/onboarding/activate` — confirmation + first tick scheduled
10. Redirects to `/app` dashboard, agent ticks within 60s

### Flow 2: Tick stream (active session)

1. User on `/app` dashboard
2. Backend emits SSE event: tick `T+1` entering `planning` state
3. New `<TickCard>` slides into top of tick stream, status pill pulses
4. Reasoning text streams into card character-by-character
5. After plan complete: status pill transitions to `simulating`, simulation card renders below reasoning
6. After simulation: status pill transitions to `proposing`, action approval card renders
7. **If manual mode:** countdown begins (default 5 min); user can Approve / Reject / Edit
8. **If autopilot for this category:** status pill skips to `auto-approved` → `executing`
9. Execution card renders with tx hash; tx confirmation streams
10. Final state: `attested`, card collapses to compact summary

### Flow 3: Approving an action manually

1. User sees `proposing` card in stream
2. Reads action summary + simulation
3. Clicks "Approve" → confirmation toast → status pill transitions to `executing`
4. OR clicks "Edit" → modal opens with constrained parameter tweaks (e.g., reduce amount from $100 to $50)
5. Submit modal → re-simulate → re-render proposal with new params
6. OR clicks "Reject" → status pill transitions to `rejected-by-user`, card minimizes

### Flow 4: Emergency Stop

1. User on any `/app/*` page
2. Clicks `<EmergencyStop>` (always visible)
3. Modal: "Stop all autopilot. Existing positions remain. Continue?"
4. Confirm → backend revokes session keys + halts cron
5. Banner appears across top of app: "Agent stopped. Resume to reactivate."
6. Resume button reactivates after final user confirmation

### Flow 5: Viewing reputation

1. User clicks Agent identity card on `/app` or visits `/app/agent`
2. Page renders agent NFT visual + reputation summary + ReputationChart
3. User can click a point in the chart → opens corresponding tick detail
4. User can click "Share" → copies public URL `concierge.xyz/agent/:id`
5. Recipient visits URL unauthenticated, sees the same page (read-only)

### Flow 6: Installing as a RealClaw skill

1. Visitor on `concierge.xyz/docs/skill`
2. Sees install snippet: `npx skills add @concierge/mantle-agent`
3. Copies, runs in their terminal
4. Their RealClaw / Claude Code / Claude Desktop now has Concierge tools available
5. They invoke Concierge actions in chat: "Concierge, supply 10 USDC to Aave"
6. The skill's MCP client connects to `mcp.concierge.xyz/api/sse` with their session token
7. Action executes server-side via their connected wallet's session key

---

## Animation / motion language

- **Transitions:** smooth, 200-300ms, easing `ease-out`. Status pill morphs use FLIP technique. NEVER bouncy.
- **Loading:** subtle shimmer for skeletons; spinning for executing states (max 2 rotations/sec).
- **Entry/exit:** cards slide in from below (16px translate + opacity 0→1), 150ms.
- **Streaming text:** character-by-character with subtle cursor blink (1Hz).
- **Status pill morphs:** color crossfade + width tween, 250ms.
- **Notifications:** toast slides in from bottom-right (16px translate + opacity 0→1).
- **Modal:** backdrop fade-in 200ms + modal scale 0.96→1.0 + 150ms.
- **`prefers-reduced-motion: reduce`:** ALL of the above become instant (0ms). Final states render directly. No animations.

## Color tokens (intent only — designer picks the actual values)

- `--bg-primary` — page background (dark by default)
- `--bg-secondary` — card / panel background
- `--bg-elevated` — elevated card (e.g., modal, sticky header)
- `--surface-tint` — overlay tint for selected / hovered states
- `--border-subtle` — default divider
- `--border-emphasized` — focused / selected border
- `--text-primary` — body text
- `--text-secondary` — secondary text (timestamps, labels)
- `--text-tertiary` — disabled / placeholder
- `--text-inverted` — text on saturated backgrounds (buttons, badges)
- `--accent-primary` — brand primary (CTAs, active states)
- `--accent-secondary` — brand secondary
- `--success` — positive states (confirmed, attested, profitable)
- `--warning` — neutral-warning states (constraint approaching, spread compressed)
- `--danger` — error states (failed, liquidation risk)
- `--info` — informational (simulating, planning)
- Status-pill backgrounds: subtle tinted (10-15% opacity of accent color)

## Typography tokens

- `--font-display` — for the hero + section headlines (serif or distinctive sans, designer's pick)
- `--font-body` — for body text (geometric sans, high readability)
- `--font-mono` — for code, addresses, tx hashes (monospace with ligatures)
- Sizes: `--text-xs` through `--text-5xl` (8-step scale)
- Weights: `300`, `400`, `500`, `600`, `700`

## Spacing tokens

- 4px grid (`--space-1` = 4px, `--space-2` = 8px, …, `--space-12` = 48px, `--space-16` = 64px, `--space-24` = 96px)
- Container max-widths: `--container-sm` (640px), `--container-md` (768px), `--container-lg` (1024px), `--container-xl` (1280px)

---

## Open questions for the designer

1. **Logo + brand mark.** No constraint from the agent runtime. Pick something distinctive that supports both icon-only and full lockup.
2. **Display font choice.** Serif (e.g., Fraunces, Newsreader) vs distinctive sans (e.g., Inter Display, Geist). Sets the tone.
3. **Color palette.** Dark-mode primary. Suggest a calm tone (deep navy / charcoal background, restrained accent color). Avoid bright/aggressive palettes.
4. **Status-pill style.** Pill shape with subtle tint background? Square chip? Animated dot + label? Designer's call as long as states are visually distinct.
5. **Tick card density.** How much vertical space per card? Cards can be tall (full reasoning visible) or compact (collapsed by default with expand on focus).
6. **Hero animation style.** Looped live demo or scripted explainer animation. Designer picks.
7. **Iconography.** Heroicons / Lucide / Phosphor / custom — designer's pick.
8. **NFT visual.** ERC-8004 identity NFT — generative pattern based on agentId? Branded illustration? Editable per user?
9. **Empty states.** Each empty state needs an illustration or visual. Suggest a coherent illustration system.
10. **Reputation chart style.** Sparkline / area chart / candlestick-style with positive-negative areas — designer picks.

---

## Reference materials NOT to include

- No competitor screenshots. Designer is expert; they don't need them.
- No mandatory color palette. Designer chooses to fit the brand they design.
- No mandatory layout grid. Designer chooses what suits each surface.
- No mandatory component library. Build with whatever fits.

The designer has total freedom over visual implementation as long as the component intent, state coverage, accessibility contract, and flow integrity are preserved.
