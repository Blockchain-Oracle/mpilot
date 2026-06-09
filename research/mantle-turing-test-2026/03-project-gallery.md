# 03 — Project Gallery

**Scraped:** 2026-06-02
**Gallery URL:** https://dorahacks.io/hackathon/mantleturingtesthackathon2026/buidl
**Total visible projects (`buidlsCount`):** **0**
**Applications registered:** 179
**Hackers registered:** 842
**Teams formed:** 9
**Status flags:** `isBuidlsPrivate: false`, `enableWhitelist: false`

---

## The empty-gallery fact

13 days before the submission deadline, the DoraHacks BUIDL gallery shows **zero submitted projects**, despite 179 applications and 842 hackers registered. The page is *not* private. The platform allows anyone to browse what's been submitted, and nothing has been.

There are two plausible explanations:

### Explanation A — submit-at-the-end behavior (most likely)
DoraHacks lets teams build privately and click "Submit BUIDL" only when their project is final. Most teams hold to avoid telegraphing strategy. We'd expect a sharp rush of submissions in the final 72 hours. This is the default behavior we'd expect to see.

### Explanation B — admin-gated BUIDL flow
DoraHacks' BUIDL submission flow may require an admin approval step before listing publicly. We'd then see no submissions until after the deadline, when organizers batch-approve.

**Either way, the public gallery is unreliable as competitive intel until T-72h.** Re-scrape at:
- 2026-06-12 (T-72h)
- 2026-06-14 (T-24h)
- 2026-06-15 evening (T+ post-deadline)

---

## All projects (table)

*N/A — gallery is empty as of 2026-06-02.*

To be re-scraped at the timestamps above. Expected schema once populated:

| Name | Track(s) | Description | GitHub | Demo | Team |
|---|---|---|---|---|---|
| _(none yet)_ | | | | | |

---

## Top-N deep reads

*N/A — no projects to deep-read.*

---

## What we *can* infer about the competing field

From the DoraHacks Nuxt state metadata:

- **9 teams formed** out of 842 hackers and 179 applications. That's a **5% team-formation rate** on the platform — suggests most participants will compete solo or in small ad-hoc groups.
- `ecosystem` tags on the hackathon: **Mantle Network, Animoca Brands, Z.AI, Nansen, Tencent Cloud** — these are the partner orgs the platform expects projects to cluster around.
- `field` tags: **Blockchain, AI, Trading, Claw** — the "Claw" tag is unusual, suggests OpenClaw / RealClaw / ClawHub are central themes the platform expects entrants to use.

**Implication for our build:** integrating OpenClaw Skills + Mantle + at least one credit-sponsor API (Nansen, Elfa, Surf, Orbit, Z.ai) covers the platform-level tag matching. The submission form will likely surface these as filters.

---

## Re-scrape plan

```bash
# T-72h: 2026-06-12
# T-24h: 2026-06-14
# T+: 2026-06-15 23:59 UTC

# Tool: Playwright (DoraHacks API is AWS-WAF-blocked; curl on the HTML page works but
# the BUIDL list is rendered by Nuxt and requires JS evaluation to populate)

# Suggested invocation pattern (browser MCP):
#   1. browser_navigate to https://dorahacks.io/hackathon/mantleturingtesthackathon2026/buidl
#   2. browser_wait_for the BUIDL grid container
#   3. browser_evaluate() to extract structured data from window.__NUXT_DATA__
#   4. Paginate if buidlsCount > items-per-page
```

For each project once visible, capture: `name`, `track[]`, `description`, `githubUrl`, `demoUrl`, `teamSize`, `submissionStatus`.

Then for the top 10 (sorted by track overlap with our wedge):
- Fetch GitHub via `gh repo view <owner>/<repo> --json description,stargazerCount,pushedAt,primaryLanguage,topics`
- Read README via `gh api repos/<owner>/<repo>/readme`
- Classify maturity: **greenfield** (no prior history) / **adapted** (forked OSS) / **startup-grade** (real product)
- Classify lane overlap with our wedge: **high** / **medium** / **low**

---

## Adjacent intel sources (since the gallery is empty)

Until DoraHacks fills up, use these as substitute competitor signal:

1. **OpenClaw skill registry (ClawHub):** scan for any Mantle/Byreal/ERC-8004-flavored skills shipped during the hackathon window — https://github.com/openclaw/clawhub
2. **GitHub search:** `org:byreal-git pushed:>2026-05-01` and `topic:erc-8004 pushed:>2026-05-01` to catch hackathon teams that build in public.
3. **X search:** `#MantleAIHackathon` (the official submission hashtag) — the press release requires every submission to thread on X with this tag. Threads appear before DoraHacks submissions for teams optimizing for Community Voting prize.
4. **The mandatory X thread requirement is a leak vector** — teams that pre-tease their submission via the hashtag are essentially publicly announcing their wedge. Watch the hashtag daily from T-7.

---

## What this means for strategy

- **Don't assume the field is sparse.** 842 registered hackers is real density. The empty gallery is a visibility gap, not a participation gap.
- **No public lane-saturation signal until late.** Lane verdicts in `06-hidden-field.md` are derived from sponsor / judge / thesis alignment + comparable hackathons, not from incumbents.
- **Plan for the X hashtag scrape as the primary late-stage intel source.**
- **The empty-gallery itself is the most useful single intel artifact right now** — it tells us we can't predict competition shape, so our wedge needs to be defensible *on absolute merit* rather than relative novelty.
