'use client';

import '@/features/admin/admin.css';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';

import { ToastProvider } from '@/features/admin/components/Toast';
import { AdminThemeProvider } from '@/features/admin/context/AdminThemeContext';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import AdminTopBar from '@/features/admin/components/AdminTopBar';

// A few older management screens still render their own shell. Keep those
// screens intact while providing the shared shell to every page that only
// renders its feature content. This prevents navigation from disappearing
// when moving between the dashboard and legacy management tools.
const LEGACY_SHELL_PATHS = new Set([
  '/management/dashboard',
  '/management/backup',
  '/management/database',
  '/management/seo',
  '/management/settings',
  '/management/srt-cleaner',
  '/management/subtitles',
  '/management/subtitle-tools',
  '/management/users',
]);

function SharedAdminShell({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="admin-shell min-h-screen flex flex-col lg:flex-row bg-[var(--studio-bg)] text-[var(--studio-text)] transition-colors duration-200">
      <AdminSidebar mobileOpen={mobileOpen} onCloseMobileNav={() => setMobileOpen(false)} />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <AdminTopBar onOpenMobileNav={() => setMobileOpen(true)} />
        <main className="admin-main flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
          <div className="w-full max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function ManagementLayout({ children }) {
  const { user, admin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [hasMounted, setHasMounted] = useState(false);
  const [pageTransitionKey, setPageTransitionKey] = useState(pathname);

  const isLoginPage = pathname === '/management/login';

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    setPageTransitionKey(pathname);
  }, [pathname]);

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
      <div className="h-screen w-screen bg-black text-white flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-[3px] border-[#8B5CF6] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-[#7A7A7A] font-medium tracking-wide">Initializing KSubZone Studio...</p>
      </div>
    );
  }

  const isAuthorized = !!admin;
  const pageOwnsShell = LEGACY_SHELL_PATHS.has(pathname);

  // If visiting a protected management route without authorization:
  // Render clean status screen while session check resolves or redirection to /management/login completes.
  if (!isLoginPage && !isAuthorized) {
    return (
      <div className="h-screen w-screen bg-black text-white flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-[3px] border-[#8B5CF6] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-[#7A7A7A] font-medium tracking-wide">
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
          <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5 overflow-hidden bg-[#800080]/20">
            <div className="h-full bg-[#800080]" style={{ animation: 'adminBar 1.2s ease-in-out infinite' }} />
          </div>
        )}
        {/* Instant render — no opacity delay */}
        <div key={pageTransitionKey} className="animate-fadeInAdmin">
          {!isLoginPage && !pageOwnsShell ? <SharedAdminShell>{children}</SharedAdminShell> : children}
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
