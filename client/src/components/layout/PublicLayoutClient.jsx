'use client';

import React, { useEffect } from 'react';
import { useSiteContent } from '@/hooks/useSiteContent';
import { useAuth } from '@/features/auth/hooks/useAuth';
import MaintenanceMode from '@/components/layout/MaintenanceMode';
import { usePathname } from 'next/navigation';
import apiClient from '@/services/api/apiClient';
import ScrollToTop from '@/components/ui/ScrollToTop';
import TopProgressBar from '@/components/ui/TopProgressBar';

/**
 * Thin client shell that sits INSIDE the server-rendered public layout.
 *
 * Responsibilities:
 *  - Maintenance mode gate (auth-aware, client-only check)
 *  - Analytics visit logger (fires on route change)
 *  - UI chrome (progress bar, scroll-to-top)
 *
 * By keeping these concerns here — and making the parent layout a Server
 * Component — Googlebot always receives the fully server-rendered HTML shell
 * (Navbar, Footer, main wrapper, children) without waiting for any client-side
 * API call to resolve.
 */
export default function PublicLayoutClient({ children }) {
  const { content } = useSiteContent();
  const { admin } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    const logVisit = async () => {
      try {
        await apiClient.post('/api/analytics/visit');
      } catch {
        // Intentionally silent — analytics must never break page rendering.
      }
    };
    logVisit();
  }, [pathname]);

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
      <TopProgressBar />
      <ScrollToTop />
      {children}
    </>
  );
}
