# Story 104 — Vercel deploys for all 3 demo merchants on patron.xyz subdomains

**Epic:** Epic 7 — Demo Merchants
**Estimated:** ~1.5h
**Depends on:** story-100-threads-by-mara-storefront, story-101-pixelink-storefront, story-102-dialer-pro-storefront, story-103-merchant-onboarding-via-cli

## BDD Acceptance Criteria

```
Given each of the 3 demo merchants has its build passing
And the per-merchant secrets from story-103 are loaded into Vercel projects
When `pnpm deploy:demos` runs (from the repo root)
Then each merchant deploys to Vercel production
And each is reachable at its own subdomain:
  - https://threads-by-mara.patron.xyz returns 200 with the Threads by Mara homepage
  - https://pixelink.patron.xyz returns 200 with the Pixelink homepage
  - https://dialer-pro.patron.xyz returns 200 with the Dialer Pro homepage
And each subdomain has a valid TLS cert (no cert warnings)

Given each storefront loads in a fresh browser
When the page renders
Then the <PatronButton> (or vanilla SDK button) targets PATRON_API_URL = https://api.patron.xyz (or staging URL during dev)
And clicking it triggers the real /orders/intent flow against the deployed Patron API
And the merchant's NEXT_PUBLIC_PATRON_MERCHANT_KEY matches the on-chain registered key from story-103

Given the deploy is complete
When a developer checks the Vercel project settings for each merchant
Then each project has:
  - Custom domain configured
  - Production env vars set (NEXT_PUBLIC_PATRON_*)
  - "Ignored build step" command set so deploys only trigger on changes under demo-merchants/<slug>/**

Given Github push to main runs
When CI evaluates the diff
Then only the affected demo-merchant deploys are triggered (path-filtered via Vercel ignored build step OR via .github/workflows/deploy-demos.yml monorepo-aware paths)

Given the lighthouse audit runs against each deployed URL
When the score is computed
Then performance ≥ 80 and accessibility ≥ 90 on each homepage
```

## File modification map

- `vercel.json` (per-merchant, NEW under each `demo-merchants/<slug>/vercel.json`) — NEW × 3 — declares framework, build command, output dir, ignored-build-step (`git diff --quiet HEAD^ HEAD ../../packages/sdk-js packages/sdk-react . || exit 1`), and the cleanUrls setting
- `scripts/deploy-demos.sh` — NEW — bash script: for each of (threads-by-mara, pixelink, dialer-pro), `cd demo-merchants/<slug> && vercel --prod --token $VERCEL_TOKEN --scope $VERCEL_TEAM` ; expects per-merchant Vercel project linked via `vercel link`
- `scripts/setup-demo-vercel-projects.sh` — NEW — one-time bootstrap: `vercel link` each merchant directory, then `vercel domains add <slug>.patron.xyz`, then push env vars from `packages/contracts/scripts/onboard/secrets/<slug>.env` via `vercel env add` for each line
- `.github/workflows/deploy-demos.yml` — NEW — GitHub Actions: on push to `main` with paths `demo-merchants/**` or `packages/sdk-*/**`, run deploy for the affected merchants only. Uses Vercel CLI with `--token`.
- `packages/contracts/scripts/onboard/README.md` — UPDATE (extend the readme from story-103) — add a "Wiring secrets to Vercel" section that points to `scripts/setup-demo-vercel-projects.sh`
- `package.json` (root) — UPDATE — add scripts: `"deploy:demos": "bash scripts/deploy-demos.sh"`, `"setup:demo-vercel": "bash scripts/setup-demo-vercel-projects.sh"`
- `README.md` (root) — UPDATE — add a "Demo merchant URLs" section listing the 3 production subdomains (filled in once deploys succeed; flagged TODO until story-110/111 are also green so all addresses match)
- `docs/DNS.md` — NEW — one-screen note documenting DNS records required for the 3 subdomains (CNAME → `cname.vercel-dns.com`) and how to verify in the registrar

## Shell verification

```bash
# Pre-flight
test -n "$VERCEL_TOKEN"
test -n "$VERCEL_TEAM"

# Vercel projects linked
for slug in threads-by-mara pixelink dialer-pro; do
  test -f demo-merchants/$slug/.vercel/project.json || { echo "$slug not linked"; exit 1; }
done

# Deploy
pnpm deploy:demos
test $? -eq 0

# Subdomains live
for slug in threads-by-mara pixelink dialer-pro; do
  curl -sfI https://$slug.patron.xyz | grep -q "200"
done

# TLS cert valid
for slug in threads-by-mara pixelink dialer-pro; do
  echo | openssl s_client -servername $slug.patron.xyz -connect $slug.patron.xyz:443 2>/dev/null | openssl x509 -noout -dates
done

# Merchant key wired (HTML contains the public key prefix from onboarding output)
for slug in threads-by-mara pixelink dialer-pro; do
  expected_prefix=$(grep "PATRON_MERCHANT_KEY=" packages/contracts/scripts/onboard/secrets/$slug.env | cut -d= -f2 | cut -c1-8)
  curl -s https://$slug.patron.xyz | grep -q "$expected_prefix" || echo "WARN: $slug merchant key not on page (may be runtime-injected only — verify in browser)"
done

# Lighthouse a11y on each
for slug in threads-by-mara pixelink dialer-pro; do
  npx lighthouse https://$slug.patron.xyz --only-categories=accessibility --quiet --chrome-flags="--headless" --output=json --output-path=/tmp/lh-$slug.json
  node -e "const r = require('/tmp/lh-$slug.json'); if (r.categories.accessibility.score < 0.9) process.exit(1);"
done
```

## Notes

- **Three independent Vercel projects, one Cloudflare-managed DNS zone (`patron.xyz`).** Each merchant is `<slug>.patron.xyz` so judges see real-looking URLs on Demo Day.
- The `patron.xyz` domain itself hosts the main Patron web app (`apps/web`) on `www.patron.xyz` and the API on `api.patron.xyz` — those are separate Vercel + Railway deploys, not part of this story.
- **Per-merchant Vercel projects (not a single monorepo project)** — required because each merchant has its own custom domain and we want path-filtered deploys (only affected merchant redeploys when its code changes).
- The `setup-demo-vercel-projects.sh` is one-time-per-environment. Document the manual prompts (`vercel link`, `vercel domains add`) in the script's header comments so a fresh developer can follow them.
- Env var hygiene: `packages/contracts/scripts/onboard/secrets/<slug>.env` files are gitignored. The setup script reads them at deploy time and pushes via `vercel env add`. NEVER commit these files.
- The "Ignored build step" command in `vercel.json` is the cheapest way to avoid all-merchants-redeploy on every push. Use `git diff --quiet HEAD^ HEAD ../../packages/sdk-* .` (returns non-zero if there's a diff, which Vercel interprets as "build needed").
- The GH Actions workflow is a backup path: if Vercel's ignored-build-step heuristic is too loose, the workflow has explicit per-merchant deploy jobs gated by `paths` filters.
- **Demo Day URL hygiene matters.** A judge typing `pixelink.patron.xyz` and getting a clean 200 with TLS green is a credibility win. If DNS isn't set up early, this story stalls.
- Story-118 (live demo rehearsal) verifies all 3 URLs load + checkout works end-to-end on Mainnet, so this story's verification on Sepolia is sufficient as a gate.
- Mainnet variant: when story-111 completes (Mainnet merchant onboarding), re-run this story's `pnpm deploy:demos` with `PATRON_API_URL=https://api.patron.xyz` and the Mainnet merchant keys swapped in. Document the cutover in `scripts/deploy-demos.sh` header.
- File size < 400 LOC per file (the bash scripts will stay short).
