import React from 'react';
import MovieManager from '@/features/admin/pages/MovieManager';

export const metadata = {
  title: 'Manage Movies - KSubZone Control',
  robots: 'noindex, nofollow',
};

export default function Page() {
  return <MovieManager />;
}
