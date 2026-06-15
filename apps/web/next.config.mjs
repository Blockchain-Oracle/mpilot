/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages ship as ESM-only per ADR-018. Allow Next.js to
  // transpile their TS sources directly without requiring a prebuild step.
  transpilePackages: ['@concierge-mantle/ui'],
  experimental: {
    optimizePackageImports: ['@concierge-mantle/ui'],
  },
  webpack: (config, { isServer }) => {
    // @wagmi/connectors → @metamask/sdk pulls in a React-Native-only module
    // (`@react-native-async-storage/async-storage`) via dynamic import. For
    // browser+Node builds we stub it to `false` so webpack stops warning
    // about the missing dep at build time. Pino's transport/worker shims
    // get the same treatment for the same reason (Node worker-thread paths
    // we never hit in Next.js).
    //
    // `@concierge-mantle/smart-account`'s barrel exports session-key
    // persistence + EOA-fallback code that pulls in `pg`, `bullmq`, and
    // `ioredis` — Node-only. The web client only calls `createConciergeAccount`
    // (creates the kernel client + paymaster), which never reaches those
    // modules at runtime. Stubbing the Node-only deps lets webpack tree-shake
    // them in the browser bundle without dragging in `fs`/`net`/`tls`.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
      fs: false,
      net: false,
      tls: false,
      dns: false,
      child_process: false,
      perf_hooks: false,
      // Privy ships optional fiat-onramp + Farcaster mini-app paths we don't
      // wire — stub both so webpack stops failing the build.
      '@stripe/crypto': false,
      '@farcaster/mini-app-solana': false,
    };
    // ox (viem's crypto primitives) does a dynamic `require()` for tempo
    // configuration that webpack flags as 'critical dependency: the request
    // of a dependency is an expression'. It's a no-op path for us.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      {
        module: /node_modules\/ox\/.*tempo/,
      },
      {
        module: /node_modules\/@metamask\/sdk/,
      },
    ];
    return config;
  },
};

export default nextConfig;
