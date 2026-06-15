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

/** Tx URL on MantleScan. Throws on unsupported chain. */
export function mantleScanTxUrl(txHash: `0x${string}`, chainId: number): string {
  assertChain(chainId);
  return `${MANTLESCAN_BASE[chainId]}/tx/${txHash}`;
}

/** Address URL on MantleScan. */
export function mantleScanAddressUrl(address: `0x${string}`, chainId: number): string {
  assertChain(chainId);
  return `${MANTLESCAN_BASE[chainId]}/address/${address}`;
}

/** ERC-8004 attestation URL — chain-aware, includes the feedback hash. */
export function attestationMantleScanUrl(feedbackHash: `0x${string}`, chainId: number): string {
  // ReputationRegistry attestation events surface via the contract page filtered by topic;
  // we link to the tx by feedback hash (which the worker preserves alongside `cid`).
  return mantleScanTxUrl(feedbackHash, chainId);
}

/** IPFS gateway link for an attestation CID. */
export function attestationIpfsUrl(cid: string): string {
  if (!/^[A-Za-z0-9]+$/.test(cid)) {
    throw new Error('[sdk/urls] CID failed shape check');
  }
  return `https://ipfs.io/ipfs/${cid}`;
}

/** Public agent profile URL. */
export function agentShareUrl(agentId: bigint | string, origin: string): string {
  const trimmed = origin.replace(/\/+$/, '');
  return `${trimmed}/agent/${agentId.toString()}`;
}
