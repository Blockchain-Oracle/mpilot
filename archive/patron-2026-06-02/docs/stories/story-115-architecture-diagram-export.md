# Story 115 — Architecture diagram export (PNG + SVG visual asset for submission)

**Epic:** Epic 8 — Polish + Submit
**Estimated:** ~1.5h
**Depends on:** story-00-monorepo-scaffold

## BDD Acceptance Criteria

```
Given a source file at docs/architecture-diagram.excalidraw exists
When `npx @excalidraw/mermaid-to-excalidraw` or a manual export from excalidraw.com runs
Then it produces two artifacts:
  - docs/architecture-diagram.svg (vector, < 200 KB)
  - docs/architecture-diagram.png (raster, 1920x1080, < 500 KB)

Given a viewer opens either export
When they look at the diagram
Then it shows all 5 layers in the Patron stack:
  - User surfaces: apps/web (Next.js, wagmi+RainbowKit) + apps/mini (TG, Privy) + 3 demo merchants (with @patron/react and @patron/sdk-js embeds)
  - SDK layer: @patron/react + @patron/sdk-js (consumed by merchants)
  - Backend: apps/api (Hono + Postgres/Neon + Redis/Upstash + BullMQ scheduler + viem indexer) + Claude Agent SDK with 6 intent handlers + byreal-cli tool wrapper
  - On-chain: 4 Patron contracts (PatronVault, MerchantRegistry, ReputationProxy, AgentAuthorizer) → integrations with Aave V3 Mantle Pool, sUSDe, USDC, ERC-8004 Identity Registry, ERC-8004 Reputation Registry, Aave Oracle aggregator (per ADR-003 — single price source on Mantle; no direct Chainlink sUSDe/USD feed exists)
  - Mantle Network (chain id 5000 mainnet / 5003 sepolia)

Given annotations show data + transaction flow
When a viewer reads the labels
Then the demo flow is traceable on the diagram:
  - Step 1: merchant storefront → SDK → /orders/intent endpoint
  - Step 2: API → Agent decision engine → 4 on-chain calls (MerchantRegistry.checkReputation, PatronVault.openLoan, Aave borrow, ReputationProxy.logAction)
  - Step 3: API → user dashboard updates via SSE
  - Step 4: ERC-8004 receipt → /audit/:txHash public page

Given the diagram uses consistent visual language
When a viewer sees it
Then:
  - Each layer has a distinct color (consistent with PRD/ux-spec palette but not necessarily matching exactly — diagrams have their own clarity needs)
  - Arrows show direction (call vs response vs event emission distinguished)
  - External dependencies are visually flagged (different border or icon)
  - The Mantle "settlement layer" is highlighted at the bottom as the foundation

Given the README references the diagram
When `grep -q "architecture-diagram" README.md` runs
Then it returns 0 (the diagram is embedded in the README per story-114)

Given the diagram is committed
When file sizes are checked
Then PNG ≤ 500 KB, SVG ≤ 200 KB (so the repo stays clone-fast)
```

## File modification map

- `docs/architecture-diagram.excalidraw` — NEW — source file (editable in excalidraw.com or VS Code Excalidraw extension)
- `docs/architecture-diagram.svg` — NEW — vector export, embedded in README + DoraHacks
- `docs/architecture-diagram.png` — NEW — raster export, 1920x1080, used for X thread cards + social share
- `docs/architecture-diagram-dark.svg` — NEW (optional) — dark-mode variant for README dark-mode rendering
- `docs/architecture-diagram-source.md` — NEW — one-screen explainer: who edits this, how to regenerate, where the assets land, layer-by-layer narrative the diagram tells (so any team member can understand and modify it without re-onboarding)
- `scripts/check-diagram-freshness.sh` — NEW — bash check: if `architecture.md` mtime > diagram mtime, print a warning ("architecture has changed since the diagram was last exported — regenerate"). Non-fatal but loud.
- `README.md` — VERIFY (story-114 handles embed) — confirm relative-path `<img>` works on GitHub renderer
- `docs/.gitattributes` — UPDATE — mark *.png as binary (not LFS, since size < 500 KB)

## Shell verification

```bash
test -f docs/architecture-diagram.excalidraw
test -f docs/architecture-diagram.svg
test -f docs/architecture-diagram.png

# File sizes within bounds
wc -c docs/architecture-diagram.png | awk '{if ($1 > 512000) exit 1}'
wc -c docs/architecture-diagram.svg | awk '{if ($1 > 204800) exit 1}'

# PNG is exactly 1920x1080 (or close)
identify docs/architecture-diagram.png | grep -q "1920x1080" || echo "WARN: PNG not 1920x1080 — acceptable if aspect ratio is correct"

# SVG references all 4 contracts (text content check)
for c in PatronVault MerchantRegistry ReputationProxy AgentAuthorizer; do
  grep -q "$c" docs/architecture-diagram.svg || echo "WARN: $c not labeled in SVG (may be in PNG-only annotation; manually verify)"
done

# SVG mentions Mantle + Aave + ERC-8004 + Aave Oracle (per ADR-003 — no Chainlink labels in the diagram)
for word in "Mantle" "Aave" "ERC-8004" "sUSDe" "Claude" "Oracle"; do
  grep -qi "$word" docs/architecture-diagram.svg
done

# Freshness check
bash scripts/check-diagram-freshness.sh

# README references diagram
grep -q "architecture-diagram" README.md
```

## Notes

- **Diagrams beat prose for judges in a hurry.** A judge scanning a 12-tab PR review will spend more attention on a clear diagram than a 5-paragraph "what is this" section.
- **Excalidraw** is the recommended tool — hand-drawn aesthetic, lightweight, supports SVG export, no vendor lock-in. Alternative: Figma (export as SVG/PNG).
- **5 layers, top-to-bottom is the standard mental model:** user → SDK → backend → on-chain → chain itself. Stick to it.
- **The demo flow must be traceable on the diagram.** A judge who watched the video should be able to point at the diagram and say "this is where step 3 happens." Annotate the 4 critical calls explicitly.
- **External dependencies flagged.** Aave (V3 Pool + Oracle aggregator per ADR-003), ERC-8004 registries, byreal-cli, Anthropic API are all external — they should be visually distinct (dashed border or external-icon overlay) so judges see what's ours vs what's borrowed. Do NOT label "Chainlink" in the diagram — per AUDIT-1 there is no direct Chainlink sUSDe/USD feed on Mantle; the price-source box should read "Aave Oracle aggregator" instead.
- **No marketing fluff.** This is an architecture diagram, not a pitch slide. Boxes + arrows + labels. No hero shots. (The video is the pitch.)
- **Dark-mode variant is optional** — GitHub's README renders the SVG with `<img>`, which can use the `prefers-color-scheme` `<picture>` element to swap. Only worth doing if Abu uses GitHub dark mode himself (most judges will be on default light mode).
- **Don't redraw on every architecture.md edit.** Use the freshness script as a soft warning; only regenerate when the layer composition changes meaningfully.
- **File hosting:** committed to the repo at `docs/architecture-diagram.*` so it renders on GitHub, on any fork, and on DoraHacks (which fetches the README).
- **DoraHacks compatibility:** DoraHacks renders the README via GitHub raw URLs; relative paths work as long as the file exists in the default branch. Test by viewing the GH-rendered README from an incognito tab before submitting.
- File size: artifacts under bound; no LOC limit on binary assets but text artifacts < 400 LOC.
