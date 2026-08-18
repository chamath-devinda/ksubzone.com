const fallbackSets = {
  train: {
    poster: '/media-fallback/train-poster.svg',
    backdrop: '/media-fallback/train-backdrop.svg'
  },
  parasite: {
    poster: '/media-fallback/parasite-poster.svg',
    backdrop: '/media-fallback/parasite-backdrop.svg'
  },
  moving: {
    poster: '/media-fallback/moving-poster.svg',
    backdrop: '/media-fallback/moving-backdrop.svg'
  },
  default: {
    poster: '/media-fallback/default-poster.svg',
    backdrop: '/media-fallback/default-backdrop.svg'
  }
};

const isPlaceholderImage = (url = '') => {
  if (!url) return true;
  const value = String(url).trim().toLowerCase();
  return !value || 
         value === 'null' || 
         value === 'undefined' || 
         value.includes('placehold.co') || 
         value.includes('placeholder') || 
         value.includes('via.placeholder');
};

const fallbackKeyFor = (item = {}) => {
  const text = `${item.title || ''} ${item.slug || ''}`.toLowerCase();
  if (text.includes('train') || text.includes('busan')) return 'train';
  if (text.includes('parasite')) return 'parasite';
  if (text.includes('moving')) return 'moving';
  return 'default';
};

export const getMediaImage = (item = {}, kind = 'poster') => {
  let source = kind === 'backdrop'
    ? item.banner || item.backdrop || item.backdrops?.[0]
    : item.poster || item.banner || item.backdrop || item.backdrops?.[0];

  // Optimize TMDB image paths to load faster (w1280 for backdrop, w500 for poster, w342 for card, w154 for thumb)
  if (source && typeof source === 'string' && source.includes('image.tmdb.org/t/p/')) {
    const sizeMap = {
      backdrop: 'w1280', // Upgraded to w1280 for high-resolution premium display on desktops
      poster: 'w500',
      card: 'w342',
      thumb: 'w154'
    };
    const size = sizeMap[kind] || 'w500';
    source = source.replace(/\/t\/p\/[^/]+\//, `/t/p/${size}/`);
  }

  if (!isPlaceholderImage(source)) return source;
  const fallbackKind = kind === 'backdrop' ? 'backdrop' : 'poster';
  return fallbackSets[fallbackKeyFor(item)]?.[fallbackKind] || fallbackSets.default[fallbackKind];
};

export const imageFallbackFor = (item = {}, kind = 'poster') => {
  const fallbackKind = kind === 'backdrop' ? 'backdrop' : 'poster';
  return fallbackSets[fallbackKeyFor(item)]?.[fallbackKind] || fallbackSets.default[fallbackKind];
};

export const handleImageFallback = (event, item = {}, kind = 'poster') => {
  const fallback = imageFallbackFor(item, kind);
  if (event.currentTarget.src !== fallback) {
    event.currentTarget.src = fallback;
  }
};

export const resolveLogoUrl = (url = '') => {
  if (!url) return '/main-logo.webp';
  const urlStr = String(url).trim();
  if (urlStr.includes('drive.google.com')) {
    const fileDMatch = urlStr.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileDMatch && fileDMatch[1]) {
      return `https://drive.google.com/uc?export=view&id=${fileDMatch[1]}`;
    }
    const idMatch = urlStr.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
    }
  }
  return urlStr;
};
