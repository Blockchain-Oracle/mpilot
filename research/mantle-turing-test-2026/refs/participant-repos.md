# Participant Repos

**Scraped:** 2026-06-02
**Status:** No Phase 2 participant repos visible yet — DoraHacks BUIDL gallery is empty (`buidlsCount=0`). See `03-project-gallery.md` for the re-scrape plan.

This file is a structural placeholder. Populate after the T-72h and T-24h re-scrapes surface real submissions.

---

## Expected schema once populated

```md
### <Project name>
- **Track(s):** ...
- **Repo:** `<owner>/<repo>`
- **Stars:** N
- **Primary language:** ...
- **Last push:** YYYY-MM-DD
- **Maturity signal:** [greenfield / adapted / startup-grade]
- **Lane overlap with our wedge:** [high / medium / low]
- **What it does:** ...
- **What's interesting to borrow:** ...
- **What to avoid (where it likely fails):** ...
```

---

## Re-scrape execution

```bash
# Step 1: get the BUIDL list (browser MCP since DoraHacks API is WAF-blocked)
# Use Playwright or chrome-devtools MCP to navigate to:
#   https://dorahacks.io/hackathon/mantleturingtesthackathon2026/buidl
# and evaluate window.__NUXT_DATA__ to extract structured project data

# Step 2: for each project with a GitHub link
for repo in <list-from-scrape>; do
  gh repo view "$repo" --json name,description,stargazerCount,pushedAt,primaryLanguage,topics,defaultBranchRef
  gh api "repos/$repo/readme" --jq '.content' | base64 -d | head -100
done

# Step 3: classify each
# - Maturity: count commits; check pushed_at; look at README polish
# - Lane overlap: compare description keywords to our target wedge keywords
```

---

## Adjacent signal sources (use until BUIDL gallery populates)

### 1. `byreal-git` org activity since 2026-05-01
```bash
gh api orgs/byreal-git/events --jq '.[] | select(.created_at > "2026-05-01") |
  {type, repo: .repo.name, actor: .actor.login, time: .created_at}'
```

### 2. ClawHub registry commits since 2026-05-01
```bash
gh api repos/openclaw/clawhub/commits --jq '.[] |
  select(.commit.author.date > "2026-05-01") |
  {sha: .sha[0:7], msg: .commit.message, author: .commit.author.name, date: .commit.author.date}'
```

### 3. GitHub search: ERC-8004 + Mantle-flavored recent activity
```bash
gh search repos --topic erc-8004 --sort updated --limit 30
gh search repos --topic mantle --sort updated --limit 30
gh search code "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" --limit 20
gh search repos "mantleturingtesthackathon" --limit 30
```

### 4. X hashtag (until sahil-x is fixed, use web search)
- Hashtag: `#MantleAIHackathon`
- Required on every submission per press release
- Threads will appear ahead of formal DoraHacks submissions for teams optimizing for Community Voting

---

## When this file gets populated

Run after each of:
- 2026-06-12 (T-72h scrape)
- 2026-06-14 (T-24h scrape)
- 2026-06-15 (T+ post-deadline scrape)

Each pass: append a dated section with the new projects + re-classify lane overlap with the locked wedge.
