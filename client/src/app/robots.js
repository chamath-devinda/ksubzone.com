export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/management',
          '/management/',
          '/profile',
          '/profile/',
          '/auth',
          '/auth/',
          '/api/',
        ],
      },
    ],
    sitemap: 'https://www.ksubzone.com/sitemap.xml',
    host: 'https://www.ksubzone.com',
  };
}
