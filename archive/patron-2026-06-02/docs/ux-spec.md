# Patron — UX Spec

**Surfaces:** Web app (`apps/web`) + Telegram Mini App (`apps/mini`) + 3 demo merchant storefronts
**Status:** Locked. Frontend stories build to this spec.

---

## Anchor products (visual references)

Different surfaces have different anchors. Each anchor was chosen because it has shipped — judges and users have seen it work — and because it solves a problem we have.

| Patron surface | Anchor | URL | What we borrow |
|---|---|---|---|
| Landing page | **Mercury.com** | https://mercury.com | Crisp serif headline + sans body, generous whitespace, dark numbers on cream/off-white, segmented feature showcase |
| Dashboard | **Cleo (cleo.ai) + Lindy (lindy.ai)** | https://cleo.ai · https://lindy.ai | Card-based agent activity feed; plain-language permission summary at top; persistent agent status indicator |
| Agent action timeline | **Cognition Devin dashboard** | https://devin.ai | Sub-agent fan-out tree; parent/child task visualization; time-axis filter |
| Emergency Freeze button | **Cobo Agentic Wallet** | https://cobo.com | Large red one-tap "freeze all permissions" primitive; immediate visual feedback (frozen state lock-icon) |
| Plain-language permissions | **Openfort + Privy** | https://openfort.io · https://privy.io | "Patron can spend up to $200 USDC per 24h on whitelisted merchants until Aug 1" — translates session-key bytecode to English |
| Checkout modal | **Stripe Checkout + Klarna widget** | https://stripe.com/checkout | Modal pattern; clean confirm step; visible fee/yield math |
| Merchant directory | **Substack discover + Pinterest boards** | https://substack.com/discover | Card grid with category filters + "favorited" pinning |
| Telegram Mini App | **TON Wallet + Hamster Kombat** | (Telegram-native) | TG-native shell (back button, main button, theme adaptation); bottom-action-bar primary CTA pattern |

**Anti-anchor (do NOT look like):** generic shadcn dashboards with default gradients, Glassmorphism overuse, generic SaaS purple, "AI assistant" chat-bubble UIs (we are NOT a chat product — we are an agent management dashboard).

---

## Design tokens

### Colors

| Token | Value | Use |
|---|---|---|
| `--bg` | `#FAF8F4` (cream) | App background, landing |
| `--bg-elevated` | `#FFFFFF` | Cards, modals |
| `--bg-inverse` | `#0A0A0A` | Hero band, footer |
| `--fg` | `#0F0F0F` | Primary text |
| `--fg-muted` | `#6B6B6B` | Secondary text, labels |
| `--fg-inverse` | `#FAFAFA` | Text on dark |
| `--accent` | `#1E40AF` (deep indigo) | CTAs, links, focus rings |
| `--accent-hover` | `#1A3A9E` | CTA hover |
| `--success` | `#0F7B3D` (forest green) | Yield deltas, repaid state |
| `--warning` | `#B45309` (amber) | Health-factor warnings |
| `--danger` | `#B91C1C` (deep red) | Emergency Freeze, liquidation alerts |
| `--border` | `#E5E0D7` (warm grey) | Card borders, dividers |

**No gradients in CTAs.** Solid colors only. Gradients allowed only in hero/banner backgrounds with explicit design approval.

### Typography

| Role | Family | Weight | Sizes |
|---|---|---|---|
| Display (hero) | **Fraunces** (serif) | 500 / 600 | 48 / 64 / 80 px |
| Heading | **Fraunces** (serif) | 500 | 24 / 32 / 40 px |
| Body | **Inter** (sans) | 400 / 500 | 14 / 16 / 18 px |
| Mono / numeric | **JetBrains Mono** | 400 / 500 | 12 / 14 / 16 px (for token amounts, addresses, hashes) |

Pair: **Fraunces (serif display) + Inter (sans body)**. NOT Inter-only.

### Spacing

8-point system: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192`.

### Radii

| Element | Radius |
|---|---|
| Cards | `16px` |
| Inputs | `12px` |
| Buttons (default) | `12px` |
| Emergency Freeze button | `28px` (full-pill) |
| Modal | `24px` |

### Motion

- Easing: `cubic-bezier(0.32, 0.72, 0, 1)` (springy, not bouncy)
- Page transitions: 200ms
- Hover micro-interactions: 150ms
- Toast in/out: 300ms
- NO `transition-all`. Specify properties.

---

## Route shape

### `apps/web` (full web product)

| Route | Purpose | Auth |
|---|---|---|
| `/` | Landing page — hero, "how it works", merchant logos, Demo Day mention | Public |
| `/app` | Authenticated dashboard (collapses to `/connect` if no wallet) | Wallet required |
| `/app/dashboard` | Default view — positions, yield tickers, agent activity, Emergency Freeze | Wallet required |
| `/app/agent` | Agent management — reputation, permissions (plain-language), settings, export | Wallet required |
| `/app/merchants` | Merchant directory (browse + search + favorites) | Wallet required |
| `/m/:slug` | Public merchant page (review, reputation, items they sell) | Public |
| `/checkout/:orderId` | Checkout flow (called from SDK embed) | Wallet required |
| `/connect` | Wallet connect (wagmi + RainbowKit) | Public |
| `/api-keys` | Issue + revoke scoped API keys | Wallet required |
| `/audit/:txHash` | Public ERC-8004 receipt viewer (for link-sharing) | Public |

### `apps/mini` (Telegram Mini App)

Reduced surface; reuses components from `packages/ui`.

| Route | Purpose | Auth |
|---|---|---|
| `/` | Dashboard (collapses to onboarding if first time) | Privy session |
| `/agent` | Agent management | Privy session |
| `/merchants` | Merchant directory | Privy session |
| `/checkout/:orderId` | Checkout flow | Privy session |
| `/onboarding` | First-time Privy email/social → embedded EVM wallet | Public |

NO landing page in the Mini App (TG users arrive via deep-link or in-bot button).

---

## Demo shape rule

The exact 90-second live demo flow on Demo Day (Jul 2-3) drives every UI decision:

1. **Stage 1 (0-10s):** Judge sees a Patron-powered storefront — clearly a real merchant (Threads by Mara), $75 product. Cursor moves to "**Pay with Patron**" button. **Visual:** premium fashion landing, large product card, button is the visually-prominent CTA in the Patron brand color.

2. **Stage 2 (10-25s):** Modal opens. Shows yield + borrow math in plain language. Big confirm button. **Visual:** clean modal, math is visible in one glance, fee comparison vs Klarna in a small line below the confirm button.

3. **Stage 3 (25-50s):** Mantlescan side-panel shows live tx confirmations. Dashboard updates in real time. **Visual:** dashboard's "Recent Activity" feed gets a new entry with the action type + reputation +1 indicator + receipt link.

4. **Stage 4 (50-70s):** Judge sees the dashboard's permission summary at the top (plain English) and the prominent Emergency Freeze button. Clicks Freeze. Dashboard immediately shows frozen state (lock icon + grey overlay on agent capabilities). **Visual:** Freeze is unambiguous; freeze action is < 1 second visible to the judge.

5. **Stage 5 (70-90s):** Judge unfreezes. Clicks the ERC-8004 receipt link. New tab opens to `/audit/:txHash` showing the on-chain audit trail. **Visual:** clean receipt page with agent identity, action type, parameters, reputation delta, link to Mantlescan.

Every UI component is designed for this flow. Anything that doesn't serve the 90-second demo is dropped or pushed to v2.

---

## Component library

Components live in `packages/ui` for reuse between web + mini. Each component:
- Is a single file under 400 lines
- Has a Storybook story (Vitest + browser mode for component tests)
- Uses Tailwind v4 with the design tokens above
- Has TypeScript props typed via Zod schema for runtime + compile-time safety

| Component | Purpose | Used in |
|---|---|---|
| `<PatronButton>` | Primary CTA — used on landing, dashboard, checkout, merchant pages | All surfaces |
| `<EmergencyFreezeButton>` | Big red one-tap freeze. Spring animation on press. | Dashboard, /app/agent |
| `<PermissionSummary>` | Plain-language session-key summary | Dashboard, /app/agent |
| `<PositionCard>` | Live yield-vs-interest ticker + paydown progress | Dashboard |
| `<ActivityFeed>` | Time-ordered list with sub-agent tree expansion | Dashboard |
| `<MerchantCard>` | For directory + favorites | /app/merchants, /m/:slug |
| `<ReputationBadge>` | Shows ERC-8004 reputation score with hover detail | Merchant pages, agent management |
| `<CheckoutModal>` | Yield math + confirm step | Embedded by SDK in merchant sites |
| `<AuditReceiptViewer>` | Renders an ERC-8004 receipt with all fields + Mantlescan link | /audit/:txHash |
| `<YieldTicker>` | Live-incrementing yield display | Position cards |

---

## Banned Tailwind classes / patterns

Project-specific no-go list (in addition to architecture.md banned patterns):

- ❌ `bg-gradient-to-r from-blue-500 to-purple-500` and its cousins — no default gradients
- ❌ `font-sans` alone — always pair Fraunces serif with Inter sans
- ❌ `text-blue-600` literal — use `text-[--accent]` via CSS variable
- ❌ `shadow-2xl` — too heavy; use `shadow-md` or design token `--shadow-soft`
- ❌ `transition-all` — specify properties (`transition-[transform,opacity]` etc.)
- ❌ `divide-y` on long lists — use explicit border-bottom for clarity
- ❌ `text-xs` for important info — `text-sm` minimum for legibility
- ❌ Glassmorphism (`backdrop-blur-xl` + low alpha bg) — outdated 2026 aesthetic
- ❌ Generic shadcn purple (`#7c3aed` and adjacent) — use our `--accent` deep indigo

---

## Telegram Mini App specifics

- Use `@twa-dev/sdk` for: BackButton, MainButton, theme adaptation (light/dark), viewport sizing, haptic feedback
- Use `Telegram.WebApp.MainButton` for primary CTAs at the bottom of the viewport (TG convention)
- Use `Telegram.WebApp.BackButton` for nav back instead of an in-app back button
- Theme: respect TG's user theme (light/dark) via `Telegram.WebApp.colorScheme`
- Onboarding: Privy social/email → embedded EVM wallet inside the TG WebView (no WalletConnect)
- Payment fallback: if Privy embedded wallet fails, deep-link to web app with the same checkout intent token

---

## Accessibility minimum

- All interactive elements have visible focus ring (Tailwind `focus-visible:ring-2 ring-[--accent]`)
- Color contrast meets WCAG AA (`fg` on `bg` is 16:1, `fg-muted` on `bg` is 4.5:1)
- All form inputs have `<label>` associations
- All icons in buttons have `aria-label` or visible text
- Keyboard navigation works on every page (Tab + Enter + Escape)
- Touch targets ≥ 44×44px on mobile
- Reduced-motion users get instant transitions (`prefers-reduced-motion: reduce`)

---

## Responsive breakpoints

- Mobile: 320 – 767px (TG Mini App primary)
- Tablet: 768 – 1023px
- Desktop: 1024px+
- Wide: 1440px+ (max-width container at 1280px)

Mini App: design mobile-first; assume 360-450px width primary.
