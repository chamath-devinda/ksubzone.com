/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
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
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:5000';
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
