'use client';

import React, { useEffect } from 'react';
import { useSiteContent } from '@/hooks/useSiteContent';
import { useAuth } from '@/features/auth/hooks/useAuth';
import MaintenanceMode from '@/components/layout/MaintenanceMode';
import { usePathname } from 'next/navigation';
import ScrollToTop from '@/components/ui/ScrollToTop';
import TopProgressBar from '@/components/ui/TopProgressBar';

// A random first-party identifier lets the analytics endpoint distinguish
// browsers that share an ISP, mobile carrier, office, or home IP. It contains
// no account or personal information; the server only uses a one-way,
// day-scoped fingerprint and never stores this value in the database.
const VISITOR_ID_STORAGE_KEY = 'ksubzone-visitor-id';

function createVisitorId() {
  if (window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return `v1_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  }

  return `v1_${`${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`.slice(0, 32).padEnd(32, '0')}`;
}

function getVisitorId() {
  try {
    const existing = window.localStorage.getItem(VISITOR_ID_STORAGE_KEY);
    if (/^v1_[a-f0-9]{32}$/i.test(existing || '')) return existing;

    const visitorId = createVisitorId();
    window.localStorage.setItem(VISITOR_ID_STORAGE_KEY, visitorId);
    return visitorId;
  } catch {
    // Private-mode storage can be unavailable. The backend safely falls back
    // to its privacy-preserving network fingerprint in that case.
    return '';
  }
}

/**
 * Thin client shell that sits INSIDE the server-rendered public layout.
 *
 * Responsibilities:
 *  - Maintenance mode gate (auth-aware, client-only check)
 *  - Analytics visit logger (fires on route change)
 *  - Ad provider context
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
    const logVisit = () => {
      try {
        const visitorId = getVisitorId();
        // Keep this a simple first-party request. It is not a third-party
        // tracker, so Brave Shields and Edge tracking prevention do not need
        // to allow an external analytics domain for the visit to be counted.
        void fetch('/api/analytics/visit', {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          keepalive: true,
          headers: visitorId ? { 'X-KSubZone-Visitor-Id': visitorId } : undefined,
        }).catch(() => {});
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
