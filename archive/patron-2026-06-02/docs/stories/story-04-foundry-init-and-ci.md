# Story 04 — Foundry init + Slither + Aderyn in CI

**Epic:** Epic 0 — Foundation
**Estimated:** ~2h
**Depends on:** story-00-monorepo-scaffold, story-03-github-actions-ci

## BDD Acceptance Criteria

```
Given the contracts package is set up
When `forge build` runs in packages/contracts/
Then it succeeds with zero warnings on a freshly scaffolded contract (Counter.sol placeholder)
And ABI artifacts land in packages/contracts/out/

Given Forge tests exist
When `forge test -vvv` runs
Then all placeholder tests pass
And gas reports are generated

Given a PR with Solidity changes is opened
When the contracts CI job runs
Then Slither completes successfully with zero HIGH severity findings
And Aderyn completes successfully with zero HIGH severity findings
And forge test exits 0

Given remappings.txt is set
When the contracts package builds
Then OpenZeppelin and Aave imports resolve correctly
And forge fmt verifies formatting
```

## File modification map

- `packages/contracts/foundry.toml` — NEW — solc 0.8.26, optimizer 200, fmt config, fuzz runs=256, invariant runs=256
- `packages/contracts/remappings.txt` — NEW — OpenZeppelin, Aave V3 (core + periphery, including `IAaveOracle`), forge-std mappings. **Do NOT install Chainlink** — per ADR-003 we read prices via `IAaveOracle` from Aave V3 periphery; no Chainlink interface is needed in the contracts (the audit lesson from AUDIT-1: there is no direct Chainlink sUSDe/USD feed on Mantle anyway).
- `packages/contracts/lib/.gitkeep` — NEW — Foundry uses lib/ for git submodules (forge install)
- `packages/contracts/.gitignore` — NEW — `out/`, `cache/`, `broadcast/`, `lib/`
- `packages/contracts/src/Counter.sol` — NEW — placeholder contract so forge build has something to compile
- `packages/contracts/test/Counter.t.sol` — NEW — placeholder Forge test
- `packages/contracts/scripts/install-deps.sh` — NEW — runs `forge install` for OpenZeppelin Contracts, Aave V3 (core + periphery — periphery is where `IAaveOracle` lives), forge-std (called by CI + dev setup). No Chainlink install per ADR-003.
- `.github/workflows/contracts-ci.yml` — NEW — separate workflow for Solidity: forge build + forge test + slither + aderyn
- `.slither.config.json` — NEW — Slither config: exclude `node_modules`, `lib`, `out`; fail on HIGH severity
- `aderyn.toml` — NEW — Aderyn config: src=src, exclude=test, fail-on-high=true
- `.github/workflows/ci.yml` — UPDATE — add `contracts` job that calls contracts-ci.yml (reusable)

## Shell verification

```bash
cd packages/contracts
./scripts/install-deps.sh
forge build
forge test -vvv
forge fmt --check

# Slither + Aderyn (require Python + Rust toolchains; CI handles install)
pip install slither-analyzer
slither . --config-file .slither.config.json --exclude-dependencies

cargo install aderyn || true  # may already be installed
aderyn .

echo "All contracts CI steps locally green"
```

## Notes

- Foundry version: pin to a specific commit hash in `.github/workflows/contracts-ci.yml` to prevent silent upgrades. Use `foundry-rs/foundry-toolchain@v1` with `version: stable`.
- Solc 0.8.26+ is required for transient storage and other newer features we may use.
- Forge dependencies installed via `forge install` (git submodules under `lib/`):
  - `OpenZeppelin/openzeppelin-contracts@v5.1.0`
  - `aave/aave-v3-core` (Mantle deployment refs)
  - `smartcontractkit/chainlink` (only AggregatorV3Interface, prune the rest)
  - `foundry-rs/forge-std@v1.9.0`
- Slither: install via pip; runs in CI as a separate step; outputs SARIF for GitHub Code Scanning integration.
- Aderyn: Rust-based; install via `cargo install aderyn`; outputs Markdown report.
- Both run only on PRs that touch `packages/contracts/` (use `paths:` filter to save CI minutes).
- Fail the PR on HIGH severity findings from either tool. MEDIUM and LOW are warnings only.
