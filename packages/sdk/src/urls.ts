/**
 * Chain-aware URL helpers. One source of truth for MantleScan, IPFS, and
 * agent-share links so the web app, MCP iframe cards, skill, and docs site
 * never drift on hardcoded chain ids or subdomains.
 */

export type SupportedChainId = 5000 | 5003;

const MANTLESCAN_BASE: Readonly<Record<SupportedChainId, string>> = {
  5000: 'https://mantlescan.xyz',
  5003: 'https://sepolia.mantlescan.xyz',
};

function assertChain(chainId: number): asserts chainId is SupportedChainId {
  if (chainId !== 5000 && chainId !== 5003) {
    throw new Error(
      `[sdk/urls] Unsupported chainId ${chainId}; expected 5000 (mainnet) or 5003 (sepolia).`,
    );
  }
}

const TX_HASH = /^0x[0-9a-fA-F]{64}$/;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

function assertTxHash(value: string): void {
  // TS template-literal types are erased at runtime — re-check shape so that a
  // worker emitting `txHash: "deadbeef/../etc"` doesn't produce a broken URL.
  if (!TX_HASH.test(value)) {
    throw new Error('[sdk/urls] Expected 32-byte hex tx/feedback hash');
  }
}

function assertAddress(value: string): void {
  if (!ADDRESS.test(value)) {
    throw new Error('[sdk/urls] Expected 20-byte hex address');
  }
}

/** Tx URL on MantleScan. Throws on unsupported chain or malformed hash. */
export function mantleScanTxUrl(txHash: `0x${string}`, chainId: number): string {
  assertChain(chainId);
  assertTxHash(txHash);
  return `${MANTLESCAN_BASE[chainId]}/tx/${txHash}`;
}

/** Address URL on MantleScan. Throws on unsupported chain or malformed address. */
export function mantleScanAddressUrl(address: `0x${string}`, chainId: number): string {
  assertChain(chainId);
  assertAddress(address);
  return `${MANTLESCAN_BASE[chainId]}/address/${address}`;
}

/** ERC-8004 attestation URL — chain-aware, includes the feedback hash. */
export function attestationMantleScanUrl(feedbackHash: `0x${string}`, chainId: number): string {
  // ReputationRegistry attestation events surface via the contract page filtered by topic;
  // we link to the tx by feedback hash (which the worker preserves alongside `cid`).
  return mantleScanTxUrl(feedbackHash, chainId);
}

/**
 * IPFS gateway link for an attestation CID. Validates against CIDv0 (`Qm…` 46
 * chars, base58btc alphabet) or CIDv1 base32 (`b…` 59+ chars, lowercase
 * base32). The IPFS gateway has no integrity guarantee on the returned bytes —
 * the caller still verifies against the attestation's expected hash.
 *
 * Future multibase prefixes (k, z, f, …) are intentionally not accepted; add
 * them as the agent runtime actually emits them.
 */
const CIDV0 = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
const CIDV1_BASE32 = /^b[a-z2-7]{58,}$/;

export function attestationIpfsUrl(cid: string): string {
  if (!CIDV0.test(cid) && !CIDV1_BASE32.test(cid)) {
    throw new Error('[sdk/urls] CID failed shape check (expected CIDv0 Qm… or CIDv1 base32 b…).');
  }
  return `https://ipfs.io/ipfs/${cid}`;
}

/** Public agent profile URL. */
export function agentShareUrl(agentId: bigint | string, origin: string): string {
  const trimmed = origin.replace(/\/+$/, '');
  return `${trimmed}/agent/${agentId.toString()}`;
}
