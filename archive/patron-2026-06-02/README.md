# Archive: Patron (YieldBNPL wedge) — 2026-06-02

**Status:** PAUSED 2026-06-03 — wedge abandoned after sUSDe yield compression made the carry-trade pitch fragile + Aave V3 missing on Mantle Sepolia killed clean testnet UX.

**Current direction:** Concierge — autonomous DeFi agent on Mantle (Giza-shape architecture). See `workspace/candidates/2026-06-03-concierge-architecture.md` for the new wedge brief.

## Contents

- `docs/` — Full Patron spec set: PRD.md, architecture.md, epics.md, ux-spec.md, sprint-status.yaml, 97 story files, superpowers/specs/2026-06-02-patron-design.md
- `audit/` — 4 audit reports from 2026-06-03 audit pass + bulk-regen report

## Why kept (not deleted)

The Patron spec demonstrates a complete BMad-style spec artifact set as a template reference. The Mantle on-chain verification work (ERC-8004 addresses, Aave V3 Pool, sUSDe, USDC) transfers directly to Concierge — those facts are still true. The Sepolia mock-deploy pattern from Patron is reusable for Concierge's testnet playground.

## What changed

- Wedge: spend-without-selling (BNPL) → autonomous multi-tool DeFi agent (Concierge)
- Track 6 qualification: was via Byreal Skills CLI (turned out to be Solana-only) → now via RealClaw skill packaging
- Architecture: contracts-first → agent-runtime-first with SDK + MCP server + web app + RealClaw skill (4 surfaces)
