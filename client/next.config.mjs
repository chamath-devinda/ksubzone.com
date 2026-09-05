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
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
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
        source: '/robots.txt',
        destination: `${backendUrl}/robots.txt`,
      },
      {
        source: '/sitemap.xml',
        destination: `${backendUrl}/sitemap.xml`,
      },
      {
        source: '/sitemap-:type.xml',
        destination: `${backendUrl}/sitemap-:type.xml`,
      },
      {
        source: '/news-sitemap.xml',
        destination: `${backendUrl}/news-sitemap.xml`,
      },
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
};

export default nextConfig;
