import React from 'react';
import DramasList from '@/features/media/pages/DramasList';

export const metadata = {
  title: 'Korean TV Dramas & Series with Sinhala & English Subtitles | KSubZone',
  description: 'Download synchronized Sinhala & English subtitles for popular Korean TV shows and dramas. Explore episode guides, cast listings, and SRT downloads.',
  keywords: ['korean dramas', 'sinhala subtitles', 'kdrama subtitles', 'ksubzone dramas'],
  alternates: {
    canonical: 'https://www.ksubzone.com/dramas',
  },
  openGraph: {
    title: 'Korean TV Dramas & Series with Sinhala & English Subtitles | KSubZone',
    description: 'Download synchronized Sinhala & English subtitles for popular Korean TV shows and dramas.',
    url: 'https://www.ksubzone.com/dramas',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Korean TV Dramas & Series with Sinhala & English Subtitles | KSubZone',
    description: 'Download synchronized Sinhala & English subtitles for popular Korean TV shows and dramas.',
  },
};

export default async function DramasPage() {
  const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:5000';
  let initialData = null;
  try {
    const res = await fetch(`${backendUrl}/api/media/dramas?sort=popular&page=1&limit=24`, { next: { revalidate: 60 } });
    if (res.ok) {
      initialData = await res.json();
    }
  } catch (error) {
    console.error("Error fetching dramas catalog on server:", error);
  }

  return <DramasList initialData={initialData} />;
}
