import React from 'react';
import Articles from '@/features/articles/pages/Articles';
import { fetchBackendJson } from '@/lib/server/backend';

// The article payload is cached by fetch below; render the page at request time
// so a failed build-time API request cannot be published as an empty archive.
export const revalidate = 0;

export const metadata = {
  title: 'KSubZone Articles - K-Drama Guides, Reviews & Sinhala Subtitle Notes',
  description: 'Read Korean drama articles, watch guides, character analysis, Sinhala subtitle notes, and movie recommendations on KSubZone.',
  keywords: ['kdrama articles', 'korean drama guides', 'sinhala subtitles', 'ksubzone articles'],
  alternates: {
    canonical: 'https://www.ksubzone.com/articles',
  },
};

export default async function ArticlesPage() {
  const data = await fetchBackendJson('/api/articles?status=Published&limit=30', {
    revalidate: 30,
    tags: ['articles'],
    notFoundStatuses: [],
  });
  const initialData = data?.articles || [];

  return <Articles initialData={initialData} />;
}
