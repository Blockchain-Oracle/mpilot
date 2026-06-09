# Story 05 — Branch protection + PR template + CODEOWNERS

**Epic:** Epic 0 — Foundation
**Estimated:** ~0.5h
**Depends on:** story-03-github-actions-ci, story-04-foundry-init-and-ci

## BDD Acceptance Criteria

```
Given the repo is on GitHub
When a developer attempts to push directly to main
Then GitHub rejects the push
And the developer is instructed to open a PR instead

Given a PR is opened
When the PR is submitted
Then the .github/pull_request_template.md content is auto-populated in the description

Given a PR has CI failures
When a developer tries to merge
Then GitHub blocks the merge with "Required status checks not met"

Given a PR has been opened
When less than 1 approving review exists (and the developer is solo)
Then either: a) merge is blocked OR b) the solo developer can self-approve via the configured rule
```

## File modification map

- `.github/pull_request_template.md` — NEW — sections: Summary, Story link, BDD acceptance criteria status, Test plan, Screenshots/recordings (if UI), Risk surface, Checklist
- `.github/CODEOWNERS` — NEW — `* @abu` (solo project default; can be extended if collaborators join)
- `scripts/setup-branch-protection.sh` — NEW — `gh api` calls to set branch protection rules on `main`:
  - required PR review (1 approval; solo dev exemption via personal account)
  - required status checks: `ci / biome`, `ci / typecheck`, `ci / vitest`, `ci / build`, `contracts-ci / forge`, `contracts-ci / slither`, `contracts-ci / aderyn`
  - dismiss stale reviews on new commits
  - require linear history (no merge commits)
  - block force-pushes
  - allow squash merges only

## Shell verification

```bash
# Run the setup script (requires gh auth login + repo admin permissions)
./scripts/setup-branch-protection.sh

# Verify branch protection is set
gh api repos/:owner/:repo/branches/main/protection > /tmp/protection.json
cat /tmp/protection.json | jq '.required_status_checks.contexts | length' | xargs test 7 -le
cat /tmp/protection.json | jq '.required_pull_request_reviews.required_approving_review_count' | xargs test 1 -le
cat /tmp/protection.json | jq '.allow_force_pushes.enabled' | grep false

# Try to push directly (should fail)
git checkout main
git commit --allow-empty -m "test direct push"
git push origin main 2>&1 | grep -i "protected"
git reset --hard HEAD~1
```

## Notes

- This story requires GitHub repo admin permissions (`gh auth login` as repo owner).
- The script is idempotent — running twice doesn't break anything.
- If working solo, the `required_pull_request_reviews` can be set to `0` (effectively disabled) — but for hackathon hygiene + showing the architect-agent / pr-audit subagent flow, keep `1` and use the `sahil-pr-audit` agent as the reviewer.
- PR template MUST include the BDD acceptance criteria from the story; the orchestrator's PR creation step pastes these in.
- CODEOWNERS triggers auto-review-request when matched files change. Useful for routing reviews even in solo work (catches your own PRs in notifications).
