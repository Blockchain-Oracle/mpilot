# Story — `@mpilot/skill` generic skill framework (SKILL.md generator + JSON output contract validator)

**ID:** story-156-skill-framework
**Epic:** Epic E9 — RealClaw Skill
**Depends on:** story-22-sdk-skeleton, story-300-tools-registry
**Estimate:** ~2h
**Status:** PENDING (NEW 2026-06-14)

---

## User story

**As a** developer integrating mPilot into a third-party agent skill (RealClaw, Claude Skills, OpenAI custom GPTs, or a custom in-house skill registry)
**I want to** `pnpm add @mpilot/skill` and call `generateSkillManifest({ tools, profile })` to emit a valid SKILL.md from any subset of `@mpilot/tools`, plus `validateSkillOutput(skill, json)` to assert that a tool's JSON output conforms to its declared `outputSchema`
**So that** any team can ship a mPilot-powered skill in under 30 LOC, the JSON output contract (per ADR-014 / 017) is enforced at the skill boundary, and `packages/skill-mantle-agent` becomes a thin caller of this framework rather than hand-authored YAML

---

## Context

This story is **distinct from `@mpilot/skill-mantle-agent`** (story-150). That package is the *concrete published RealClaw skill*. THIS package is the *generic framework* that builds such skills from a tool selection + profile. `skill-mantle-agent` becomes a thin consumer of `@mpilot/skill` in a follow-up refactor — but this story does NOT modify `skill-mantle-agent`; it only ships the framework.

Per ADR-014, every `ConciergeTool` declares `inputSchema` AND `outputSchema`. The skill manifest must mirror these into the host registry's format (RealClaw frontmatter, Claude Skills YAML, etc.). The JSON output contract validator (`validateSkillOutput`) is the runtime gate that prevents schema drift at the skill→host boundary.

---

## File modification map

- `packages/skill/package.json` — NEW — `"type": "module"`, `"sideEffects": false`, `"engines.node": ">=22"`, runtime deps on `@mpilot/tools` + `zod-to-json-schema` + `yaml`, peer dep on `zod ^3.25 || ^4.1`. `tsup` build. Exports: `.` and `./profiles`.
- `packages/skill/src/types.ts` — NEW — `SkillProfile` discriminated union: `'realclaw' | 'claude-skills' | 'openai-gpt' | 'custom'`; `SkillManifest` interface; `SkillManifestInput` interface (name, description, version, tools, profile, permissions). ~50 LOC.
- `packages/skill/src/profiles/realclaw.ts` — NEW — `renderRealClawManifest(input): string` — emits SKILL.md with RealClaw frontmatter (per `research/concierge/06-realclaw-skill-pkg.md`). ~60 LOC.
- `packages/skill/src/profiles/claude-skills.ts` — NEW — `renderClaudeSkillsManifest(input): string` — emits Claude Skills format. ~50 LOC.
- `packages/skill/src/profiles/openai-gpt.ts` — NEW — `renderOpenAiGptManifest(input): { instructions: string; actions: unknown }` — emits OpenAI Custom GPT action spec from tool schemas. ~50 LOC.
- `packages/skill/src/profiles/custom.ts` — NEW — `renderCustomManifest(input, template): string` — caller-supplied Mustache-style template renderer. ~30 LOC.
- `packages/skill/src/profiles/index.ts` — NEW — barrel.
- `packages/skill/src/generateSkillManifest.ts` — NEW — `generateSkillManifest(input: SkillManifestInput): SkillManifest` — dispatches to the profile renderer. ~30 LOC.
- `packages/skill/src/validateSkillOutput.ts` — NEW — `validateSkillOutput(tool: ConciergeTool, json: unknown): SafeParseResult` — runs `tool.outputSchema.safeParse(json)` with bigint-string coercion. Returns `{ success, data, error: { issues: [{ path, message, code }] } }`. ~40 LOC.
- `packages/skill/src/contaminationGuard.ts` — NEW — `assertNoPatronContamination(text: string): void` — throws if any of `/BNPL|Buy.Now.Pay.Later|yield.spread.wedge/i` matches. Used at manifest-render time. ~15 LOC.
- `packages/skill/src/permissionsMap.ts` — NEW — maps `ConciergeTool.name` patterns to `read:agent` / `write:agent` / `execute:onchain` scopes. ~25 LOC.
- `packages/skill/src/index.ts` — NEW — barrel: exports `generateSkillManifest`, `validateSkillOutput`, all profile renderers, `SkillProfile`, `SkillManifest`, `SkillManifestInput`, `assertNoPatronContamination`. ~15 LOC.
- `packages/skill/src/__tests__/generateSkillManifest.test.ts` — NEW — ≥ 6 cases (one per profile + custom template + permissions inference + contamination throw).
- `packages/skill/src/__tests__/validateSkillOutput.test.ts` — NEW — ≥ 6 cases (happy path, missing field, type mismatch, bigint coercion, nested error path, multiple issues).
- `packages/skill/src/__tests__/profiles.test.ts` — NEW — ≥ 6 cases (each profile renders, frontmatter parses, schema fields present).
- `packages/skill/tsconfig.json` — NEW — extends base.
- `packages/skill/tsup.config.ts` — NEW — multi-entry (`.` + `./profiles`), `format: ['esm']`, `dts: true`.
- `packages/skill/README.md` — NEW — quickstart (15-LOC example), profile reference, validator usage.

---

## Acceptance criteria (BDD)

```
Given `generateSkillManifest({ profile: 'realclaw', name: 'mantle-agent', description: 'Autonomous DeFi agent for Mantle', version: '0.1.0', tools: [<aave tool>, <portfolio tool>] })` runs
When the result is parsed
Then it is a string starting with `---\n` AND the YAML frontmatter has fields `name`, `description`, `version`, `tools` (array of tool names), `permissions` (array)

Given the description passed to generateSkillManifest contains the string "Buy-Now-Pay-Later"
When the function runs
Then it throws an Error referencing Patron contamination AND no file is written

Given the same input with profile: 'claude-skills'
When rendered
Then the output is a valid Claude Skills manifest distinct in shape from the realclaw one

Given the same input with profile: 'openai-gpt'
When rendered
Then the output has `instructions: string` AND `actions` is a valid OpenAPI 3 schema derived from each tool's inputSchema

Given a `ConciergeTool` whose name matches /^(pause|resume|revoke|execute|propose)/
When permissionsMap infers scopes
Then the result includes `write:agent` AND `execute:onchain` (NOT just `read:agent`)

Given a JSON output `{ id: 'p_1', actionSummary: 'Supply 100 USDC', estimatedAprDelta: 0.034, expiresAt: '2026-06-14T10:00:00Z' }` and the proposeAction tool
When `validateSkillOutput(proposeActionTool, json)` runs
Then result.success is true AND result.data matches the proposal shape

Given the same tool and a malformed output missing `actionSummary`
When `validateSkillOutput` runs
Then result.success is false AND result.error.issues contains an entry with path `['actionSummary']` AND message describing the missing required field

Given a tool output containing `{ amount: "1234567890" }` (bigint serialized as string per ADR-014)
When `validateSkillOutput` runs against a schema declaring `amount: z.coerce.bigint()`
Then result.success is true AND result.data.amount is a bigint

Given a custom-profile template `"Skill: {{name}}\nTools: {{toolNames}}"`
When rendered with `{ name: 'x', tools: [{ name: 't1' }] }`
Then output is `"Skill: x\nTools: t1"`

Given typecheck + LOC + lint
When `pnpm typecheck && pnpm check-file-loc && pnpm lint --filter @mpilot/skill` runs
Then all exit 0

Given the package builds
When `pnpm --filter @mpilot/skill build` runs
Then `dist/index.js`, `dist/index.d.ts`, `dist/profiles/index.js` all exist

Given tests
When `pnpm --filter @mpilot/skill test` runs
Then ≥ 18 cases pass across the three test files
```

---

## Shell verification

```bash
test -f packages/skill/package.json
test -f packages/skill/src/generateSkillManifest.ts
test -f packages/skill/src/validateSkillOutput.ts
test -f packages/skill/src/contaminationGuard.ts
test -f packages/skill/src/profiles/realclaw.ts
test -f packages/skill/src/profiles/claude-skills.ts
test -f packages/skill/src/profiles/openai-gpt.ts
test -f packages/skill/src/profiles/custom.ts

# Package shape (ESM + sideEffects: false + peer zod)
node -e "
  const p = require('./packages/skill/package.json');
  if (p.type !== 'module') process.exit(1);
  if (p.sideEffects !== false) process.exit(2);
  if (p.dependencies?.zod) process.exit(3);
  if (!p.peerDependencies?.zod) process.exit(4);
  if (!p.exports?.['.'] || !p.exports?.['./profiles']) process.exit(5);
"

# Anti-Patron contamination: contaminationGuard EXISTS and is exported
grep -q "assertNoPatronContamination" packages/skill/src/index.ts
grep -qE "BNPL|Buy.Now.Pay.Later" packages/skill/src/contaminationGuard.ts

# Anti-regression: validator returns SafeParseResult shape, not throws
! grep -E "throw new (Schema|Validation)Error" packages/skill/src/validateSkillOutput.ts

pnpm --filter @mpilot/skill build
test -f packages/skill/dist/index.js
test -f packages/skill/dist/index.d.ts
test -f packages/skill/dist/profiles/index.js

pnpm --filter @mpilot/skill test 2>&1 | grep -cE "(✓|PASS)" | awk '$1 >= 18 {exit 0} {exit 1}'

pnpm check-file-loc
pnpm typecheck
```

---

## Notes for coding agent

- **NOT a replacement for `@mpilot/skill-mantle-agent`.** That package (story-150) is the published RealClaw skill. THIS one is the generic framework. Refactoring `skill-mantle-agent` to consume this framework is a separate story; do NOT touch `skill-mantle-agent` here.
- **`outputSchema` is the contract.** Per ADR-014 + ADR-017, the JSON output of every tool call is the contract between the agent and the skill host. `validateSkillOutput` is the boundary enforcement. Without it, drift between tool implementation and skill manifest goes undetected until production.
- **Contamination guard is non-negotiable.** Per CLAUDE.md + AUDIT-2026-06-04, the Patron BNPL language must NEVER appear in any shipped skill manifest. The guard runs at render time AND there's a unit test that asserts it throws.
- **Profile registry is open-ended.** The `'custom'` profile lets in-house teams use their own template; the framework provides Mustache-style `{{name}}` / `{{toolNames}}` interpolation only (no Turing-complete logic).
- **Bigint coercion** at the validator boundary: tools serialize bigints as strings (per `bigintSafeStringify` in `@mpilot/tools`); the validator accepts `z.coerce.bigint()` to round-trip cleanly.
- **Permissions inference** uses name-prefix matching (pause/resume/revoke/execute/propose → write+execute; everything else → read). Spec'd in `permissionsMap.ts`; tested explicitly.
- **No runtime imports of any provider package.** This package operates on `ConciergeTool[]` only — it MUST work with any tool selection, including third-party tools that conform to the shape.
- Cross-ref: ADR-014 (tools), ADR-017 (output contract = gen-UI contract), `research/concierge/06-realclaw-skill-pkg.md` (RealClaw frontmatter spec), story-150 (downstream consumer, NOT modified here).
