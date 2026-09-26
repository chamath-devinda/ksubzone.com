import React from 'react';
import { redirect } from 'next/navigation';
import MoviesList from '@/features/media/pages/MoviesList';
import { compactCatalogItems } from '@/utils/mediaCatalog';
import { permalinkSlug } from '@/utils/slug';
import { buildBreadcrumbSchema, cleanMediaTitle, serializeJsonLd, SITE_URL } from '@/utils/seo';
import { fetchBackendJson } from '@/lib/server/backend';

export const revalidate = 60;

export function generateMetadata({ searchParams }) {
  const page = Number(searchParams?.page) || 1;
  const canonical = page === 1
    ? `${SITE_URL}/movies`
    : `${SITE_URL}/movies?page=${page}`;

  return {
    title: 'Korean Movies with Sinhala & English Subtitles | KSubZone',
    description: 'Download synchronized Sinhala & English subtitles for popular Korean movies. Explore ratings, reviews, cast listings, and timing files.',
    keywords: ['korean movies', 'sinhala subtitles', 'k-movie subtitles', 'ksubzone movies'],
    alternates: {
      canonical,
    },
    ...(page > 1 ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: 'Korean Movies with Sinhala & English Subtitles | KSubZone',
      description: 'Download synchronized Sinhala & English subtitles for popular Korean movies.',
      url: canonical,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Korean Movies with Sinhala & English Subtitles | KSubZone',
      description: 'Download synchronized Sinhala & English subtitles for popular Korean movies.',
    },
  };
}

export default async function MoviesPage({ searchParams }) {
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const limit = 50;

  const initialData = await fetchBackendJson(
    `/api/media/movies?status=Published&sort=popular&page=${page}&limit=${limit}`,
    { revalidate: 10, tags: ['movies'] },
  );
  initialData.movies = compactCatalogItems(initialData.movies);

  const items = initialData?.movies || [];
  const totalPages = initialData?.totalPages || 1;

  if (page > totalPages) {
    redirect(totalPages === 1 ? '/movies' : `/movies?page=${totalPages}`);
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Korean movies with Sinhala subtitles',
    numberOfItems: items.length,
    itemListElement: items.map((movie, index) => ({
      '@type': 'ListItem',
      position: (page - 1) * limit + index + 1,
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
      <MoviesList
        initialData={initialData}
        initialPage={page}
        totalPages={totalPages}
      />
    </>
  );
}
