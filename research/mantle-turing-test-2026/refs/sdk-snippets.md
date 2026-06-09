# SDK Snippets — Paste & Go

All snippets verified against `phase2-sponsor-docs.md`. Use these as the starting point in any coding-agent build session — every snippet is buildable on its own.

---

## Mantle chain — viem config

```typescript
// chains.ts
import { defineChain } from 'viem';

export const mantle = defineChain({
  id: 5000,
  name: 'Mantle',
  nativeCurrency: { name: 'Mantle', symbol: 'MNT', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mantle.xyz'] } },
  blockExplorers: { default: { name: 'Mantlescan', url: 'https://mantlescan.xyz' } },
});

export const mantleSepolia = defineChain({
  id: 5003,
  name: 'Mantle Sepolia',
  nativeCurrency: { name: 'Mantle', symbol: 'MNT', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.sepolia.mantle.xyz'] } },
  blockExplorers: { default: { name: 'Mantlescan Sepolia', url: 'https://sepolia.mantlescan.xyz' } },
});
```

Faucet for Sepolia: https://faucets.chain.link/mantle-sepolia

---

## ERC-8004 — register an agent identity on Mantle

### Quickstart with `create-8004-agent`

```bash
npx create-8004-agent my-mantle-agent
cd my-mantle-agent
# .env config:
#   IDENTITY_REGISTRY=0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
#   REPUTATION_REGISTRY=0x8004BAa17C55a88189AE136b182e5fdA19dE9b63
#   RPC_URL=https://rpc.mantle.xyz
#   CHAIN_ID=5000
```

### Manual register via viem (Mantle Mainnet)

```typescript
import { createWalletClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mantle } from './chains';

const IDENTITY_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';

const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const client = createWalletClient({
  account,
  chain: mantle,
  transport: http('https://rpc.mantle.xyz'),
});

// Pull the full ABI from https://github.com/erc-8004/erc-8004-contracts/tree/main/abis
const identityAbi = parseAbi([
  'function register(string tokenURI) returns (uint256 agentId)',
  'function setAgentURI(uint256 agentId, string tokenURI)',
  'function setAgentWallet(uint256 agentId, address wallet, bytes signature)',
  'function setMetadata(uint256 agentId, bytes32 key, bytes value)',
]);

// Mint agent identity NFT — returns agentId
const txHash = await client.writeContract({
  address: IDENTITY_REGISTRY,
  abi: identityAbi,
  functionName: 'register',
  args: ['ipfs://<your-agent-registration-file-cid>'],
});
```

### Agent registration file schema (the `tokenURI` target)

```json
{
  "type": "agent",
  "name": "MyAgent",
  "description": "What this agent does",
  "image": "ipfs://<icon-cid>",
  "services": [
    { "kind": "a2a", "url": "https://my-agent.example/.well-known/a2a-card.json" },
    { "kind": "mcp", "url": "https://my-agent.example/mcp" },
    { "kind": "oasf", "url": "ipfs://<oasf-manifest-cid>" },
    { "kind": "email", "value": "agent@example.com" }
  ],
  "registrations": [
    { "agentRegistry": "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432", "agentId": 0 }
  ],
  "supportedTrust": ["reputation", "crypto-economic"]
}
```

### Mantle Sepolia equivalents (use for testing)

- IdentityRegistry: `0x8004A818BFB912233c491871b3d84c89A494BD9e`
- ReputationRegistry: `0x8004B663056A597Dffe9eCcC1965A193B7388713`

---

## USDY / mUSD on Mantle — read-only example

```typescript
import { Contract, JsonRpcProvider } from 'ethers';

const provider = new JsonRpcProvider('https://rpc.mantle.xyz');

const USDY_MANTLE = '0x5bE26527e817998A7206475496fDE1E68957c5A6';
const MUSD_MANTLE = '0xab575258d37EaA5C8956EfABe71F4eE8F6397cF3';
const REDEMPTION_ORACLE = '0xA96abbe61AfEdEB0D14a20440Ae7100D9aB4882f';

const erc20Abi = [
  'function balanceOf(address) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function decimals() view returns (uint8)',
];

const usdy = new Contract(USDY_MANTLE, erc20Abi, provider);
const bal = await usdy.balanceOf('0x<your-address>');
const decimals = await usdy.decimals();
console.log(`USDY balance: ${Number(bal) / 10 ** Number(decimals)}`);
```

Transfer restrictions on USDY apply to mUSD. Pull the RWADynamicRateOracle ABI from Ondo's docs to read the redemption price programmatically.

References:
- https://docs.ondo.finance/addresses
- https://docs.ondo.finance/developer-guides/mantle-integration-guidelines

---

## Byreal stack — install + initialize

### Install as OpenClaw skills (recommended for agentic flows)

```bash
# Install both skills into the active OpenClaw runtime
npx skills add byreal-git/byreal-agent-skills
npx skills add byreal-git/byreal-perps-cli

# First-time wallet setup (interactive)
byreal-cli setup                   # Solana wallet for CLMM
byreal-perps-cli account init      # Hyperliquid sub-account
```

### Standalone CLI (no OpenClaw required)

```bash
npm install -g @byreal-io/byreal-cli
npm install -g @byreal-io/byreal-perps-cli
```

### Agent discovery commands (let the LLM see capabilities)

```bash
byreal-cli skill                # Full doc dump for agent context
byreal-cli catalog list         # All capabilities with params
byreal-cli catalog show <id>    # Detailed param info for one capability

byreal-perps-cli catalog list   # Same pattern for perps CLI
```

### Sample swap (Byreal CLMM on Solana)

```bash
byreal-cli pools list --sort-field apr24h --limit 10 -o json
byreal-cli pools analyze <pool-address> -o json

# SOL → USDC dry-run
byreal-cli swap execute \
  --input-mint So11111111111111111111111111111111111111112 \
  --output-mint EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  --amount 0.1 \
  --dry-run

# Add --confirm to execute
```

### Sample perp order (Byreal Perps on Hyperliquid)

```bash
byreal-perps-cli position leverage BTC 10
byreal-perps-cli order market buy 0.01 BTC --tp 110000 --sl 90000
byreal-perps-cli position list -o json
byreal-perps-cli signal scan -o json     # market signals
byreal-perps-cli signal detail BTC -o json
```

### Byreal SDK (TypeScript, for programmatic agents)

```bash
npm install @byreal-io/byreal-sdk
```

```typescript
import { Connection, Keypair } from '@solana/web3.js';
import { ByrealSDK } from '@byreal-io/byreal-sdk';

const connection = new Connection('https://api.mainnet-beta.solana.com');
const sdk = new ByrealSDK({ connection });

// List top pools by TVL
const poolsResult = await sdk.pools.list({
  pageSize: 10,
  sortField: 'tvl',
  sortType: 'desc',
});

// Get quote
const quote = await sdk.swap.getQuote({
  inputMint: 'So11111111111111111111111111111111111111112',
  outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  amount: '1000000000',
  swapMode: 'in',
  slippageBps: 200,
  userPublicKey: wallet.publicKey.toBase58(),
});

// Execute
const swapResult = await sdk.swap.executeSwap({
  ...quote,
  signerCallback: async (tx) => { tx.sign([wallet]); return tx; },
});

// Open CLMM position with USD amount (auto-swap to optimal split)
const openResult = await sdk.positions.openPosition({
  poolAddress: '<pool-address>',
  priceLower: '0.998',
  priceUpper: '1.002',
  amountUsd: 1000,
  userAddress: wallet.publicKey.toBase58(),
  signerCallback: async (tx) => { tx.sign([wallet]); return tx; },
});

// Copy farming
const topPositions = await sdk.copyFarmer.getTopPositions({
  poolAddress: '<pool-address>',
  sortField: 'liquidity',
  sortType: 'desc',
  pageSize: 10,
});
const copyResult = await sdk.copyFarmer.copyPosition({
  sourcePositionAddress: '<top-position-address>',
  amountUsd: 500,
  userAddress: wallet.publicKey.toBase58(),
  signerCallback: async (tx) => { tx.sign([wallet]); return tx; },
});
```

Low-level API:
```typescript
import { ApiClient, API_ENDPOINTS } from '@byreal-io/byreal-sdk/api';
const client = new ApiClient({ baseUrl: 'https://api2.byreal.io' });
```

Swagger / REST docs: https://github.com/byreal-git/byreal-api-docs (swagger.json, router.md)

---

## Bybit V5 — signed REST request

### Python (pybit)

```python
from pybit.unified_trading import HTTP

session = HTTP(
    testnet=False,                          # set True for testnet.bybit.com
    api_key='<key>',
    api_secret='<secret>',
)
result = session.get_tickers(category='linear', symbol='BTCUSDT')
order = session.place_order(
    category='linear', symbol='BTCUSDT', side='Buy',
    orderType='Market', qty='0.001',
)
```

### Python (manual HMAC, for any endpoint)

```python
import time, hmac, hashlib, requests, urllib.parse

API_KEY = '<key>'
SECRET  = '<secret>'

ts   = str(int(time.time() * 1000))
recv = '5000'
params = {'category': 'linear', 'symbol': 'BTCUSDT'}
query  = urllib.parse.urlencode(params)

sign_str = ts + API_KEY + recv + query
sig = hmac.new(SECRET.encode(), sign_str.encode(), hashlib.sha256).hexdigest()

headers = {
    'X-BAPI-API-KEY': API_KEY,
    'X-BAPI-TIMESTAMP': ts,
    'X-BAPI-SIGN': sig,
    'X-BAPI-RECV-WINDOW': recv,
}
r = requests.get(f'https://api.bybit.com/v5/market/tickers?{query}', headers=headers)
print(r.json())
```

Timestamp rule: `server_time - recv_window <= timestamp < server_time + 1000`

Testnet REST: `https://api-testnet.bybit.com`
WebSocket public spot: `wss://stream.bybit.com/v5/public/spot`
WebSocket public linear: `wss://stream.bybit.com/v5/public/linear`
WebSocket private: `wss://stream.bybit.com/v5/private`

Docs: https://bybit-exchange.github.io/docs/v5/intro

---

## Nansen API — Smart Money query

```python
import requests

NANSEN_KEY = '<your-key-claim-via-hackathon-credit>'

# Smart Money tokens (example endpoint — confirm in docs)
url = 'https://api.nansen.ai/v1/smart-money/tokens'
headers = {'API-KEY': NANSEN_KEY}
params = {'chain': 'mantle', 'timeframe': '24h'}
r = requests.get(url, headers=headers, params=params)
print(r.json())
```

Free credits available for hackathon participants via the $7K Nansen credit pool. Docs: https://docs.nansen.ai

---

## OpenClaw skill — minimal SKILL.md template

```yaml
---
name: my-mantle-agent-skill
description: "What this skill does — used by the LLM to decide when to call it"
metadata:
  openclaw:
    homepage: https://github.com/<you>/<repo>
    requires:
      bins: []
      config: []
    install: []
---

# My Mantle Agent Skill

When to use: <trigger conditions>

Inputs: <param schema>

Outputs: <return schema>

Examples:
- <example invocation>
```

Reference templates in the ClawHub registry: https://github.com/openclaw/clawhub

---

## Mantle X402 (agent micropayments)

Not surfaced in primary docs in this research pass. Reference Mantle's Questflow integration announcement:
https://blockchainreporter.net/mantle-integrates-x402-protocol-to-power-web3-automation-in-collaboration-with-questflow/

For an x402 + ERC-8004 combined stack, see `Trustdev-eth/x402-erc8004-agent` (12 ⭐).

---

## Allora Network — consume ML inference

Allora Topics expose decentralized AI predictions. To integrate:
1. Browse live Topics at https://www.allora.network (55+ active)
2. Use the Allora Network Topic Inference EVM client
3. Subscribe to a topic worker and fetch on-chain prediction

Repo + docs: https://www.alloralabs.xyz

---

## Universal env file template

```bash
# .env — paste, then fill in
RPC_URL=https://rpc.mantle.xyz
CHAIN_ID=5000

# Or testnet:
# RPC_URL=https://rpc.sepolia.mantle.xyz
# CHAIN_ID=5003

PRIVATE_KEY=0x...

# ERC-8004 (Mantle Mainnet)
IDENTITY_REGISTRY=0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
REPUTATION_REGISTRY=0x8004BAa17C55a88189AE136b182e5fdA19dE9b63

# Sepolia equivalents
# IDENTITY_REGISTRY=0x8004A818BFB912233c491871b3d84c89A494BD9e
# REPUTATION_REGISTRY=0x8004B663056A597Dffe9eCcC1965A193B7388713

# RWA primitives (Mantle)
USDY=0x5bE26527e817998A7206475496fDE1E68957c5A6
MUSD=0xab575258d37EaA5C8956EfABe71F4eE8F6397cF3
REDEMPTION_ORACLE=0xA96abbe61AfEdEB0D14a20440Ae7100D9aB4882f

# Bybit V5
BYBIT_API_KEY=
BYBIT_API_SECRET=
BYBIT_TESTNET=true                 # start on testnet

# Sponsor API credits
NANSEN_API_KEY=
ELFA_API_KEY=
SURF_API_KEY=
ORBIT_API_KEY=
ZAI_API_KEY=
ALTLLM_API_KEY=

# LLM (for the agent itself)
ANTHROPIC_API_KEY=
```
