/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages ship as ESM-only per ADR-018. Allow Next.js to
  // transpile their TS sources directly without requiring a prebuild step.
  transpilePackages: ['@concierge-mantle/ui'],
  // Quiet down the Google Fonts CSS warning — tokens.css imports them via
  // an @import URL (matches the prototype) so Next's font optimization is
  // bypassed by design.
  experimental: {
    optimizePackageImports: ['@concierge-mantle/ui'],
  },
};

export default nextConfig;
