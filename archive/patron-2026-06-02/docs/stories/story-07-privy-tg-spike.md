# Story 07 — Privy + Telegram Mini App EVM spike (gate story before Epic 5)

**Epic:** Epic 0 — Foundation (gating addition)
**Estimated:** ~2h
**Depends on:** story-00-monorepo-scaffold, story-06-env-and-secrets-setup
**Blocks:** story-82 (privy-embedded-wallet) and the entire Epic 5

> **Why this story exists** (added 2026-06-03 via AUDIT-4): the GitHub sanity check found **zero public 2026 repos** doing `Privy + Telegram WebView + EVM wallet`. We are off-map. ADR-008 picked Privy on the assumption it works in TG WebView, but the assumption needs a live spike before Epic 5's 9 stories burn time on a stack that might not work. Better to find out in 2h than in Day 9.

## BDD Acceptance Criteria

```
Given a minimal Next.js 15 app (apps/mini scaffolded earlier) running inside a real Telegram Mini App context via the @twa-dev/sdk debug mode
When a user opens the app via `https://t.me/<TestBot>/app?startapp=test`
Then Privy SDK initializes inside the Telegram WebView
And a "Sign in with email" flow completes end-to-end
And an embedded EVM wallet is provisioned and the user's Mantle Sepolia address is shown on screen

Given the spike app shows the wallet address
When the user signs a test message via Privy's signMessage API inside TG WebView
Then the signature is returned and verifies against the address (using viem's verifyMessage)
And the test passes (Playwright with TG WebView UA + custom viewport)

Given the spike app needs to call a Mantle Sepolia contract
When the user invokes a test write (e.g. `MockCounter.increment()` deployed for this spike)
Then the tx broadcasts via Privy's wallet client
And the resulting tx hash is shown
And mantlescan confirms within 30s

Given the Privy-in-TG path fails for any reason during the spike
When the spike completes
Then `docs/spikes/07-privy-tg-result.md` documents EITHER (a) WORKS — with screenshots + a verified handshake, OR (b) FAILS — with the specific failure mode and the fallback recommendation below activated
And if FAILS: ADR-008 is amended to fall back to "deep-link from Mini App to web app for wallet operations; Privy used only as a metadata provider"
```

## File modification map

- `apps/mini/spike/page.tsx` — NEW — minimal Next.js page with Privy `PrivyProvider`, `useLoginWithEmail`, `useEmbeddedWallet`, signMessage button, contract-write button
- `apps/mini/spike/MockCounter.sol` — NEW — trivial Solidity contract for the write test (deploy via story-21 helper or `forge create` ad-hoc)
- `apps/mini/spike/playwright.tg-webview.spec.ts` — NEW — Playwright spec with Telegram WebView User-Agent + 360×640 viewport
- `apps/mini/spike/README.md` — NEW — manual test instructions (how to wire @BotFather to point to the spike URL)
- `docs/spikes/07-privy-tg-result.md` — NEW — result document with WORKS/FAILS verdict, screenshots, decisions
- `docs/architecture.md` (ADR-008) — UPDATE (conditional) — if spike FAILS, amend ADR-008 to record the fallback (deep-link from Mini App to web for wallet ops)

## Shell verification

```bash
# Spike app builds and runs
cd apps/mini
pnpm build
test $? -eq 0
pnpm vitest run spike/
test $? -eq 0

# Playwright spec exists and runs (manual UA simulation)
pnpm playwright test spike/playwright.tg-webview.spec.ts
test $? -eq 0

# Result document exists
test -f ../../docs/spikes/07-privy-tg-result.md
grep -E "VERDICT:\s*(WORKS|FAILS)" ../../docs/spikes/07-privy-tg-result.md

# If verdict is FAILS, ADR-008 must have a "Fallback path" subsection
if grep -q "VERDICT:\s*FAILS" ../../docs/spikes/07-privy-tg-result.md; then
  grep -A 5 "ADR-008" ../../docs/architecture.md | grep -q "Fallback path"
fi
```

## Notes

- This story is a **spike**, not a production ship. The goal is verifying ADR-008's load-bearing assumption (Privy works in TG WebView) before Epic 5 commits to it.
- Real TG WebView testing requires either: (a) a real Telegram bot pointed at a public URL (use ngrok during dev), or (b) Playwright with a custom User-Agent matching TG WebView (`Mozilla/5.0 (...) TelegramBot/...`) — both are documented in `apps/mini/spike/README.md`.
- Privy's TG support is documented at https://docs.privy.io/guide/react/mini-apps/telegram — coding agent should `mcp__plugin_context7_context7__query-docs` for the latest before starting.
- If the spike fails, the entire Epic 5 (stories 80-88) must be re-scoped: the Mini App becomes a thin shell that deep-links to the web app for any wallet operation. Update sprint-status.yaml to reflect this.
- ALSO ACCEPTABLE outcome: Privy works but with caveats (e.g., needs a one-time browser tab open for OAuth). Document these caveats in the result doc; Epic 5 stories will need to accommodate.
- Story budget is 2h — do not let this expand. If 2h passes without a verdict, declare PARTIAL and document what's known. Better an incomplete spike than no spike.
- File MUST stay under 400 LOC each.
