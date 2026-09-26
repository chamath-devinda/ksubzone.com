import React from 'react';
import { redirect } from 'next/navigation';
import DramasList from '@/features/media/pages/DramasList';
import { compactCatalogItems } from '@/utils/mediaCatalog';
import { permalinkSlug } from '@/utils/slug';
import { buildBreadcrumbSchema, cleanMediaTitle, serializeJsonLd, SITE_URL } from '@/utils/seo';
import { fetchBackendJson } from '@/lib/server/backend';

// ISR: catalog listing refreshes hourly in the background.
export const revalidate = 300;

export function generateMetadata({ searchParams }) {
  // Pages beyond page 1 get a noindex signal to prevent duplicate-content
  // dilution, while still being crawlable so Google can follow links.
  const page = Number(searchParams?.page) || 1;
  const canonical = page === 1
    ? `${SITE_URL}/dramas`
    : `${SITE_URL}/dramas?page=${page}`;

  return {
    title: 'Korean TV Dramas & Series with Sinhala & English Subtitles | KSubZone',
    description: 'Download synchronized Sinhala & English subtitles for popular Korean TV shows and dramas. Explore episode guides, cast listings, and SRT downloads.',
    keywords: ['korean dramas', 'sinhala subtitles', 'kdrama subtitles', 'ksubzone dramas'],
    alternates: {
      canonical,
    },
    // Pages 2+ are crawlable so Google follows links, but we tell it
    // the first page is the canonical representative.
    ...(page > 1 ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: 'Korean TV Dramas & Series with Sinhala & English Subtitles | KSubZone',
      description: 'Download synchronized Sinhala & English subtitles for popular Korean TV shows and dramas.',
      url: canonical,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Korean TV Dramas & Series with Sinhala & English Subtitles | KSubZone',
      description: 'Download synchronized Sinhala & English subtitles for popular Korean TV shows and dramas.',
    },
  };
}

export default async function DramasPage({ searchParams }) {
  // Read the page number from the URL query string — crawlable by Googlebot.
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const limit = 50;

  const initialData = await fetchBackendJson(
    `/api/media/dramas?status=Published&sort=popular&page=${page}&limit=${limit}`,
    { revalidate: 300, tags: ['dramas'] },
  );
  initialData.dramas = compactCatalogItems(initialData.dramas);

  const items = initialData?.dramas || [];
  const totalPages = initialData?.totalPages || 1;

  if (page > totalPages) {
    redirect(totalPages === 1 ? '/dramas' : `/dramas?page=${totalPages}`);
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Korean TV dramas with Sinhala subtitles',
    numberOfItems: items.length,
    itemListElement: items.map((drama, index) => ({
      '@type': 'ListItem',
      position: (page - 1) * limit + index + 1,
      name: cleanMediaTitle(drama.title) || drama.title,
      url: `${SITE_URL}/drama/${permalinkSlug(drama)}`,
    })),
  };
  const breadcrumbs = buildBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Dramas', url: '/dramas' },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbs) }} />
      <DramasList
        initialData={initialData}
        initialPage={page}
        totalPages={totalPages}
      />
    </>
  );
}
