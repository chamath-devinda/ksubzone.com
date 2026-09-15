/** @type {import('next').NextConfig} */
const configuredBackendUrl = (
  process.env.BACKEND_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://api.ksubzone.com'
    : 'http://127.0.0.1:5000')
);
const backendUrl = (/^https?:\/\/(www\.)?ksubzone\.com(?:\/|$)/i.test(configuredBackendUrl)
  ? 'https://api.ksubzone.com'
  : configuredBackendUrl
).replace(/\/+$/, '');

const nextConfig = {
  // Isolate QA builds from an already-running local dev server.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  reactStrictMode: true,
  trailingSlash: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  devIndicators: {
    buildActivity: false,
    appIsrStatus: false,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
    deviceSizes: [390, 640, 750, 828, 1080, 1200, 1440, 1920],
    imageSizes: [32, 48, 64, 96, 128, 180, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
      {
        protocol: 'https',
        hostname: 'media.themoviedb.org',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'ejvczjiueysbiewzsuin.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'dyypaoupfdpqpczbppfc.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'lhbmpnnjrbvqvumtydcx.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'www.ksubzone.com',
      },
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'ksubzone.com' }],
        destination: 'https://www.ksubzone.com/:path*',
        permanent: true,
      },
    ];
  },
  async headers() {
    const noIndexHeaders = [
      { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
    ];
    return [
      { source: '/management/:path*', headers: noIndexHeaders },
      { source: '/auth', headers: noIndexHeaders },
      { source: '/profile', headers: noIndexHeaders },
      { source: '/profile/:path*', headers: noIndexHeaders },
    ];
  },
  experimental: {
    serverComponentsExternalPackages: ['@tsparticles/react', '@tsparticles/slim', '@tsparticles/engine'],
  },
};

export default nextConfig;
