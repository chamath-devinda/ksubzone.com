'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSiteContent } from '@/hooks/useSiteContent';
import { resolveLogoUrl } from '@/utils/mediaImages';
import AdminNotifications from './AdminNotifications';
import { useAdminTheme } from '@/features/admin/context/AdminThemeContext';
import {
  BookOpenText,
  ChevronRight,
  Cloud,
  Database,
  ExternalLink,
  Film,
  Languages,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Server,
  Settings2,
  Sparkles,
  Sun,
  Tv,
  Users,
  WandSparkles,
  X,
} from 'lucide-react';

const NAV_GROUPS = [
  {
    label: 'Workspace',
    links: [
      { to: '/management/dashboard', label: 'Overview', description: 'Analytics & health', icon: LayoutDashboard },
      { to: '/management/import', label: 'TMDB Import', description: 'Add new titles', icon: Sparkles },
    ],
  },
  {
    label: 'Content',
    links: [
      { to: '/management/movies', label: 'Movies', description: 'Manage film library', icon: Film },
      { to: '/management/dramas', label: 'Dramas', description: 'Series & episodes', icon: Tv },
      { to: '/management/articles', label: 'Articles', description: 'Editorial content', icon: BookOpenText },
      { to: '/management/subtitles', label: 'Subtitles', description: 'Moderation queue', icon: Languages },
      { to: '/management/comments', label: 'Comments', description: 'Reviews & discussion', icon: MessageSquareText },
      { to: '/management/users', label: 'Members', description: 'Accounts & access', icon: Users },
    ],
  },
  {
    label: 'Creator tools',
    links: [
      { to: '/management/subtitle-tools', label: 'Subtitle Studio', description: 'Brand & translate', icon: WandSparkles },
      { to: '/management/srt-cleaner', label: 'SRT Cleaner', description: 'Repair subtitle files', icon: Languages },
      { to: '/management/settings', label: 'Site Builder', description: 'Brand & content', icon: Settings2 },
    ],
  },
  {
    label: 'System',
    links: [
      { to: '/management/database', label: 'Database', description: 'Browse records', icon: Server },
      { to: '/management/backup', label: 'Backups', description: 'Protect site data', icon: Cloud },
      { to: '/management/seo', label: 'Configuration', description: 'SEO & raw settings', icon: Database },
    ],
  },
];

export default function AdminSidebar() {
  const { admin, logoutAdmin } = useAuth();
  const { theme, toggleTheme, isLight } = useAdminTheme();
  const pathname = usePathname();
  const { content } = useSiteContent();
  const brand = content?.brand || {};
  const logoUrl = resolveLogoUrl(brand.logoUrl);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const syncViewport = () => setIsDesktop(mediaQuery.matches);
    syncViewport();
    mediaQuery.addEventListener('change', syncViewport);
    return () => mediaQuery.removeEventListener('change', syncViewport);
  }, []);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('ksz-admin-nav-collapsed') === 'true');
    } catch (_) {}
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      try { localStorage.setItem('ksz-admin-nav-collapsed', String(next)); } catch (_) {}
      return next;
    });
  };

  const filteredGroups = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return NAV_GROUPS;
    return NAV_GROUPS
      .map((group) => ({
        ...group,
        links: group.links.filter((link) =>
          `${link.label} ${link.description}`.toLowerCase().includes(term)
        ),
      }))
      .filter((group) => group.links.length > 0);
  }, [query]);

  const allLinks = NAV_GROUPS.flatMap((group) => group.links);
  const currentLink = allLinks.find((link) => pathname === link.to) || allLinks.find((link) => pathname.startsWith(`${link.to}/`));
  const adminRoleName = admin?.role?.name || (typeof admin?.role === 'object' ? admin.role.name : String(admin?.role || 'Administrator'));
  const adminName = admin?.username || admin?.name || 'Admin';
  const adminInitial = adminName.charAt(0).toUpperCase();

  return (
    <>
      <header className="admin-mobile-bar flex lg:hidden items-center justify-between gap-3 px-4 py-3 sticky top-0 z-40 w-full">
        <div className="flex items-center gap-3 min-w-0">
          <button type="button" onClick={() => setMobileOpen(true)} className="admin-icon-button" aria-label="Open admin navigation">
            <Menu className="w-[18px] h-[18px]" />
          </button>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-violet-300/70">KSubZone Admin</p>
            <p className="text-sm font-semibold text-white truncate">{currentLink?.label || 'Management'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDesktop === false && <AdminNotifications />}
          <button
            type="button"
            onClick={toggleTheme}
            className="admin-icon-button"
            aria-label={isLight ? 'Switch to Dark theme' : 'Switch to Light theme'}
            title={isLight ? 'Switch to Dark theme' : 'Switch to Light theme'}
          >
            {isLight ? <Moon className="w-[17px] h-[17px] text-indigo-500" /> : <Sun className="w-[17px] h-[17px] text-amber-400" />}
          </button>
          <Link href="/" target="_blank" className="admin-icon-button" aria-label="Open public website">
            <ExternalLink className="w-[17px] h-[17px]" />
          </Link>
        </div>
      </header>

      {mobileOpen && (
        <button type="button" className="fixed inset-0 z-40 bg-[#020208]/80 backdrop-blur-md lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close admin navigation" />
      )}

      <aside className={`admin-sidebar fixed inset-y-0 left-0 z-50 flex flex-col flex-shrink-0 overflow-hidden transition-[width,transform] duration-300 ease-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${collapsed ? 'lg:w-[5.5rem]' : 'lg:w-[18rem]'} w-[18rem] ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-[76px] items-center justify-between gap-2 border-b border-white/[0.07] px-4 flex-shrink-0">
          <Link href="/management/dashboard" className="flex items-center gap-3 min-w-0" title="KSubZone Admin">
            <span className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-white/10 bg-white/[0.06] shadow-[0_10px_30px_rgba(124,58,237,0.18)]">
              {logoUrl ? <img src={logoUrl} alt={brand.siteName || 'KSubZone'} className="h-7 w-7 object-contain" /> : <span className="font-display text-sm font-extrabold text-white">K</span>}
              <span className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full border-2 border-[#11101d] bg-emerald-400" />
            </span>
            <span className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
              <span className="block truncate font-display text-[15px] font-bold tracking-tight text-white">{brand.logoText || brand.siteName || 'KSubZone'}</span>
              <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500">Control Center</span>
            </span>
          </Link>

          <button type="button" onClick={() => setMobileOpen(false)} className="admin-icon-button admin-mobile-only" aria-label="Close admin navigation">
            <X className="h-[18px] w-[18px]" />
          </button>

          {!collapsed && (
            <button type="button" onClick={toggleCollapsed} className="admin-icon-button admin-desktop-only" aria-label="Collapse admin navigation" title="Collapse sidebar">
              <PanelLeftClose className="h-[17px] w-[17px]" />
            </button>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className={`px-3 pt-4 ${collapsed ? 'lg:hidden' : ''}`}>
            <label className="relative block">
              <span className="sr-only">Search navigation</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a section..." className="admin-nav-search h-10 w-full rounded-xl pl-9 pr-3 text-xs outline-none" />
            </label>
          </div>

          <nav className="admin-nav-scroll flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 pt-4">
            {filteredGroups.map((group, groupIndex) => (
              <div key={group.label} className={groupIndex === 0 ? '' : 'mt-5'}>
                <p className={`mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.22em] text-slate-600 ${collapsed ? 'lg:hidden' : ''}`}>{group.label}</p>
                {collapsed && <div className="mx-auto mb-2 hidden h-px w-7 bg-white/[0.07] lg:block" />}
                <div className="space-y-1">
                  {group.links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.to || pathname.startsWith(`${link.to}/`);
                    return (
                      <Link key={link.to} href={link.to} title={collapsed ? link.label : undefined} className={`admin-nav-link group relative flex min-h-[46px] items-center gap-3 rounded-xl px-3 transition-all duration-200 ${isActive ? 'is-active text-white' : 'text-slate-400 hover:text-slate-100'} ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
                        <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] transition-colors ${isActive ? 'bg-violet-500/20 text-violet-200' : 'text-slate-500 group-hover:bg-white/[0.05] group-hover:text-slate-300'}`}>
                          <Icon className="h-[17px] w-[17px]" />
                        </span>
                        <span className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
                          <span className="block truncate text-[12px] font-semibold leading-tight">{link.label}</span>
                          <span className="mt-0.5 block truncate text-[9px] font-medium text-slate-600 group-hover:text-slate-500">{link.description}</span>
                        </span>
                        {isActive && <ChevronRight className={`h-3.5 w-3.5 text-violet-300/80 ${collapsed ? 'lg:hidden' : ''}`} />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            {filteredGroups.length === 0 && (
              <div className={`px-3 py-10 text-center ${collapsed ? 'lg:hidden' : ''}`}>
                <Search className="mx-auto h-5 w-5 text-slate-700" />
                <p className="mt-2 text-[11px] text-slate-500">No matching sections</p>
              </div>
            )}
          </nav>
        </div>

        <div className="border-t border-white/[0.07] p-3 flex-shrink-0">
          {collapsed && (
            <button type="button" onClick={toggleCollapsed} className="admin-icon-button admin-desktop-only mx-auto mb-2" aria-label="Expand admin navigation" title="Expand sidebar">
              <PanelLeftOpen className="h-[17px] w-[17px]" />
            </button>
          )}

          <div className={`mb-2 flex items-center gap-2 ${collapsed ? 'lg:flex-col' : ''}`}>
            {isDesktop === true && <AdminNotifications />}
            <button
              type="button"
              onClick={toggleTheme}
              className={`admin-icon-button flex items-center justify-center ${collapsed ? 'mx-auto' : ''}`}
              aria-label={isLight ? 'Switch to Dark theme' : 'Switch to Light theme'}
              title={isLight ? 'Switch to Dark theme' : 'Switch to Light theme'}
            >
              {isLight ? <Moon className="w-[17px] h-[17px] text-indigo-500" /> : <Sun className="w-[17px] h-[17px] text-amber-400" />}
            </button>
            <Link href="/" target="_blank" className={`admin-visit-button flex h-9 items-center justify-center gap-2 rounded-xl px-3 text-[10px] font-semibold text-slate-400 transition hover:text-white ${collapsed ? 'lg:w-9 lg:px-0' : 'flex-1'}`} title="Open public website">
              <ExternalLink className="h-3.5 w-3.5" />
              <span className={collapsed ? 'lg:hidden' : ''}>View website</span>
            </Link>
          </div>

          <div className={`admin-profile-card flex items-center gap-3 rounded-2xl p-2 ${collapsed ? 'lg:justify-center' : ''}`}>
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-bold text-white shadow-[0_8px_20px_rgba(124,58,237,0.28)]">{adminInitial}</span>
            <span className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
              <span className="block truncate text-[11px] font-semibold text-slate-100">{adminName}</span>
              <span className="mt-0.5 block truncate text-[9px] capitalize text-slate-500">{adminRoleName}</span>
            </span>
            <button type="button" onClick={() => logoutAdmin()} className={`admin-logout-button flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] text-slate-500 transition hover:text-rose-300 ${collapsed ? 'lg:hidden' : ''}`} aria-label="Sign out" title="Sign out">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
