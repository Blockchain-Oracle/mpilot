# Agent Architecture Research — Patron

Scope: research only — surfaces patterns and prior art. No architecture recommendations for Patron specifically.

Status tags: **SHIPPED** = live in production product, **DEMO** = hackathon/reference impl, **THEORETICAL** = proposed standard / draft / blog post pattern.

---

## Q1 — Portable AI agent patterns in 2026

### 1.1 OpenClaw Skill install pattern

**Install paths** (SHIPPED). `openclaw skills install <slug>` (workspace) or `--global` (`~/.openclaw/skills`); also `openclaw skills install git:owner/repo@ref` and `./path/to/skill`. Skills are markdown files with YAML frontmatter that follow the AgentSkills spec — portable by copy.
Source: https://docs.openclaw.ai/tools/skills

**Where credentials live** (SHIPPED). Credentials stay on the host machine, never in the sandbox. Skill manifests declare `requires.env` (env-var names) and `primaryEnv`. Actual secrets resolve from one of: Gateway process env, `~/.openclaw/.env`, the `env` block in `~/.openclaw/openclaw.json`, or login-shell import. Workspace `.env` is **blocked** from providing provider credentials. Env injection is scoped to the host agent run, not the sandbox.
Source: https://docs.openclaw.ai/gateway/security · https://docs.openclaw.ai/help/environment

**Publisher / signing model** (PARTIAL — closer to THEORETICAL than SHIPPED). ClawHub uses GitHub OAuth for publisher accounts; blue-checkmark "verified publisher" badges exist; `openclaw skills verify <slug>` requests a `clawhub.skill.verify.v1` trust envelope; installed skills carry `.clawhub/origin.json` with version + registry recorded. **However**, third-party 2026 analyses note there is currently no code signing, no release attestation, and no rollback mechanism — i.e. the trust envelope verifies registry provenance, not a cryptographic publisher signature. A maintainer account compromise pushes malicious updates to everyone who installed.
Sources: https://docs.openclaw.ai/clawhub · https://vibecoding.app/blog/openclaw-clawhub-skills-security · https://github.com/openclaw/clawhub

**Foreign-runtime install** (SHIPPED — implicit). Because a Skill is plain markdown with frontmatter conforming to the cross-vendor "AgentSkills spec," any compliant runtime can load it. Auth model is *machine-level* — the runtime supplies secrets from its own env; the Skill itself doesn't carry credentials. There is no per-Skill OAuth or capability token. Effectively: portability = file portability; trust = host-machine trust.
Source: https://docs.openclaw.ai/tools/skills

### 1.2 ERC-8004 cross-app usage in the wild

**`Eversmile12/create-8004-agent`** (DEMO — scaffolder). Write-only pattern: scaffolds agents that mint themselves as ERC-721 NFTs in the Identity Registry, expose `/.well-known/agent-card.json` + a JSON-RPC `/a2a` endpoint, and point at IPFS metadata. No reputation *reading* implemented — interop happens through the standardized discovery endpoints (A2A, MCP), not by querying ERC-8004 reputation directly.
Source: https://github.com/Eversmile12/create-8004-agent

**`AgentlyHQ/aixyz`** (SHIPPED — SDK). A "Next.js for agents" — `aixyz erc-8004 register` and `aixyz erc-8004 update`. Wires up A2A + MCP + x402 + ERC-8004 on Ethereum, Base, Polygon, Scroll, Monad, BSC, Gnosis. The framework treats ERC-8004 as the *identity primitive* other agents resolve, with x402 settling payments referencing the agent's ID. Reputation read/write isn't part of the framework — left to integrators.
Source: https://github.com/AgentlyHQ/aixyz

**`ChaosChain/chaoschain-genesis-studio`** (DEMO). Implements ERC-8004 v1.0 in full triad: Identity (ERC-721), Reputation (feedback scores), Validation (stake-secured verification). Notable cross-app pattern: agents generate **RSA256 JWT tokens** from RSA keypairs in `./keys/` to carry tamper-proof authorization across services — the JWT signs *on-chain identity attestations* off-chain. This is one of the few examples binding off-chain auth to ERC-8004 identity.
Source: https://github.com/ChaosChain/chaoschain-genesis-studio

**AdPrompt.ai** (SHIPPED — first commercial). Registers its marketing agent under ERC-8004 and gates three purpose-scoped API resources via x402 pay-per-use. Other agents/merchants discover and pay AdPrompt's agent without prior trust relationship — using the ERC-8004 record as the trust anchor and x402 receipts as reputation feedback.
Source: https://www.prweb.com/releases/adpromptai-registers-its-agentic-marketing-solution-under-erc-8004-for-on-chain-agent-identity-and-reputation-signals-302689395.html

**Pattern summary across the field**: most shipped uses treat ERC-8004 as a *discoverable identity anchor* with reputation written but rarely *read cross-app*. The "read reputation from another app's agent before transacting" loop is more aspirational than common in mid-2026.

### 1.3 Sign-in-with-Agent precedents

**SIWE / EIP-4361** (SHIPPED — incumbent). Sign-In with Ethereum is the canonical "sign a structured human-readable message → off-chain service authenticates the address" pattern. Domain + statement + URI + nonce + chain-id + issued-at — wallet signs, server verifies. Direct analog for "agent signs in as itself" would be the agent's wallet (its bound ERC-6551 TBA or its EOA) signing a SIWE message naming the foreign app as the relying party.
Sources: https://eips.ethereum.org/EIPS/eip-4361 · https://docs.login.xyz/general-information/siwe-overview/eip-4361

**Cognition Devin → GitHub/Slack** (SHIPPED). Devin authenticates to integrated apps via standard OAuth flows the *user* completes (GitHub App permissions for Read/Write/Pull Request; Slack/Linear OAuth). Credentials live in Devin's isolated cloud VM per session. There is no agent-side identity primitive — the user is the principal; Devin is a delegated worker that holds OAuth tokens scoped per integration.
Source: https://docs.devin.ai/release-notes/2026 · https://cognition.ai/blog/how-cognition-uses-devin-to-build-devin

**GPT Store / Claude Skills marketplace** (SHIPPED, but weak on author identity). Custom GPT actions use OpenAPI schemas and per-action auth (API key or OAuth). The GPT's *author identity* travels as marketplace metadata (creator name, verified-builder badge), but skills do not carry cryptographically signed publisher credentials. Same architecture as ClawHub: marketplace-attested provenance, not signed packages.
Source: https://openai.com/index/introducing-the-gpt-store/

**No mature "sign-in-with-Agent"** (THEORETICAL). No widely-shipped product yet imports a foreign agent's identity into a host app the way SIWE imports a wallet. The closest precedent is the **IETF draft `draft-oauth-ai-agents-on-behalf-of-user`** (active, mid-2026) — extends OAuth with `requested_actor` and `actor_token` so consent screens show the *agent's* identity alongside the user's, and access tokens document the full delegation chain.
Source: https://www.scalekit.com/blog/oauth-ai-agents-architecture

### 1.4 Scoped API keys vs OAuth-for-agents vs signed-message

**OAuth 2.1 + PKCE + RFC 8693 token exchange** (SHIPPED — Stytch, Scalekit, Keycard, WorkOS, Composio). Production consensus mid-2026. Agents are public clients → PKCE required. RFC 8693 lets every hop exchange a parent token for a narrowed child token; full delegation chain is traceable, revocable, expires with the session. Multi-hop pattern: user→app→agent→sub-agent each carries a downscoped token.
Sources: https://www.scalekit.com/blog/oauth-ai-agents-architecture · https://workos.com/blog/oauth-multi-hop-delegation-ai-agents · https://stytch.com/blog/agent-to-agent-oauth-guide/

**Anthropic Managed Agents — Credential Vault** (SHIPPED). Anthropic's Console has a per-org credential vault; agents request secrets at runtime; vault enforces scope-per-agent and logs every use. Pattern: *secrets held centrally by runtime, agent never sees the raw key*.
Source: https://www.mindstudio.ai/blog/what-is-anthropic-managed-agents

**EIP-7702 session keys** (SHIPPED on Ethereum mainnet via Pectra, May 2025). EOA delegates code to a contract that grants scoped permissions to a session key (spending cap, contract allowlist, time window, gas sponsorship). The agent holds the session key, not the master key. Revocable any time. Mid-2026 reference impls from OpenZeppelin, Openfort, 7BlockLabs.
Sources: https://docs.openzeppelin.com/contracts/5.x/eoa-delegation · https://www.openfort.io/blog/eip-7702 · https://www.7blocklabs.com/blog/session-based-authentication-on-ethereum-delegation-patterns-for-eip-7702

**Privy policy engine** (SHIPPED). Server-defined policies (policies/rules/conditions) gate signatures from embedded smart wallets. Configurable via dashboard, Node SDK, or REST. The policy engine evaluates *before* signing — so the user's wallet itself enforces the agent's scope.
Source: https://privy.io/blog/turning-wallets-programmable-with-privy-policy-engine

**Lit Protocol PKPs + Lit Actions** (SHIPPED V0 sunsetting Feb 2026, Chipotle network launching 2026 as rebuild). PKPs are DKG-generated keypairs where >2/3 of nodes must collaborate to sign; **Lit Actions** are JS programs that gate signing on auth methods (Google OAuth, Discord, wallet sig, custom). Useful when you want a key that *can't* be exported and whose signing rules are programmable code. Chipotle is the 2026 rebuild for HTTP-native agent workflows.
Sources: https://developer.litprotocol.com/user-wallets/pkps/overview · https://spark.litprotocol.com/updates-to-minting-programmable-key-pairs-pkps-with-lits-relay-server/

**Infisical agent-vault** (SHIPPED). HTTP credential proxy + vault — agents call the proxy, never see raw secrets, proxy injects on outbound. Supports Claude Code, OpenClaw, custom harnesses.
Source: https://github.com/Infisical/agent-vault

**2026 consensus pattern** for "let an external tool act on behalf of my agent": **OAuth 2.1 + RFC 8693 token exchange for off-chain APIs**, **EIP-7702 session keys for on-chain actions**, **credential vault for secrets that must touch the agent runtime**. Signed-message (SIWE-style) is used for *authentication* (login) but not for ongoing authorization.

### 1.5 Cross-chain reputation portability

**ERC-8004 canonical CREATE2 deploy** (SHIPPED). Registries deployed at deterministic addresses on 25+ chains since 2026-02-16 — so an agent's ID `{namespace}:{chainId}:{identityRegistry}` resolves the same code on every chain. This is the *infrastructure* for cross-chain portability.
Sources: https://eips.ethereum.org/EIPS/eip-8004 · https://github.com/erc-8004/erc-8004-contracts

**Cross-chain reputation reads** (THEORETICAL → DEMO). The spec contemplates portable reputation via "cryptographic proofs and cross-chain attestations" — an agent registered on chain X presents proofs of chain X reputation to a verifier on chain Y. No widely-cited shipped product mid-2026 demonstrates an end-to-end cross-chain reputation-aware transaction. AdPrompt and aixyz both register on multiple chains but reputation reads stay same-chain.
Sources: https://medium.com/@gwrx2005/erc-8004-a-trustless-extension-of-googles-a2a-protocol-for-on-chain-agents-b474cc422c9a · https://www.allium.so/blog/onchain-ai-identity-what-erc-8004-unlocks-for-agent-infrastructure/

**ENS-bound agent identity** (SHIPPED — emerging). ENS blog proposes ENS subdomains as the human-readable handle layer over ERC-8004 — `payments.alice.eth` resolves to the agent's registry record. Gives cross-chain identity *resolution* even when reputation reads stay siloed.
Source: https://ens.domains/blog/post/ens-ai-agent-erc8004

**The Graph backing both x402 + ERC-8004** (SHIPPED). The Graph indexes ERC-8004 reputation/validation events across chains and exposes them as queryable subgraphs — closest thing to a "cross-chain reputation API" available mid-2026.
Source: https://thegraph.com/blog/understanding-x402-erc8004/

### 1.6 Recommended portability surface for Patron

UI/architecture-agnostic considerations the next architect should weigh:

1. **Two-layer portability** is the field's pattern: (a) identity primitive that travels (ERC-8004 NFT + optional ENS handle), (b) authorization primitive the foreign tool actually needs (OAuth token, session key, signed message). Identity ≠ authorization. The NFT alone doesn't let OpenClaw act on the user's behalf.
2. **What the agent's "behavior" actually is**: a Skill (markdown + frontmatter) + a credential bundle. Skill is portable by file; credential bundle is not — credentials must be re-issued per host runtime.
3. **Sign-in-with-Agent** as a primitive worth inventing: extend SIWE so the signed payload names *the agent NFT* as the principal and *the user wallet* as the controller, letting a relying app verify both. Aligns with the IETF `requested_actor`/`actor_token` direction.
4. **Session-key-as-default for on-chain actions**: EIP-7702 lets the user mint a scoped session key the agent uses; spending cap + contract allowlist + time window. Revocation is one tx. This is the field's answer to "agent has a private key."
5. **Credential vault (not raw env)** for off-chain secrets: pattern from Anthropic Managed Agents, Infisical agent-vault, Privy policy engine. Agent calls a vault endpoint, vault enforces scope per-host-tool.
6. **Reputation reads are siloed in 2026**: portable identity infra exists (CREATE2 + The Graph), but cross-chain reputation reads aren't a settled UX. If Patron wants a foreign tool to read the user's agent reputation, the *foreign tool* needs the integration — Patron's job is to keep emitting clean attestations.
7. **Trust envelope, not code signing, is what's shipped**: ClawHub's `clawhub.skill.verify.v1` envelope is registry-provenance attestation. If Patron wants stronger guarantees ("this Skill update was actually approved by the publisher"), that's a gap to fill or accept.
8. **OAuth-for-agents (RFC 8693 token exchange)** is the cross-vendor standard converging in 2026 for "external tool acts on behalf of agent." Aligning with it makes a Patron agent immediately usable by any host that already speaks OAuth 2.1 for agents.

---

## Q2 — Agent management dashboard UX patterns

### 2.1 Anthropic Console (Managed Agents dashboard)
- Sits inside Anthropic Console. Positioned as **ops layer**, not builder — "watch them run, catch problems early, maintain accountability."
- **Per-session tracing**: every agent invocation gets a unique session ID with full sequence of steps, tool calls, model outputs.
- **Tool/permission inspector** per agent — what the agent can call.
- **Credential vault** for secrets the agent needs.
- **Cost/usage telemetry** broken down by workflow, model, time period.
- **Filter for failures/anomalies**; step-level drilldown for debugging.
Source: https://www.mindstudio.ai/blog/what-is-anthropic-managed-agents · https://www.mindstudio.ai/blog/anthropic-managed-agents-dashboard-guide

### 2.2 OpenAI Assistants Playground + GPT Store creator dashboard
- **Two-tab creator UI** ("Create" via prompting vs "Configure" via form fields).
- **Live preview pane** updates as you edit — config on left, conversation on right.
- **Tool toggles** (Functions, Retrieval, Code Interpreter) with file upload built-in for Retrieval.
- **Threads + Runs model**: each thread = a conversation session; runs are bound to thread+assistant pair. Both surfaced as inspectable objects.
- **Publish gate**: save-for-me vs save-for-everyone (with marketplace metadata).
- **No native cross-thread analytics dashboard** in Assistants v2 — observability is bolted on externally.
Source: https://platform.openai.com/docs/assistants/overview · https://developers.openai.com/api/docs/assistants/deep-dive · https://openai.com/index/introducing-the-gpt-store/

### 2.3 Replit Agent dashboard
- **Split workspace**: Agent pane on one side, admin/preview on the other.
- **Long-running session indicator** (Agent 4 runs 200+ min on Max autonomy).
- **Sub-agent visualization**: Agent 4 splits tasks into sub-agents that run in parallel and recombine — UI shows the fan-out.
- **App Monitoring** for published apps with anomaly alerts.
- **Logs + production database access** built into the agent's debugging loop.
- **Real-time stream** of agent decisions and tool calls; user can intervene mid-flight.
Sources: https://blog.replit.com/introducing-agent-4-built-for-creativity · https://docs.replit.com/replitai/agent · https://blog.replit.com/introducing-agent-3-our-most-autonomous-agent-yet

### 2.4 Cognition Devin dashboard
- **Sessions page** is the primary surface — flat list with rich filters.
- **Sub-Devin filter** for child sessions; parent/child combined filtering.
- **Each Devin has its own interactive cloud IDE** that user can drop into mid-run (Cmd+I, Cmd+K).
- **Slack/Linear/CLI entry points** all converge into the same session object — "messaging a colleague" interaction model.
- **Step-by-step plan view** with real-time progress; user can redirect, clarify, correct at any point.
- **PR generation** as the natural artifact of completed work, linked back to the session.
Sources: https://docs.devin.ai/release-notes/2026 · https://cognition.ai/blog/devin-2 · https://cognition.ai/blog/introducing-devin-2-2

### 2.5 Lindy
- **Visual block-based workflow builder** — multi-step agents drawn as graphs.
- **Action history view**: actions taken, decisions made, when human escalation occurred.
- **Autosave drafts** + discard-draft button (treats agent config like Figma documents).
- **Triggers + actions for self-observation** ("Task Completed" trigger; "Get Task Details" returns full run history).
- **Credit/usage display** in UI with upcoming-plan preview.
- **Granular access controls** per agent.
- **Test panel** for running sample scenarios without going live.
Source: https://www.lindy.ai/changelog · https://www.nocode.mba/articles/lindy-ai-review

### 2.6 Modal / Beam / Cloudflare Workers AI / Cloudflare Agents
- **Cloudflare Agents**: every agent has a built-in SQL DB + key-value state that **syncs to connected clients in real-time** via WebSockets. State survives restarts, deploys, hibernation.
- **`keepAlive()` heartbeat** prevents eviction during long tool chains (idle window is 70-140s otherwise).
- **`useAgent` React hook** for client-side reactive UI bound to agent state.
- **Durable Objects** give each agent its own database — surfaced in dashboard as per-agent storage.
- **Cloudflare's "Agent Lee"** is the new top-level UI surface — chat + observability + control plane consolidated.
Sources: https://developers.cloudflare.com/agents/concepts/long-running-agents/ · https://blog.cloudflare.com/introducing-agent-lee/ · https://blog.cloudflare.com/durable-object-facets-dynamic-workers/

### 2.7 Wallet managers as inspiration
- **Privy dashboard**: policy engine UI — policies/rules/conditions as primitives; "what actions is this wallet allowed to take?" answered in plain language.
- **Session-key consolidated view**: every active session key listed with plain-language permission summary; "Revoke all" + individual revoke. (Openfort, ZeroDev, Penguards-style extensions.)
- **Emergency Freeze** as a one-tap mobile primitive (Cobo Agentic Wallet pattern) — pauses all active "Pacts" (delegated permission sets) at once.
- **Per-pact termination** to revoke a single delegation without nuking the rest.
- **Real-time policy modification** — spending limits, allowlists, approval thresholds adjustable without redeploying the agent.
- **Self-hosted wallet admin dashboards** add a JWT session token per agent with configurable TTL, renewal limits, absolute lifetime.
Sources: https://www.openfort.io/blog/how-to-build-wallet-permissions · https://docs.privy.io/recipes/agent-integrations/agentic-wallets · https://www.cobo.com/post/agentic-wallet-ai-crypto-wallet-guide · https://github.com/1lystore/dcp

### 2.8 Synthesis — UI elements Patron's dashboard should consider

Pure UI/interaction list, not architecture. Pulled from what consistently appears across the dashboards above.

**Identity + reputation surface**
- The agent NFT as a "hero card" — token ID, ENS handle, controlling wallet, chain badge(s).
- Reputation score with breakdown by validator/feedback source.
- Validation receipts ledger (which validator signed what, when).
- Optional: cross-chain reputation aggregation if/when the foreign-chain read story matures.

**Live activity surface**
- Sessions list with rich filters (status, time, action type, counterparty) — Devin pattern.
- Per-session step-by-step plan with real-time progress.
- Step-level drilldown: every tool call, every decision point, every signature.
- Filter-for-failures view.
- Real-time stream via WebSocket (Cloudflare Agents pattern).

**Control surface (the wallet-style primitives)**
- One-tap "Emergency Freeze" (Cobo pattern) — pauses all delegated permissions immediately.
- Per-permission revoke ("Revoke all" + individual).
- Active session-key list with plain-language permission summaries (Openfort/Privy pattern).
- Real-time policy modification: spending cap, contract allowlist, time window — adjustable without redeploying the agent.
- Human-escalation log: when did the agent ask for approval, what did the user decide.

**Configuration surface**
- Skill list (installed Skills, version, source, last update) with per-Skill enable/disable toggle.
- Tool toggles (Functions, Retrieval, x402 endpoints).
- Credential vault view: what secrets does the agent have access to, scoped to which Skill.
- Two-tab editor (prompt-based "create" vs form-based "configure") with live preview — OpenAI Assistants pattern.
- Autosave drafts + discard-draft button (Lindy).
- Test/sandbox panel for dry-run scenarios.

**Portability surface (the "export the agent" affordance)**
- "Connect to external tool" flow — OAuth-style consent screen showing the foreign app's identity + the scope it's requesting from the agent.
- Active integrations list with per-integration revoke.
- "Sign-in-with-Agent" button generator (relying-party developers get a copy-paste snippet).
- Skill export/share via ClawHub-style trust envelope.
- API key / session key generation with TTL + scope picker.

**Cost / health surface**
- Usage telemetry — gas spent, x402 payments made/received, LLM tokens, by workflow + time period (Anthropic Console pattern).
- Anomaly alerts (Replit App Monitoring pattern).
- "Manage your agent's wallet": balance, transaction history, top-up.

**Three UI elements that surprised the researcher**
- **Emergency Freeze as a single tap** — agentic-wallet UX has converged on it, but most agent dashboards (Anthropic, OpenAI, Lindy) lack the equivalent panic button.
- **Sub-agent fan-out visualization** — Replit Agent 4 and Devin's Sub-Devin filter expose the parallel-work tree as a first-class UI object, not buried in logs.
- **Plain-language permission summaries** — Openfort/Privy translate session-key bytecode permissions into "Can spend up to 100 USDC on Aave every 24h until June 30" — a primitive that maps directly to "user understands what their agent is allowed to do."
