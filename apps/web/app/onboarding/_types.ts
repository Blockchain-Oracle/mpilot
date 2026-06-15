/**
 * Onboarding state shape. The wizard owns one OnboardingData object and
 * threads (data, set) through every step. Step components patch via
 * `set({ partial })` or `set((prev) => derived)`.
 */

export const ONBOARDING_STEPS = [
  'connect',
  'account',
  'identity',
  'goal',
  'llm',
  'policy',
  'activate',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const STEP_LABEL: Readonly<Record<OnboardingStep, string>> = {
  connect: 'Connect',
  account: 'Account',
  identity: 'Identity',
  goal: 'Goal',
  llm: 'LLM',
  policy: 'Policy',
  activate: 'Activate',
};

export type WalletId = 'Privy' | 'Reown' | 'Browser wallet';

export type LlmProviderId = 'anthropic' | 'openai' | 'google' | 'xai';

export type KeyStatus = 'empty' | 'verifying' | 'verified' | 'invalid';

export type PolicyCategory = 'aave' | 'dex' | 'bridge' | 'yield' | 'restaking';

export type PolicyMode = 'manual' | 'autopilot';

export interface OnboardingData {
  readonly wallet: WalletId | null;
  /** Connected wallet address (set by r1 — Privy login). */
  readonly walletAddress: `0x${string}` | null;
  /** Whether the connected wallet is Privy-embedded or an external one (MetaMask/WalletConnect). */
  readonly walletKind: 'embedded' | 'external' | null;
  /** Deployed smart-account address (set by r2 — StepAccount). */
  readonly smartAccountAddress: `0x${string}` | null;
  /** ERC-8004 agent token id (set by r2 — StepIdentity). */
  readonly agentId: bigint | null;
  readonly goal: string;
  readonly overrides: Readonly<Record<string, string>>;
  readonly keys: Readonly<Record<LlmProviderId, string>>;
  readonly keyStatus: Readonly<Record<LlmProviderId, KeyStatus>>;
  readonly policies: Readonly<Record<PolicyCategory, PolicyMode>>;
  readonly caps: { readonly perTx: string; readonly perDay: string };
}

export const INITIAL_DATA: OnboardingData = {
  wallet: null,
  walletAddress: null,
  walletKind: null,
  smartAccountAddress: null,
  agentId: null,
  goal: '',
  overrides: {},
  keys: { anthropic: '', openai: '', google: '', xai: '' },
  keyStatus: { anthropic: 'empty', openai: 'empty', google: 'empty', xai: 'empty' },
  policies: {
    aave: 'manual',
    dex: 'manual',
    bridge: 'manual',
    yield: 'manual',
    restaking: 'manual',
  },
  caps: { perTx: '300', perDay: '300' },
};

export type StatePatcher = (
  patch: Partial<OnboardingData> | ((prev: OnboardingData) => Partial<OnboardingData>),
) => void;
