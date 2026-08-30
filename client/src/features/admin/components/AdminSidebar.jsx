'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSiteContent } from '@/hooks/useSiteContent';
import { resolveLogoUrl } from '@/utils/mediaImages';
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
  MessageSquareText,
  Clapperboard,
  Star,
} from 'lucide-react';

const NAV_GROUPS = [
  {
    label: 'Workspace',
    links: [
      { to: '/management/dashboard', label: 'Overview', icon: LayoutDashboard },
      { to: '/management/import', label: 'TMDB Import', icon: Sparkles, badge: 'Auto' },
    ],
  },
  {
    label: 'Content',
    links: [
      { to: '/management/movies', label: 'Movies', icon: Film },
      { to: '/management/dramas', label: 'Dramas', icon: Tv },
      { to: '/management/articles', label: 'Articles', icon: BookOpenText },
      { to: '/management/subtitles', label: 'Subtitles', icon: Languages },
      { to: '/management/comments', label: 'Comments', icon: MessageSquareText },
      { to: '/management/users', label: 'Members', icon: Users },
    ],
  },
  {
    label: 'Creator Tools',
    links: [
      { to: '/management/subtitle-tools', label: 'Subtitle Studio', icon: WandSparkles },
      { to: '/management/srt-cleaner', label: 'SRT Cleaner', icon: Languages },
      { to: '/management/settings', label: 'Site Builder', icon: Settings2 },
    ],
  },
  {
    label: 'System',
    links: [
      { to: '/management/database', label: 'Database', icon: Database },
      { to: '/management/backup', label: 'Backups', icon: Cloud },
      { to: '/management/seo', label: 'SEO & Config', icon: Server },
    ],
  },
];

export default function AdminSidebar({ mobileOpen = false, onCloseMobileNav = () => {} }) {
  const { admin, logoutAdmin } = useAuth();
  const { theme, toggleTheme, isLight } = useAdminTheme();
  const pathname = usePathname();
  const { content } = useSiteContent();
  const brand = content?.brand || {};
  const logoUrl = resolveLogoUrl(brand.logoUrl);

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('ksz-admin-nav-collapsed') === 'true');
    } catch (_) {}
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem('ksz-admin-nav-collapsed', String(next));
      } catch (_) {}
      return next;
    });
  };

  const adminName = admin?.username || admin?.name || 'Admin';
  const adminInitial = adminName.charAt(0).toUpperCase();
  const adminRoleName = admin?.role?.name || (typeof admin?.role === 'object' ? admin.role.name : String(admin?.role || 'Administrator'));

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobileNav}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Shell */}
      <aside
        className={`ksz-sidebar fixed inset-y-0 left-0 z-50 flex flex-col flex-shrink-0 transition-[width,transform] duration-[220ms] ease-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          collapsed ? 'lg:w-[72px]' : 'lg:w-[256px]'
        } w-[256px] ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* ── Brand Header ── */}
        <div className={`flex h-[60px] items-center border-b border-white/[0.05] flex-shrink-0 ${collapsed ? 'justify-center px-0' : 'justify-between px-4'}`}>
          <Link
            href="/management/dashboard"
            className="flex items-center gap-2.5 min-w-0 group"
            title="KSubZone Control Center"
          >
            <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#1A1B25] border border-white/[0.07]">
              {logoUrl ? (
                <img src={logoUrl} alt={brand.siteName || 'KSubZone'} className="h-5 w-5 object-contain" />
              ) : (
                <span className="font-display text-xs font-black text-violet-400">K</span>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full border border-[#090A0F] bg-emerald-400" />
            </div>

            {!collapsed && (
              <div className="min-w-0 leading-none">
                <span className="block truncate text-[13px] font-bold text-slate-100 tracking-tight">
                  {brand.logoText || brand.siteName || 'KSubZone'}
                </span>
                <span className="block text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500 mt-0.5">
                  Control Center
                </span>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={onCloseMobileNav}
            className="lg:hidden flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] transition"
            aria-label="Close menu"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          {!collapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:text-slate-300 hover:bg-white/[0.04] transition"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav className="ksz-nav-scroll flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-5 min-h-0" aria-label="Main navigation">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className={collapsed ? '' : 'px-3'}>
              {!collapsed ? (
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                  {group.label}
                </p>
              ) : (
                <div className="mx-auto mb-2 h-px w-8 bg-white/[0.05]" />
              )}

              <div className="space-y-0.5">
                {group.links.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.to || (link.to !== '/management/dashboard' && pathname.startsWith(`${link.to}/`));

                  return (
                    <Link
                      key={link.to}
                      href={link.to}
                      title={collapsed ? link.label : undefined}
                      onClick={() => { if (mobileOpen) onCloseMobileNav(); }}
                      className={`group relative flex items-center gap-2.5 rounded-lg text-[12.5px] font-medium transition-all duration-150 ${
                        collapsed ? 'h-9 w-9 mx-auto justify-center' : 'h-9 px-2.5'
                      } ${
                        isActive
                          ? 'bg-white/[0.06] text-slate-100'
                          : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.03]'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-full bg-violet-500" />
                      )}

                      <Icon
                        className={`h-[15px] w-[15px] flex-shrink-0 transition-colors ${
                          isActive ? 'text-violet-400' : 'text-slate-600 group-hover:text-slate-400'
                        }`}
                      />

                      {!collapsed && (
                        <span className="flex-1 truncate">{link.label}</span>
                      )}

                      {!collapsed && link.badge && (
                        <span className="rounded-md bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 text-[9px] font-bold text-violet-400 leading-none">
                          {link.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Bottom Bar ── */}
        <div className="border-t border-white/[0.05] flex-shrink-0 p-2 space-y-1">
          {collapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden lg:flex mx-auto h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.04] transition"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="h-3.5 w-3.5" />
            </button>
          )}

          {/* User Profile Footer */}
          <div
            className={`flex items-center gap-2 rounded-lg p-1.5 hover:bg-white/[0.03] transition ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <span className="relative flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-violet-600 to-indigo-600 text-[11px] font-bold text-white shadow-sm">
              {adminInitial}
            </span>

            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-200">{adminName}</p>
                <p className="truncate text-[9px] capitalize text-slate-500">{adminRoleName}</p>
              </div>
            )}

            {!collapsed && (
              <button
                type="button"
                onClick={() => logoutAdmin()}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
