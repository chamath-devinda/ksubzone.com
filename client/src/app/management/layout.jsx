'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { tokenService } from '@/services/api/tokenService';

import { ToastProvider } from '@/features/admin/components/Toast';

export default function ManagementLayout({ children }) {
  const { user, admin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [hasMounted, setHasMounted] = useState(false);

  const isLoginPage = pathname === '/management/login';

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Redirect only when we're sure there's no valid session
  useEffect(() => {
    console.log('[ManagementLayout] Redirect useEffect triggered. hasMounted:', hasMounted, 'loading:', loading, 'isLoginPage:', isLoginPage, 'admin:', !!admin, 'user:', !!user);
    if (!hasMounted || loading || isLoginPage) return;
    const hasAdminToken = !!tokenService.getAdminToken();
    const isAuthorized = admin || (user && user.hasDashboardAccess);
    console.log('[ManagementLayout] Evaluating redirect: hasAdminToken:', hasAdminToken, 'isAuthorized:', isAuthorized);
    if (!isAuthorized && !hasAdminToken) {
      console.log('[ManagementLayout] Redirecting to login!');
      router.push('/management/login');
    } else {
      console.log('[ManagementLayout] Authorization check passed, no redirect');
    }
  }, [hasMounted, loading, admin, user, isLoginPage, router]);

  // SSR guard: Always show initial loading until mounted to prevent hydration mismatches
  if (!hasMounted) {
    return (
      <div className="h-screen w-screen bg-luxury-950 flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isAuthorized = admin || (user && user.hasDashboardAccess);

  // Show full-screen spinner if the page is a protected management page and we do not have an authorized session.
  // If we have a cached session (isAuthorized is true), we can render the dashboard immediately while the API validates in the background.
  if (!isLoginPage && !isAuthorized) {
    return (
      <div className="h-screen w-screen bg-luxury-950 flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ToastProvider>
      {/* Slim progress bar while auth verifies in background */}
      {!isLoginPage && loading && (
        <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5 overflow-hidden bg-brand-primary/20">
          <div className="h-full bg-brand-primary" style={{ animation: 'adminBar 1.2s ease-in-out infinite' }} />
        </div>
      )}
      {/* Instant render — no opacity delay */}
      <div className="animate-fadeInAdmin">
        {children}
      </div>
      <style>{`
        @keyframes adminBar {
          0% { transform: translateX(-100%) scaleX(0.4); }
          60% { transform: translateX(60%) scaleX(0.6); }
          100% { transform: translateX(200%) scaleX(0.4); }
        }
        @keyframes fadeInAdmin {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .animate-fadeInAdmin {
          animation: fadeInAdmin 0.15s ease-out forwards;
        }
      `}</style>
    </ToastProvider>
  );
}
