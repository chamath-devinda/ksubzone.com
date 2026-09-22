import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { AdminShell } from './ui/AdminShell';

// Redesigned SaaS Suite Components
import { AdminDashboardHome } from './dashboard/AdminDashboardHome';
import { SubtitleModerationQueue } from './subtitles/SubtitleModerationQueue';
import SubtitleTools from '@/features/admin/pages/SubtitleTools';
import SrtCleaner from '@/features/admin/pages/SrtCleaner';
import { AiTranslationStudio } from './subtitles/AiTranslationStudio';
import { MemberManager } from './members/MemberManager';
import { DatabaseGuiViewer } from './database/DatabaseGuiViewer';
import { BackupRecoveryManager } from './backup/BackupRecoveryManager';
import { SiteSettingsManager } from './settings/SiteSettingsManager';
import { SeoManagementStudio } from './seo/SeoManagementStudio';

// Existing Content Management Features (Wrapped in Redesigned Shell)
import MovieManager from '@/features/admin/pages/MovieManager';
import DramaManager from '@/features/admin/pages/DramaManager';
import ArticleManager from '@/features/admin/pages/ArticleManager';
import TmdbImport from '@/features/admin/pages/TmdbImport';
import AdminProfile from '@/features/admin/pages/AdminProfile';
import ReviewManager from '@/features/admin/pages/ReviewManager';
import AdminLogin from '@/features/admin/pages/AdminLogin';
import { IslandProvider } from '@/components/shared/IslandProvider';
import { ToastProvider } from '@/features/admin/components/Toast';

export interface AdminAppProps {
  initialPath?: string;
}

function AdminAppInner({ initialPath = '/management/dashboard' }: AdminAppProps) {
  const { admin, loading: authLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || initialPath;
    }
    return initialPath;
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0C0C0E] flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#9E57F6] border-t-transparent animate-spin" />
          <span className="text-xs font-mono">Authenticating management session...</span>
        </div>
      </div>
    );
  }

  // Not authenticated -> show AdminLogin
  if (!admin) {
    return <AdminLogin />;
  }

  // Render view corresponding to route
  const renderView = () => {
    const p = currentPath.toLowerCase();

    if (p === '/management' || p === '/management/' || p.startsWith('/management/dashboard')) {
      return <AdminDashboardHome onNavigate={handleNavigate} />;
    }
    if (p.startsWith('/management/subtitles')) {
      return <SubtitleModerationQueue />;
    }
    if (p.startsWith('/management/subtitle-tools')) {
      return <SubtitleTools onNavigate={handleNavigate} embedded />;
    }
    if (p.startsWith('/management/srt-cleaner')) {
      return <SrtCleaner onNavigate={handleNavigate} embedded />;
    }
    if (p.startsWith('/management/ai-translate')) {
      return <AiTranslationStudio />;
    }
    if (p.startsWith('/management/users')) {
      return <MemberManager />;
    }
    if (p.startsWith('/management/database')) {
      return <DatabaseGuiViewer />;
    }
    if (p.startsWith('/management/backup')) {
      return <BackupRecoveryManager />;
    }
    if (p.startsWith('/management/settings')) {
      return <SiteSettingsManager />;
    }
    if (p.startsWith('/management/seo')) {
      return <SeoManagementStudio />;
    }
    if (p.startsWith('/management/movies')) {
      return <MovieManager />;
    }
    if (p.startsWith('/management/dramas')) {
      return <DramaManager />;
    }
    if (p.startsWith('/management/articles')) {
      return <ArticleManager />;
    }
    if (p.startsWith('/management/import')) {
      return <TmdbImport />;
    }
    if (p.startsWith('/management/profile')) {
      return <AdminProfile />;
    }
    if (p.startsWith('/management/comments') || p.startsWith('/management/reviews')) {
      return <ReviewManager />;
    }

    // Default fallback
    return <AdminDashboardHome onNavigate={handleNavigate} />;
  };

  return (
    <AdminShell currentPath={currentPath} onNavigate={handleNavigate}>
      {renderView()}
    </AdminShell>
  );
}

export default function AdminApp(props: AdminAppProps) {
  return (
    <IslandProvider>
      <ToastProvider>
        <AdminAppInner {...props} />
      </ToastProvider>
    </IslandProvider>
  );
}
