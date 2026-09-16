'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAdminTheme } from '@/features/admin/context/AdminThemeContext';
import AdminNotifications from './AdminNotifications';
import AdminSearch from './AdminSearch';
import {
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
  Sliders,
  Activity,
  ShieldCheck
} from 'lucide-react';

const PAGE_TITLES = {
  dashboard: 'Studio Overview',
  dramas: 'Dramas & TV Series',
  movies: 'Movies Catalog',
  articles: 'Articles & Editorial',
  subtitles: 'Subtitle Operations',
  'subtitle-tools': 'Subtitle Studio',
  'srt-cleaner': 'SRT Cleaner',
  import: 'TMDB Auto-Import',
  users: 'Community Members',
  comments: 'Reviews & Discussion',
  database: 'System Database',
  backup: 'Cloud Backups',
  seo: 'SEO Telemetry',
  settings: 'Site Configuration',
  profile: 'Admin Profile',
};

export default function AdminTopBar({ onOpenMobileNav }) {
  const { admin, logoutAdmin } = useAuth();
  const { isLight, toggleTheme } = useAdminTheme();
  const pathname = usePathname();
  const router = useRouter();

  const [profileOpen, setProfileOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

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
    const close = (e) => {
      if (e.key === 'Escape') {
        setProfileOpen(false);
        setQuickAddOpen(false);
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  const adminName = admin?.displayName || admin?.username || admin?.name || 'Administrator';
  const adminInitial = (adminName.slice(0, 2) || 'AD').toUpperCase();
  const adminRole = admin?.role?.name || (typeof admin?.role === 'object' ? admin.role.name : String(admin?.role || 'SuperAdmin'));
  const avatarUrl = admin?.avatar;
  const pageKey = pathname.split('/').filter(Boolean).pop() || 'dashboard';
  const pageTitle = PAGE_TITLES[pageKey] || 'Overview';

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between px-4 sm:px-6 bg-[var(--studio-surface)]/90 backdrop-blur-xl border-b border-[var(--studio-border)] transition-colors">
      {/* ── Left: Mobile Hamburger & Command Search ── */}
      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="lg:hidden flex h-9 w-9 items-center justify-center rounded-[9999px] border border-[var(--studio-border)] bg-[var(--studio-raised)] text-[var(--studio-text)] hover:bg-[var(--studio-surface-hover)] transition"
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Current Active Workspace Indicator */}
        <div className="hidden md:flex flex-col leading-none border-r border-[var(--studio-border)] pr-4">
          <span className="text-[9px] font-black tracking-widest text-[var(--studio-muted)] uppercase">
            KSUBZONE STUDIO
          </span>
          <strong className="text-xs font-bold text-[var(--studio-text)] tracking-tight mt-0.5">
            {pageTitle}
          </strong>
        </div>

        {/* Global Command & Search trigger */}
        <div className="min-w-0 flex-1 max-w-[380px]">
          <AdminSearch />
        </div>
      </div>

      {/* ── Right: Live Operational Status, Quick Create, Notifications, Theme, Profile ── */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live Operational Status Pill */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-[9999px] bg-[#14B8A6]/10 border border-[#14B8A6]/20 text-[#14B8A6] text-[11px] font-semibold">
          <span className="h-2 w-2 rounded-full bg-[#14B8A6] animate-pulse" />
          <span>Live Operational</span>
        </div>

        {/* Quick Add Menu */}
        <div className="relative" ref={quickAddRef}>
          <button
            type="button"
            aria-expanded={quickAddOpen}
            onClick={() => setQuickAddOpen(!quickAddOpen)}
            className="flex h-8 items-center gap-1.5 rounded-[9999px] px-3.5 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-sm shadow-blue-500/20 transition active:scale-95"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Create</span>
          </button>

          {quickAddOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-[16px] border border-[var(--studio-border)] bg-[var(--studio-surface)] p-1.5 shadow-2xl z-50 animate-fadeInAdmin">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--studio-muted)]">
                Quick Actions
              </div>
              <div className="space-y-0.5 mt-1">
                {[
                  { href: '/management/import', icon: Sparkles, label: 'Import from TMDB', color: 'text-[#2563EB]' },
                  { href: '/management/movies', icon: Film, label: 'Add New Movie', color: 'text-sky-500' },
                  { href: '/management/dramas', icon: Tv, label: 'Add New Drama', color: 'text-[#14B8A6]' },
                  { href: '/management/subtitles', icon: Languages, label: 'Upload Subtitle', color: 'text-emerald-500' },
                  { href: '/management/articles', icon: BookOpenText, label: 'Write Article', color: 'text-[#F59E0B]' },
                ].map(({ href, icon: Icon, label, color }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setQuickAddOpen(false)}
                    className="flex items-center gap-2.5 rounded-[12px] px-2.5 py-2 text-xs font-medium text-[var(--studio-text)] hover:bg-[var(--studio-raised)] transition"
                  >
                    <Icon className={`h-4 w-4 ${color}`} />
                    <span>{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notifications Popover */}
        <AdminNotifications />

        {/* Theme Toggle (Persists to local storage) */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-[9999px] border border-[var(--studio-border)] bg-[var(--studio-raised)] text-[var(--studio-text)] hover:border-[var(--studio-border-strong)] transition"
          aria-label={isLight ? 'Switch to Dark mode' : 'Switch to Light mode'}
          title={isLight ? 'Switch to Dark mode' : 'Switch to Light mode'}
        >
          {isLight ? <Moon className="h-4 w-4 text-[var(--studio-text)]" /> : <Sun className="h-4 w-4 text-[#F59E0B]" />}
        </button>

        {/* Public Site Link */}
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex h-8 items-center gap-1.5 rounded-[9999px] border border-[var(--studio-border)] bg-[var(--studio-raised)] px-3 text-xs font-semibold text-[var(--studio-text)] hover:border-[var(--studio-border-strong)] transition"
          title="Visit Public Website"
        >
          <ExternalLink className="h-3 w-3 text-[#2563EB]" />
          <span>Site</span>
        </Link>

        {/* ── User Profile Pill ── */}
        <div className="relative pl-1" ref={profileRef}>
          <button
            type="button"
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1 rounded-[9999px] hover:bg-[var(--studio-raised)] transition group"
            aria-label="User profile menu"
          >
            <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[9999px] bg-gradient-to-br from-[#2563EB] to-[#14B8A6] text-[11px] font-bold text-white shadow-sm ring-2 ring-[#2563EB]/20">
              {avatarUrl ? (
                <img src={avatarUrl} alt={adminName} className="h-full w-full rounded-[9999px] object-cover" />
              ) : (
                <span>{adminInitial}</span>
              )}
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-[var(--studio-muted)] group-hover:text-[var(--studio-text)] transition-transform" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-[16px] border border-[var(--studio-border)] bg-[var(--studio-surface)] p-2 shadow-2xl z-50 animate-fadeInAdmin">
              {/* Header Info */}
              <div className="p-3 border-b border-[var(--studio-border)] mb-1.5 bg-[var(--studio-raised)] rounded-[12px]">
                <p className="text-xs font-bold text-[var(--studio-text)] truncate">{adminName}</p>
                <p className="text-[11px] text-[var(--studio-muted)] truncate">{admin?.email || 'admin@ksubzone.com'}</p>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-[9999px] bg-[#2563EB]/15 text-[9.5px] font-black uppercase tracking-wider text-[#2563EB]">
                  {adminRole}
                </span>
              </div>

              {/* Menu items */}
              <div className="space-y-0.5">
                <Link
                  href="/management/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 rounded-[12px] px-3 py-2 text-xs font-medium text-[var(--studio-text)] hover:bg-[var(--studio-raised)] transition"
                >
                  <User className="h-4 w-4 text-[var(--studio-muted)]" />
                  <span>Profile Settings</span>
                </Link>
                <Link
                  href="/management/seo"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 rounded-[12px] px-3 py-2 text-xs font-medium text-[var(--studio-text)] hover:bg-[var(--studio-raised)] transition"
                >
                  <Shield className="h-4 w-4 text-[var(--studio-muted)]" />
                  <span>System Diagnostics</span>
                </Link>
              </div>

              {/* Logout */}
              <div className="pt-1.5 mt-1.5 border-t border-[var(--studio-border)]">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    logoutAdmin();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-[12px] px-3 py-2 text-xs font-medium text-[#EF4444] hover:bg-[#EF4444]/10 transition"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log Out of Studio</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
