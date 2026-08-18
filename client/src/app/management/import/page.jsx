import React from 'react';
import TmdbImport from '@/features/admin/pages/TmdbImport';

export const metadata = {
  title: 'TMDB Importer - KSubZone Control',
  robots: 'noindex, nofollow',
};

export default function Page() {
  return <TmdbImport />;
}
