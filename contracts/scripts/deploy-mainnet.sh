#!/usr/bin/env bash
# deploy-mainnet.sh — Interactive Mantle Mainnet deploy wrapper for DeployAll.s.sol.
#
# Steps:
#   1. Pre-flight: env vars, cast/forge/node/gh present, MNT balance ≥ 0.3, clean git tree, CI green
#   2. Summary printout (irreversibility warning)
#   3. Exact-string confirmation: type DEPLOY-MAINNET (not y/N — fat-finger-safe)
#   4. forge script broadcast + inline Mantlescan verification
#   5. write-addresses.mjs --network mainnet
#   6. postdeploy-smoke.mjs
#   7. Next-steps reminder
#
# Required env vars: MANTLE_RPC_URL, OPS_PRIVATE_KEY, MANTLESCAN_API_KEY
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$CONTRACTS_DIR/.." && pwd)"

# --- Tool presence ---

for TOOL in cast forge node gh git; do
  if ! command -v "$TOOL" &>/dev/null; then
    echo "ERROR: '$TOOL' not found in PATH — install it first." >&2
    exit 1
  fi
done

# --- Required env vars ---

for VAR in MANTLE_RPC_URL OPS_PRIVATE_KEY MANTLESCAN_API_KEY; do
  if [[ -z "${!VAR:-}" ]]; then
    echo "ERROR: $VAR is not set. Export it before running this script." >&2
    exit 1
  fi
done

# --- Derive deployer address ---

DEPLOYER=$(cast wallet address --private-key "$OPS_PRIVATE_KEY" 2>/dev/null) || {
  echo "ERROR: Cannot derive deployer address — is OPS_PRIVATE_KEY a valid hex private key?" >&2
  exit 1
}
echo "Deployer: $DEPLOYER"

# --- MNT balance check (≥ 0.3 MNT required) ---

BALANCE_WEI=$(cast balance "$DEPLOYER" --rpc-url "$MANTLE_RPC_URL" 2>/dev/null) || {
  echo "ERROR: Cannot fetch balance — check MANTLE_RPC_URL ($MANTLE_RPC_URL)" >&2
  exit 1
}
REQUIRED_WEI=300000000000000000 # 0.3 MNT in wei
if (( BALANCE_WEI < REQUIRED_WEI )); then
  echo "ERROR: Insufficient MNT for deploy (need ≥ 0.3 MNT [${REQUIRED_WEI} wei], have ${BALANCE_WEI} wei)" >&2
  exit 1
fi
echo "Balance OK: ${BALANCE_WEI} wei"

# --- Clean git tree ---

if [[ -n "$(git -C "$REPO_ROOT" status --porcelain 2>/dev/null)" ]]; then
  echo "ERROR: Uncommitted changes — commit or stash first" >&2
  exit 1
fi

# --- CI green check (most recent run on main) ---

CI_CONCLUSION=$(gh run list \
  --repo Blockchain-Oracle/concierge \
  --branch main \
  --limit 1 \
  --json conclusion \
  --jq '.[0].conclusion' 2>/dev/null || echo "unknown")

if [[ "$CI_CONCLUSION" != "success" ]]; then
  echo "WARNING: Most recent CI run on main is '${CI_CONCLUSION}' — not green." >&2
  read -rp "CI is not green. Type YES to continue anyway (or anything else to abort): " ci_confirm
  if [[ "$ci_confirm" != "YES" ]]; then
    echo "Aborted." >&2
    exit 1
  fi
fi

# --- Summary ---

echo ""
echo "========================================================================"
echo "  CONCIERGE — MANTLE MAINNET DEPLOY (chain 5000)"
echo "========================================================================"
echo "  Deployer  : $DEPLOYER"
echo "  RPC       : $MANTLE_RPC_URL"
echo "  Balance   : $BALANCE_WEI wei"
echo ""
echo "  ⚠  Real \$MNT will be spent on this deploy."
echo "  ⚠  Mainnet contracts CANNOT be undeployed once broadcast."
echo "  ⚠  Verify this is the correct private key and RPC endpoint."
echo "========================================================================"
echo ""

# --- Exact-string confirmation gate ---
# y/N is fat-finger-able; pasting code or scripts might accidentally type 'y'.
# DEPLOY-MAINNET requires deliberate, unambiguous intent.

read -rp "Type DEPLOY-MAINNET to continue (anything else aborts): " confirmation
if [[ "$confirmation" != "DEPLOY-MAINNET" ]]; then
  echo "Aborted — confirmation string did not match 'DEPLOY-MAINNET'." >&2
  exit 1
fi

# --- Step 1: Broadcast ---

echo ""
echo "[1/4] Broadcasting DeployAll.s.sol to Mantle Mainnet..."
cd "$CONTRACTS_DIR"
forge script script/DeployAll.s.sol \
  --rpc-url "$MANTLE_RPC_URL" \
  --broadcast \
  --verify \
  --verifier-url "https://api.mantlescan.xyz/api" \
  --etherscan-api-key "$MANTLESCAN_API_KEY"

# --- Step 2: Write addresses ---

echo ""
echo "[2/4] Writing deployed addresses to packages/shared/src/addresses.ts..."
cd "$REPO_ROOT"
node contracts/scripts/write-addresses.mjs --network mainnet

# --- Step 3: Postdeploy smoke ---

echo ""
echo "[3/4] Running postdeploy smoke check..."
MANTLE_RPC_URL="$MANTLE_RPC_URL" node contracts/scripts/postdeploy-smoke.mjs

# --- Step 4: Next steps ---

echo ""
echo "[4/4] Deploy complete!"
echo ""
echo "Next steps:"
echo "  1. Commit the updated packages/shared/src/addresses.ts:"
echo "     git add packages/shared/src/addresses.ts"
echo "     git commit -m 'chore(addresses): populate mainnet conciergeRegistry post-deploy'"
echo "  2. Archive the broadcast artifact:"
echo "     cp contracts/broadcast/DeployAll.s.sol/5000/run-latest.json \\"
echo "        docs/deployments/$(date +%Y-%m-%d)-mainnet.json"
echo "  3. Deploy MCP server (story-194)"
echo "  4. Finalize README addresses table (story-200)"
