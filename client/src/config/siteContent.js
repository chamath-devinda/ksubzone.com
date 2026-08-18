export const defaultSiteContent = {
  brand: {
    siteName: 'KSubZone',
    shortName: 'KDV',
    tagline: 'K-Drama & Movie Subtitles',
    logoText: 'KSUBZONE',
    logoUrl: '/main-logo.webp',
    faviconUrl: '/favicon.svg',
    primaryUrl: 'https://www.ksubzone.com'
  },
  seo: {
    homeTitle: 'KSubZone - Sinhala & English K-Drama Subtitles',
    homeDescription: 'Download synchronized Sinhala and English SRT, VTT, and ASS community subtitles for Korean dramas and movies.',
    keywords: 'ksubzone, k-drama subtitles, korean dramas, sinhala subtitles, korean movies',
    ogImage: ''
  },
  navigation: {
    searchPlaceholder: 'Search...',
    signInLabel: 'Sign In',
    adminLabel: 'Admin Panel',
    links: [
      { label: 'Movies', url: '/search?category=movie&sort=newest' },
      { label: 'TV Shows', url: '/search?category=drama&sort=newest' },
      { label: 'Genres', url: '/genres' },
      { label: 'Articles', url: '/articles' },
      { label: 'Trending', url: '/search?category=all&trending=true&sort=views' }
    ]
  },
  home: {
    catalogTitle: 'Explore Catalog',
    catalogDescription: 'Discover popular Asian dramas and movies with Sinhala subtitles.',
    emptyTitle: 'No Titles Found',
    emptyDescription: 'We could not find any items matching these filters. Try changing your search options or check the admin manager.',
    subtitleTitle: 'Recent Subtitle Releases',
    subtitleEmpty: 'Community subtitles are pending uploader approvals. Check back later!',
    newsletterTitle: 'Subscribe to Releases',
    newsletterDescription: 'Receive weekly digests containing fresh Korean drama imports, subtitle sync patches, and custom reviews direct to your inbox.',
    newsletterPlaceholder: 'Enter your email address',
    newsletterButton: 'Join Newsletter'
  },
  footer: {
    description: 'Discover Korean dramas, movies, episode guides, community subtitles, and reviews in one polished subtitle catalog.',
    badges: ['HD Catalog', 'Community Subs', 'K-Drama Watchlist'],
    quickLinksTitle: 'Quick Links',
    contactTitle: 'Contact',
    contactText: 'Seoul-curated Korean entertainment catalog for global fans.',
    email: 'contact@ksubzone.com',
    requestText: 'Request a title or subtitle sync',
    followTitle: 'Follow Us',
    newsletterPlaceholder: 'Get release alerts',
    copyrightSuffix: 'All rights reserved.',
    bottomText: 'Your destination for Korean dramas, movies, subtitle releases, and community updates.',
    featureLabels: ['Subtitle Release Guides', 'Fan Community', 'Latest K-Content'],
    links: [
      { label: 'Home', url: '/' },
      { label: 'Explore Catalog', url: '/search' },
      { label: 'K-Dramas', url: '/search?category=drama' },
      { label: 'Movies', url: '/search?category=movie' }
    ],
    socials: [
      { label: 'Facebook', url: 'https://facebook.com' },
      { label: 'Instagram', url: 'https://instagram.com' },
      { label: 'YouTube', url: 'https://youtube.com' }
    ]
  },
  ai: {
    enableChatbot: true,
    enableSmartSearch: true,
    enableTranslation: true
  },
  system: {
    maintenanceMode: false,
    maintenanceMessage: 'KSubZone is currently undergoing scheduled maintenance. We will be back online shortly.'
  }
};

export const mergeSiteContent = (base, override = {}) => {
  const merged = { ...base };
  Object.entries(override || {}).forEach(([section, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      merged[section] = { ...(base[section] || {}), ...value };
    } else if (value !== undefined) {
      merged[section] = value;
    }
  });
  return merged;
};
