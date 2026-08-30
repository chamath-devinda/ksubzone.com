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
  ChevronRight,
  LogOut,
  User,
  Shield,
  Command,
  Slash,
} from 'lucide-react';

const ROUTE_NAMES = {
  '/management/dashboard': 'Overview',
  '/management/import': 'TMDB Import',
  '/management/movies': 'Movies Library',
  '/management/dramas': 'Dramas & Series',
  '/management/articles': 'Articles & News',
  '/management/subtitles': 'Subtitle Moderation',
  '/management/comments': 'User Comments',
  '/management/users': 'Members & Access',
  '/management/subtitle-tools': 'Subtitle Studio',
  '/management/srt-cleaner': 'SRT Cleaner',
  '/management/settings': 'Site Builder',
  '/management/database': 'Database Viewer',
  '/management/backup': 'Backups',
  '/management/seo': 'SEO & Config',
};

export default function AdminTopBar({ onOpenMobileNav }) {
  const { admin, logoutAdmin } = useAuth();
  const { theme, toggleTheme, isLight } = useAdminTheme();
  const pathname = usePathname();
  const router = useRouter();

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const quickAddRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (quickAddRef.current && !quickAddRef.current.contains(e.target)) {
        setQuickAddOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ctrl+K / Cmd+K → focus search
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('admin-global-search');
        if (searchInput) searchInput.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentRouteName = ROUTE_NAMES[pathname] || 'Dashboard';
  const adminName = admin?.username || admin?.name || 'Admin';
  const adminInitial = adminName.charAt(0).toUpperCase();
  const adminRole = admin?.role?.name || (typeof admin?.role === 'object' ? admin.role.name : String(admin?.role || 'Administrator'));

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/management/movies?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <header className="ksz-topbar sticky top-0 z-30 flex h-[60px] w-full items-center justify-between px-4 sm:px-5 border-b border-white/[0.05]">
      {/* ── Left: Mobile Toggle + Breadcrumbs ── */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="flex lg:hidden h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
          aria-label="Open sidebar menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-[12px] text-slate-500 select-none">
          <Link href="/management/dashboard" className="hover:text-slate-300 transition font-medium">
            Control Center
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-slate-300 font-semibold truncate max-w-[200px]">
            {currentRouteName}
          </span>
        </nav>
      </div>

      {/* ── Center: Global Search ── */}
      <div className="flex-1 max-w-sm mx-4 hidden md:block">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600" />
          <input
            id="admin-global-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search movies, dramas, members, subtitles…"
            className="ksz-search-input h-8 w-full rounded-lg border border-white/[0.06] bg-white/[0.03] pl-9 pr-[72px] text-[12px] text-slate-200 placeholder:text-slate-600 outline-none transition focus:border-violet-500/40 focus:bg-white/[0.05] focus:ring-0"
          />
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            <kbd className="rounded border border-white/[0.08] bg-white/[0.04] px-1 py-0.5 text-[9px] font-mono text-slate-500">Ctrl</kbd>
            <kbd className="rounded border border-white/[0.08] bg-white/[0.04] px-1 py-0.5 text-[9px] font-mono text-slate-500">K</kbd>
          </div>
        </form>
      </div>

      {/* ── Right: Actions ── */}
      <div className="flex items-center gap-1.5 sm:gap-2">

        {/* Quick Add */}
        <div className="relative" ref={quickAddRef}>
          <button
            type="button"
            onClick={() => setQuickAddOpen(!quickAddOpen)}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 text-[12px] font-medium text-slate-300 hover:text-white hover:bg-white/[0.07] hover:border-white/[0.12] transition active:scale-95"
            aria-label="Quick add content"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add</span>
          </button>

          {quickAddOpen && (
            <div className="ksz-dropdown absolute right-0 mt-1.5 w-52 rounded-xl border border-white/[0.08] bg-[#151821] p-1.5 shadow-2xl z-50">
              <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                Quick Actions
              </div>
              {[
                { href: '/management/import', icon: Sparkles, label: 'Import from TMDB', color: 'text-violet-400' },
                { href: '/management/movies', icon: Film, label: 'Add New Movie', color: 'text-pink-400' },
                { href: '/management/dramas', icon: Tv, label: 'Add New Drama', color: 'text-sky-400' },
                { href: '/management/subtitles', icon: Languages, label: 'Upload Subtitle', color: 'text-emerald-400' },
                { href: '/management/articles', icon: BookOpenText, label: 'Write Article', color: 'text-amber-400' },
              ].map(({ href, icon: Icon, label, color }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setQuickAddOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] font-medium text-slate-400 hover:bg-white/[0.06] hover:text-white transition"
                >
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <AdminNotifications />

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-slate-500 hover:text-slate-200 hover:border-white/[0.1] transition"
          aria-label={isLight ? 'Switch to Dark mode' : 'Switch to Light mode'}
          title={isLight ? 'Switch to Dark mode' : 'Switch to Light mode'}
        >
          {isLight ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5 text-slate-400" />}
        </button>

        {/* View Site */}
        <Link
          href="/"
          target="_blank"
          className="hidden lg:flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 text-[12px] font-medium text-slate-500 hover:text-slate-200 hover:border-white/[0.1] transition"
          title="Open public website in new tab"
        >
          <ExternalLink className="h-3 w-3" />
          <span>Site</span>
        </Link>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 rounded-lg p-1 hover:bg-white/[0.04] transition"
            aria-label="User account menu"
          >
            <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-violet-800 text-[11px] font-bold text-white">
              {adminInitial}
              <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full border-[1.5px] border-[#08090D] bg-emerald-400" />
            </span>
          </button>

          {profileOpen && (
            <div className="ksz-dropdown absolute right-0 mt-1.5 w-52 rounded-xl border border-white/[0.08] bg-[#151821] p-1.5 shadow-2xl z-50">
              <div className="px-3 py-2.5 border-b border-white/[0.05] mb-1">
                <p className="text-[12px] font-semibold text-slate-200 truncate">{adminName}</p>
                <p className="text-[10px] font-medium text-slate-500 truncate capitalize mt-0.5">{adminRole}</p>
              </div>
              <Link
                href="/management/settings"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-400 hover:bg-white/[0.06] hover:text-white transition"
              >
                <Shield className="h-3.5 w-3.5 text-slate-500" />
                <span>Admin Settings</span>
              </Link>
              <button
                type="button"
                onClick={() => { setProfileOpen(false); logoutAdmin(); }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-rose-400 hover:bg-rose-500/10 transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
