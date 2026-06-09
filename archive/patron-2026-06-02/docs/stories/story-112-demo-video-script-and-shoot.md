# Story 112 — Demo video (90-second screencast with audio narration matching the demo-shape rule)

**Epic:** Epic 8 — Polish + Submit
**Estimated:** ~2h
**Depends on:** story-111-mainnet-merchant-onboarding, story-88-deep-link-handling

## BDD Acceptance Criteria

```
Given a finalized script at docs/demo-video/script.md
And a recorded screencast at docs/demo-video/raw.mov
And an audio narration at docs/demo-video/voiceover.wav
When the editor produces the final cut at docs/demo-video/patron-demo-final.mp4
Then the video duration is between 90 and 180 seconds (PRD allows 2-5 min; we target 90s for the demo, 2-min minimum for Deployment Award rubric — so the FINAL has TWO cuts: a 90s "tight" cut for X thread, and a 2:30 "full" cut for DoraHacks submission)
And audio narration matches the on-screen action frame-for-frame at every stage transition (verified by manual review per the 5-stage demo-shape rule from ux-spec.md)
And the file is ≤ 300 MB, mp4, H.264, 1920x1080 @ 30fps, AAC audio @ 192 kbps

Given the 90s tight cut
When viewed
Then it covers all 5 stages from ux-spec § Demo shape rule:
  - Stage 1 (0-10s): Threads by Mara storefront, $75 hoodie product page, cursor moves to "Pay with Patron"
  - Stage 2 (10-25s): Patron checkout modal with yield math copy VERBATIM from PRD § Demo moment Stage 2
  - Stage 3 (25-50s): Mantlescan split-panel showing 4 confirmations (MerchantRegistry.checkReputation, PatronVault.openLoan, Aave borrow, ReputationProxy.logAction)
  - Stage 4 (50-70s): Dashboard with positions list, permission summary, Emergency Freeze click → frozen state
  - Stage 5 (70-90s): Unfreeze, click receipt link, /audit/:txHash page renders with full ERC-8004 trail

Given the 2:30 full cut
Then it includes everything in the 90s tight cut
And adds: (a) 15s of pitch opener ("In May 2026 Klarna had to rehire human agents... watch what happens when the agent is held accountable on-chain") shot as overlay text + voiceover; (b) 15s of merchant variety (cuts to Pixelink and Dialer Pro to prove 3 verticals); (c) 15s of contract address reveal with mantlescan links overlaid; (d) 15s of CTA ("Patron is open-source. Repo + addresses in the description.")

Given the final video is uploaded to YouTube unlisted + saved to the repo
When the README + DoraHacks + X thread are drafted (stories 113, 114, 117)
Then they reference the YouTube URL + the repo-hosted mp4 fallback

Given the video is reviewed by the team
When the team approves
Then the file is committed under docs/demo-video/ (mp4 + script + voiceover) with a .gitattributes entry marking *.mp4 as LFS-tracked OR a clear note that the mp4 lives only on YouTube + a backup S3 bucket (cheaper than LFS)
```

## File modification map

- `docs/demo-video/script.md` — NEW — full shot-by-shot script with timecodes, on-screen text overlays, voiceover lines for each second; per the 5-stage demo-shape rule; includes the verbatim Stage 2 yield math copy
- `docs/demo-video/shotlist.md` — NEW — bullet shot list: storefront → click → modal → math copy → confirm → mantlescan panel → dashboard → freeze → unfreeze → receipt page; each shot annotated with which Patron app/URL is open + which cursor moves are needed
- `docs/demo-video/voiceover.md` — NEW — the spoken script as plain text (for ElevenLabs or human VO recording); ≤ 220 words for the 90s cut; ≤ 380 words for the 2:30 cut
- `docs/demo-video/recording-checklist.md` — NEW — pre-record checklist: Mainnet rehearsal green (story-118), 3 storefronts live, mantlescan tab pre-loaded with the test merchant address, dashboard pre-seeded with a position so Stage 4 has something to freeze, screen recorder configured to 1920x1080 @ 30fps, audio levels checked, browser zoom set to 100%, browser bookmarks bar hidden
- `docs/demo-video/upload-checklist.md` — NEW — post-edit checklist: trim to 90s + 2:30 cuts, AAC audio, mp4 H.264, upload to YouTube unlisted, copy URL into README/DoraHacks/X thread, also upload to backup S3 bucket
- `docs/demo-video/.gitignore` — NEW — `raw.mov`, `*.wav` (raw assets stay local; only final cuts + scripts committed)
- `docs/demo-video/README.md` — NEW — one-screen index: where each artifact lives, who owns each step, deadline (Day 12 evening)
- `scripts/optimize-demo-video.sh` — NEW — ffmpeg wrapper that takes the editor's output and produces the two final mp4s with deterministic settings: `ffmpeg -i input.mov -c:v libx264 -preset slow -crf 22 -c:a aac -b:a 192k -vf "scale=1920:1080" -r 30 output-tight.mp4`

## Shell verification

```bash
# Script exists with timecodes for all 5 stages
test -f docs/demo-video/script.md
grep -q "Stage 1" docs/demo-video/script.md
grep -q "Stage 5" docs/demo-video/script.md

# Voiceover script is under word limit for 90s cut
wc -w docs/demo-video/voiceover.md | awk '{if ($1 > 400) exit 1}'

# Stage 2 yield math framing present in the script (NOT specific rate numbers — those are live and drift)
grep -q "sUSDe is yielding" docs/demo-video/script.md
grep -q "Aave Mantle E-Mode" docs/demo-video/script.md
grep -q "collateral covers the loan" docs/demo-video/script.md

# Final cuts exist with correct properties
test -f docs/demo-video/patron-demo-tight-90s.mp4 || echo "TODO: produce tight cut"
test -f docs/demo-video/patron-demo-full-2m30.mp4 || echo "TODO: produce full cut"

# If final cuts exist, validate codec + duration
if [ -f docs/demo-video/patron-demo-tight-90s.mp4 ]; then
  ffprobe -v error -show_streams docs/demo-video/patron-demo-tight-90s.mp4 | grep -q "codec_name=h264"
  dur=$(ffprobe -v error -show_format docs/demo-video/patron-demo-tight-90s.mp4 | grep duration | head -1 | cut -d= -f2)
  awk -v d="$dur" 'BEGIN { if (d < 85 || d > 100) exit 1 }'
fi

if [ -f docs/demo-video/patron-demo-full-2m30.mp4 ]; then
  dur=$(ffprobe -v error -show_format docs/demo-video/patron-demo-full-2m30.mp4 | grep duration | head -1 | cut -d= -f2)
  awk -v d="$dur" 'BEGIN { if (d < 120 || d > 180) exit 1 }'
fi

# README references the video URL
grep -q "youtu" README.md || echo "TODO: add YouTube URL to README in story-114"
```

## Notes

- **The audio must match the on-screen action.** Per the user's strict demo-shape rule in ux-spec: every voiceover line aligns with the visual it's describing. No "and now we're going to..." filler narration over a static screen. Story this story very tightly per second.
- **Two cuts, not one.** The 90-second tight cut is for the X thread (story-113); the 2:30 full cut is for DoraHacks submission (rubric explicitly says ≥ 2 min for Deployment Award) and for the README embed.
- **Verbatim Stage 2 copy is non-negotiable.** PRD § Demo moment Stage 2 specifies the exact yield math language. The script must include it word-for-word, and the on-screen modal during recording must render that exact copy (story-76 already enforces this).
- **Live Mainnet recording** — record against the deployed Mainnet contracts (story-110) and the live Mainnet-wired demo storefronts (story-104 + story-111). NOT Sepolia. This is the Demo Day rehearsal proof.
- **Story-118 (live demo rehearsal) gates this.** Run the rehearsal first; if anything fails in the recording, fix it before re-recording rather than editing around the failure.
- **Backup plan if Mainnet flake during recording:** record against Sepolia with a clear "Sepolia" badge in the bottom-right corner. Acceptable per Deployment Award rubric (testnet allowed). Document the fallback in `recording-checklist.md`.
- **Voiceover production:** prefer human voiceover (Abu's voice) for credibility; ElevenLabs fallback is acceptable if time-boxed. The sahil-elevenlabs skill is available if needed.
- **No music bed.** Music can mask audio sync issues and distracts from the math copy. Clean voiceover only.
- **Captions:** burn-in subtitles for accessibility + sound-off viewing (X auto-plays muted). Use Aegisub or YouTube auto-captions + manual correction.
- **Don't commit raw assets to git.** `raw.mov` (likely 1-2GB) and uncompressed `.wav` stay local. Only the final mp4s (≤ 300MB each) + scripts go in the repo, via LFS or S3 backup.
- The mp4s + script land in `docs/demo-video/` so story-114 (README) and story-117 (DoraHacks) can reference them.
- File size < 400 LOC for any text artifact (scripts will stay well under).
