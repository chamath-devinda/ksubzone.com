export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/management', '/profile', '/auth'],
      },
    ],
    sitemap: 'https://www.ksubzone.com/sitemap.xml',
  };
}
