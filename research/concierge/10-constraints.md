# Concierge — Constraints, Requirements, Standards

## Submission requirements (the *what*, not the *when*)

Mantle Turing Test 2026 submission requires all of the following per the prize doc. Each is a hard requirement for prize eligibility:

### Mantle deployment (Grand Champion + all track prizes)
- ✅ Smart contract deployed on **Mantle Mainnet (chain id 5000)**
- ✅ Contract **verified** on MantleScan (https://mantlescan.xyz)
- ✅ At least one **AI-powered function callable on-chain** — Concierge tick → ERC-8004 `giveFeedback` write IS the AI-powered function on-chain
- ✅ Submit **open-source repo** (GitHub, public) with **comprehensive README** (setup instructions, architecture overview, deployed contract addresses)
- ✅ Submit **runnable demo** (public URL — not localhost)
- ✅ Submit **project pitch** (DoraHacks form)
- ✅ Must be **nominated from at least one track**

### Agentic Economy (Byreal) track-specific
- ✅ Must use **core capabilities** of at least one of: Byreal Agent Skills / Byreal Perps CLI / **RealClaw** — Concierge qualifies via RealClaw skill packaging
- ✅ Deploy on **Mantle** (or Solana — Mantle is our choice)
- ✅ Open-source repo + runnable demo + one-line pitch (in DoraHacks form)
- ✅ Answer in submission: *"Which Byreal on-chain capabilities does your project use? What scenario are they applied to?"*

### Best UI/UX
- ✅ Runnable **frontend interface** (`concierge.xyz/app`)
- ✅ Submit demo video OR publicly accessible link (both ship)

### 20-Project Deployment Award (first-come 20 spots)
- ✅ Smart contract on Mantle Mainnet OR Testnet — Concierge deploys to both
- ✅ Verified on Mantle Explorer
- ✅ AI-powered function callable on-chain
- ✅ Frontend publicly accessible
- ✅ Deployment address in DoraHacks submission
- ✅ Demo video **≥ 2 minutes** walking through core use case
- ✅ Open-source GitHub repo with README

### Community Voting
- ✅ Automatically eligible upon submission
- ✅ Voting on **X (Twitter) Platform**

### Required hashtag
- ✅ **`#MantleAIHackathon`** on the X thread (submission qualification + Community Voting eligibility per Mantle press release)

## The official submission window

The Phase 2 (AI Awakening) submission window closes 2026-06-15 15:59 UTC per the prize doc. This is documented as a fact for the submission system, not as the build rhythm. We ship when the product clears our quality bar; we use the window when it does. Quality discipline beats clock discipline.

## Submission artifacts checklist (for DoraHacks)

Each item must exist + be public when we submit:

- [ ] **Mainnet contract addresses** verified on MantleScan
  - `ConciergeRegistry.sol` (agent identity + goal/policy storage)
  - Session-key validator contract (if custom; or ZeroDev's stock validator)
- [ ] **Public frontend** at `concierge.xyz` — Vercel
- [ ] **Public app surface** at `concierge.xyz/app`
- [ ] **Public docs** at `concierge.xyz/docs`
- [ ] **MCP server** live at `mcp.concierge.xyz/api/sse`
- [ ] **`npx skills add @mpilot/mantle-agent`** installable + verified by demo install
- [ ] **7 npm packages published** under `@mpilot/*` scope
- [ ] **GitHub repo** public, MIT licensed, with full README (setup, architecture, addresses, screenshots)
- [ ] **Demo video** ≥ 2 minutes, recorded, hosted (Vercel/YouTube/direct upload to DoraHacks)
- [ ] **Demo video script** committed in repo (`docs/demo-video/script.md`)
- [ ] **X thread draft** committed in repo (`docs/x-thread/draft.md`), tagged `#MantleAIHackathon`
- [ ] **DoraHacks submission** form filled with:
  - One-line pitch (from `01-wedge-locked.md`)
  - Tracks nominated: Agentic Economy primary, Grand Champion, Best UI/UX, Community Voting, 20-Project Deployment
  - Byreal-capabilities-used answer (RealClaw skill packaging)
  - GitHub URL
  - Demo URL
  - MCP server URL
  - Demo video URL
  - All contract addresses
- [ ] **README "Deployed contracts" table** with mantlescan.xyz links for each address
- [ ] **README "Quick start" section** — `git clone` → `bun install` → `bun dev` works in ≤ 10 minutes

## Architectural / scope constraints (the *how*)

- **Solo dev + Claude/Codex AI tools + designer agent** — designer handles all visual + component implementation; I handle architecture + specs + agent runtime + on-chain
- **Mantle-only product surface** — no Solana, no L1, no non-EVM. Mantle Mainnet (5000) + Sepolia (5003)
- **TypeScript-first** — no Python in the agent runtime. Foundry/Solidity for contracts only
- **No premium-ui skill** — designer agent owns visual design
- **No reference-app catalogs for designer** — designer is expert, doesn't need visual study guides
- **Comprehensive domain knowledge folder is required input for sahil-spec-writer** — this folder you're reading
- **No pre-locked UI framework** — architecture specifies what components must *do* (states, transitions, streaming behavior, accessibility); designer picks Tambo vs assistant-ui vs custom shadcn vs whatever fits
- **400-LOC per-file budget enforced via Biome** (`noExcessiveLinesPerFile` nursery rule). Files > 400 LOC fail CI

## Quality standards (the *bar we hold*)

These are the standards every ship must meet, regardless of any timing window:

- **Every contract verified on MantleScan** with source code published
- **Every npm package published** with full README + types + examples
- **Every action provider has BDD-style integration tests** against Sepolia fork
- **Every UI flow keyboard-accessible** + screen-reader-friendly + motion-reduce-aware
- **Every tick on Mainnet writes a real ERC-8004 attestation** (no demo-mode stubs in production)
- **README ships with `bun install && bun dev` working in ≤ 10 minutes** for a clean clone
- **The demo video walks through a real scenario** (not a scripted toy case) — Sepolia playground or small-amount Mainnet
- **Open-source quality** — others can `npm install @mpilot/sdk` and ship their own agent within an hour of reading docs
- **No silent failures** — every error has a typed shape, surfaces to the user, and writes to history
- **The agent is observable** — every tick logs structured to Pino + Postgres; user can replay any tick

## Risk register (mitigations, not deadlines)

1. **ERC-8004 contract verification on Mantle.** Addresses appear in the canonical repo but devhub docs are thin. Mitigation: verify each address via `cast call` against the canonical ABI before integration; stub `IAgentRegistry` shim only if a real address can't be confirmed.

2. **ZeroDev ERC-4337 on Mantle.** ZeroDev claims support but unverified at Mantle's gas/precompile semantics. Mitigation: validate kernel-account deploy + session-key signing on Sepolia before depending on it in the agent runtime; fall back to EOA + signed-tx queue if it doesn't work.

3. **MCP server SSE over hosting platform.** Long-lived SSE may exceed Vercel function execution limits. Mitigation: validate against the actual tick stream early; deploy MCP server on Cloudflare Workers or Fly.io (mcp subdomain only) if Vercel limits hit.

4. **Mantle DEX SDK quality.** Merchant Moe + Agni + FusionX SDKs may be sparse. Mitigation: spike each to find the cleanest TS surface; WOOFi aggregation as optional price-improvement; pick best single DEX if aggregation isn't clean.

5. **Demo reliability.** Agent demos crash hard when LLMs hallucinate. Mitigation: comprehensive test suite, recorded backup video before submission, dry-run on presentation device, small-amount mainnet ticks ($1-$5) for live demo path.

6. **LLM cost runaway.** Every tick burns tokens. Mitigation: Sonnet 4.6 default with Opus 4.7 gated to hard-reasoning prompts; aggressive prompt caching; per-agent budget guardrails written into the runtime.

## Explicit OUT-of-scope (for THIS submission)

- Multi-LLM provider abstraction
- Mobile native app (PWA later)
- Email / push notifications
- Internationalization
- Multi-tenant SaaS billing
- Aggressive perp trading strategies
- zkML proofs
- NFT trading
- Real KYC flow for USDY (assume user already holds)
- Custom prediction markets (that's AgentArena plan B)
- Multi-agent swarms (single agent per user)
