'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAdminTheme } from '@/features/admin/context/AdminThemeContext';
import AdminNotifications from './AdminNotifications';
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

  // Ctrl+K or Cmd+K to focus search
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('dashstack-search');
        if (searchInput) searchInput.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  return (
    <header className="sticky top-0 z-30 flex h-[80px] w-full items-center justify-between px-4 sm:px-7 lg:px-9 bg-white/80 dark:bg-[#0B0813]/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-white/[0.06] transition-colors">
      {/* ── Left: Mobile Menu, Studio Breadcrumb & Search ── */}
      <div className="flex items-center gap-3 sm:gap-5 flex-1 max-w-xl">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="lg:hidden flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-white/[0.05] text-slate-600 dark:text-slate-300 hover:text-slate-900 transition"
          aria-label="Open sidebar menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Studio Breadcrumb */}
        <div className="hidden xl:flex flex-col min-w-max pr-2">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7C3AED] dark:text-[#A855F7]">KSUBZONE STUDIO</span>
          <span className="text-sm font-black text-slate-900 dark:text-white leading-tight">{pageTitle}</span>
        </div>

        {/* Global Catalog Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm hidden sm:block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="dashstack-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search movies, dramas, subtitles..."
            className="h-10.5 w-full rounded-[16px] bg-slate-100/70 dark:bg-white/[0.05] border border-slate-200/60 dark:border-white/[0.08] pl-10 pr-14 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-[#7C3AED] focus:bg-white dark:focus:bg-[#120E1E] focus:outline-none focus:ring-4 focus:ring-[#7C3AED]/10 transition"
          />
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            <kbd className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#171226] px-1.5 py-0.5 text-[10px] font-mono text-slate-400 shadow-sm">
              ⌘K
            </kbd>
          </div>
        </form>
      </div>

      {/* ── Right: Quick Actions, Theme, and Profile Pill Matching Reference Image ── */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Quick Add Menu */}
        <div className="relative" ref={quickAddRef}>
          <button
            type="button"
            onClick={() => setQuickAddOpen(!quickAddOpen)}
            className="hidden sm:flex h-10 items-center gap-2 rounded-[14px] px-3.5 text-xs font-bold text-white bg-gradient-to-r from-[#7C3AED] to-[#A855F7] shadow-md shadow-[#7C3AED]/25 hover:shadow-lg hover:shadow-[#7C3AED]/35 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Create</span>
          </button>

          {quickAddOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-[#151124]/95 backdrop-blur-xl p-2 shadow-2xl z-50 animate-fadeInAdmin">
              <div className="px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                Quick Actions
              </div>
              <div className="space-y-1 mt-1">
                {[
                  { href: '/management/import', icon: Sparkles, label: 'Import from TMDB', color: 'text-[#8B5CF6]' },
                  { href: '/management/movies', icon: Film, label: 'Add New Movie', color: 'text-[#3B82F6]' },
                  { href: '/management/dramas', icon: Tv, label: 'Add New Drama', color: 'text-[#06B6D4]' },
                  { href: '/management/subtitles', icon: Languages, label: 'Upload Subtitle', color: 'text-[#10B981]' },
                  { href: '/management/articles', icon: BookOpenText, label: 'Write Article', color: 'text-[#F59E0B]' },
                ].map(({ href, icon: Icon, label, color }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setQuickAddOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition"
                  >
                    <Icon className={`h-4 w-4 ${color}`} />
                    <span>{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <AdminNotifications />

        {/* Theme Toggle (Light / Dark) */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.05] text-slate-500 dark:text-slate-300 hover:text-[#7C3AED] dark:hover:text-white transition shadow-sm"
          aria-label={isLight ? 'Switch to Dark mode' : 'Switch to Light mode'}
          title={isLight ? 'Switch to Dark mode' : 'Switch to Light mode'}
        >
          {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-[#F59E0B]" />}
        </button>

        {/* Public Site Link */}
        <Link
          href="/"
          target="_blank"
          className="hidden md:flex h-9 items-center gap-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.05] px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[#7C3AED] dark:hover:text-white transition shadow-sm"
        >
          <ExternalLink className="h-3.5 w-3.5 text-[#7C3AED]" />
          <span>Site</span>
        </Link>

        {/* ── User Profile Pill Exactly Matching Reference Image ── */}
        <div className="relative pl-1 sm:pl-2" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-3 py-1.5 px-3 sm:px-4 rounded-full bg-white/90 dark:bg-white/[0.06] border border-slate-200/70 dark:border-white/[0.08] shadow-sm hover:border-[#7C3AED]/30 transition group"
            aria-label="User profile menu"
          >
            {/* Circular Avatar with Gradient Initials */}
            <div className="relative flex h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] via-[#8B5CF6] to-[#A855F7] text-[11px] font-black text-white shadow-md shadow-[#7C3AED]/20">
              {avatarUrl ? (
                <img src={avatarUrl} alt={adminName} className="h-full w-full rounded-full object-cover" />
              ) : (
                <span>{adminInitial}</span>
              )}
            </div>

            {/* Name + Role Subtitle */}
            <div className="hidden sm:block text-left pr-1">
              <p className="text-[12.5px] font-bold text-slate-900 dark:text-white leading-tight">
                {adminName}
              </p>
              <p className="text-[10.5px] font-medium text-slate-400 dark:text-slate-400 leading-tight mt-0.5">
                {adminRole}
              </p>
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
