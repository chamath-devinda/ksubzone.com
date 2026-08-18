import React, { Suspense } from 'react';
import Search from '@/features/media/pages/Search';

export const metadata = {
  title: 'Advanced Search - KSubZone Catalog',
  description: 'Search through hundreds of Korean dramas, movies, and subtitles. Filter by genre, rating, release year, or origin.',
};

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-full bg-transparent flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Loading Catalog...</span>
      </div>
    }>
      <Search />
    </Suspense>
  );
}
