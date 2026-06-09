# 05 — ZeroDev + ERC-4337: Smart Accounts & Session Keys on Mantle

**Purpose:** Concrete patterns for Concierge's on-chain execution layer. Read by `sahil-spec-writer` before generating wallet/execution stories.

**Stack:** ZeroDev Kernel v3 smart account + permission validator (session keys) + viem clients + Pimlico bundler/paymaster on Mantle (chain id 5000) since ZeroDev's hosted bundler does not document Mantle support.

---

## 1. ZeroDev SDK overview

Repo: `zerodevapp/sdk` (monorepo). Docs: https://docs.zerodev.app

ZeroDev is a smart-account stack built on top of viem and ERC-4337. The core wallet is **Kernel** — a modular smart account where behavior is added by plugging **validators** in.

Two slot kinds for validators:
- `sudo` validator — full-control validator (usually an ECDSA key tied to the user's EOA). Required.
- `regular` validator — bounded validator (e.g. session key + permission policies). Optional.

You can build a Kernel account three ways:
1. **Sudo-only** — EOA-signed UserOps, full control. Like an EOA but smart (batched calls, sponsored gas).
2. **Sudo + session-key** — UserOps signed by a separate key that's bounded by on-chain policies (call targets, amounts, time window).
3. **Sudo + permissions plugin** — same idea but with the newer `@zerodev/permissions` package and `policies` array (recommended).

Core packages:
- `@zerodev/sdk` — `createKernelAccount`, `createKernelAccountClient`, `createZeroDevPaymasterClient`.
- `@zerodev/ecdsa-validator` — `signerToEcdsaValidator` (sudo).
- `@zerodev/permissions` — `toPermissionValidator`, `toECDSASigner`, `serializePermissionAccount`.
- `@zerodev/permissions/policies` — `toCallPolicy`, `toTimestampPolicy`, `toSudoPolicy`, `toSpendingLimitPolicy`.

---

## 2. ERC-4337 primer (just enough)

ERC-4337 is account abstraction without consensus changes. Four moving parts:

| Component       | What it is                                                                |
| --------------- | ------------------------------------------------------------------------- |
| **Smart Account** | A contract wallet (Kernel here) that validates its own UserOps.         |
| **UserOperation** | Pseudo-tx struct (sender, calldata, gas fields, signature, paymaster).  |
| **EntryPoint**    | Singleton contract (v0.6, v0.7, v0.8) that runs UserOps after validation. |
| **Bundler**       | Off-chain mempool node that batches UserOps into one EntryPoint call.   |
| **Paymaster**     | Optional contract that pays gas on behalf of the user (ETH or ERC-20).  |

Entry-point versions on Mantle (verified via Pimlico docs, https://docs.pimlico.io/infra/platform/supported-chains):
- **V06**: `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789`
- **V07**: `0x0000000071727De22E5E9d8BAf0edAc6f37da032`
- **V08**: `0x4337084d9e255ff0702461cf8895ce9e3b5ff108`

Pimlico explicitly supports Kernel 0.3.0-beta and 0.3.1 on Mantle under V06/V07. Use V07 (latest stable for Kernel).

---

## 3. Mantle support — the critical question

**[UNVERIFIED via ZeroDev docs]** — ZeroDev's homepage claims "50+ networks" but their `/sdk/faqs/chains`, `/meta-infra/networks`, and `/sdk/infra/intro` pages do not enumerate Mantle. The ZeroDev SDK source (`zerodevapp/sdk`) shows test configs for Sepolia and Optimism Sepolia only. Conclusion:

- **ZeroDev *SDK* (account, validators, permissions) is chain-agnostic** — it builds Kernel UserOps for any EVM chain.
- **ZeroDev *hosted bundler/paymaster* support for Mantle is not documented.**

**Recommended path:** Use ZeroDev SDK for the account + permission validators, but route the bundler RPC and paymaster RPC through **Pimlico** (confirmed Mantle support).

```typescript
import { http } from 'viem';
import { mantle } from 'viem/chains';
import { createKernelAccount, createKernelAccountClient } from '@zerodev/sdk';
import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator';
import { getEntryPoint, KERNEL_V3_1 } from '@zerodev/sdk/constants';

const entryPoint = getEntryPoint('0.7');
const PIMLICO_RPC = `https://api.pimlico.io/v2/mantle/rpc?apikey=${process.env.PIMLICO_API_KEY}`;

const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
  signer: ownerSigner,
  entryPoint,
  kernelVersion: KERNEL_V3_1,
});

const account = await createKernelAccount(publicClient, {
  plugins: { sudo: ecdsaValidator },
  entryPoint,
  kernelVersion: KERNEL_V3_1,
});

const kernelClient = createKernelAccountClient({
  account,
  chain: mantle,
  bundlerTransport: http(PIMLICO_RPC),
  client: publicClient,
  // paymaster: optional, see §5
});
```

**Fallback if Pimlico routing fails:** Drop ERC-4337 entirely and use a plain EOA + queue (described in §7). This is the fire-break; the wedge survives either way.

---

## 4. Session keys via `@zerodev/permissions`

Session keys are the killer feature for an autonomous agent. The user (sudo) approves an ephemeral signer with on-chain bounds:
- Which **contracts** it can call.
- Which **functions** it can call on those contracts.
- Which **argument values** are allowed (e.g. only `recipient = userAddress`).
- A **value cap** (max ETH/MNT transferred per call).
- A **time window** (`validAfter`, `validUntil`).
- A **spending limit** (per-token, per-period).

Agent worker holds the session-key private key — if it leaks, the blast radius is bounded by these policies, not by the user's full balance.

### 4.1 Owner side — approve a session key with policies

From `https://docs.zerodev.app/sdk/permissions/transaction-automation`:

```typescript
import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator';
import { addressToEmptyAccount } from '@zerodev/sdk';
import { toPermissionValidator, toECDSASigner } from '@zerodev/permissions';
import { toCallPolicy, toTimestampPolicy, ParamCondition, CallPolicyVersion } from '@zerodev/permissions/policies';
import { createKernelAccount, serializePermissionAccount } from '@zerodev/sdk';

const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
  entryPoint, kernelVersion, signer: ownerSigner,
});

const emptyAccount = addressToEmptyAccount(sessionKeyAddress);
const emptySessionKeySigner = await toECDSASigner({ signer: emptyAccount });

const callPolicy = toCallPolicy({
  policyVersion: CallPolicyVersion.V0_0_4,
  permissions: [
    {
      target: USDC_MANTLE,
      valueLimit: 0n,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [
        { condition: ParamCondition.EQUAL, value: LENDER_VAULT }, // only pay this lender
        null, // any amount (we cap separately via spending-limit policy)
      ],
    },
    {
      target: AGNI_ROUTER,
      valueLimit: 0n,
      abi: AGNI_ROUTER_ABI,
      functionName: 'swapExactTokensForTokens',
      args: [null, null, null, null, null, null], // unrestricted args — leave per-cycle guards to the agent
    },
  ],
});

const timestampPolicy = toTimestampPolicy({
  validAfter: Math.floor(Date.now() / 1000),
  validUntil: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
});

const permissionPlugin = await toPermissionValidator(publicClient, {
  entryPoint, kernelVersion,
  signer: emptySessionKeySigner,
  policies: [callPolicy, timestampPolicy /* , spendingLimitPolicy */],
});

const sessionKeyAccount = await createKernelAccount(publicClient, {
  entryPoint, kernelVersion,
  plugins: { sudo: ecdsaValidator, regular: permissionPlugin },
});

const approval = await serializePermissionAccount(sessionKeyAccount);
// Send `approval` (base64 string) to the agent worker. Agent never sees the owner's key.
```

### 4.2 Agent side — use the session key

The agent worker deserializes `approval` and pairs it with the local session-key private key. From the same docs:

```typescript
import { deserializePermissionAccount } from '@zerodev/permissions';
import { toECDSASigner } from '@zerodev/permissions/signers';

const sessionKeySigner = await toECDSASigner({ signer: privateKeyToAccount(SESSION_KEY_PK) });
const account = await deserializePermissionAccount(
  publicClient, entryPoint, kernelVersion, approval, sessionKeySigner,
);

const kernelClient = createKernelAccountClient({
  account, chain: mantle,
  bundlerTransport: http(PIMLICO_RPC),
});

const txHash = await kernelClient.sendUserOperation({
  callData: await account.encodeCalls([{ to: USDC_MANTLE, data: transferCalldata, value: 0n }]),
});
const receipt = await kernelClient.waitForUserOperationReceipt({ hash: txHash });
```

### 4.3 Available policy primitives

| Policy                    | Purpose                                                  |
| ------------------------- | -------------------------------------------------------- |
| `toCallPolicy`            | Restrict target + function + arg values.                 |
| `toTimestampPolicy`       | `validAfter` / `validUntil` window.                      |
| `toSpendingLimitPolicy`   | Total token-transfer cap over a period.                  |
| `toRateLimitPolicy`       | Max N UserOps per time window.                           |
| `toGasPolicy`             | Cap on gas paid by paymaster (DoS protection).           |
| `toSudoPolicy`            | "Allow everything" — only useful for testing.            |
| `toSignatureCallerPolicy` | Restrict who can broadcast (1559 relayer pattern).       |
| `toSignaturePolicy`       | Custom signature scheme.                                 |

Compose multiple — they're ANDed. Concierge uses at minimum: `toCallPolicy` + `toTimestampPolicy` + `toSpendingLimitPolicy`.

### 4.4 Revocation

Two paths:
- **Time-based** — let `validUntil` expire. Cheap, no on-chain action.
- **Active** — owner sends UserOp that uninstalls the permission validator. Costs gas but immediate.

Concierge UX: show "Session expires in X days. Renew?" + a single-tap **Revoke now** button.

---

## 5. Paymaster (gas sponsorship)

Optional but big UX win. From `https://docs.zerodev.app/sdk/core-api/sponsor-gas`:

```typescript
import { createZeroDevPaymasterClient } from '@zerodev/sdk';

const paymasterClient = createZeroDevPaymasterClient({
  chain: mantle,
  transport: http(PIMLICO_RPC),  // or ZeroDev's RPC if Mantle becomes supported
});

const kernelClient = createKernelAccountClient({
  account, chain: mantle,
  bundlerTransport: http(PIMLICO_RPC),
  paymaster: {
    getPaymasterData: (userOp) => paymasterClient.sponsorUserOperation({ userOperation: userOp }),
  },
});
```

For Mantle, MNT-as-gas is cheap (~$0.001/tx) so sponsoring is feasible at small scale. Alternatively, ERC-20 paymaster lets users pay gas in USDC/USDT — no need to hold MNT at all.

```typescript
// ERC-20 paymaster — user pays gas in USDC
const kernelClient = createKernelAccountClient({
  // ...
  paymaster: paymasterClient,
  paymasterContext: { token: USDC_MANTLE },
});
```

[UNVERIFIED] — does Pimlico's ERC-20 paymaster support USDC-on-Mantle as the gas token? Check at integration time; fallback is sponsor-with-MNT or user-pays-MNT.

---

## 6. viem integration

Everything above uses viem. Two clients to wire:

```typescript
import { createPublicClient, http } from 'viem';
import { mantle } from 'viem/chains';

const publicClient = createPublicClient({
  chain: mantle,
  transport: http(process.env.MANTLE_RPC),  // public RPC or Alchemy/QuickNode
});
```

`mantle` is in `viem/chains` (chain id 5000, rpc `https://rpc.mantle.xyz`, explorer `https://mantlescan.xyz`).

For signing the session key:

```typescript
import { privateKeyToAccount } from 'viem/accounts';
const sessionKeyAccount = privateKeyToAccount(SESSION_KEY_PK);
```

Store `SESSION_KEY_PK` in the worker's secret manager (Doppler, AWS Secrets, Vercel env, or—for the hackathon—a `.env` file with a comment "DEMO ONLY").

---

## 7. Fallback: EOA + signed-tx queue

If at integration time Pimlico's Mantle bundler is flaky, ZeroDev's permission plugin has unfixable Mantle bugs, or session-key approval txs revert at the EntryPoint — fall back to a plain-EOA path. We lose nice-to-haves (gasless, atomic batches, fine-grained policy) but the wedge still ships.

```typescript
// Worker holds the user's session-key as a plain EOA private key.
// User signs an EIP-712 "agent authorization" object off-chain that the
// frontend records. Worker reads policy from DB and self-enforces.
const walletClient = createWalletClient({
  account: privateKeyToAccount(EOA_PK),
  chain: mantle,
  transport: http(MANTLE_RPC),
});
const hash = await walletClient.writeContract({
  address: USDC_MANTLE, abi: ERC20_ABI, functionName: 'transfer',
  args: [LENDER_VAULT, amount],
});
```

**Difference for judging:** ERC-4337 + session keys is the differentiator that maps to Track 6 (autonomous agent infra). Fallback degrades that narrative. Decide before demo day: ship ERC-4337 path or be honest about the fallback.

---

## 8. Risks

| Risk                                              | Mitigation                                                                  |
| ------------------------------------------------- | --------------------------------------------------------------------------- |
| ZeroDev hosted bundler doesn't support Mantle     | Use Pimlico (verified). Document the routing in the spec.                   |
| Pimlico ERC-20 paymaster doesn't support USDC-MNT | Sponsor with MNT, or have user pre-fund a small MNT balance.                |
| Session-key contract bug — funds drained          | Hard policy caps + spending-limit policy + short `validUntil`.              |
| User loses session key                            | Owner can revoke on-chain. UX: regenerate from owner approval flow.         |
| ERC-4337 v0.7 EntryPoint not deployed on Mantle   | Verified deployed (Pimlico docs). Pin entry-point address in config.        |
| UserOp simulation passes, on-chain fails          | Use `eth_estimateUserOperationGas` + replay-buffer; mark exec as `failed`.  |
| Kernel version mismatch                           | Pin `KERNEL_V3_1` (Pimlico-verified). Don't auto-upgrade.                   |

---

## 9. Open questions for spec writer

1. **Bundler choice on Mantle** — Pimlico is verified. Should we also check Stackup, Alchemy Smart Wallets, Biconomy for Mantle coverage and dual-route for redundancy? (Recommend: launch with Pimlico, add fallback later.)
2. **Paymaster strategy** — sponsor 100% (best UX, our cost), ERC-20 paymaster (user pays in USDC, no MNT needed), or user-pays-MNT (cheapest for us)? Hackathon judges love sponsored gas. Recommend sponsored for demo, ERC-20 fallback.
3. **Session key lifetime** — 24h, 7d, 30d? Trade-off: short = more re-approval friction; long = bigger blast radius if key leaks. Recommend 30d default + active revoke button.
4. **Where does session-key PK live?** — Vercel env var (simple), worker host secret manager (better), or HSM/KMS (overkill for hackathon). Recommend worker-host env for demo.
5. **Per-action $ cap encoded on-chain (spending limit) or off-chain (agent self-enforces)?** — On-chain is the proper answer; off-chain is faster to ship. Recommend on-chain via `toSpendingLimitPolicy` if the policy package supports it well on Mantle, else off-chain with explicit doc disclosure.
6. **EOA fallback path — keep or drop?** — Keep behind a feature flag for demo-day resilience.
7. **Kernel version** — V3.1 (Pimlico-verified) or V3.0-beta? Recommend V3.1.
8. **EntryPoint version** — V0.7 (recommended). Don't use V0.8 (Pimlico shows only SimpleAccount support).
