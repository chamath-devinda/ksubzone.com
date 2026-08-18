import React from 'react';
import Articles from '@/features/articles/pages/Articles';

export const metadata = {
  title: 'KSubZone Articles - K-Drama Guides, Reviews & Sinhala Subtitle Notes',
  description: 'Read Korean drama articles, watch guides, character analysis, Sinhala subtitle notes, and movie recommendations on KSubZone.',
  keywords: ['kdrama articles', 'korean drama guides', 'sinhala subtitles', 'ksubzone articles'],
  alternates: {
    canonical: 'https://www.ksubzone.com/articles',
  },
};

export default async function ArticlesPage() {
  const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:5000';
  let initialData = null;
  try {
    const res = await fetch(`${backendUrl}/api/articles?limit=30`, { next: { revalidate: 30 } });
    if (res.ok) {
      const data = await res.json();
      initialData = data.articles || [];
    }
  } catch (e) {
    console.error('Error fetching articles for page:', e);
  }

  return <Articles initialData={initialData} />;
}
