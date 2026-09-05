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
  User,
  Shield,
  UserCheck,
  ChevronDown,
  Database,
  Sliders,
  Bell
} from 'lucide-react';

const PAGE_TITLES = {
  dashboard: 'Overview', dramas: 'Dramas & TV', movies: 'Movies', articles: 'Articles',
  subtitles: 'Subtitles', 'subtitle-tools': 'Subtitle Studio', 'srt-cleaner': 'SRT Cleaner',
  import: 'TMDB Import', users: 'Members', comments: 'Comments', database: 'Database',
  backup: 'Cloud Backups', seo: 'SEO & Config', settings: 'Site Builder', profile: 'Admin Profile',
};

export default function AdminTopBar({ onOpenMobileNav }) {
  const { admin, logoutAdmin } = useAuth();
  const { theme, toggleTheme, isLight } = useAdminTheme();
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

  // Ctrl+K → focus search
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

  const adminName = admin?.displayName || admin?.username || admin?.name || 'Admin User';
  const adminInitial = adminName.charAt(0).toUpperCase();
  const adminRole = admin?.role?.name || (typeof admin?.role === 'object' ? admin.role.name : String(admin?.role || 'Admin'));
  const avatarUrl = admin?.avatar;
  const pageKey = pathname.split('/').filter(Boolean).pop() || 'dashboard';
  const pageTitle = PAGE_TITLES[pageKey] || 'Workspace';

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/management/movies?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <header className="dashstack-topbar ksz-studio-topbar sticky top-0 z-30 flex h-[82px] w-full items-center justify-between px-4 sm:px-7 lg:px-9 transition-colors">
      {/* ── Left: Toggle & DashStack Search Bar ── */}
      <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-xl">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="lg:hidden flex h-10 w-10 items-center justify-center rounded-xl border border-[#EAEBF0] dark:border-[#313D4F] bg-[#F5F6FA] dark:bg-[#1B2431] text-slate-600 dark:text-slate-300 hover:text-slate-900 transition"
          aria-label="Open sidebar menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="hidden xl:block min-w-[132px]">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">KSubZone Studio</p>
          <p className="mt-0.5 text-sm font-extrabold text-slate-900 dark:text-white">{pageTitle}</p>
        </div>

        {/* Global catalog search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm hidden sm:block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-[#9AA5B8]" />
          <input
            id="dashstack-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search movies, dramas, subtitles..."
            className="ksz-studio-search h-11 w-full rounded-[14px] pl-10 pr-16 text-xs outline-none transition"
          />
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            <kbd className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#273142] px-1 py-0.5 text-[9px] font-mono text-slate-400 shadow-sm">⌘K</kbd>
          </div>
        </form>
      </div>

      {/* ── Right: DashStack Notification, Theme & Profile ── */}
      <div className="flex items-center gap-3 sm:gap-4">

        {/* Quick Add Menu */}
        <div className="relative" ref={quickAddRef}>
          <button
            type="button"
            onClick={() => setQuickAddOpen(!quickAddOpen)}
            className="ksz-studio-create hidden sm:flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold text-white transition active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create</span>
          </button>

          {quickAddOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[#EAEBF0] dark:border-[#313D4F] bg-white dark:bg-[#273142] p-2 shadow-xl z-50 animate-fadeInAdmin">
              <div className="px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#9AA5B8]">
                Quick Actions
              </div>
              <div className="space-y-1 mt-1">
                {[
                  { href: '/management/import', icon: Sparkles, label: 'Import from TMDB', color: 'text-[#8280FF]' },
                  { href: '/management/movies', icon: Film, label: 'Add New Movie', color: 'text-[#FF9066]' },
                  { href: '/management/dramas', icon: Tv, label: 'Add New Drama', color: 'text-[#B85ADB]' },
                  { href: '/management/subtitles', icon: Languages, label: 'Upload Subtitle', color: 'text-[#00B69B]' },
                  { href: '/management/articles', icon: BookOpenText, label: 'Write Article', color: 'text-[#FEC53D]' },
                ].map(({ href, icon: Icon, label, color }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setQuickAddOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-[#F5F6FA] dark:hover:bg-white/[0.06] transition"
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
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#EAEBF0] dark:border-[#313D4F] bg-[#F5F6FA] dark:bg-[#1B2431] text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
          aria-label={isLight ? 'Switch to Dark mode' : 'Switch to Light mode'}
          title={isLight ? 'Switch to Dark mode' : 'Switch to Light mode'}
        >
          {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-[#FEC53D]" />}
        </button>

        {/* View Public Site */}
        <Link
          href="/"
          target="_blank"
          className="hidden md:flex h-9 items-center gap-1.5 rounded-lg border border-[#EAEBF0] dark:border-[#313D4F] bg-[#F5F6FA] dark:bg-[#1B2431] px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
        >
          <ExternalLink className="h-3.5 w-3.5 text-[#B85ADB]" />
          <span>Site</span>
        </Link>

        {/* ── DashStack Profile Dropdown (Avatar + Name + Subtitle + Chevron) ── */}
        <div className="relative pl-1 sm:pl-2 border-l border-[#EAEBF0] dark:border-[#313D4F]" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-3 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.05] transition group"
            aria-label="User profile menu"
          >
            {/* Avatar with Status Dot */}
            <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#490570] text-xs font-black text-white overflow-hidden shadow-sm">
              {avatarUrl ? (
                <img src={avatarUrl} alt={adminName} className="h-full w-full object-cover" />
              ) : (
                <span>{adminInitial}</span>
              )}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-[#273142] bg-[#00B69B]" />
            </div>

            {/* Name + Subtitle Role */}
            <div className="hidden lg:block text-left">
              <p className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">
                {adminName}
              </p>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-[#9AA5B8] leading-tight mt-0.5">
                {adminRole}
              </p>
            </div>

            <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white transition-transform" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-[#EAEBF0] dark:border-[#313D4F] bg-white dark:bg-[#273142] p-2 shadow-2xl z-50 animate-fadeInAdmin">
              {/* Header Info */}
              <div className="p-3 border-b border-[#EAEBF0] dark:border-[#313D4F] mb-1.5 bg-[#F5F6FA] dark:bg-[#1B2431] rounded-xl">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{adminName}</p>
                <p className="text-[11px] text-slate-500 dark:text-[#9AA5B8] truncate">{admin?.email || 'admin@ksubzone.com'}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-[#490570]/20 text-[9.5px] font-black uppercase tracking-wider text-[#B85ADB]">
                  {adminRole}
                </span>
              </div>

              {/* Links */}
              <div className="space-y-1">
                <Link
                  href="/management/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-[#F5F6FA] dark:hover:bg-white/[0.06] hover:text-[#B85ADB] transition"
                >
                  <UserCheck className="h-4 w-4 text-[#B85ADB]" />
                  <span>Admin Profile & Avatar</span>
                </Link>

                <Link
                  href="/management/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-[#F5F6FA] dark:hover:bg-white/[0.06] transition"
                >
                  <Sliders className="h-4 w-4 text-slate-400" />
                  <span>Site Builder & Config</span>
                </Link>

                <Link
                  href="/management/database"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-[#F5F6FA] dark:hover:bg-white/[0.06] transition"
                >
                  <Database className="h-4 w-4 text-slate-400" />
                  <span>Database & Health</span>
                </Link>
              </div>

              {/* Logout */}
              <div className="border-t border-[#EAEBF0] dark:border-[#313D4F] pt-1 mt-1.5">
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
