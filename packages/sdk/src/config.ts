import { z } from 'zod';
import { ConfigError } from './errors.ts';

/**
 * Zod schema for all Concierge env vars (per ADR-016 / story-24).
 *
 * Design notes:
 * - MANTLE_CHAIN_ID: `z.coerce.number().pipe(z.union([z.literal(5000), z.literal(5003)]))`
 *   coerces the env string to a number then narrows to the literal union — Zod
 *   infers `5000 | 5003` without a cast, so adding a new chain ID requires a
 *   schema change the compiler enforces everywhere.
 * - SENTRY_DSN: empty string treated as absent — `SENTRY_DSN=""` is the
 *   idiomatic "disabled" in .env files and many PaaS platforms; without this,
 *   a blank value crashes startup for an optional field.
 * - `.transform()` maps UPPER_CASE env names → camelCase SDK fields so that
 *   `ConciergeConfig = z.output<typeof ConfigSchema>` is fully derived. Adding
 *   a field to the schema forces adding a transform line — no parallel list.
 */
export const ConfigSchema = z
  .object({
    // LLM
    ANTHROPIC_API_KEY: z
      .string()
      .min(20)
      .regex(/^sk-ant-/, 'must start with "sk-ant-"'),

    // Database + cache
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),

    // Mantle network (defaults keep tests minimal)
    MANTLE_RPC_URL: z.string().url().default('https://rpc.mantle.xyz'),
    MANTLE_SEPOLIA_RPC_URL: z.string().url().default('https://rpc.sepolia.mantle.xyz'),
    MANTLE_CHAIN_ID: z.coerce.number().pipe(z.union([z.literal(5000), z.literal(5003)])),

    // ZeroDev + Pimlico (smart account layer, E4)
    ZERODEV_PROJECT_ID: z.string().optional(),
    PIMLICO_API_KEY: z.string().optional(),

    // Externals
    LIFI_API_KEY: z.string().optional(),
    PINATA_JWT: z.string().optional(),
    WEB3_STORAGE_TOKEN: z.string().optional(),

    // Observability — empty string treated as absent (deployment-platform idiom)
    SENTRY_DSN: z
      .string()
      .optional()
      .transform((v) => (v === '' ? undefined : v))
      .pipe(z.string().url().optional()),

    // Auth (web / MCP surfaces)
    PRIVY_APP_ID: z.string().optional(),
    PRIVY_SERVER_KEY: z.string().optional(),

    // Runtime
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  })
  .transform((raw) => ({
    anthropicApiKey: raw.ANTHROPIC_API_KEY,
    databaseUrl: raw.DATABASE_URL,
    redisUrl: raw.REDIS_URL,
    mantleRpcUrl: raw.MANTLE_RPC_URL,
    mantleSepoliaRpcUrl: raw.MANTLE_SEPOLIA_RPC_URL,
    mantleChainId: raw.MANTLE_CHAIN_ID,
    zeroDevProjectId: raw.ZERODEV_PROJECT_ID,
    pimlicoApiKey: raw.PIMLICO_API_KEY,
    lifiApiKey: raw.LIFI_API_KEY,
    pinataJwt: raw.PINATA_JWT,
    web3StorageToken: raw.WEB3_STORAGE_TOKEN,
    sentryDsn: raw.SENTRY_DSN,
    privyAppId: raw.PRIVY_APP_ID,
    privyServerKey: raw.PRIVY_SERVER_KEY,
    nodeEnv: raw.NODE_ENV,
  }));

/**
 * Typed config returned by `loadConfig()`. Derived from `ConfigSchema` —
 * adding a field to the schema without a transform line produces a type error.
 */
export type ConciergeConfig = z.output<typeof ConfigSchema>;

/**
 * Validates env vars and returns a typed `ConciergeConfig`. Always throws
 * `ConfigError` on failure, with field-level summaries in `err.message` and
 * structured Zod issues in `err.metadata.issues`.
 *
 * Accepts an optional `env` override for testing (defaults to `process.env`).
 * Wrapped in try-catch to preserve the ConfigError contract even if a future
 * refine/transform callback throws unexpectedly.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ConciergeConfig {
  let result: ReturnType<typeof ConfigSchema.safeParse>;
  try {
    result = ConfigSchema.safeParse(env);
  } catch (err) {
    throw new ConfigError(
      `[@concierge/sdk] loadConfig: schema validation threw unexpectedly — ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (!result.success) {
    const summary = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new ConfigError(`[@concierge/sdk] loadConfig: ${summary}`, {
      issues: result.error.issues,
    });
  }
  return result.data;
}
