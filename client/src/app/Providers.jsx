'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/context/AuthContext';
import { SiteContentProvider } from '@/contexts/SiteContentContext';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

export default function Providers({ children, initialSiteContent }) {
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname === 'ksubzone.com') {
      window.location.replace('https://www.ksubzone.com' + window.location.pathname + window.location.search + window.location.hash);
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SiteContentProvider initialContent={initialSiteContent}>
            {children}
          </SiteContentProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
