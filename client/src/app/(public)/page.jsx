import React from 'react';
import { cache } from 'react';
import Home from '@/features/media/pages/Home';
import { compactHomeCatalog } from '@/utils/mediaCatalog';
import {
  SITE_URL,
  normalizeBrandName,
  normalizeBrandText,
  normalizeSiteUrl,
  serializeJsonLd,
} from '@/utils/seo';

const getBackendUrl = () => process.env.BACKEND_URL || (
  process.env.NODE_ENV === 'production'
    ? 'https://api.ksubzone.com'
    : 'http://127.0.0.1:5000'
);

const getSiteContent = cache(async () => {
  try {
    const res = await fetch(`${getBackendUrl()}/api/site-content`, { next: { revalidate: 300 } });
    return res.ok ? res.json() : null;
  } catch (error) {
    console.error('Error fetching site content for homepage SEO:', error);
    return null;
  }
});

const absoluteAssetUrl = (value, fallback) => {
  try {
    return new URL(value || fallback, `${SITE_URL}/`).toString();
  } catch {
    return new URL(fallback, `${SITE_URL}/`).toString();
  }
};

export async function generateMetadata() {
  try {
    const data = await getSiteContent();
    if (data) {
      const seo = data.seo || {};
      const brand = data.brand || {};
      const siteName = normalizeBrandName(brand.siteName);
      const primaryUrl = normalizeSiteUrl(brand.primaryUrl);
      const title = normalizeBrandText(seo.homeTitle || `${siteName} - ${brand.tagline || 'K-Drama & Movie Subtitles'}`);
      const description = seo.homeDescription || 'Download synchronized Sinhala and English subtitles for Korean dramas and movies.';

      return {
        title,
        description,
        keywords: seo.keywords || 'ksubzone, k-drama subtitles, sinhala subtitles, korean movies',
        alternates: {
          canonical: primaryUrl,
        },
        openGraph: {
          title,
          description,
          url: primaryUrl,
          siteName,
          images: seo.ogImage ? [{ url: seo.ogImage }] : [],
          type: 'website',
        },
        twitter: {
          card: 'summary_large_image',
          title,
          description,
          images: seo.ogImage ? [seo.ogImage] : [],
        },
      };
    }
  } catch (e) {
    console.error('Error generating home metadata:', e);
  }
  return {
    title: 'KSubZone - Sinhala & English K-Drama Subtitles',
    description: 'Download synchronized Sinhala and English SRT, VTT, and ASS community subtitles for Korean dramas and movies.',
    alternates: {
      canonical: `${SITE_URL}/`,
    },
  };
}

export default async function HomePage() {
  const backendUrl = getBackendUrl();
  
  let initialHomeCatalog = {};
  let initialSubtitles = [];
  let initialLibraryMovies = { movies: [], totalPages: 1 };
  let initialLibraryDramas = { dramas: [], totalPages: 1 };
  const siteContent = await getSiteContent();
  
  try {
    const [catalogRes, subsRes] = await Promise.all([
      fetch(`${backendUrl}/api/media/home`, { next: { revalidate: 60 } }).then(r => r.ok ? r.json() : {}),
      fetch(`${backendUrl}/api/subtitles/recent?limit=4`, { next: { revalidate: 60 } }).then(r => r.ok ? r.json() : [])
    ]);
    
    initialHomeCatalog = compactHomeCatalog(catalogRes);
    initialSubtitles = subsRes;
    // Home already contains the same view-ranked records. Reuse them instead
    // of making two more server requests and embedding duplicate JSON.
    initialLibraryMovies = {
      movies: (initialHomeCatalog.popularMovies?.length ? initialHomeCatalog.popularMovies : initialHomeCatalog.trendingMovies || []).slice(0, 10),
      totalPages: 1
    };
    initialLibraryDramas = {
      dramas: (initialHomeCatalog.popularDramas?.length ? initialHomeCatalog.popularDramas : initialHomeCatalog.trendingDramas || []).slice(0, 10),
      totalPages: 1
    };
  } catch (error) {
    console.error("Error fetching homepage initial data on server:", error);
  }

  const brand = siteContent?.brand || {};
  const seo = siteContent?.seo || {};
  const footer = siteContent?.footer || {};
  const siteName = normalizeBrandName(brand.siteName);
  const primaryUrl = normalizeSiteUrl(brand.primaryUrl);
  const logoUrl = absoluteAssetUrl(brand.logoUrl, '/main-logo.webp');
  const genericSocialRoots = new Set([
    'https://facebook.com/',
    'https://www.facebook.com/',
    'https://instagram.com/',
    'https://www.instagram.com/',
    'https://youtube.com/',
    'https://www.youtube.com/',
  ]);
  const sameAs = (footer.socials || [])
    .map((social) => String(social?.url || '').trim())
    .filter((url) => /^https?:\/\//i.test(url) && !genericSocialRoots.has(url.endsWith('/') ? url : `${url}/`));
  const importantPages = [
    ['Korean Movies', '/movies'],
    ['Korean Dramas', '/dramas'],
    ['Articles and Guides', '/articles'],
    ['Korean Entertainment Genres', '/genres'],
  ].map(([name, path]) => ({
    '@type': 'WebPage',
    name,
    url: `${SITE_URL}${path}`,
  }));
  const homeDescription = seo.homeDescription || 'Download synchronized Sinhala and English subtitles for Korean dramas and movies.';
  const homeSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${primaryUrl}#website`,
        url: primaryUrl,
        name: siteName,
        alternateName: ['KSUBZONE', 'ksubzone.com'],
        description: homeDescription,
        inLanguage: ['en', 'si'],
        publisher: { '@id': `${primaryUrl}#organization` },
        hasPart: importantPages,
      },
      {
        '@type': 'Organization',
        '@id': `${primaryUrl}#organization`,
        name: siteName,
        url: primaryUrl,
        logo: {
          '@type': 'ImageObject',
          url: logoUrl,
        },
        ...(sameAs.length ? { sameAs } : {}),
      },
      {
        '@type': 'WebPage',
        '@id': `${primaryUrl}#webpage`,
        url: primaryUrl,
        name: normalizeBrandText(seo.homeTitle || `${siteName} - K-Drama & Movie Subtitles`),
        description: homeDescription,
        isPartOf: { '@id': `${primaryUrl}#website` },
        about: { '@id': `${primaryUrl}#organization` },
        inLanguage: ['en', 'si'],
      },
    ],
  };

  return (
    <>
      <script
        id="website-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(homeSchema) }}
      />
      <Home
        initialHomeCatalog={initialHomeCatalog}
        initialSubtitles={initialSubtitles}
        initialLibraryMovies={initialLibraryMovies}
        initialLibraryDramas={initialLibraryDramas}
      />
    </>
  );
}
