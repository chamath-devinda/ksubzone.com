import React from 'react';
import SeoManager from '@/features/admin/pages/SeoManager';

export const metadata = {
  title: 'SEO Settings - KSubZone Control',
  robots: 'noindex, nofollow',
};

export default function Page() {
  return <SeoManager />;
}
