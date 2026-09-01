const readBoolean = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  return !['0', 'false', 'off', 'no'].includes(String(value).trim().toLowerCase());
};

export const AD_MODES = Object.freeze({
  ADSTERRA_ONLY: 'ADSTERRA_ONLY',
  MONETAG_ONLY: 'MONETAG_ONLY',
  HYBRID: 'HYBRID',
  AB_TEST: 'AB_TEST',
  OFF: 'OFF',
});

const requestedMode = String(process.env.NEXT_PUBLIC_AD_MODE || AD_MODES.HYBRID).toUpperCase();
const mode = Object.values(AD_MODES).includes(requestedMode) ? requestedMode : AD_MODES.HYBRID;
const isProduction = process.env.NODE_ENV === 'production';

export const adConfig = Object.freeze({
  enabled: readBoolean(process.env.NEXT_PUBLIC_ADS_ENABLED, isProduction),
  showDevelopmentPlaceholders: readBoolean(process.env.NEXT_PUBLIC_AD_PLACEHOLDERS, !isProduction),
  mode,
  consent: {
    required: false,
  },
  experiments: {
    storageKey: 'ksubzone_ad_variant',
    adsterraPercentage: Math.min(100, Math.max(0, Number(process.env.NEXT_PUBLIC_ADSTERRA_TRAFFIC_PERCENTAGE || 50))),
  },
  formats: {
    banner: readBoolean(process.env.NEXT_PUBLIC_BANNER_ADS_ENABLED, true),
    desktopBanner: readBoolean(process.env.NEXT_PUBLIC_DESKTOP_BANNER_ENABLED, true),
    mobileBanner: readBoolean(process.env.NEXT_PUBLIC_MOBILE_BANNER_ENABLED, true),
    square: readBoolean(process.env.NEXT_PUBLIC_SQUARE_ADS_ENABLED, true),
    native: readBoolean(process.env.NEXT_PUBLIC_NATIVE_ADS_ENABLED, true),
    sidebar: readBoolean(process.env.NEXT_PUBLIC_SIDEBAR_ADS_ENABLED, false),
    popunder: readBoolean(process.env.NEXT_PUBLIC_POPUNDER_ENABLED, true),
    socialBar: readBoolean(process.env.NEXT_PUBLIC_SOCIAL_BAR_ENABLED, false),
    inPagePush: readBoolean(process.env.NEXT_PUBLIC_IN_PAGE_PUSH_ENABLED, false),
  },
  intrusive: {
    popunderCooldownMs: Math.max(60 * 60 * 1000, Number(process.env.NEXT_PUBLIC_POPUNDER_COOLDOWN_MS || 12 * 60 * 60 * 1000)),
    storageKey: 'ksubzone_intrusive_ad_loaded_at',
  },
  providers: {
    adsterra: {
      enabled: readBoolean(process.env.NEXT_PUBLIC_ADSTERRA_ENABLED, true),
      zones: {
        popunder: {
          scriptUrl: 'https://pl31115434.profitableratecpmnetwork.com/40/bd/11/40bd1125e79449d58c39753268112ba1.js',
        },
        socialBar: {
          // Official code supplied by the publisher. Disabled by default.
          scriptUrl: 'https://pl31115638.profitableratecpmnetwork.com/14/40/7a/14407a1eff4e14302920f95abb22c22a.js',
        },
        native: {
          scriptUrl: 'https://pl31115664.profitableratecpmnetwork.com/90963118e211fbe13565d79b0d81a39d/invoke.js',
          containerId: 'container-90963118e211fbe13565d79b0d81a39d',
          reservedHeight: 320,
        },
        bannerDesktop: {
          key: '23a798c8294b23d3b5f73561f68cc621',
          scriptUrl: 'https://www.highrevenueformat.com/23a798c8294b23d3b5f73561f68cc621/invoke.js',
          width: 728,
          height: 90,
        },
        bannerMobile: {
          key: 'cee89ddb1e1c5bd615b6d0a22ba3d9e8',
          scriptUrl: 'https://www.highrevenueformat.com/cee89ddb1e1c5bd615b6d0a22ba3d9e8/invoke.js',
          width: 320,
          height: 50,
        },
        square: {
          key: '586e1584081dab0775623a2b61895f68',
          scriptUrl: 'https://www.highrevenueformat.com/586e1584081dab0775623a2b61895f68/invoke.js',
          width: 300,
          height: 250,
        },
        sidebar: {
          // Official publisher unit. Kept disabled until a safe desktop sidebar exists.
          key: 'c13f5f2182fb9c307a05678f246a92d3',
          scriptUrl: 'https://www.highrevenueformat.com/c13f5f2182fb9c307a05678f246a92d3/invoke.js',
          width: 160,
          height: 600,
        },
      },
    },
    monetag: {
      enabled: readBoolean(process.env.NEXT_PUBLIC_MONETAG_ENABLED, false),
      // Paste only official Monetag code/URLs here when supplied.
      zones: {
        multiTagScriptUrl: '',
        inPagePushScriptUrl: '',
        onClickScriptUrl: '',
      },
    },
  },
  routes: {
    home: { enabled: true, banner: true, square: false, native: true, intrusive: true },
    movie: { enabled: true, banner: true, square: true, native: true, intrusive: true },
    drama: { enabled: true, banner: true, square: false, native: true, intrusive: true },
    episode: { enabled: true, banner: true, square: false, native: false, intrusive: true },
    article: { enabled: true, banner: false, square: true, native: true, intrusive: true },
    search: { enabled: false, banner: false, square: false, native: false, intrusive: false },
    listing: { enabled: true, banner: true, square: false, native: false, intrusive: true },
    static: { enabled: false, banner: false, square: false, native: false, intrusive: false },
    auth: { enabled: false, banner: false, square: false, native: false, intrusive: false },
    account: { enabled: false, banner: false, square: false, native: false, intrusive: false },
    admin: { enabled: false, banner: false, square: false, native: false, intrusive: false },
    error: { enabled: false, banner: false, square: false, native: false, intrusive: false },
  },
  placements: {
    home_content_banner: { pages: ['home'], format: 'responsiveBanner', provider: 'adsterra', lazy: true },
    home_content_native: { pages: ['home'], format: 'native', provider: 'adsterra', lazy: true },
    media_after_description: { pages: ['movie', 'drama'], format: 'responsiveBanner', provider: 'adsterra', lazy: true },
    media_before_subtitles: { pages: ['movie', 'drama'], format: 'native', provider: 'adsterra', lazy: true },
    article_intro_square: { pages: ['article'], format: 'square', provider: 'adsterra', lazy: true },
    article_mid_native: { pages: ['article'], format: 'native', provider: 'adsterra', lazy: true },
    episode_content_banner: { pages: ['episode'], format: 'responsiveBanner', provider: 'adsterra', lazy: true },
    listing_content_banner: { pages: ['listing'], format: 'responsiveBanner', provider: 'adsterra', lazy: true },
  },
});

export function getAdPageType(pathname = '/') {
  const path = String(pathname || '/').split('?')[0];
  if (path.startsWith('/management')) return 'admin';
  if (path === '/auth') return 'auth';
  if (path === '/profile') return 'account';
  if (path === '/404' || path === '/_not-found') return 'error';
  if (path === '/') return 'home';
  if (/^\/drama\/[^/]+\/season-\d+\/episode-\d+\/?$/i.test(path)) return 'episode';
  if (/^\/movie\/genre\//i.test(path) || /^\/drama\/genre\//i.test(path)) return 'listing';
  if (/^\/movie\/[^/]+\/?$/i.test(path)) return 'movie';
  if (/^\/drama\/[^/]+\/?$/i.test(path)) return 'drama';
  if (/^\/articles\/[^/]+\/?$/i.test(path) && !/^\/articles\/category\//i.test(path)) return 'article';
  if (path === '/search') return 'search';
  if (['/movies', '/dramas', '/articles', '/genres'].includes(path) || /^\/articles\/category\//i.test(path)) return 'listing';
  return 'static';
}
