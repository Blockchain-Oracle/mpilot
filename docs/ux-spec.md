# UX Spec — Concierge

**Anchor source:** Component intent + states + flows are fully specified at `research/concierge/08-ux-component-intent.md` (the designer's brief). This file documents the **structural locks** + **route shape** + **demo shape rule** + **visual loop validation gate**. **Visual design tokens (color, type, motion language, iconography) are owned by the designer agent** — coding agent reads `@concierge-mantle/ui/tokens` (the published design-tokens module from the designer) at build time.
**Last updated:** 2026-06-09 (amended; previous 2026-06-03)
**Status:** DRAFT (amended)

---

## ⚠️ 2026-06-09 AMENDMENT

Per architecture.md ADR-013 (amended) + ADR-015 (new), the visual implementation layer ships as **`@concierge-mantle/react-ui`** — NOT scattered across `apps/web/components/`. Designer owns the visual layer of that package; coding agents consume the package; the web app at `concierge.xyz/app` DOGFOODS the package per the web-app-dogfood requirement.

- **Headless behavior + ARIA + state machines** → `@concierge-mantle/react` (story-310)
- **Styled drop-in cards** (Radix + shadcn + `@concierge-mantle/ui` tokens) → `@concierge-mantle/react-ui` (story-311)
- **Designer no longer picks Tambo / Crayon** — both dropped (model-driven, contradict per-tool card contract)
- **Component intent in `08-ux-component-intent.md` is preserved as-is** — that's still the BRIEF. The implementation venue is now `@concierge-mantle/react-ui`, not the web app.

Cross-refs: ADR-015 (Epic E14 — Composable UI), story-310, story-311, story-312 (web dogfood).

---

## Anchor product

**Anchor:** **Designer's choice.** Concierge's visual direction is not pinned to a specific competitor or reference site. The designer agent picks the anchor (likely from the Linear / Stripe / Vercel / Granola / v0.dev quality band, but the specific anchor is theirs to choose) and publishes the resulting design tokens + component library back to `@concierge-mantle/ui`.

**Why no pinned anchor:** Per Abu's pacing preference and `08-ux-component-intent.md`, the designer is expert and does not need a reference-app catalog from the spec writer. The component intent file describes *what each component must do*; the designer translates that into visual implementation with whatever anchor they find most aligned with the brand they're designing.

**Quality bar:** Final UI must clear "Series A diligence eye-test" — premium, designer-touched, no AI-generated-looking gradients, no Inter-default body text, no `text-gray-600` on white. The anti-slop checklist in `08-ux-component-intent.md` is enforced via the visual loop validation gate (see §Visual loop validation below).

---

## Design tokens

Owned by the designer agent. Coding agent does NOT make color/font/motion decisions — it imports from `@concierge-mantle/ui/tokens`.

```typescript
// packages/ui/src/tokens.ts — populated by designer agent, consumed by coding agents
export const tokens = {
  color: { /* designer-provided */ },
  font:  { /* designer-provided */ },
  space: { /* designer-provided */ },
  radius:{ /* designer-provided */ },
  motion:{ /* designer-provided */ },
};
```

**Categorical token contracts the designer must provide (intent only — values are theirs):**

| Token category | Required values |
|---|---|
| Color | `bg.primary`, `bg.secondary`, `bg.elevated`, `surface.tint`, `border.subtle`, `border.emphasized`, `text.primary`, `text.secondary`, `text.tertiary`, `text.inverted`, `accent.primary`, `accent.secondary`, `success`, `warning`, `danger`, `info` + dark-mode variants |
| Status pill (per tick state) | `status.pending`, `status.planning`, `status.simulating`, `status.proposing`, `status.awaitingApproval`, `status.autoApproved`, `status.executing`, `status.confirmed`, `status.attesting`, `status.attested`, `status.failedSimulation`, `status.failedExecution`, `status.rejectedByUser` |
| Font | `display` (hero + sections), `body`, `mono` (addresses + code) + weight scale 300/400/500/600/700 |
| Spacing | 4px base grid: `space.1` (4px) … `space.24` (96px) |
| Border radius | `radius.sm`, `radius.md`, `radius.lg`, `radius.full` |
| Motion | `motion.fast` (150ms), `motion.medium` (250ms), `motion.slow` (400ms), easing curves |
| Container widths | `container.sm`, `container.md`, `container.lg`, `container.xl` |

**Lock contract:** Once the designer publishes `@concierge-mantle/ui@1.0.0`, the tokens are LOCKED. Coding agents read them via import, never override inline.

---

## Route shape (LOCKED)

| Route | Purpose | Header | Footer | Auth gate |
|---|---|---|---|---|
| `/` | Landing — marketing + hero with live tick demo embed | ✅ landing variant | ✅ full footer | No |
| `/app` | Authenticated dashboard — agent stream + portfolio + emergency stop | ✅ app variant | optional | Wallet required |
| `/app/onboarding/connect` | First-step: wallet connect | ✅ minimal | No | No |
| `/app/onboarding/account` | Smart account deploy (sponsored) | ✅ minimal | No | Wallet required |
| `/app/onboarding/identity` | ERC-8004 identity NFT mint | ✅ minimal | No | Wallet + smart account required |
| `/app/onboarding/goal` | First goal set | ✅ minimal | No | Wallet + smart account + identity required |
| `/app/onboarding/policy` | Autopilot toggles per category | ✅ minimal | No | All previous |
| `/app/onboarding/activate` | Confirm + activate | ✅ minimal | No | All previous |
| `/app/goal` | Edit active goal | ✅ app | optional | Authed |
| `/app/ticks` | Full tick history (paginated) | ✅ app | optional | Authed |
| `/app/ticks/:tickId` | Single tick detail (reasoning + simulation + execution + attestation) | ✅ app | optional | Authed |
| `/app/portfolio` | Position detail across providers | ✅ app | optional | Authed |
| `/app/agent` | Agent identity + reputation viewer (authed view) | ✅ app | optional | Authed |
| `/app/settings` | Network selector + LLM model overrides + API keys + MCP install | ✅ app | optional | Authed |
| `/agent/:id` | Public unauthenticated reputation viewer | ✅ landing variant | ✅ minimal footer | No |
| `/docs` | Docs site (Fumadocs or equivalent) | ✅ docs variant | ✅ minimal footer | No |
| `/docs/*` | Quickstart, SDK reference, provider docs, runtime, skill, MCP, recipes, architecture, contributing | ✅ docs variant | ✅ minimal footer | No |
| `/api/chat` | Vercel AI SDK streaming endpoint | — | — | Bearer token |
| `/api/tick` | Manual tick trigger | — | — | Bearer token |
| `/api/rates` | Live Aave Oracle + DefiLlama proxy | — | — | Public |

**Subdomain (separate Cloudflare Worker, NOT part of the Next.js app):**

| Route | Purpose | Auth |
|---|---|---|
| `mcp.concierge.xyz/api/sse` | MCP server — Streamable HTTP transport | Bearer token v0 / OAuth v1 |

---

## Returning-user gate (LOCKED — added 2026-06-15)

Onboarding is a one-time event. The wizard MUST NOT run for users who already have a deployed smart account + minted agent on their connected wallet.

**Mechanism.** On every authenticated page load `<AuthGate>` (root client component, wrapped inside `<PrivyProviders>`) calls `GET /api/agents/me` with the Privy access token. Route shape:

```
GET /api/agents/me
  Authorization: Bearer <privy_access_token>
  → 200 { agent: null }              // first-time user
  → 200 { agent: { id, smartAccountAddress, agentTokenId, status, ... } }
  → 401                              // missing / invalid token
```

The server verifies the token via `@privy-io/node`'s `verifyAccessToken` and uses the verified `userId` as the ownership key — NEVER trusts a wallet address or user id from the request body or headers. This is the canonical server-side identity boundary for every authenticated route.

**Routing decisions.**

| `data.agent` shape | Current path | Action |
|---|---|---|
| `null` | `/` | `router.replace('/onboarding')` |
| `null` | `/onboarding/*` | no-op (already in wizard) |
| `{smartAccountAddress, agentTokenId: null}` (mid-wizard) | any | `router.replace('/onboarding')` (resume at identity step) |
| `{status: 'active'}` | `/` or `/onboarding/*` | `router.replace('/app')` |
| `{status: 'active'}` | `/app/*` or `/agent/*` | no-op |

Landing always renders immediately; the gate runs only the redirect *side-effect*, never gates the *render*, so first-paint stays fast.

**Why not middleware?** Next.js Edge middleware cannot read Privy's client-side session. Verified via Context7 and confirmed in the project plan — the gate is intentionally a client component, after hydration.

**Logout.** `useLogout` wraps Privy's `logout()` and calls `queryClient.removeQueries({ queryKey: ['me'] })` (NOT `clear()` — would nuke wagmi's cache). `<ConciergeAccountContext>` resets on the next mount.

---

## Demo shape rule

The 90-second judge walkthrough (per `PRD.md` § Demo moment) lives on these routes in this order:

1. `/` (hero) — judge sees live tick streaming on Sepolia
2. `/app/onboarding/*` — sponsored connect → smart account → identity → goal → activate (Concierge sponsors gas; judge pays nothing)
3. `/app` — judge watches first tick stream in real time, approves manually
4. Judge runs `npx skills add @concierge-mantle/mantle-agent` in their terminal, then drives Concierge from Claude Code via `mcp.concierge.xyz/api/sse`

**The wow moment:** judge sees the same agent (same `agentId` in ERC-8004 reputation) operating across two surfaces (web + MCP-driven Claude Code) within 90 seconds.

**No demo-only routes.** Every URL a judge sees is a real production route. The Sepolia playground (chain `5003`, mock contracts) is selectable via the network switcher; Mainnet (chain `5000`, real contracts) is the default once a user has funded their smart account.

---

## Structural requirements (non-negotiable)

### Header (required on every route)

| Variant | Used on | Contents |
|---|---|---|
| `landing` | `/`, `/agent/:id`, `/docs` | Logo (left) · primary nav (center) · "Try on Sepolia" CTA (right) |
| `app` | `/app/*` | Logo (left) · network badge · agent identity card link · Emergency Stop button (always visible) · wallet/account dropdown (right) |
| `minimal` | `/app/onboarding/*` | Logo (left) · step indicator (center) · exit-onboarding link (right) |
| `docs` | `/docs/*` | Logo (left) · search input + Cmd/Ctrl-K shortcut · nav links (right) |

Heights: **64px desktop / 56px mobile.** Header is sticky after scroll on landing; pinned on app + docs.

### Footer

| Variant | Used on | Contents |
|---|---|---|
| `full` | `/` | Sections: Product (links to /app, /docs, /agent), Resources (GitHub, X, Discord), Legal (License, Terms-stub) · MCP install snippet · copyright + MIT license note |
| `minimal` | `/docs`, `/agent/:id` | Single-line: "Concierge — built for Mantle Turing Test 2026 · MIT License · GitHub" |
| (none) | `/app/*` | App routes have no footer (Emergency Stop is the persistent footer-adjacent element) |

### Always-visible app elements

- **Emergency Stop button** (per `08-ux-component-intent.md` § Emergency Stop) — never below the fold on `/app/*`. Mobile: floating action button bottom-right. Desktop: sticky in header.
- **Network badge** — shows current chain ("Mantle Mainnet" green / "Mantle Sepolia (Demo)" amber / "Disconnected" red). Click opens network switcher modal.

---

## Banned Tailwind / styling classes (project-specific)

In addition to the global bans listed in `docs/architecture.md` § Banned patterns:

- ❌ `bg-white` on cards — use `bg-[var(--surface)]` or the designer's surface token
- ❌ `rounded-full` on cards — only on buttons and avatars
- ❌ `rounded-xl` on cards — use the designer's card radius token (likely `rounded-md` or `rounded-lg` depending on brand)
- ❌ `shadow-lg` everywhere — sparingly, per designer's elevation hierarchy
- ❌ Hardcoded hex colors in components — import from `@concierge-mantle/ui/tokens`
- ❌ Inline `style={{ ... }}` for non-dynamic values — use Tailwind utilities or token-driven CSS variables
- ❌ Custom font loading via raw `<link>` — fonts ship through `@concierge-mantle/ui/fonts` per designer
- ❌ Status-pill backgrounds at full color saturation — designer's pill tokens use subtle tinted backgrounds (10-15% opacity)

---

## Visual loop validation gate

Every UI story includes a visual loop validation step. Coding agent runs after any `.tsx` edit:

1. Playwright captures current screenshot at `screenshots/current/<route-or-component>--<viewport>.png`
2. `odiff` diffs current vs the designer's anchor at `screenshots/anchor/<route-or-component>--<viewport>.png`
3. Opus 4.7 reviewer reads the diff image + outputs verdict JSON at `.claude/last-review.json`
4. If `verdict !== "ok"` → fix before continuing
5. Coding agent does NOT commit while `.claude/last-review.json` shows `"needs-fix"` or `"slop"`

**Passing threshold:** `slop_score ≤ 2 AND blocking_count = 0`

**Slop signals (any of these in the review = block):**
- Generic AI gradient (`purple-to-pink` family)
- Default Inter / Helvetica without designer's font load
- `text-gray-*` body color on white
- Misaligned content (button text not centered, card padding inconsistent)
- Empty states with no illustration / no copy
- Placeholder copy ("John Doe", "lorem ipsum")
- Missing focus states on interactive elements
- Untreated loading states (raw spinner)

**Designer-provided anchors:**
- Once the designer agent finalizes the component library, anchor screenshots are committed at `screenshots/anchor/`
- Coding agent NEVER overwrites these (read-only baseline)
- New routes or components require the designer to publish a new anchor before the coding agent can build that surface

---

## Mobile + accessibility requirements

Inherited from `08-ux-component-intent.md`:

- All flows work on 375px viewport
- Tap targets ≥ 44×44 px
- Action cards stack vertically on mobile, horizontal where space allows on desktop
- Keyboard navigation: every interactive element reachable + activatable via Tab + Enter/Space
- Screen reader: status changes announced via ARIA live regions
- `prefers-reduced-motion: reduce` respected — all animations become instant, final states render directly
- Color contrast WCAG AA minimum (4.5:1 for body text, 3:1 for large text + UI components)
- Focus rings visible always (never `outline: none` without `:focus-visible` replacement)
- Dark mode is primary; light mode supported

---

## Handoff to designer agent

The designer agent reads:

1. `research/concierge/08-ux-component-intent.md` — component intent + states + flows + accessibility contract (THE primary brief)
2. This file (`docs/ux-spec.md`) — route shape + structural locks + banned patterns + visual loop validation gate
3. `docs/PRD.md` — wedge + demo moment + judging-criteria alignment
4. `research/concierge/01-wedge-locked.md` — product narrative + user description

Designer agent outputs:

1. `packages/ui/src/tokens.ts` — design tokens (color, font, spacing, motion)
2. `packages/ui/src/components/*.tsx` — component implementations per `08-ux-component-intent.md`
3. `packages/ui/src/fonts/*.css` — font-face declarations
4. `screenshots/anchor/*.png` — visual baselines for the validation loop
5. `packages/ui/README.md` — component library documentation

Once `@concierge-mantle/ui@1.0.0` is published, coding agents pick up UI stories (Epic 5 onwards).
