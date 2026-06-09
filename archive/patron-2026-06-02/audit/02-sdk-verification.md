# AUDIT-2: SDK + library verification (8 highest-risk claims)

**Date:** 2026-06-03
**Verdict:** PARTIAL — 2 FAIL, 1 PARTIAL, 5 VERIFIED. Two stack-version claims in architecture.md must be patched before scaffolding.

## Per-claim verification

| # | Claim | Verdict | Evidence | Patch needed |
|---|---|---|---|---|
| 1 | @anthropic-ai/sdk + claude-opus-4-7 | VERIFIED | `npm view @anthropic-ai/sdk` = 0.100.1 (current). docs.anthropic.com/en/docs/about-claude/models lists `claude-opus-4-7` (also 4-6, 4-8). SDK README example shows `messages.create({model})` pattern; tool use is supported via standard `tools` param on messages API. | None |
| 2 | Privy SDK in TG WebView | VERIFIED | `@privy-io/react-auth@3.28.0`. Privy sitemap.xml has `/authentication/user-authentication/login-methods/telegram` + `/recipes/react/seamless-telegram` + `/recipes/telegram-bot`. llms-full.txt explicitly lists "Telegram Mini App, social login" as keywords on the Telegram login page. Native, first-party support. | None |
| 3 | @byreal-io/byreal-cli + JSON output | VERIFIED (minor flag-name diff) | `npm view @byreal-io/byreal-cli` = 0.3.6. README explicit: "All commands support `-o json` for structured output." Note: flag is `-o json` not `--json`. Architecture says "JSON-output mode" generically so OK, but story-level SPECs must use `-o json`. | Add note to ADR-005 / story spec: flag is `-o json`, not `--json`. |
| 4 | wagmi v2 chains 5000 + 5003 | PARTIAL | Mantle chain id=5000 + Mantle Sepolia id=5003 both present in viem definitions (verified via raw github file fetch of `wevm/viem/src/chains/definitions/mantle.ts` and `mantleSepoliaTestnet.ts`). HOWEVER: `wagmi` latest = **3.6.16**, `@wagmi/core` = **3.5.0**. wagmi v2 exists (v2.0.0 shipped in 2024) but the current default is v3. Spec says "wagmi v2 + RainbowKit latest" — wagmi has moved on. | Architecture.md row 20 + ADR-008: change "wagmi v2" → "wagmi v3 (latest)". Confirm RainbowKit peer-deps support wagmi v3 before locking. |
| 5 | Biome max-lines rule | FAIL | No `max_lines.rs` file in `crates/biome_js_analyze/src/lint/style/` or `nursery/` (404 on both paths). Biome currently has NO native max-lines rule (search of rules-sources page returned zero matches). ADR-007 + ADR-006 + epics 400-LOC enforcement all depend on this. | (a) ADR-007 already anticipates "fall back to ESLint for that rule only" — formalize the fallback NOW: ship `scripts/check-file-loc.mjs` (Node walker counting lines) and wire to pre-commit via Husky + lint-staged. (b) Remove the "Biome max-lines: 400" wording from ADR-007 — it implies a Biome rule that doesn't exist. |
| 6 | shadcn/ui + Tailwind v4 | VERIFIED | `npm view shadcn` = 4.10.0. `npm view tailwindcss` = 4.3.0. shadcn docs page `/docs/tailwind-v4` exists and references `@tailwindcss` / Tailwind v4 explicitly. Tailwind v4 is the current default in shadcn install flow as of 2026. | None |
| 7 | @twa-dev/sdk vs @telegram-apps/sdk | PARTIAL (lean alternative) | `@twa-dev/sdk@8.0.2` vs `@telegram-apps/sdk@3.11.8`. Both maintained. `@telegram-apps/sdk` is the official Telegram-org SDK (telegram-mini-apps.github.io ecosystem) and is the 2026 default in TG docs; `@twa-dev/sdk` is a community wrapper that pre-dates the official one and is in maintenance mode. Spec works either way but using `@telegram-apps/sdk` is the safer 2026 choice. | OPTIONAL: switch architecture row 68 + frontend section from `@twa-dev/sdk` → `@telegram-apps/sdk` (official). Not blocking — `@twa-dev/sdk` still works. |
| 8 | Foundry + Solidity 0.8.26 | VERIFIED | Solidity releases list confirms 0.8.26 exists; latest is 0.8.35 (Apr 2026). Foundry README references Solidity build/test as core feature with no version cap. Foundry tracks every solc release via `svm`. | None |

## High-risk findings (would break the build)

1. **FAIL — Biome max-lines rule does not exist.** Story-level 400-LOC enforcement is referenced in every story file ("split if >400 LOC") but the lint tool can't enforce it. Pre-commit will be a no-op for this constraint unless `scripts/check-file-loc.mjs` exists and is wired up. ADR-007 acknowledges this as a possibility but the fallback is not specified in the spec.

2. **PARTIAL — wagmi v2 is one major version stale.** wagmi shipped v3 (current 3.6.16). RainbowKit peer-deps must be re-checked: if RainbowKit latest still requires wagmi v2, the spec is fine, but if RainbowKit has shipped a wagmi-v3 compatible release we should use it. Either way, the literal string "wagmi v2" in architecture.md is misleading vs current npm reality.

3. **MINOR — byreal-cli JSON flag.** Spec says `--json` (generic), but actual CLI uses `-o json`. Stories that script this CLI need the correct flag or they'll error.

## Recommended spec patches

- **architecture.md row 20** ("wagmi v2 + RainbowKit latest"): change to **"wagmi v3 (latest) + RainbowKit (latest, verify wagmi-v3 compatible release)"**.
- **architecture.md row 68** ("@twa-dev/sdk"): consider switching to **"@telegram-apps/sdk (official Telegram SDK)"** — optional but recommended.
- **ADR-005**: append note **"CLI flag for JSON output is `-o json`, not `--json`."**
- **ADR-007**: replace "Biome with `max-lines: 400` rule" with **"Biome for lint+format. 400-LOC ceiling enforced via `scripts/check-file-loc.mjs` (Node script, run via Husky + lint-staged pre-commit). Biome does not ship a max-lines rule as of 2026."**
- **Add a tiny story** (e.g. story-04b) for `scripts/check-file-loc.mjs` + pre-commit wiring — currently no story owns this and the constraint is invisible to the tool fleet.
