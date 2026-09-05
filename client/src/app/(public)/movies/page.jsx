import React from 'react';
import MoviesList from '@/features/media/pages/MoviesList';
import { compactCatalogItems } from '@/utils/mediaCatalog';
import { permalinkSlug } from '@/utils/slug';
import { buildBreadcrumbSchema, cleanMediaTitle, serializeJsonLd, SITE_URL } from '@/utils/seo';

export const metadata = {
  title: 'Korean Movies with Sinhala & English Subtitles | KSubZone',
  description: 'Download synchronized Sinhala & English subtitles for popular Korean movies. Explore ratings, reviews, cast listings, and timing files.',
  keywords: ['korean movies', 'sinhala subtitles', 'k-movie subtitles', 'ksubzone movies'],
  alternates: {
    canonical: 'https://www.ksubzone.com/movies',
  },
  openGraph: {
    title: 'Korean Movies with Sinhala & English Subtitles | KSubZone',
    description: 'Download synchronized Sinhala & English subtitles for popular Korean movies.',
    url: 'https://www.ksubzone.com/movies',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Korean Movies with Sinhala & English Subtitles | KSubZone',
    description: 'Download synchronized Sinhala & English subtitles for popular Korean movies.',
  },
};

export default async function MoviesPage() {
  const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:5000';
  let initialData = null;
  try {
    const res = await fetch(`${backendUrl}/api/media/movies?sort=popular&page=1&limit=24`, { next: { revalidate: 60 } });
    if (res.ok) {
      initialData = await res.json();
      initialData.movies = compactCatalogItems(initialData.movies);
    }
  } catch (error) {
    console.error("Error fetching movies catalog on server:", error);
  }

  const items = initialData?.movies || [];
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Korean movies with Sinhala subtitles',
    numberOfItems: items.length,
    itemListElement: items.map((movie, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: cleanMediaTitle(movie.title) || movie.title,
      url: `${SITE_URL}/movie/${permalinkSlug(movie)}`,
    })),
  };
  const breadcrumbs = buildBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Movies', url: '/movies' },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbs) }} />
      <MoviesList initialData={initialData} />
    </>
  );
}
