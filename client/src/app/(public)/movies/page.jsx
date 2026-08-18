import React from 'react';
import MoviesList from '@/features/media/pages/MoviesList';

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
    }
  } catch (error) {
    console.error("Error fetching movies catalog on server:", error);
  }

  return <MoviesList initialData={initialData} />;
}
