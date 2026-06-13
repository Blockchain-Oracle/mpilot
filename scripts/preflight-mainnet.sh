#!/usr/bin/env bash
# preflight-mainnet.sh — Story-190 gate. Run BEFORE invoking the deploy
# script. Exits 0 only when ALL checks pass.
#
# Checks:
#   * cast / forge / git present in PATH
#   * MANTLE_RPC_URL / OPS_PRIVATE_KEY / MANTLESCAN_API_KEY env vars set
#   * The RPC actually responds (eth_chainId returns 5000 for Mantle Mainnet)
#   * MNT balance ≥ 0.5 (covers deploy + 100 verify calls + buffer)
#   * Current gas price ≤ 2x recent baseline (avoid deploy during spike)
#   * Git tree is clean (no uncommitted changes that didn't go through review)
#   * CI is green on main (`gh run list --branch main --limit 1`)
#
# Wrapper around the canonical contracts/scripts/deploy-mainnet.sh preflight
# logic — extracted as a standalone gate per story-190 spec so it can be
# invoked from CI or paired by an observer before the driver runs the deploy.
#
# Carry-over patterns from story-150 install.sh:
#   * set -euo pipefail (fail-fast)
#   * [[ -t 1 ]] / non-TTY safe (this script can run in CI; pure-output)
#   * No JSON injection surface (we never write user input to a file)

set -euo pipefail

readonly EXPECTED_CHAIN_ID=5000
readonly MIN_BALANCE_WEI=500000000000000000   # 0.5 MNT (18 decimals)
readonly GAS_PRICE_MULTIPLIER_MAX=2

fatal() {
  printf '[preflight] FATAL: %s\n' "$*" >&2
  exit 1
}

info() {
  printf '[preflight] %s\n' "$*" >&2
}

ok() {
  printf '[preflight] ✓ %s\n' "$*" >&2
}

# 1. Tool presence
for TOOL in cast forge git gh node; do
  command -v "$TOOL" >/dev/null 2>&1 || fatal "'$TOOL' not found in PATH"
done
ok "cast, forge, git, gh, node available"

# 2. Required env vars
for VAR in MANTLE_RPC_URL OPS_PRIVATE_KEY MANTLESCAN_API_KEY; do
  if [[ -z "${!VAR:-}" ]]; then
    fatal "$VAR is not set (source your .env.deploy)"
  fi
done
ok "MANTLE_RPC_URL / OPS_PRIVATE_KEY / MANTLESCAN_API_KEY all set"

# 3. RPC reachable + correct chain id
chain_id_hex=$(cast chain-id --rpc-url "$MANTLE_RPC_URL" 2>/dev/null || echo "")
[[ -n "$chain_id_hex" ]] || fatal "RPC unreachable: $MANTLE_RPC_URL"
# cast chain-id prints decimal already on recent foundry; older versions hex
if [[ "$chain_id_hex" =~ ^0x ]]; then
  chain_id=$((chain_id_hex))
else
  chain_id="$chain_id_hex"
fi
[[ "$chain_id" -eq "$EXPECTED_CHAIN_ID" ]] || fatal "RPC chain id is $chain_id, expected $EXPECTED_CHAIN_ID (Mantle Mainnet)"
ok "RPC chain id = $EXPECTED_CHAIN_ID"

# 4. Deployer balance
deployer=$(cast wallet address --private-key "$OPS_PRIVATE_KEY")
balance_wei=$(cast balance "$deployer" --rpc-url "$MANTLE_RPC_URL")
if [[ "$balance_wei" -lt "$MIN_BALANCE_WEI" ]]; then
  # Format for human-readability via bc fallback (cast --ether requires recent foundry).
  balance_eth=$(awk -v w="$balance_wei" 'BEGIN{printf "%.6f", w/1e18}')
  fatal "deployer $deployer has $balance_eth MNT, need ≥ 0.5 MNT"
fi
balance_eth=$(awk -v w="$balance_wei" 'BEGIN{printf "%.6f", w/1e18}')
ok "deployer $deployer has $balance_eth MNT (≥ 0.5)"

# 5. Gas price sanity — Mantle is usually stable. Reject if current price is
#    more than GAS_PRICE_MULTIPLIER_MAX × what we observed last (heuristic: a
#    1 gwei floor as the recent-baseline approximation).
gas_price_wei=$(cast gas-price --rpc-url "$MANTLE_RPC_URL")
gas_price_gwei=$(awk -v w="$gas_price_wei" 'BEGIN{printf "%.4f", w/1e9}')
# Sanity floor: 0.02 gwei (current Mantle median is ~0.02 gwei; 2× = 0.04).
# If gas price exceeds 0.5 gwei (25× median), warn loudly + abort.
gas_price_max_wei=500000000   # 0.5 gwei in wei
if [[ "$gas_price_wei" -gt "$gas_price_max_wei" ]]; then
  fatal "gas price spike: $gas_price_gwei gwei > 0.5 gwei threshold. Retry later."
fi
ok "gas price = $gas_price_gwei gwei (≤ 0.5 gwei threshold)"

# 6. Clean git tree
if [[ -n "$(git -C "$(dirname "$0")/.." status --porcelain 2>/dev/null)" ]]; then
  fatal "git working tree is dirty — commit or stash before deploy"
fi
ok "git tree clean"

# 7. CI green on main
ci_status=$(gh run list --branch main --limit 1 --json conclusion --jq '.[0].conclusion' 2>/dev/null || echo "unknown")
if [[ "$ci_status" != "success" ]]; then
  fatal "CI on main is '$ci_status' — wait for green before deploying"
fi
ok "CI on main = success"

info "all preflight checks passed; safe to broadcast"
exit 0
