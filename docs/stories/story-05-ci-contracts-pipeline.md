# Story — CI: Foundry contracts pipeline

**ID:** story-05-ci-contracts-pipeline
**Epic:** Epic E0 — Foundation
**Depends on:** story-03-foundry-init-and-remappings
**Estimate:** ~30min
**Status:** PENDING

---

## User story

**As a** Concierge contracts engineer
**I want to** `forge build + forge test + forge coverage` runs in CI on every push affecting contracts/
**So that** contract regressions are caught before merge

---

## File modification map

- `.github/workflows/ci.yml` — UPDATE — add `contracts` job with: timeout-minutes 15, `permissions: { contents: read }`, install Foundry, run `install-deps.sh`, `forge fmt --check`, `forge build --sizes` (size guard), `forge test -vvv`, `forge coverage --report summary` (gate ≥ 80% on `src/`). Path-filter so it only runs when `contracts/**` or the workflow file change. **Add `contracts-security` job** (runs only on PR + nightly schedule): Slither + Aderyn with `fail-on-high: true`.
- `.slither.config.json` — NEW — Slither config (exclude `node_modules`, `lib`, `out`; fail on HIGH severity)
- `aderyn.toml` — NEW — Aderyn config: src=src, exclude=test, fail-on-high=true

---

## Acceptance criteria (BDD)

```
Given .github/workflows/ci.yml has a contracts job
When `node -e "const yaml = require('js-yaml'); const c = yaml.load(require('fs').readFileSync('.github/workflows/ci.yml','utf8')); console.log(Object.keys(c.jobs).includes('contracts'))"` runs
Then output is `true`

Given the contracts job uses Foundry
When grep checks the workflow
Then it contains "foundry-rs/foundry-toolchain"

Given the contracts job runs forge fmt --check
When grep checks the workflow
Then it contains "forge fmt --check"

Given the contracts job runs forge build + test
When grep checks the workflow
Then it contains "forge build" AND "forge test"

Given the contracts job runs coverage
When grep checks the workflow
Then it contains "forge coverage"

Given the path filter is set
When grep checks the contracts job triggers
Then it includes "paths:" with `contracts/**` (so the heavy job only runs when contracts change)
```

---

## Shell verification

```bash
# Workflow has contracts job
grep -qE "^\s*contracts:" .github/workflows/ci.yml

# Foundry toolchain
grep -q "foundry-rs/foundry-toolchain" .github/workflows/ci.yml

# All required forge commands
grep -q "forge fmt --check" .github/workflows/ci.yml
grep -q "forge build" .github/workflows/ci.yml
grep -q "forge test" .github/workflows/ci.yml
grep -q "forge coverage" .github/workflows/ci.yml

# Slither + Aderyn configs
test -f .slither.config.json
test -f aderyn.toml
grep -q "fail_on" .slither.config.json
grep -q "fail-on-high" aderyn.toml
```

---

## Notes for coding agent

- Inherits the top-level `concurrency` group + `cancel-in-progress: true` from story-04's ci.yml (single workflow, multiple jobs).
- The `contracts` job uses `timeout-minutes: 15` (forge test against Mainnet fork can take longer than the TS test matrix).
- `permissions: { contents: read }` at job level matches story-04's least-privilege pattern.
- Use `foundry-rs/foundry-toolchain@v1` — official action.
- Path filter the contracts job so it skips when only TS changes (saves CI minutes):
  ```yaml
  on:
    push:
      paths:
        - 'contracts/**'
        - '.github/workflows/ci.yml'
    pull_request:
      paths:
        - 'contracts/**'
  ```
- `forge install` step runs `bash contracts/scripts/install-deps.sh` from story-03.
- `forge coverage --report summary` outputs to stdout; gate at 80% via `awk` parsing:
  ```bash
  cov=$(forge coverage --report summary | awk '/^Total/{print $NF}' | tr -d '%')
  [ "${cov%.*}" -ge 80 ] || exit 1
  ```
- Slither + Aderyn run in a separate job, also path-filtered. Fail on HIGH severity findings only (LOW/MEDIUM is advisory).
- Set `working-directory: contracts` on all forge steps so paths resolve correctly.
