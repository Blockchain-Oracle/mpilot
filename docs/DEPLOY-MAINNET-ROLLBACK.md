# Mainnet Rollback Procedure

What to do when something goes wrong AFTER the broadcast. Read this BEFORE
the deploy (per [`DEPLOY-MAINNET-PRECHECK.md`](./DEPLOY-MAINNET-PRECHECK.md)).

## Triage decision tree

```
Did the deploy script crash mid-broadcast?
├── YES → "Partial deploy" — see § Partial-deploy recovery.
└── NO  → Did post-deploy verification fail?
         ├── YES (postdeploy-verify-mainnet.sh exit ≠ 0) → see § Logic upgrade.
         └── NO  → Did smoke / integration tests fail after publish?
                  ├── YES → see § Logic upgrade.
                  └── NO  → No rollback needed. Continue with Phase 6 of the runbook.
```

The two main classes of rollback are **partial-deploy recovery** (broadcast
crashed before all txs went through) and **logic upgrade** (deploy succeeded
but a bug was found post-deploy). The third class — **full redeploy** — is
the last resort when the proxy itself is broken.

## Partial-deploy recovery

If `forge script ... --broadcast` crashed in the middle, some contracts may
be deployed and others not. DO NOT re-run the script blindly — it would
re-deploy the contracts that already shipped, leading to duplicate
addresses.

1. **Open the broadcast log.** Located at
   `contracts/broadcast/DeployAll.s.sol/5000/run-latest.json`.
2. **List successful txs.** Each entry has a `hash` and `contractAddress`.
   Cross-reference with `cast code <address> --rpc-url $MANTLE_RPC_URL` to
   confirm each address has bytecode.
3. **Compute the missing txs.** Compare the expected deploy set
   (ConciergeRegistry impl + ConciergeRegistryProxy) against what shipped.
4. **Hand-resume.** Use `forge create` (NOT `forge script`) to deploy each
   missing contract individually with the constructor args from the
   original script:
   ```bash
   cd contracts
   forge create src/ConciergeRegistry.sol:ConciergeRegistry \
     --rpc-url "$MANTLE_RPC_URL" \
     --private-key "$OPS_PRIVATE_KEY" \
     --verify --verifier-url 'https://api.mantlescan.xyz/api' \
     --etherscan-api-key "$MANTLESCAN_API_KEY"
   ```
5. **Document.** Write a post-mortem in `docs/deployments/<date>-partial.md`
   noting which txs from the original log shipped, which were hand-resumed,
   and why the script crashed (gas spike, RPC error, sigint).
6. **Continue with Phase 3** of the runbook (post-deploy verification).

## Logic upgrade (preferred for impl bugs)

`ConciergeRegistry` is a UUPS proxy. The implementation contract can be
swapped in-place without changing the proxy address.

1. **Author the fix.** Patch `contracts/src/ConciergeRegistry.sol`.
2. **Test.** Run `cd contracts && forge test` — the unit + invariant tests
   must pass.
3. **Deploy the new implementation** (without touching the proxy):
   ```bash
   cd contracts
   forge create src/ConciergeRegistry.sol:ConciergeRegistry \
     --rpc-url "$MANTLE_RPC_URL" \
     --private-key "$OPS_PRIVATE_KEY" \
     --verify --verifier-url 'https://api.mantlescan.xyz/api' \
     --etherscan-api-key "$MANTLESCAN_API_KEY"
   # Capture: NEW_IMPL=0x...
   ```
4. **Call `upgradeToAndCall` on the proxy.** The caller MUST hold
   `DEFAULT_ADMIN_ROLE` (the OPS multisig):
   ```bash
   PROXY=$(grep -A1 conciergeRegistry packages/shared/src/addresses.ts | grep -oE '0x[0-9a-fA-F]{40}')
   cast send "$PROXY" 'upgradeToAndCall(address,bytes)' "$NEW_IMPL" 0x \
     --rpc-url "$MANTLE_RPC_URL" --private-key "$OPS_PRIVATE_KEY"
   ```
5. **Verify the swap.**
   ```bash
   # ERC-1967 implementation slot
   cast storage "$PROXY" 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc \
     --rpc-url "$MANTLE_RPC_URL"
   # Should show NEW_IMPL right-padded.
   ```
6. **Re-run post-deploy verification.**
   ```bash
   bash scripts/postdeploy-verify-mainnet.sh
   ```
7. **Document** in `docs/deployments/<date>-upgrade.md`. Reference the
   original deploy log + the upgrade tx hash.

The proxy address does NOT change — `packages/shared/src/addresses.ts`
needs no update.

## Session-key revocation (security incident)

If a deployed session key is suspected compromised:

1. **Identify the agent + key.** From the ConciergeRegistry events:
   ```bash
   cast logs --rpc-url "$MANTLE_RPC_URL" \
     --address "$PROXY" \
     --from-block <recent> \
     'SessionKeyIssued(address,address,uint256)'
   ```
2. **Revoke on-chain.** The OPS admin can revoke any agent's key:
   ```bash
   cast send "$PROXY" 'revokeSessionKey(address)' "$KEY" \
     --rpc-url "$MANTLE_RPC_URL" --private-key "$OPS_PRIVATE_KEY"
   ```
3. **Confirm.** Subsequent `cast call $PROXY 'isSessionKeyActive(address)'
   $KEY` returns `false`.
4. **Notify** the affected user via the comms channel they configured at
   skill install.

## Full redeploy (last resort)

ONLY if the proxy itself is broken (storage corruption, irrecoverable
admin loss).

1. **Pause the broken proxy** if possible (`pause()` requires
   `DEFAULT_ADMIN_ROLE`). If the admin is also lost, jump to step 3.
2. **Run the deploy script** at a fresh address:
   ```bash
   bash contracts/scripts/deploy-mainnet.sh
   # Capture the new proxy address.
   ```
3. **Update `packages/shared/src/addresses.ts`** with the new proxy
   address.
4. **Mark the old proxy as DEPRECATED** in
   `docs/deployments/<date>-deprecated.md` AND in the README's
   "Live addresses" section.
5. **Notify integration partners.** Anyone reading the old address from
   `@concierge/shared` BEFORE the version bump is now hitting a dead
   address.

## Escalation

When to escalate to Mantle support (`#partners` Discord or
`partnerships@mantle.xyz`):

- RPC endpoint serving stale data (`eth_blockNumber` lags the real chain).
- Mantlescan repeatedly rejects valid source verification.
- An EVM-level discrepancy (gas accounting, opcode behavior) that
  reproduces on Mantle but not on a forked node.

For purely contract-level bugs (logic, storage, access control), the
fix-and-upgrade procedure above is the standard path; do not pull Mantle
support in unless the chain itself is misbehaving.

## After ANY rollback

Within 24 hours:

1. Write a post-mortem under `docs/deployments/<date>-postmortem.md`.
2. Open a PR adding regression tests for the failure class.
3. Update this runbook + checklist if a new failure mode emerged.
