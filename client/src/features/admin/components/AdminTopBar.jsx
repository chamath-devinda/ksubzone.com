'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAdminTheme } from '@/features/admin/context/AdminThemeContext';
import AdminNotifications from './AdminNotifications';
import AdminSearch from './AdminSearch';
import {
  Search,
  Plus,
  Moon,
  Sun,
  ExternalLink,
  Menu,
  Film,
  Tv,
  Languages,
  BookOpenText,
  Sparkles,
  LogOut,
  UserCheck,
  ChevronDown,
  Database,
  Sliders
} from 'lucide-react';

const PAGE_TITLES = {
  dashboard: 'Overview',
  dramas: 'Dramas & TV Series',
  movies: 'Movies Catalog',
  articles: 'Articles & Editorial',
  subtitles: 'Subtitles Repository',
  'subtitle-tools': 'Subtitle Studio',
  'srt-cleaner': 'SRT Cleaner',
  import: 'TMDB Auto-Import',
  users: 'Community Members',
  comments: 'Reviews & Comments',
  database: 'System Database',
  backup: 'Cloud Backups',
  seo: 'SEO & Metadata',
  settings: 'Site Builder',
  profile: 'Admin Profile',
};

export default function AdminTopBar({ onOpenMobileNav }) {
  const { admin, logoutAdmin } = useAuth();
  const { isLight, toggleTheme } = useAdminTheme();
  const pathname = usePathname();
  const router = useRouter();

  const [profileOpen, setProfileOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const profileRef = useRef(null);
  const quickAddRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (quickAddRef.current && !quickAddRef.current.contains(e.target)) {
        setQuickAddOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const close = e => { if (e.key === "Escape") { setProfileOpen(false); setQuickAddOpen(false); } };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  const adminName = admin?.displayName || admin?.username || admin?.name || 'System Admin';
  const adminInitial = (adminName.slice(0, 2) || 'AD').toUpperCase();
  const adminRole = admin?.role?.name || (typeof admin?.role === 'object' ? admin.role.name : String(admin?.role || 'SuperAdmin'));
  const avatarUrl = admin?.avatar;
  const pageKey = pathname.split('/').filter(Boolean).pop() || 'dashboard';
  const pageTitle = PAGE_TITLES[pageKey] || 'Overview';

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/management/movies?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <header className="admin-topbar sticky top-0 z-30 flex h-16 w-full items-center justify-between px-4 sm:px-6 bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-800 transition-colors">
      {/* ── Left: Mobile Menu & Smart Search ── */}
      <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-xl">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition"
          aria-label="Open sidebar menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Global Catalog & Commands Search */}
        <AdminSearch />
      </div>

      {/* ── Right: Quick Actions, Fullscreen, Theme, and Profile ── */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Add Menu */}
        <div className="relative" ref={quickAddRef}>
          <button
            type="button"
            aria-expanded={quickAddOpen}
            onClick={() => setQuickAddOpen(!quickAddOpen)}
            className="hidden sm:flex h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-sm shadow-indigo-500/25 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Content</span>
          </button>

          {quickAddOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-1.5 shadow-xl z-50 animate-fadeInAdmin">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Quick Actions
              </div>
              <div className="space-y-0.5 mt-1">
                {[
                  { href: '/management/import', icon: Sparkles, label: 'Import from TMDB', color: 'text-indigo-500' },
                  { href: '/management/movies', icon: Film, label: 'Add New Movie', color: 'text-blue-500' },
                  { href: '/management/dramas', icon: Tv, label: 'Add New Drama', color: 'text-purple-500' },
                  { href: '/management/subtitles', icon: Languages, label: 'Upload Subtitle', color: 'text-emerald-500' },
                  { href: '/management/articles', icon: BookOpenText, label: 'Write Article', color: 'text-amber-500' },
                ].map(({ href, icon: Icon, label, color }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setQuickAddOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.06] hover:text-[#1976d2] transition"
                  >
                    <Icon className={`h-4 w-4 ${color}`} />
                    <span>{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notifications Bell */}
        <AdminNotifications />

        {/* Theme Toggle (Light / Dark) */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-[#1976d2] hover:bg-slate-100/70 dark:hover:bg-white/[0.06] transition"
          aria-label={isLight ? 'Switch to Dark mode' : 'Switch to Light mode'}
          title={isLight ? 'Switch to Dark mode' : 'Switch to Light mode'}
        >
          {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-[#f59e0b]" />}
        </button>

        {/* Public Site Link */}
        <Link
          href="/"
          target="_blank" rel="noopener noreferrer"
          className="hidden md:flex h-8 items-center gap-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.04] px-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-[#1976d2] transition"
          title="Visit Public Website"
        >
          <ExternalLink className="h-3 w-3 text-[#1976d2]" />
          <span>Site</span>
        </Link>

        {/* ── User Profile Pill (SmartAngular Header Style) ── */}
        <div className="relative pl-1" ref={profileRef}>
          <button
            type="button"
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100/80 dark:hover:bg-white/[0.06] transition group"
            aria-label="User profile menu"
          >
            <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1976d2] to-[#42a5f5] text-[11px] font-bold text-white shadow-sm ring-2 ring-[#1976d2]/20">
              {avatarUrl ? (
                <img src={avatarUrl} alt={adminName} className="h-full w-full rounded-full object-cover" />
              ) : (
                <span>{adminInitial}</span>
              )}
            </div>

            <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-transform" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-[#151124]/95 backdrop-blur-xl p-2 shadow-2xl z-50 animate-fadeInAdmin">
              {/* Header Info */}
              <div className="p-3 border-b border-slate-200/60 dark:border-white/10 mb-1.5 bg-slate-50 dark:bg-white/[0.04] rounded-xl">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{adminName}</p>
                <p className="text-[11px] text-slate-400 truncate">{admin?.email || 'admin@ksubzone.com'}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#7C3AED]/15 text-[9.5px] font-black uppercase tracking-wider text-[#7C3AED] dark:text-[#C084FC]">
                  {adminRole}
                </span>
              </div>

              {/* Links */}
              <div className="space-y-1">
                <Link
                  href="/management/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-[#7C3AED] transition"
                >
                  <UserCheck className="h-4 w-4 text-[#7C3AED]" />
                  <span>Admin Profile</span>
                </Link>

                <Link
                  href="/management/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition"
                >
                  <Sliders className="h-4 w-4 text-slate-400" />
                  <span>Site Configuration</span>
                </Link>

                <Link
                  href="/management/database"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition"
                >
                  <Database className="h-4 w-4 text-slate-400" />
                  <span>Database Operations</span>
                </Link>
              </div>

              {/* Logout */}
              <div className="border-t border-slate-200/60 dark:border-white/10 pt-1 mt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    if (window.confirm('Are you sure you want to sign out from Admin Control?')) {
                      logoutAdmin();
                    }
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
