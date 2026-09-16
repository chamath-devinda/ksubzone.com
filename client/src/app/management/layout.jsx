'use client';

import '@/features/admin/admin.css';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';

import { ToastProvider } from '@/features/admin/components/Toast';
import { AdminThemeProvider } from '@/features/admin/context/AdminThemeContext';

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
    if (!hasMounted || loading || isLoginPage) return;
    const isAuthorized = !!admin;
    if (!isAuthorized) {
      router.replace('/management/login');
    }
  }, [hasMounted, loading, admin, user, isLoginPage, router]);

  // SSR guard: Always show initial loading until mounted to prevent hydration mismatches
  if (!hasMounted) {
    return (
      <div className="h-screen w-screen bg-[#0B0E14] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-[3px] border-[#2563EB] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-[#9AA3B2] font-medium tracking-wide">Initializing KSubZone Studio...</p>
      </div>
    );
  }

  const isAuthorized = !!admin;

  // If visiting a protected management route without authorization:
  // Render clean status screen while session check resolves or redirection to /management/login completes.
  if (!isLoginPage && !isAuthorized) {
    return (
      <div className="h-screen w-screen bg-[#0B0E14] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-[3px] border-[#2563EB] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-[#9AA3B2] font-medium tracking-wide">
          {loading ? 'Verifying Studio session...' : 'Redirecting to Studio login...'}
        </p>
      </div>
    );
  }

  return (
    <AdminThemeProvider>
      <ToastProvider>
        {/* Slim progress bar while auth verifies in background */}
        {!isLoginPage && loading && (
          <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5 overflow-hidden bg-[#2563EB]/20">
            <div className="h-full bg-[#2563EB]" style={{ animation: 'adminBar 1.2s ease-in-out infinite' }} />
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
    </AdminThemeProvider>
  );
}
