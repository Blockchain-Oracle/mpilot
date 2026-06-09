# Story 113 — X thread draft tagged #MantleAIHackathon (pitch + demo video + repo + contract addresses)

**Epic:** Epic 8 — Polish + Submit
**Estimated:** ~1h
**Depends on:** story-112-demo-video-script-and-shoot

## BDD Acceptance Criteria

```
Given the file docs/x-thread/draft.md exists
When a reader opens it
Then it contains 8-12 tweets in numbered order (1/, 2/, ... n/)
And tweet 1 has the verbatim pitch opener from PRD: "In May 2026, Klarna had to rehire human disputes agents because their AI hallucinated and they couldn't audit it. Watch what happens when the agent is held accountable on-chain."
And tweet 1 includes the 90s demo video (referenced as @attachment: docs/demo-video/patron-demo-tight-90s.mp4 — uploaded as native X video, not a YouTube link, for autoplay)
And every tweet ≤ 280 characters (verified by line-length check excluding the `N/` prefix)
And the LAST tweet contains:
  - The hashtag #MantleAIHackathon (REQUIRED per Mantle press release for submission qualification)
  - The repo URL (github.com/abu/patron or equivalent)
  - The 4 Mainnet contract addresses (PatronVault, MerchantRegistry, ReputationProxy, AgentAuthorizer) with mantlescan.xyz links
  - The 3 demo merchant URLs (threads-by-mara.patron.xyz, pixelink.patron.xyz, dialer-pro.patron.xyz)

Given the thread is ready to post
When a publication checklist runs
Then it confirms:
  - Day-of-publication timing aligned with submission window (Day 12-13, optimal post window: Tue-Thu morning UTC per hackathon-research note on Community Voting optimization)
  - All addresses copy-paste-correct from packages/shared/src/addresses.ts (no typos)
  - The native video is < 140 MB + < 2:20 duration (X native video limits)
  - Alt text on every image (a11y + extra surface area)

Given an alternative-style draft exists at docs/x-thread/draft-technical.md
When a reader opens it
Then it's a more technical version emphasizing the Klarna failure → ERC-8004 accountability angle, targeted at the agent/AI side of crypto Twitter

Given an alternative-style draft exists at docs/x-thread/draft-product.md
When a reader opens it
Then it's a more product-focused version emphasizing the user benefit (negative-cost-of-funds BNPL) and the merchant SDK angle, targeted at the consumer-fintech side of crypto Twitter

Given a copy-paste-ready single string exists at docs/x-thread/post-string.txt
Then the file contains the chosen draft serialized as one block with `---tweet---` separators so it can be pasted into a thread-scheduling tool (Typefully, Hypefury) or posted manually
```

## File modification map

- `docs/x-thread/draft.md` — NEW — the canonical thread (12 tweets numbered 1/ through 12/)
- `docs/x-thread/draft-technical.md` — NEW — alt version: agent + ERC-8004 angle for crypto-AI audience
- `docs/x-thread/draft-product.md` — NEW — alt version: user + merchant angle for consumer-fintech audience
- `docs/x-thread/post-string.txt` — NEW — serialized version for tooling
- `docs/x-thread/assets/` — NEW directory — contains the 90s video (symlink to `docs/demo-video/patron-demo-tight-90s.mp4`), 3 storefront screenshots (one per merchant), 1 dashboard screenshot, 1 receipt-page screenshot
- `docs/x-thread/checklist.md` — NEW — pre-publish checklist (addresses verified, video uploaded as native, hashtag present, alt text added, scheduled for Tue-Thu AM UTC)
- `scripts/verify-x-thread.sh` — NEW — bash script that lints the draft: greps for required hashtag, validates every tweet line ≤ 280 chars, validates addresses match `packages/shared/src/addresses.ts`, validates URLs return 200
- `README.md` — UPDATE — add link to the X thread once posted: "Read the thread: https://x.com/<handle>/status/<id>"

## Shell verification

```bash
test -f docs/x-thread/draft.md

# Hashtag present
grep -q "#MantleAIHackathon" docs/x-thread/draft.md

# Pitch opener verbatim
grep -q "rehire human disputes agents" docs/x-thread/draft.md
grep -q "held accountable on-chain" docs/x-thread/draft.md

# Every tweet body <= 280 chars (excluding "N/" prefix)
awk '/^[0-9]+\// { sub(/^[0-9]+\/ ?/, ""); if (length($0) > 280) { print "OVER:", $0; exit 1 } }' docs/x-thread/draft.md

# All 4 Mainnet addresses present
for c in PatronVault MerchantRegistry ReputationProxy AgentAuthorizer; do
  addr=$(node -e "console.log(require('./packages/shared/src/addresses.ts').ADDRESSES.mainnet.$c)")
  grep -q "$addr" docs/x-thread/draft.md || { echo "missing $c address"; exit 1; }
done

# Repo URL + 3 merchant URLs present in last tweet block
tail -30 docs/x-thread/draft.md | grep -q "github.com"
tail -30 docs/x-thread/draft.md | grep -q "threads-by-mara.patron.xyz"
tail -30 docs/x-thread/draft.md | grep -q "pixelink.patron.xyz"
tail -30 docs/x-thread/draft.md | grep -q "dialer-pro.patron.xyz"

# Run the verifier
bash scripts/verify-x-thread.sh
test $? -eq 0

# post-string.txt is non-empty
test -s docs/x-thread/post-string.txt
```

## Notes

- **`#MantleAIHackathon` is mandatory** per Mantle press release for submission qualification + Community Voting eligibility. CI check enforces it.
- **Verbatim pitch opener** from PRD § Pitch opener. This is the line judges will see if they search the hashtag.
- **Native X video** (not YouTube link) — X autoplays native video in-feed, dramatically increasing watch rate. The 90s tight cut from story-112 is sized for this (≤ 140 MB, ≤ 2:20).
- **3 drafts, 1 winner.** Provide 3 stylistic angles (canonical, technical, product) so Abu can pick the one that fits his current audience temperature. The canonical `draft.md` is the safe default.
- **Address copy-paste correctness is critical.** A single character wrong in a Mainnet address breaks the proof. The CI grep pulls addresses straight from `packages/shared/src/addresses.ts` and verifies they appear verbatim in the draft.
- **Timing matters for Community Voting.** Hackathon research notes Tue-Thu AM UTC as the peak engagement window for global crypto X. Schedule the post to land in that window on Day 12 or 13.
- **Tweet count budget:** aim for 8-12 tweets. Fewer than 8 = under-using the format; more than 12 = engagement drops off the cliff. Suggested structure:
  - 1/ — pitch opener + video
  - 2/ — the problem (Klarna AI failure, no audit trail, refunded $35M)
  - 3/ — the move (your savings keep earning Ethena yield; agent borrows USDC against them via Aave Mantle E-Mode; your collateral covers the loan interest — near-zero cost-of-credit floor)
  - 4/ — the wow (on-chain ERC-8004 receipts; freeze with one tap)
  - 5/ — demo screenshot 1: storefront → confirm
  - 6/ — demo screenshot 2: mantlescan + dashboard
  - 7/ — demo screenshot 3: emergency freeze + receipt page
  - 8/ — the agent layer (Claude Agent SDK + 6 intents + byreal-cli)
  - 9/ — the SDK distribution (1-line drop-in; 3 demo merchants prove it)
  - 10/ — track + sponsor alignment (Mantle RWA + ERC-8004 + Byreal Skills)
  - 11/ — try it (3 storefront URLs + repo)
  - 12/ — addresses + #MantleAIHackathon
- **Don't claim things the demo can't show live.** Anything you tweet, the agent must be able to do on Demo Day. Conservative claims > inflated claims.
- The thread post itself isn't this story's deliverable — the DRAFT + verifier are. Abu posts manually (or via scheduler) on Day 12 evening.
- File size < 400 LOC per file (drafts are well under).
