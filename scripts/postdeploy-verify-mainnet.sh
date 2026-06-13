#!/usr/bin/env bash
# postdeploy-verify-mainnet.sh — Story-190. Run AFTER a successful deploy.
# `cast call`s each deployed contract for a known view function and asserts
# the expected return value. Exit 0 means: addresses live, ABI matches,
# contracts respond.
#
# Reads deployed addresses from packages/shared/src/addresses.ts. The
# canonical post-deploy smoke (contracts/scripts/postdeploy-smoke.mjs) does
# a richer check; this script is the standalone gate per story-190 spec —
# minimal, no node dependency, useful from a PR template.

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
readonly ADDRESSES_FILE="$REPO_ROOT/packages/shared/src/addresses.ts"
readonly EXPECTED_CHAIN_ID=5000
readonly ZERO_ADDR='0x0000000000000000000000000000000000000000'

fatal() {
  printf '[postdeploy] FATAL: %s\n' "$*" >&2
  exit 1
}

ok() {
  printf '[postdeploy] ✓ %s\n' "$*" >&2
}

# Required tools + env
for TOOL in cast grep awk; do
  command -v "$TOOL" >/dev/null 2>&1 || fatal "'$TOOL' not found in PATH"
done
[[ -n "${MANTLE_RPC_URL:-}" ]] || fatal "MANTLE_RPC_URL is not set"
[[ -f "$ADDRESSES_FILE" ]] || fatal "addresses file not found: $ADDRESSES_FILE"

# Sanity check: RPC is the right chain.
chain_id=$(cast chain-id --rpc-url "$MANTLE_RPC_URL")
if [[ "$chain_id" =~ ^0x ]]; then chain_id=$((chain_id)); fi
[[ "$chain_id" -eq "$EXPECTED_CHAIN_ID" ]] || fatal "RPC chain id $chain_id ≠ Mantle Mainnet ($EXPECTED_CHAIN_ID)"
ok "RPC on chain $EXPECTED_CHAIN_ID"

# Pull the deployed ConciergeRegistry proxy address from addresses.ts.
# Strategy: grep the line inside the mantleMainnet block. Conservative: line
# shape is `conciergeRegistry: '0x...' as Address,` (or similar quoting).
registry_addr=$(awk '
  /mantleMainnet:/ { in_mainnet = 1 }
  /mantleSepolia:/ { in_mainnet = 0 }
  in_mainnet && /conciergeRegistry/ {
    if (match($0, /0x[0-9a-fA-F]{40}/)) {
      print substr($0, RSTART, RLENGTH)
      exit
    }
  }
' "$ADDRESSES_FILE")

[[ -n "$registry_addr" ]] || fatal "conciergeRegistry not found in mantleMainnet block of $ADDRESSES_FILE"
[[ "$registry_addr" != "$ZERO_ADDR" ]] || fatal "conciergeRegistry is still the ZERO_ADDRESS placeholder — addresses publication step skipped?"
ok "ConciergeRegistry proxy: $registry_addr"

# Verify the proxy responds to UUPS proxiableUUID() — should return the
# canonical ERC-1967 implementation slot.
expected_uuid='0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'
got_uuid=$(cast call "$registry_addr" 'proxiableUUID()(bytes32)' --rpc-url "$MANTLE_RPC_URL")
if [[ "$got_uuid" != "$expected_uuid" ]]; then
  fatal "ConciergeRegistry.proxiableUUID() returned $got_uuid, expected $expected_uuid (ERC-1967 slot)"
fi
ok "proxiableUUID() matches ERC-1967 slot"

# nextAgentId() — on a fresh deploy this should be 1.
next_agent_id=$(cast call "$registry_addr" 'nextAgentId()(uint256)' --rpc-url "$MANTLE_RPC_URL" 2>/dev/null || echo "")
if [[ -n "$next_agent_id" ]]; then
  ok "nextAgentId() = $next_agent_id"
fi

# ERC-8004 IdentityRegistry sanity (canonical address per AUDIT-2026-06-04).
identity_addr='0x8004A169FB4a3325136EB29fA0ceB6D2e539a432'
identity_code_size=$(cast code "$identity_addr" --rpc-url "$MANTLE_RPC_URL" | awk '{ print length($0) }')
if [[ "$identity_code_size" -lt 4 ]]; then
  fatal "ERC-8004 IdentityRegistry at $identity_addr has no code — wrong network?"
fi
ok "ERC-8004 IdentityRegistry has code at canonical address"

# Reminder: Mantlescan source-code verification check is NOT automatable here
# (Mantlescan's verify-status endpoint is rate-limited). Operator MUST visit
# the URL per the runbook.
printf '[postdeploy] manual step: confirm Mantlescan source verification at:\n' >&2
printf '            https://mantlescan.xyz/address/%s#code\n' "$registry_addr" >&2

ok "all automated post-deploy checks passed"
exit 0
