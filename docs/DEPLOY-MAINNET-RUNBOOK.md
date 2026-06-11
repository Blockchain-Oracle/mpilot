# Deploy Mainnet Runbook — Concierge on Mantle Mainnet (chain 5000)

## Pre-flight

Complete all checks before running the deploy script.

### Environment
```bash
export MANTLE_RPC_URL="https://rpc.mantle.xyz"
export OPS_PRIVATE_KEY="0x<deployer-private-key>"
export MANTLESCAN_API_KEY="<your-mantlescan-api-key>"
```

### Checklist
- [ ] CI is green on `main` (`gh run list --branch main --limit 1`)
- [ ] Working tree is clean (`git status`)
- [ ] Deployer has ≥ 0.5 MNT (`cast balance $(cast wallet address --private-key $OPS_PRIVATE_KEY) --rpc-url $MANTLE_RPC_URL`)
- [ ] `contracts/script/DeployAll.s.sol` has been reviewed — the same script runs on Sepolia; ensure chainid guard is present (`block.chainid == 5000 || block.chainid == 5003`)
- [ ] `packages/shared/src/addresses.ts` has been reviewed — `mantleMainnet.conciergeRegistry` should be `ZERO_ADDRESS` (the slot `write-addresses.mjs` will populate)
- [ ] You are NOT on a VPN or behind a firewall that blocks `rpc.mantle.xyz`
- [ ] The deployer wallet is the intended OPS multisig signer (not a dev key)

---

## Deploy command

```bash
bash contracts/scripts/deploy-mainnet.sh
```

The script will:
1. Verify all env vars, tool presence, MNT balance, and clean git tree
2. Check CI status on `main`; prompt for explicit override if not green
3. Print a summary and require you to type `DEPLOY-MAINNET` exactly — not `y`, not `yes`
4. Broadcast `DeployAll.s.sol` to Mainnet with inline Mantlescan verification
5. Run `write-addresses.mjs --network mainnet` to update `packages/shared/src/addresses.ts`
6. Run `postdeploy-smoke.mjs` to verify the deploy on-chain

**The broadcast is irreversible. If you make a typo in the confirmation, the script aborts.**

---

## Post-deploy verification

After a successful run:

### Automated (done by the script)
- `postdeploy-smoke.mjs` asserts:
  - `ConciergeRegistry.nextAgentId() == 1` (fresh deploy, no agents registered)
  - `ConciergeRegistry.hasRole(DEFAULT_ADMIN_ROLE, deployer) == true`
  - `Aave Pool.ADDRESSES_PROVIDER()` returns `0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f`
  - `ERC-8004 IdentityRegistry.name() == "AgentIdentity"`

### Manual
1. Verify contract source on Mantlescan:
   `https://mantlescan.xyz/address/<ConciergeRegistryProxy>#code`
2. Confirm `packages/shared/src/addresses.ts` — `mantleMainnet.conciergeRegistry` now holds the proxy address (not `ZERO_ADDRESS`)
3. Run the full test suite to confirm the addresses lockbox is clean:
   ```bash
   pnpm run test
   ```
4. Archive the broadcast artifact:
   ```bash
   cp contracts/broadcast/DeployAll.s.sol/5000/run-latest.json \
      docs/deployments/$(date +%Y-%m-%d)-mainnet.json
   git add docs/deployments packages/shared/src/addresses.ts
   git commit -m "chore(addresses): populate mainnet conciergeRegistry post-deploy"
   ```

---

## Rollback strategy

Mainnet contracts are immutable once deployed. "Rollback" has two forms:

### Logic upgrade (preferred)
`ConciergeRegistry` is a UUPS proxy (story-10). To fix a logic bug:
1. Deploy a new `ConciergeRegistry` implementation contract
2. Call `upgradeToAndCall(newImpl, "")` on the proxy from `OPS_PRIVATE_KEY` (which holds `DEFAULT_ADMIN_ROLE`)
3. The proxy address stays the same; downstream consumers are unaffected
4. Update `LOGIC_IMPL` in the broadcast archive for audit traceability

### Full redeploy (last resort)
If the proxy itself is broken (e.g., storage layout corruption):
1. Run `deploy-mainnet.sh` again — it deploys a fresh proxy at a new address
2. Update `packages/shared/src/addresses.ts` with the new proxy address
3. Mark the old proxy as `DEPRECATED` in `README.md` and `docs/deployments/`
4. Notify any integration partners that the address has changed

### What NOT to do
- Do not call `selfdestruct` on the impl — the UUPS proxy points to it
- Do not abandon the old proxy silently — flag it as deprecated so users don't send funds

---

## Gas price guidance

Mantle uses EIP-1559. Live `forge script` dry-run against `rpc.mantle.xyz` (2026-06-11) estimates:

```
Estimated amount required: ~0.30 MNT
```

The 0.5 MNT pre-flight floor provides ~1.67× headroom over the live estimate. Fund the deployer wallet with ≥ 0.5 MNT before running the script.

The script does **not** pass `--legacy` — Mantle supports EIP-1559, and EIP-1559 is safer for front-running protection.

---

## References
- ADR-012: Chain-id routing strategy
- Story-10: ConciergeRegistry base contract (UUPS proxy pattern)
- Story-18: Sepolia deploy (mirrors this flow, use as reference)
- `research/concierge/AUDIT-2026-06-04.md`: Verified on-chain addresses
