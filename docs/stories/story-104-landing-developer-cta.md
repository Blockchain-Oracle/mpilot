# Story — Landing developer CTA (npm install + docs link)

**ID:** story-104-landing-developer-cta
**Epic:** Epic E7 — Web App
**Depends on:** story-100-next-app-scaffold
**Estimate:** ~30min
**Status:** PENDING

---

## User story

**As a** Mantle developer landing on concierge.xyz
**I want to** see a developer-focused CTA block with code samples (npm install, basic usage) and a clear docs link
**So that** I can evaluate "can I integrate this into my own product?" without clicking through to the docs first

---

## File modification map

- `apps/web/components/landing/DeveloperCTA.tsx` — NEW — block with headline "Built for developers" or similar; code blocks showing `pnpm add @concierge-mantle/sdk` and a 5-line example of using the SDK to register an agent + read reputation. Links to /docs.
- `apps/web/components/landing/CodeBlock.tsx` — NEW — reusable syntax-highlighted code block (uses shiki or rehype-pretty-code). Has copy-to-clipboard button.
- `apps/web/components/landing/__tests__/DeveloperCTA.test.tsx` — NEW — RTL test
- `apps/web/lib/copy-to-clipboard.ts` — NEW — `useCopyToClipboard()` hook

---

## Acceptance criteria (BDD)

```
Given the section renders
When inspected
Then it contains a code block with `pnpm add @concierge-mantle/sdk` AND a 5-line example AND a link to /docs

Given the code block
When clicked the copy button
Then the code is copied to clipboard (verified by spy on navigator.clipboard.writeText)

Given the syntax highlighting
When inspected
Then the code block is rendered with semantic colors (NOT a flat monospace text dump)

Given the docs link
When clicked
Then it navigates to /docs (no new tab — the user is choosing to leave the landing intentionally)

Given the example code
When evaluated
Then it actually works as documented (the 5 lines are real, not pseudocode — judges will copy-paste)

Given the code block on mobile
When viewed at 375px
Then horizontal scroll is enabled within the block (NOT shrinking the font to unreadable)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd apps/web
test -f components/landing/DeveloperCTA.tsx
test -f components/landing/CodeBlock.tsx

cd ../..

pnpm --filter @concierge-mantle/web run build
test $? -eq 0

# Real install command (NOT placeholder)
grep -q "pnpm add @concierge-mantle/sdk" apps/web/components/landing/DeveloperCTA.tsx

# /docs link present
grep -q "/docs" apps/web/components/landing/DeveloperCTA.tsx

# Tests pass
pnpm --filter @concierge-mantle/web run test 2>&1 | grep "DeveloperCTA" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Real working code.** Judges will copy-paste the example. If it doesn't run, the credibility hit is fatal. Test the example against a freshly-installed clean project.
- **Use shiki for syntax highlighting** — server-side rendered, no client-side cost. Reference: shiki.style.
- **Copy-to-clipboard with feedback.** When clicked, show a brief "Copied!" toast or icon swap for 2 seconds. Better UX than silent copy.
- **Mobile horizontal scroll on code blocks** preserves readability. Shrinking font to fit is anti-pattern.
- **The 5-line example** should do something concrete: register an agent, read its reputation. NOT "import { Concierge } from '@concierge-mantle/sdk'" alone — too abstract. Reference: `research/concierge/03-providers/erc8004.md` § Integration pattern for a real-shape example.
- **Link to /docs in this story is correct** — the docs site itself doesn't exist yet (story-170+). Stub for now; story-176 wires the actual docs.
- Cross-ref: `research/concierge/08-ux-component-intent.md` § developer CTA, `packages/sdk/README.md` (story-22 — the README's quickstart should mirror this block).
