# AUDIT-3: Internal consistency review

**Date:** 2026-06-03
**Verdict:** NEEDS_PATCH

## Summary

The four top-level docs (PRD, architecture, ux-spec, epics) are mutually coherent. Project name "Patron" is consistent everywhere. All Mantle addresses (Aave Pool, sUSDe, USDC, ERC-8004 registries) are identical across architecture.md, story files (story-11, 15, 21, 103, 110, 111) and the design spec. OpenClaw, self-host, Validation Registry, USDY-as-v1 and USDT-as-v1 all appear only in the correct "excluded" contexts. Sprint-status YAML's dependency graph is acyclic with 0 missing IDs and clean topo order across all gates I checked. The 15 sampled stories are uniformly high quality: every one has the 5 required sections, BDD `Then` clauses are concretely verifiable (exit codes, jq assertions, grep, Playwright counts), file maps tag NEW/UPDATE, shell verification is runnable, notes reference ADRs. Two material problems: (1) **story-file `Depends on:` headers diverge from sprint-status.yaml for 71/95 stories** — same canonical artifact, two sources of truth, no merge tool, will confuse the orchestrator; (2) **story-21 (Sepolia deploy) misnames its own dep set** — file says it depends on the contract impl stories (10/11/15/17/19) while sprint-status (correctly) gates on the test stories (12/16/18/20). Plus a handful of minor BDD/shell issues called out below.

## Cross-doc consistency findings

All clean except minor:

1. **Project name** — "Patron" consistent everywhere. No "Hold", "YieldBNPL", "Patron Pay" leaks (`grep -rE "Hold|YieldBNPL|Patron Pay" docs/` returned nothing).
2. **Stack table** — Biome is canonically the linter; only legitimate ESLint refs are in ADR-007 (fallback escape hatch) and story-01 notes (which preserve the same escape hatch). Consistent.
3. **Mantle addresses** — sUSDe `0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2`, USDC `0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9`, Aave Pool `0x458F293454fE0d67EC0655f3672301301DD51422`, ERC-8004 Identity `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`, Reputation `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` — all identical in architecture.md, story-11, story-15, story-103, story-110, story-111, and the design spec.
4. **Tracks** — Track 3 + Track 6 + Grand Champion + Best UI/UX + Deployment Award canon held in PRD line 5, architecture ADR-005, story-117. Consistent.
5. **OpenClaw** — appears ONLY in (a) PRD excluded-scope table, (b) ADR-001 (explaining why dropped), (c) ADR-005 (noting byreal-cli does NOT need OpenClaw), (d) story-40 + story-116 (correctly citing ADR-001), (e) historical design spec under `docs/superpowers/specs/`. No leaks into active code paths.
6. **Self-host** — same: PRD excluded list + historical spec only. Minor: `story-38-onchain-indexer-skeleton.md` line 89 uses "self-host a Mantle node" as a v2 idea — semantically different (self-host node ≠ self-host product), not a leak.
7. **EIP-7702 vs scoped API keys** — Story-19 explicitly implements the v1 scoped-API-key fallback and cites ADR-004. Story-20 tests are interface-agnostic so the v2 EIP-7702 impl can swap in. Story-43 cites ADR-004 correctly. Aligned.
8. **ERC-8004 Validation Registry** — explicitly out of scope; only mentioned in PRD exclusion table, story-17 notes, and historical spec. Clean.
9. **sUSDe vs USDY** — USDY appears only as (a) v2 future-work in PRD/ADR-002, (b) story-11 + story-116 explicitly citing ADR-002. v1 is sUSDe everywhere it matters.
10. **USDC vs USDT** — USDT appears once in story-11 line 77 as a generic note about `safeIncreaseAllowance` ("USDT-style approve revert") — pattern guidance, not a v1 asset claim. v1 borrow asset is USDC everywhere.

## Story quality findings (from 15-sample)

The 15 sampled stories are uniformly strong. Issues are minor.

- **All 15 have the 5 required sections** (header / BDD / file map / shell verification / notes).
- **All 15 are ≤ 2h estimates.**
- **BDD `Then` clauses are verifiable** — they reference exit codes (`test $? -eq 0`), `jq -e` assertions, `grep -q`, Playwright spec runs, ABI length counts, schema validations. No vague "tests pass" or "works correctly" anywhere.
- **File maps consistently use NEW/UPDATE.**
- **Notes reference ADRs** correctly (story-11 → ADR-002+003, story-19 → ADR-004, story-43 → ADR-004, story-110 → ADR-003 fallback for sUSDe Chainlink feed).
- **Library versions** match architecture stack table (Solidity 0.8.26, viem 2.x, Node 22, Hono 4, Drizzle latest).

Minor weaknesses:

- **story-21 shell verification** uses `node -e "import('./packages/shared/src/addresses.ts')..."` — Node can't `import()` a `.ts` file at runtime without tsx/loader. Should be `pnpm tsx scripts/check-addresses.ts` or run after build.
- **story-110 shell verification** has the same `require('./packages/shared/src/addresses.ts')` pattern (line 91) — Node `require` cannot load `.ts`. Same fix.
- **story-21 BDD criterion 4** says "no `0x000` placeholder remains" but the grep on line 89 is `grep -v "0x0000000000000000000000000000000000000000"` which only matches the full all-zero address, not the shortened `0x000...` form referenced in PRD/architecture banned patterns. Tighten regex.
- **story-46 shell verification** line 66 `grep -q "tool_choice.*any\|'any'"` is fine but `tool_choice` is an Anthropic SDK construct — coding agent must verify via Context7 that `'any'` is still the literal in latest SDK (could be `'required'` in newer versions). Add explicit Context7 reminder.
- **story-92 BDD** specifies `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"` — `allow-same-origin` combined with `allow-scripts` against a parent on same origin defeats sandboxing. Since merchant origin ≠ patron.xyz origin this is actually fine, but worth a one-line security note.
- **story-103 line 96** `for f in packages/contracts/scripts/onboard*/**/*.mjs` uses zsh globstar; under bash (default in CI) `globstar` must be enabled or this silently no-ops. Recommend `find … -name '*.mjs'`.

## Dependency graph findings

**Sprint-status.yaml (the canonical graph for the orchestrator):**

- 95 stories, 0 missing dep IDs, 0 cycles, fully topologically orderable.
- story-110 (Mainnet) → transitively reaches story-53 (agent fixtures) ✓
- story-117 (DoraHacks) → transitively reaches every artifact-producing story (110, 112, 113, 114, 115, 116, 104) ✓
- story-43 → reaches story-20 (AgentAuthorizer tests) ✓
- story-71/72 → reach story-20 ✓
- story-76 → reaches story-36 ✓

One real ordering concern, not a bug per se:

- **story-46 (intent-open-position) does NOT transitively depend on story-36 (POST /orders/intent)** in sprint-status, but the story-46 file says it enqueues from `POST /orders/intent` and updates `orders.ts` (which doesn't exist yet without story-36). Either add `story-36-order-intent-endpoint` to story-46's sprint-status deps, or document that story-46 may run before story-36 by stubbing the route.

## Cross-story reference findings

- **story-79 + story-88 both modify `packages/shared/src/telegram.ts`.** Both files acknowledge this explicitly (story-88 line 57 calls out the symmetric helper). Good.
- **story-43 → story-20 (AgentAuthorizer tests)** present in sprint-status. Good.
- **story-21 produces `packages/shared/addresses.ts`** — downstream stories that read it: 34, 38, 42 (sprint-status: yes), 43, 49, 52, 103, 110 — all transitively gated. Good.
- **story-46 references `MerchantRegistry.checkReputation()`** — that function IS specified in story-15 file map line 42 (`checkReputation(string calldata slug) external view returns (bool isActive, uint128 score, uint256 bond)`). Match.
- **story-71 references AgentAuthorizer freeze API** — story-19 specifies `freezeAgent(uint256 agentId)`. Match (story-71 talks about revoking session keys, story-19 implements it via the freeze + isAuthorized predicate). Aligned.
- **story-51 (HandleDispute) depends on story-52 (receipt logging)** in both file + sprint-status — no cycle (story-52 doesn't depend on story-51). Good.
- **story-46 → story-36 link missing in sprint-status (file says yes).** Already called out above.

## Major divergence: story-file deps vs sprint-status deps (71 of 95)

71 stories have a mismatch between the `Depends on:` line in their `.md` file and the `depends_on:` array in `sprint-status.yaml`. Patterns:

1. **Sprint-status often uses tighter immediate predecessors; story files include transitive ones** (e.g., story-21 file lists impl stories 11/15/17/19, sprint-status lists their corresponding test stories 12/16/18/20). Both views are defensible but documentation has two sources of truth.

2. **Story files frequently omit a real dep that sprint-status correctly adds** — e.g., story-70 (file omits story-52 ERC-8004 receipts which the activity feed renders); story-71/72 (file omits story-20 AgentAuthorizer tests — sprint-status correctly adds them); story-74 (file omits story-34 merchant onboarding endpoints).

3. **Story files occasionally add deps sprint-status omits** — e.g., story-46 file requires story-36 (order intent endpoint); sprint-status doesn't gate on it.

4. **Concretely problematic divergences (resolve before orchestrator dispatch):**
   - story-21: file deps name implementation stories (11/15/17/19), sprint-status names their tests (12/16/18/20). Sprint-status is correct — never deploy without passing tests. **Update story-21.md `Depends on:` line.**
   - story-52: file says deps on story-17 (impl) + story-21 (deploy) + story-40 (bootstrap); sprint-status says story-18 (tests) + story-41 (context). Story-52 file's pre-reqs (reputation contract live + bootstrap) are arguably tighter (real ERC-8004 calls need story-21's deployed address). **Sprint-status should add story-21 to story-52 deps.**
   - story-43: file says story-19 (AgentAuthorizer impl); sprint-status says story-20 (tests). Sprint-status correct.
   - story-110: sprint-status says deps story-53 (agent fixtures done); file omits story-53. **Update story-110.md.**

## Recommended spec patches

In priority order:

1. **docs/sprint-status.yaml** — Add `story-36-order-intent-endpoint` to `story-46-intent-open-position` depends_on (line ~303). And add `story-21-sepolia-deployment` to `story-52-erc8004-receipt-logging` depends_on (line ~351) — receipts need a deployed ReputationProxy address.

2. **All 71 divergent story files** — Run a single sync pass: pick sprint-status.yaml as the source of truth (it's machine-parsed by the orchestrator), then regenerate the `**Depends on:**` line in each story `.md` from the YAML. Or vice-versa — but ONE source must win. Suggest the YAML wins and the markdown becomes a derived view.

3. **docs/stories/story-21-sepolia-deployment.md line 5** — Change `**Depends on:** story-11-patron-vault-aave-integration, story-15-merchant-registry, story-17-reputation-proxy, story-19-agent-authorizer-v1, story-06-env-and-secrets-setup` → `**Depends on:** story-12-patron-vault-tests-unit, story-16-merchant-registry-tests, story-18-reputation-proxy-tests, story-20-agent-authorizer-tests, story-06-env-and-secrets-setup` (sprint-status is correct: never deploy without tests).

4. **docs/stories/story-21-sepolia-deployment.md line 89** — Replace `grep -v "0x0000000000000000000000000000000000000000"` with `! grep -qE "0x0{6,}" README.md` so it also catches the abbreviated `0x000...` placeholder form mentioned in architecture banned patterns.

5. **docs/stories/story-21-sepolia-deployment.md lines 74-82 + story-110 line 89-95** — Replace inline `node -e "import('./packages/shared/src/addresses.ts')..."` with a real `pnpm --filter @patron/shared exec tsx scripts/check-addresses.ts` invocation, or build the package first. `node` can't load `.ts` at runtime.

6. **docs/stories/story-103-merchant-onboarding-via-cli.md line 96** — Replace globstar pattern with `find packages/contracts/scripts/onboard -type f -name "*.mjs" -exec wc -l {} +` for cross-shell compatibility.

7. **docs/stories/story-46-intent-open-position.md notes** — Add: "Per Context7 rule, verify `tool_choice: 'any'` is still the literal in the current `@anthropic-ai/sdk` before merging; recent SDK versions may rename it."

8. **docs/stories/story-92-sdk-js-modal-pattern.md notes** — Add one-line security note that `allow-same-origin` in the iframe sandbox is safe only because the iframe origin (app.patron.xyz) differs from the merchant page origin; document that the sandbox MUST NOT be loosened.

9. **docs/sprint-status.yaml** — Consider adding `story-77-audit-receipt-viewer` as a dep of `story-112-demo-video-script-and-shoot` (the demo Stage 5 requires the receipt viewer). Currently sprint-status gates story-112 on story-88 (mini deep-link) + story-111 (merchant onboarding) but not story-77.

10. **Optional cleanup** — `story-110-mainnet-contract-deploy.md` line 5 lists `story-12 through story-20` colloquially. Make explicit by listing the specific test stories so the orchestrator can mechanically check.

## Sample stories audited

15 stories sampled per rubric distribution (Epic 1: 3, Epic 2: 2, Epic 3: 3, Epic 4: 3, Epic 5: 1, Epic 6: 1, Epic 7: 1, Epic 8: 1 — exceeded Epic 1/3/8 quotas due to cross-checks):

- Gold-standard reads: story-00, story-01, story-06
- Epic 1: story-11-patron-vault-aave-integration, story-15-merchant-registry, story-19-agent-authorizer-v1, story-20-agent-authorizer-tests, story-21-sepolia-deployment
- Epic 2: story-34-merchant-onboarding-endpoints, story-36-order-intent-endpoint (header only)
- Epic 3: story-43-tool-onchain-writes, story-46-intent-open-position, story-51-intent-handle-dispute (header), story-52-erc8004-receipt-logging (header)
- Epic 4: story-68-dashboard-shell (header), story-71-dashboard-emergency-freeze, story-76-checkout-flow-page, story-79-open-in-telegram-cta
- Epic 5: story-88-deep-link-handling
- Epic 6: story-92-sdk-js-modal-pattern
- Epic 7: story-103-merchant-onboarding-via-cli
- Epic 8: story-110-mainnet-contract-deploy, story-117-dorahacks-submission, story-118-live-demo-rehearsal (header)
