import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/context/AuthContext';
import { SiteContentProvider } from '@/contexts/SiteContentContext';
import { AdProvider } from '@/components/ads/AdProvider';

let globalQueryClient: QueryClient | null = null;

function getQueryClient() {
  if (!globalQueryClient) {
    globalQueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
          refetchOnMount: false,
          retry: 1,
          staleTime: 5 * 60_000,
          gcTime: 10 * 60_000,
        },
      },
    });
  }
  return globalQueryClient;
}

export function IslandProvider({
  children,
  initialSiteContent,
}: {
  children: React.ReactNode;
  initialSiteContent?: any;
}) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SiteContentProvider initialContent={initialSiteContent}>
          <AdProvider>{children}</AdProvider>
        </SiteContentProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export function withIslandProvider<P extends object>(
  Component: React.ComponentType<P>,
  initialSiteContent?: any
) {
  return function WrappedWithIslandProvider(props: P) {
    return (
      <IslandProvider initialSiteContent={initialSiteContent}>
        <Component {...props} />
      </IslandProvider>
    );
  };
}
