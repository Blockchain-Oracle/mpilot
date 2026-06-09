# Story 118 — Live demo rehearsal (full Mainnet flow run-through on Jul 1-2 with backup paths rehearsed)

**Epic:** Epic 8 — Polish + Submit
**Estimated:** ~2h
**Depends on:** story-117-dorahacks-submission

## BDD Acceptance Criteria

```
Given a scheduled rehearsal slot on 2026-07-01 or 2026-07-02 (Demo Day eve)
When the rehearsal driver runs `bash scripts/demo-rehearsal.sh`
Then the script walks through the full 5-stage demo against MAINNET in sequence and records timing + outcome for each stage:
  - Stage 1 (storefront load + cursor on Pay with Patron): https://threads-by-mara.patron.xyz/products/heavyweight-hoodie loads, button visible, lighthouse perf > 80
  - Stage 2 (checkout modal + yield math): modal opens within 1s of click, yield math copy renders verbatim, confirm button visible
  - Stage 3 (4 on-chain txs settle): MerchantRegistry.checkReputation + PatronVault.openLoan + Aave borrow + ReputationProxy.logAction confirm within Mantle's block time (target: 4 txs in < 30s for the demo window)
  - Stage 4 (dashboard updates + Emergency Freeze): new position renders in the dashboard within 5s of tx confirmation, Emergency Freeze click reduces all agent capabilities to zero within 2s and shows the frozen state UI
  - Stage 5 (unfreeze + ERC-8004 receipt page): unfreeze restores capabilities within 2s, receipt page at /audit/<txHash> renders with all fields populated within 1s

Given the rehearsal completes
When `cat docs/demo-rehearsal/<timestamp>-rehearsal-log.md` is read
Then it shows pass/fail per stage with measured timings and tx hashes for Stages 2-5
And any failures have a captured screenshot at docs/demo-rehearsal/<timestamp>/screenshots/

Given the rehearsal identifies failure modes
When the backup paths are documented at docs/demo-rehearsal/backup-paths.md
Then there is a documented fallback for each of:
  - Mainnet RPC flake → fallback to Sepolia mid-demo (pre-loaded as second tab, badge visible)
  - Aave V3 pool full / no borrow capacity → switch to a pre-prepared mock USDC pool (deployed for emergencies)
  - Agent decision timeout (Anthropic API) → fallback narrative ("the agent normally takes 6s; today the API is slow — judges, the on-chain proof is what matters")
  - byreal-cli child process error → fallback to skipping byreal-cli step + verbal narrative
  - One of 3 storefronts down → narrate around it using the other 2 (priority order: Threads by Mara > Pixelink > Dialer Pro)
  - ERC-8004 reputation registry write fails → fallback to direct Mantlescan tab pre-loaded with a known-good prior receipt
  - Internet flake on stage → fallback to pre-recorded video segment (story-112's tight 90s cut, ready to play)
  - All else fails → "this is an early-Mainnet feature; here's what works on Sepolia today" + Sepolia path

Given the rehearsal driver completes
When a sign-off form is filled at docs/demo-rehearsal/<timestamp>-signoff.md
Then it records: rehearsal driver name, observers, overall verdict (GREEN/YELLOW/RED), top 3 risks, top 3 mitigations, recommended go/no-go for Demo Day

Given the rehearsal is RED
When the recommended path is reviewed
Then it documents either (a) the specific bug to fix before re-running rehearsal (with owner + ETA) OR (b) the decision to demo on Sepolia instead of Mainnet (with backup-path script update)

Given the rehearsal is GREEN
When the recording for story-112 happens
Then the same rehearsal is video-captured one final time and edited into the demo video
```

## File modification map

- `scripts/demo-rehearsal.sh` — NEW — bash orchestrator: takes the 5-stage walkthrough, runs each stage as a verifiable check, records tx hashes + timing, writes a markdown log; can be run in --dry-run mode to validate the script without firing real txs
- `scripts/demo-rehearsal-helpers/stage1-storefront-check.mjs` — NEW — Playwright headless: load https://threads-by-mara.patron.xyz/products/heavyweight-hoodie, assert button present, measure load time
- `scripts/demo-rehearsal-helpers/stage2-modal-check.mjs` — NEW — Playwright headless: click PatronButton, assert modal opens, yield math copy present
- `scripts/demo-rehearsal-helpers/stage3-onchain-check.mjs` — NEW — Node + viem: confirm tx, then watch mempool for the 4-tx sequence, measure timing
- `scripts/demo-rehearsal-helpers/stage4-dashboard-check.mjs` — NEW — Playwright headless: load /app/dashboard, assert new position appears, click Emergency Freeze, assert frozen state, click unfreeze
- `scripts/demo-rehearsal-helpers/stage5-receipt-check.mjs` — NEW — Playwright headless: load /audit/<txHash>, assert all receipt fields populated, check Mantlescan link
- `docs/demo-rehearsal/README.md` — NEW — one-screen explainer: when to run, how to interpret outcomes, what GREEN/YELLOW/RED mean
- `docs/demo-rehearsal/backup-paths.md` — NEW — the documented fallbacks listed in BDD criteria; this is the on-stage cheat sheet for Demo Day
- `docs/demo-rehearsal/signoff-template.md` — NEW — template for the per-rehearsal signoff record
- `docs/demo-rehearsal/.gitignore` — NEW — per-run log directories (`*-rehearsal-log.md` per timestamp); only `README.md`, `backup-paths.md`, `signoff-template.md` are checked in
- `apps/api/src/agent/intents/_demo-prewarm.ts` — NEW — small helper endpoint POST /agent/prewarm that pre-loads the agent context + warms the LLM connection; called by the rehearsal script to reduce cold-start variance during the live demo

## Shell verification

```bash
# Pre-flight
test -n "$MANTLE_RPC_URL"
test "$MANTLE_RPC_URL" = "https://rpc.mantle.xyz"
test -x scripts/demo-rehearsal.sh

# Dry-run validates the script
bash scripts/demo-rehearsal.sh --dry-run
test $? -eq 0

# Real rehearsal run (against Mainnet)
bash scripts/demo-rehearsal.sh --network mainnet --merchant threads-by-mara
test $? -eq 0

# Log produced
ls docs/demo-rehearsal/*-rehearsal-log.md | tail -1 | xargs test -f

# All 5 stages logged with outcome
latest_log=$(ls docs/demo-rehearsal/*-rehearsal-log.md | tail -1)
for stage in "Stage 1" "Stage 2" "Stage 3" "Stage 4" "Stage 5"; do
  grep -q "$stage.*\(PASS\|FAIL\)" "$latest_log" || { echo "missing $stage outcome"; exit 1; }
done

# Stage 3 logged 4 tx hashes
grep -c "0x[a-fA-F0-9]\{64\}" "$latest_log" | xargs test 4 -le

# Backup paths doc covers all required failure modes
for fm in "Mainnet RPC flake" "Aave" "agent decision timeout" "byreal-cli" "storefront" "ERC-8004" "Internet flake"; do
  grep -qi "$fm" docs/demo-rehearsal/backup-paths.md || { echo "missing fallback: $fm"; exit 1; }
done

# Signoff template exists
test -f docs/demo-rehearsal/signoff-template.md

# Sepolia fallback path is executable (verify the alt-network flag works)
bash scripts/demo-rehearsal.sh --dry-run --network sepolia
test $? -eq 0
```

## Notes

- **Demo Day is 2026-07-02 and 2026-07-03.** Rehearsal happens 2026-07-01 (preferred) or morning of 2026-07-02. Must NOT skip — per CONTEXT.md "live demo prep is not optional."
- **Run AT LEAST 3 full rehearsals.** First: discover failure modes. Second: validate fixes. Third (final): the recording for the demo video if you haven't filmed yet.
- **Pre-warm everything.** The `_demo-prewarm.ts` endpoint reduces cold-start variance: agent context loaded, LLM connection warm, viem client connected, Anvil-fork (if used) synced. Saves 2-4s of awkward stage time.
- **Backup paths > recovery improv.** Every failure mode in the BDD list has a documented fallback. The driver READS from `backup-paths.md` on stage if needed; doesn't improvise.
- **Mainnet vs Sepolia decision tree:**
  - GREEN rehearsal on Mainnet → demo on Mainnet, badge "Live on Mantle Mainnet"
  - YELLOW (intermittent Mainnet flake) → demo on Mainnet, have Sepolia tab pre-loaded, narrate the switch if needed
  - RED (Mainnet broken) → demo on Sepolia with explicit "Sepolia (testnet) — same code, same flow" badge. Deployment Award rubric explicitly allows testnet.
- **Pre-recorded backup video.** Always have the story-112 90s tight cut loaded in a hidden tab. If stage tech fails, click to video. Better an awkward "let me play the video instead" than a 30-second silent screen.
- **Connection hygiene.** Wired Ethernet > WiFi > tethered hotspot. Use a dedicated demo laptop with notifications muted, screen recorder primed, bookmarks bar hidden, browser zoom locked at 100%.
- **Multiple voices** if possible: a driver (clicks, drives the flow), a narrator (voice, watches the timing), an observer (notes any issue for the post-rehearsal signoff).
- **Track 3 + Track 6 demo emphasis:** during Stage 3, narrate "the agent now reads the merchant reputation via ERC-8004 [Track 6 angle] and locks sUSDe collateral via Aave V3 Mantle [Track 3 angle]." Make both track judges hear their thesis.
- **Don't promise things the rehearsal didn't prove.** If a feature works on Sepolia but the Mainnet rehearsal showed flake, that feature is on the "demo skip" list — don't risk live failure.
- **Final rehearsal feeds the video.** If rehearsal #3 is clean, capture it as the final demo video to maximize freshness (a video recorded the day before Demo Day shows the freshest commits).
- File size < 400 LOC per script/doc.
