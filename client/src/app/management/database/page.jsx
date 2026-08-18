import React from 'react';
import DatabaseViewer from '@/features/admin/pages/DatabaseViewer';

export const metadata = {
  title: 'Database Browser - KSubZone Control',
  robots: 'noindex, nofollow',
};

export default function Page() {
  return <DatabaseViewer />;
}
