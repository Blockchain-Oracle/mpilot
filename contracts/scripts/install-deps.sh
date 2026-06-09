#!/usr/bin/env bash
# Install Foundry submodule dependencies for the Concierge contracts.
# Called by:
#   - Contributors after a fresh clone (`pnpm install` does NOT pull these)
#   - CI's `contracts` job (added in story-05-ci-contracts-pipeline)
#
# Pinned tags verified 2026-06-09 against each repo's latest stable release:
#   openzeppelin-contracts v5.6.1  (custom errors, transparent + UUPS proxy
#                                   upgrades, ERC-4337 helpers — used by
#                                   ConciergeRegistry in story-10+)
#   aave-v3-origin v3.6.0          (the canonical V3.6 repo; includes both
#                                   core + periphery. IAaveOracle lives here)
#   forge-std v1.16.1              (Test.t.sol, Script.s.sol, cheatcodes)
#
# NO third-party price-oracle library install per ADR-008. Mantle's
# external oracle coverage doesn't include sUSDe / USDC at the layer
# we'd need; we read prices via Aave V3's IAaveOracle (getAssetPrice
# (address)) which IS in aave-v3-origin/periphery (lib/aave-v3-origin/).

set -euo pipefail

cd "$(dirname "$0")/.." # always run from contracts/

# `forge install` defaults: shallow clone, --no-git (no submodule tracking
# inside the parent repo unless we're inside one). Pin each via --tag.

forge install \
  OpenZeppelin/openzeppelin-contracts@v5.6.1 \
  aave-dao/aave-v3-origin@v3.6.0 \
  foundry-rs/forge-std@v1.16.1 \
  --no-git \
  --shallow

echo "Foundry deps installed:"
ls -la lib/
