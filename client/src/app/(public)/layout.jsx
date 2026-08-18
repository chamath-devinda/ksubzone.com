'use client';

import React, { useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

import ScrollToTop from '@/components/ui/ScrollToTop';
import { useSiteContent } from '@/hooks/useSiteContent';
import { useAuth } from '@/features/auth/hooks/useAuth';
import MaintenanceMode from '@/components/layout/MaintenanceMode';
import { usePathname } from 'next/navigation';
import apiClient from '@/services/api/apiClient';

export default function PublicLayout({ children }) {
  const { content, loading: contentLoading } = useSiteContent();
  const { admin, loading: authLoading } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    const logVisit = async () => {
      try {
        await apiClient.post('/api/analytics/visit');
      } catch (err) {
        // Silent error
      }
    };
    logVisit();
  }, [pathname]);

  if (contentLoading) {
    return (
      <div className="min-h-screen bg-luxury-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  if (content?.system?.maintenanceMode && !admin) {
    return (
      <MaintenanceMode 
        message={content?.system?.maintenanceMessage}
        siteName={content?.brand?.siteName}
        contactEmail={content?.footer?.email}
      />
    );
  }

  return (
    <>
      <ScrollToTop />
      <Navbar />
      <main className="flex-grow pb-16">
        {children}
      </main>

      <Footer />
    </>
  );
}
