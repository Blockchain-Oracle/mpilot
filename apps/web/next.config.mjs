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
  async headers() {
    // CSP allowlists: Privy iframe (auth.privy.io + auth.privy.systems), Pimlico
    // bundler (api.pimlico.io), Mantle public RPC, MantleScan explorer, IPFS
    // gateway, and the brand-svg fetches (none external — bundled). Tight enough
    // that a script injection can't beacon to a third party.
    // CSP rationale (per 2026-06-15 security review):
    //
    // - `script-src` keeps `'unsafe-inline'` ONLY for the no-FOUC theme
    //   bootstrap in `app/layout.tsx`. A future hardening pass should switch
    //   to per-request nonces (requires middleware) and drop `'unsafe-inline'`.
    // - `'unsafe-eval'` was REMOVED — Privy's parent SDK does not need it
    //   (the eval-using code runs inside the auth.privy.io iframe under its
    //   own CSP), wagmi/viem don't need it, Next 15 prod builds don't need
    //   it. Verified during the review.
    // - `connect-src` was TIGHTENED — wildcards on `*.walletconnect.*` and
    //   `*.mantle.xyz` were replaced with the specific hosts WalletConnect
    //   + Mantle actually use.
    // - `auth.privy.systems` removed (the `.io` host covers default tenants).
    //   Re-add if we ever switch to EU residency.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://auth.privy.io",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.privy.io https://*.mantlescan.xyz https://ipfs.io",
      "font-src 'self' data:",
      "connect-src 'self' https://*.privy.io https://api.pimlico.io https://rpc.mantle.xyz https://rpc.sepolia.mantle.xyz https://*.mantlescan.xyz https://ipfs.io https://relay.walletconnect.com https://relay.walletconnect.org https://verify.walletconnect.com https://pulse.walletconnect.org wss://relay.walletconnect.com wss://relay.walletconnect.org",
      'frame-src https://auth.privy.io https://verify.walletconnect.com',
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ');
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            // `preload` removed pending domain ownership confirmation —
            // hstspreload.org submission is months to reverse and breaks
            // any subdomain that ever needs to serve plaintext.
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains',
          },
        ],
      },
      {
        // Hide /app/* and /onboarding from search-engine indexes.
        source: '/(app|onboarding)/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
};

export default nextConfig;
