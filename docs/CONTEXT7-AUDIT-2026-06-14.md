# Context7 Retroactive Audit — 2026-06-14

**Trigger:** Abu, after PR #145 shipped 2 Vercel AI SDK v6 production bugs (missing `abortSignal` + `consumeSseStream`) because I wrote against training-data memory instead of querying Context7 for current docs. Acknowledged the structural risk: how many other surfaces shipped against my memory rather than the docs? Three highest-risk surfaces audited in parallel:

1. `packages/smart-account/` — ZeroDev SDK + Pimlico (permissionless) + viem. **$$$ risk** — session keys sign UserOps that move tokens.
2. `packages/attestation/` — Pinata V3 multipart + viem (EIP-712/keccak) + IPFS gateway. **Security risk** — bad hashing = unverifiable receipts.
3. `packages/mcp/` — `@modelcontextprotocol/sdk` 1.29. **Wire-protocol risk** — clients may render/handle tools incorrectly.

**Method:** per surface, an agent (a) read our pinned versions from `package.json`, (b) queried Context7 for the canonical patterns of the API surface we use, (c) ESM-probed actual exports in the pinned version, (d) listed concrete deltas.

---

## Severity-ordered findings

### 🔴 CRITICAL × 2

#### C1. `createKernelAccountClient` missing `userOperation.estimateFeesPerGas` — every UserOp wastes 5–50× gas

- **Files:** `packages/smart-account/src/createAccount.ts:69-81`, `packages/smart-account/src/connectAccount.ts:99-111`
- **What we ship:** `createKernelAccountClient({ account, chain, bundlerTransport, client, paymaster: {...} })` — no `userOperation` field at all.
- **What ZeroDev 5.4+ docs require:** `userOperation: { estimateFeesPerGas: async ({ bundlerClient }) => getUserOperationGasPrice(bundlerClient) }`. Migration note 5.3→5.4: *"`estimateFeesPerGas` is now required within the `userOperation` object… recommended to avoid excessively high default gas prices."*
- **Risk:** Every UserOp uses viem's default fee estimation (single `eth_gasPrice` × arbitrary multipliers) instead of Pimlico's `pimlico_getUserOperationGasPrice`. On Mantle (volatile L1 data fee) this can overpay 5–50× per op. On mainnet (`paymaster: 'none'`, user pays MNT), the waste comes out of the user's smart account directly. **Every tick wastes money.**
- **Fix:** Wire `gasPrice.ts`'s existing `getUserOpGasPrice` into the kernel client. ~10 LOC change at both call sites.

#### C2. Attestation hash double-truth — `hash.ts` (raw keccak) vs `eip712.ts` (EIP-712 typed-data) produce different `bytes32` for the same envelope

- **Files:** `packages/attestation/src/hash.ts` vs `packages/providers/erc8004/src/eip712.ts`
- **What we ship:** `hash.ts` computes `keccak256(toBytes(canonical))` over the JCS envelope. `eip712.ts` computes `hashTypedData({domain:{name:'Concierge',version:'1',chainId},types:{ActionAttestation:[...]}, ...})`. The two paths produce different `bytes32` for the same logical attestation. `writeAttestation.ts:33-39` JSDoc already documents this as a story-84 blocker.
- **What docs say:** ERC-8004 `ReputationRegistry.giveFeedback(agentId, schema, feedbackURI, feedbackHash)` takes an arbitrary `bytes32` — contract does NOT enforce EIP-712. So whichever scheme we pick must be applied consistently. Per ADR-004 + CLAUDE.md non-negotiable §2 ("audit supersedes spec"), keccak wins.
- **Risk:** Unverifiable receipts. A verifier reading on-chain `feedbackHash` + pulling IPFS payload cannot reproduce the bytes32 because two production paths disagree.
- **Fix:** Per ADR-004 — rip out EIP-712 path. Rename/delete `hashActionPayload`. Ensure `attestAction` writes `dataHash = keccak256(toBytes(canonical))` from `computeFeedbackPair`. Add an integration test that asserts `onChainFeedbackHash === keccak256(toBytes(IPFS_content))`.

### 🟠 HIGH × 3

#### H1. `gasPrice.ts` is dead code — hand-rolled `fetch` against `pimlico_getUserOperationGasPrice` never wired to kernel client, and `permissionless` is not even installed

- **Files:** `packages/smart-account/src/gasPrice.ts` (193 LOC) + `packages/smart-account/package.json` (no `permissionless` dep)
- **What we ship:** Raw `fetch(bundlerUrl, ...)` with hand-written hex parsing (6 throw paths). Function exported but never called by `createAccount.ts` / `connectAccount.ts`.
- **What docs say:** `import { getUserOperationGasPrice } from 'permissionless/actions/pimlico'` — typed, returns `bigint` with `slow/standard/fast` tiers. Or `createPimlicoClient({...}).getUserOperationGasPrice()`.
- **Risk:** Drift (hand-rolled hex parsing missing edge cases Pimlico handles); dead code masquerading as gas-price control (compounds C1); no `permissionless` peer dep means tests can't exercise canonical wiring.
- **Fix:** Add `permissionless` to deps. Replace `gasPrice.ts` body with `getUserOperationGasPrice(bundlerClient)`. Then wire result into `userOperation.estimateFeesPerGas` (closes C1).

#### H2. EIP-712 domain omits `verifyingContract` — cross-deployment replay vector

- **File:** `packages/providers/erc8004/src/eip712.ts:5-10`
- **What we ship:** `EIP712_DOMAIN = { name: 'Concierge', version: '1' }` + `chainId` injected per-call. `verifyingContract` deliberately omitted.
- **What EIP-712 best practice says:** `{name, version, chainId, verifyingContract}` is the canonical full domain. Wallets display all four; verifying-contract is what prevents cross-deployment replay.
- **Risk:** A hash signed against the Mantle Mainnet Reputation contract is bit-identical to one against any fork of the same contract. If we ever sign these hashes (session-key flow), replay across deployments is possible.
- **Fix:** Closes naturally with C2 — if we rip out EIP-712 (keccak wins), this issue disappears. If we keep EIP-712 anywhere, pull `verifyingContract` from `@mpilot/shared/addresses.ts` per chain.

#### H3. Paymaster wiring inconsistent — `createBundlerClient` hardcodes `paymasterClient: null` on mantle-mainnet, but `createKernelAccountClient` honors `paymaster: 'pimlico'` on either chain

- **Files:** `packages/smart-account/src/createAccount.ts:60-66` vs `packages/smart-account/src/bundler.ts:69-70`
- **What we ship:** Two source-of-truth for "is sponsorship on?" — they can disagree.
- **What docs say:** Pimlico paymaster works on Mantle Mainnet too; the gating is a product choice, not an SDK constraint.
- **Risk:** Smart account thinks it's sponsored but the bundler client isn't (or vice versa). Subtle production bug surfaces only on Mainnet path.
- **Fix:** Pick one rule (recommend: `paymaster='pimlico'` allowed only on Sepolia per project memory) and lift to a shared helper. Apply at both entry points.

### 🟡 MEDIUM × 5

#### M1. `signer` cast to `any` masks two viem versions resolving in the workspace

- **Files:** `createAccount.ts:49-50`, `connectAccount.ts:64-65`, `issueSessionKey.ts:95`
- **What we ship:** `signer: config.owner as any` with a comment "cast avoids peer dep version skew."
- **What's actually happening:** `pnpm store` shows BOTH `viem@2.38.3` AND `viem@2.52.2` resolved. If `@zerodev/ecdsa-validator` was resolved against 2.38, the `LocalAccount` interface differs from 2.52. With `as any` we lose the warning.
- **Risk:** Worst case — signature verification passes at issuance but EntryPoint rejects with AA24 (Invalid Signature) at runtime.
- **Fix:** Add `viem` to `dependencies` at a single pinned version. Pin pnpm overrides. Drop the `as any`.

#### M2. Ignore Pinata's `data.id` (UUID) — store synthetic `pinata:${cid}`

- **File:** `packages/attestation/src/pinService.ts:107, 111`
- **What we ship:** `pinId: \`pinata:${cid}\`` — synthesized from the CID.
- **What docs say:** Pinata V3 response includes `data.id` (UUID like `0195f815-5c5e-…`) — the authoritative file identifier needed for `DELETE /v3/files/{id}` and list/reconcile.
- **Risk:** Pin reconciliation, deletion, Pinata dashboard correlation all broken. CID-derived pinId isn't unique across re-uploads.
- **Fix:** Parse `body.data?.id` and store as `pinId`; keep CID separate.

#### M3. MCP `registerTool` missing `title` + `annotations` — clients render raw `get_agent_state` instead of "Get Agent State"; safe reads still get confirmation prompts

- **Files:** `packages/mcp/src/server.ts:30-36`, `packages/mcp/src/tools/read/*.ts`
- **What we ship:** `registerTool(name, { description, inputSchema, outputSchema }, handler)`.
- **What v1.29.0 docs say:** Config accepts `title?`, `description?`, `inputSchema?`, `outputSchema?`, `annotations?`, `_meta?`. `annotations: { readOnlyHint, idempotentHint, openWorldHint }` lets clients skip confirmation prompts on safe reads.
- **Risk:** UX — Claude Desktop tool picker shows raw identifier. Safe reads (story-131's get_agent_state/get_reputation/get_attestation) prompt every call.
- **Fix:** Extend `ConciergeTool` type with optional `title` + `annotations`; forward in server.ts; set `annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true }` on the 3 read tools.

#### M4. MCP error envelope drops the typed `ConciergeError.code` discriminator — clients can't distinguish `AttestationFailed` from `ScanWindowExceeded`

- **File:** `packages/mcp/src/server.ts:51-58`
- **What we ship:** Catch returns `{ content: [...], isError: true }` — message stringified, type code lost.
- **What docs say:** SDK passes `_meta` through error envelopes; typed codes can flow there.
- **Risk:** Programmatic clients can't route on error type (retry vs paginate vs surface to user).
- **Fix:** Add `_meta: { code: err.code }` to the error envelope.

#### M5. Paymaster client manually unbound — fragile to future `this` usage inside viem's `PaymasterClient`

- **Files:** `createAccount.ts:75-80`, `connectAccount.ts:105-110`
- **What we ship:** `{ getPaymasterData: paymasterClient.getPaymasterData, getPaymasterStubData: paymasterClient.getPaymasterStubData }` — passes unbound method references.
- **What docs say:** `paymaster: paymasterClient` directly (canonical Pimlico-on-ZeroDev pattern). If unbinding, bind: `.getPaymasterData.bind(paymasterClient)`.
- **Risk:** Today viem doesn't use `this` inside these methods; a future minor that does will break us.
- **Fix:** `paymaster: paymasterClient` directly.

### 🟢 LOW × 6

- **L1.** `readValidatorNonce` falls back to deprecated `accountMetadata` — `getKernelV3Nonce` is canonical in 5.5.x. (`issueSessionKey.ts:149-170`)
- **L2.** `getEntryPoint('0.7')` called inline 3 times — hoist to module const.
- **L3.** Pinata CID regex `/^ba[a-z2-7]{56,256}$/` upper bound too generous — observed CIDs are ~59 chars. Tighten to `{56,128}`. (`pinService.ts:48`)
- **L4.** Streamable-HTTP transport doesn't expose stateless mode (`sessionIdGenerator: undefined`) — story-133 Cloudflare Worker may need it.
- **L5.** `wallet-bootstrap.ts` `mode: 'url'` elicitation plan needs `ctx.sessionId` — stdio bin can't support it. Document the constraint in ADR-011/ADR-017.
- **L6.** `ConciergeTool.inputSchema` typed as `z.ZodTypeAny` not `z.ZodObject<z.ZodRawShape>` — runtime `assertZodObject` works but a compile-time bound is tighter.

### 🟢 Patterns we get right (from all 3 surfaces)

**smart-account:**
- `KERNEL_V3_1` + `getEntryPoint('0.7')` — current canonical pairing
- `signerToEcdsaValidator` + `createKernelAccount({ plugins: { sudo: ecdsaValidator } })` — matches current tutorial
- `toPermissionValidator` + `toECDSASigner` from `@zerodev/permissions/signers` — current paths
- `createPaymasterClient` from `viem/account-abstraction` (not deprecated `permissionless/clients`)
- `getPluginsEnableTypedData` + `hashTypedData` + `recoverTypedDataAddress` for owner-signs-enable flow
- API key sanitization via `sanitizeCause` — beyond what docs prescribe

**attestation:**
- Raw multipart `Blob([canonical])` with `application/json` — Pinata does NOT re-serialize, so IPFS bytes equal keccak preimage. Load-bearing fix already documented in source
- `Authorization: Bearer <JWT>` header — matches Pinata V3 spec
- Streaming size cap with `r.body.getReader()` + null-body fallback — defends CWE-770/400
- Origin-only base URL validation (`pathname === '/'`) — sound CWE-918 mitigation
- Discriminated-union `PinAttempt` + `AgentHistoryEntry` — illegal states unrepresentable
- `AbortSignal.timeout()` defaulting throughout (15s pin, 60s attest, 10s gateway)
- `computeFeedbackPair` returns BOTH canonical + hash in one pass
- Canonicalize rejects bigint/NaN/undefined/non-enumerable/accessor/forbidden-proto/cyclic/depth>64 — stricter than RFC 8785

**mcp:**
- Stdio bin: stdout reserved for MCP JSON-RPC; all logs to `process.stderr` (ADR-011)
- `inputSchema` + `outputSchema` both required at the type level
- Success returns BOTH `content[text]` AND `structuredContent`
- `bigintSafeStringify` + `BigIntString` schema — bigints cross the wire as decimal strings
- StdioServerTransport / StreamableHTTPServerTransport — canonical import paths
- `sessionIdGenerator: crypto.randomUUID` with explicit CWE-330 guard

---

## Pinned versions audited

| Library | Pinned | Notes |
|---|---|---|
| `@zerodev/sdk` | 5.5.10 | current |
| `@zerodev/ecdsa-validator` | 5.4.9 | current |
| `@zerodev/permissions` | 5.6.3 | current; `CallPolicyVersion.V0_0_5` unverified (Context7 missing) |
| `permissionless` | NOT INSTALLED | required for fix-H1 |
| `viem` | 2.52.2 (peer `^2.52.0`) | but `2.38.3` ALSO resolved transitively — fix-M1 |
| `@modelcontextprotocol/sdk` | 1.29.0 | current |
| `zod` | 4.4.3 | current |
| Pinata SDK | NOT INSTALLED (raw fetch) | acceptable per current docs |

---

## Fix-PR proposal (severity-ordered)

| # | Title | Closes | Est. |
|---|---|---|---|
| 1 | `fix(smart-account): wire Pimlico gas-price into createKernelAccountClient` | C1 + H1 | 1h (adds `permissionless` dep; replaces gasPrice.ts body; wires `userOperation.estimateFeesPerGas` at both kernel-client construction sites; tests for the wiring + a fork-anvil round-trip showing gas vs idle viem default) |
| 2 | `fix(attestation,erc8004): rip out EIP-712 path; keccak is the canonical attestation hash` | C2 + H2 | 1.5h (delete `eip712.ts` or scope it to `_internal_unused/`; update `attestAction.ts` to use `computeFeedbackPair`; integration test against on-chain `feedbackHash === keccak256(IPFS_content)`; update story-42 spec with the resolved drift; remove JSDoc note in `writeAttestation.ts`) |
| 3 | `fix(smart-account): single-source paymaster decision rule` | H3 | 30min (shared helper `shouldUsePaymaster(chain, config)`; both call sites consume it; tests cover all 4 combinations of chain × paymaster setting) |
| 4 | `fix(smart-account): pin viem as direct dep + drop signer 'as any'` | M1 | 30min (add `viem ^2.52.2` to dependencies; pnpm overrides if needed; remove three `as any` casts; tests verify no two-viem-version warning) |
| 5 | `fix(attestation): parse and store Pinata data.id alongside CID` | M2 | 30min (rename `PinAttempt.pinId` semantics OR add `PinAttempt.pinataId?: string`; update DELETE/reconcile callers) |
| 6 | `fix(mcp): registerTool title + annotations + typed-error _meta` | M3 + M4 | 45min (extend `ConciergeTool` type in `packages/tools/`; forward `title` + `annotations` + `_meta` in `server.ts`; set readOnlyHint on the 3 story-131 read tools; tests assert tools/list emits `title`) |
| 7 | `fix(smart-account): paymaster client passed directly, not unbound` | M5 | 15min |
| 8 | `chore(smart-account): hoist getEntryPoint, drop accountMetadata fallback` | L1 + L2 | 15min |
| 9 | `chore(attestation): tighten Pinata CID regex bounds` | L3 | 15min |
| 10 | `docs(adr): document MCP elicitation session-id constraint + Worker stateless mode` | L4 + L5 + L6 | 30min |

**Total estimate:** ~5h of focused work. The two CRITICAL fixes (PRs #1 + #2) carry the bulk of the risk-reduction and should land before any further story execution.

---

## Process changes (already shipped)

1. **`CLAUDE.md` updated** (PR #146) — non-negotiable §2 now includes an explicit Context7 pre-story checklist that MUST be pasted into PR descriptions. Skipping research is now auditable from the PR itself.
2. **Memory pin:** `feedback_context7_before_library_code.md` — loads next session.
3. **Memory pin:** `feedback_six_reviewer_fleet_no_bypass.md` — pairs with the above (the chat-handler bug also escaped the reviewer fleet bypass).
4. **MEMORY.md index** updated with both pins.

---

*Audit performed by Claude Code session 2026-06-14 after Abu flagged the systemic risk that prior implementations had been written against training-data memory instead of Context7 docs. Three parallel autonomous agents queried Context7 for each surface's pinned-version canonical patterns and ESM-probed actual exports. Findings are concrete (file:line + quoted code + cited docs), not speculative.*
