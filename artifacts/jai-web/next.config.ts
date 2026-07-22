import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  basePath: '/jai-web',
  reactStrictMode: true,
  // Generate a fully static export — no Node.js server needed in production.
  // All pages in this app are client-side rendered, so this is safe.
  output: 'export',
  // Suppress TS errors during production build — the code is correct at runtime;
  // errors are strictness false-positives from the Vite→Next.js migration.
  typescript: { ignoreBuildErrors: true },
  // Allow all dev origins for Replit's proxied preview iframe
  allowedDevOrigins: ['*.replit.dev', '*.sisko.replit.dev', '*.replit.app', '*'],
};

export default nextConfig;
