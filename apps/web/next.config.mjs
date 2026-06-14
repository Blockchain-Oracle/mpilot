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
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
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
