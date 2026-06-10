import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import type { LanguageModelV3 } from '@ai-sdk/provider';
import { xai } from '@ai-sdk/xai';

const DEFAULT_SPEC = 'anthropic:claude-sonnet-4-6';

/**
 * Env-auto-detect model helper per ADR-016: `AI_MODEL="provider:model"`
 * selects the model without touching code; unset (or empty) falls back to
 * `anthropic:claude-sonnet-4-6`. An explicit `spec` argument beats the env
 * var. Supported providers: `anthropic`, `openai`, `google`, `xai`.
 *
 * API keys are NOT read here — each @ai-sdk provider factory reads its key
 * (`ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` /
 * `XAI_API_KEY`) lazily at request time, so constructing a model is free and
 * a missing key surfaces on the first call, not here.
 *
 * The spec splits on the FIRST colon only: model ids themselves may contain
 * colons (OpenAI fine-tune ids like `ft:gpt-5.1:org:custom`).
 *
 * Returns `LanguageModelV3` — the interface the installed @ai-sdk 3.x
 * provider factories actually ship (ADR-016 sketches `LanguageModelV2`;
 * SDK-DX-STUDY §A says to pin to whatever interface is active at story
 * time, and `ai@6` accepts both).
 */
export function defaultModel(spec = process.env['AI_MODEL']): LanguageModelV3 {
  const normalized = spec || DEFAULT_SPEC;
  const splitAt = normalized.indexOf(':');
  if (splitAt <= 0 || splitAt === normalized.length - 1) {
    throw new Error(
      `[@concierge/sdk] defaultModel: expected a "provider:model" spec (e.g. "anthropic:claude-sonnet-4-6"), got "${normalized}".`,
    );
  }
  const provider = normalized.slice(0, splitAt);
  const model = normalized.slice(splitAt + 1);
  switch (provider) {
    case 'anthropic':
      return anthropic(model);
    case 'openai':
      return openai(model);
    case 'google':
      return google(model);
    case 'xai':
      return xai(model);
    default:
      throw new Error(
        `[@concierge/sdk] defaultModel: unknown provider "${provider}" — expected one of: anthropic, openai, google, xai.`,
      );
  }
}
