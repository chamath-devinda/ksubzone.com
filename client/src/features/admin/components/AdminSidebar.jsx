'use client';

import React, { useEffect, useState } from 'react';
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
  Server,
  Settings2,
  Sparkles,
  Sun,
  Tv,
  Users,
  WandSparkles,
  X,
  MessageSquareText,
  UserCheck,
  ShieldCheck,
  Sliders,
  Compass
} from 'lucide-react';

const NAV_GROUPS = [
  {
    label: 'PAGES',
    links: [
      { to: '/management/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/management/profile', label: 'Admin Profile', icon: UserCheck, badge: 'Profile' },
      { to: '/management/import', label: 'TMDB Import', icon: Sparkles, badge: 'Auto' },
    ],
  },
  {
    label: 'CONTENT ENGINE',
    links: [
      { to: '/management/movies', label: 'Movies', icon: Film },
      { to: '/management/dramas', label: 'Dramas & TV', icon: Tv },
      { to: '/management/articles', label: 'Articles', icon: BookOpenText },
      { to: '/management/subtitles', label: 'Subtitles', icon: Languages },
      { to: '/management/comments', label: 'Comments', icon: MessageSquareText },
      { to: '/management/users', label: 'Members', icon: Users },
    ],
  },
  {
    label: 'STUDIO & TOOLS',
    links: [
      { to: '/management/subtitle-tools', label: 'Subtitle Studio', icon: WandSparkles },
      { to: '/management/srt-cleaner', label: 'SRT Cleaner', icon: Languages },
      { to: '/management/settings', label: 'Site Builder', icon: Settings2 },
    ],
  },
  {
    label: 'SYSTEM & DATA',
    links: [
      { to: '/management/database', label: 'Database', icon: Database },
      { to: '/management/backup', label: 'Cloud Backups', icon: Cloud },
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

  const adminName = admin?.displayName || admin?.username || admin?.name || 'Admin';
  const adminInitial = adminName.charAt(0).toUpperCase();
  const adminRoleName = admin?.role?.name || (typeof admin?.role === 'object' ? admin.role.name : String(admin?.role || 'Admin'));
  const avatarUrl = admin?.avatar;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onCloseMobileNav}
          aria-hidden="true"
        />
      )}

      {/* KSubZone Studio Sidebar Shell */}
      <aside
        className={`dashstack-sidebar ksz-studio-sidebar fixed inset-y-0 left-0 z-50 flex flex-col flex-shrink-0 transition-all duration-200 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          collapsed ? 'lg:w-[84px]' : 'lg:w-[276px]'
        } w-[276px] ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}
      >
        {/* ── Brand Header ── */}
        <div className={`ksz-studio-brand flex h-[82px] items-center flex-shrink-0 ${
          collapsed ? 'justify-center px-0' : 'justify-between px-6'
        }`}>
          <Link
            href="/management/dashboard"
            className="flex items-center gap-3 min-w-0 group"
            title="KSubZone Control Center"
          >
            <div className="ksz-studio-logo flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[15px] text-white font-black">
              {logoUrl ? (
                <img src={logoUrl} alt={brand.siteName || 'KSubZone'} className="h-6 w-6 object-contain" />
              ) : (
                <span className="font-display text-base font-black">K</span>
              )}
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <span className="block truncate text-[18px] font-black tracking-tight text-white">
                  {brand.logoText || brand.siteName || 'KSubZone'}
                </span>
                <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-white/45">Content studio</span>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={onCloseMobileNav}
            className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>

          {!collapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ── Navigation List ── */}
        <nav className="admin-custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden py-5 space-y-6 min-h-0" aria-label="Main navigation">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className={collapsed ? '' : 'px-4'}>
              {!collapsed ? (
                <p className="px-3 mb-2 text-[10px] font-bold tracking-[0.16em] text-white/35 uppercase">
                  {group.label}
                </p>
              ) : (
                <div className="mx-auto mb-3 h-px w-8 bg-slate-200 dark:bg-white/[0.08]" />
              )}

              <div className="space-y-1">
                {group.links.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.to || (link.to !== '/management/dashboard' && pathname.startsWith(`${link.to}/`));

                  return (
                    <Link
                      key={link.to}
                      href={link.to}
                      title={collapsed ? link.label : undefined}
                      onClick={() => { if (mobileOpen) onCloseMobileNav(); }}
                      className={`ksz-studio-nav group relative flex items-center gap-3.5 rounded-[14px] text-[13px] font-semibold transition-all duration-150 ${
                        collapsed ? 'h-11 w-11 mx-auto justify-center' : 'h-11 px-3.5'
                      } ${
                        isActive
                          ? 'is-active text-white font-bold'
                          : 'text-white/60 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <Icon className={`h-[18px] w-[18px] flex-shrink-0 ${
                        isActive ? 'text-white' : 'text-white/45 group-hover:text-white'
                      }`} />

                      {!collapsed && (
                        <span className="flex-1 truncate">{link.label}</span>
                      )}

                      {!collapsed && link.badge && (
                        <span className={`rounded-md px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider leading-none ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300'
                        }`}>
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

        {/* ── Bottom Section: profile and actions ── */}
        <div className="ksz-studio-profile flex-shrink-0 p-3">
          {collapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden lg:flex mx-auto mb-2 h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}

          {/* User Profile Tile */}
          <div
            className={`flex items-center gap-3 rounded-[16px] p-2 bg-white/[0.055] border border-white/[0.07] hover:border-white/15 transition ${
              collapsed ? 'justify-center p-1.5' : ''
            }`}
          >
            <Link
              href="/management/profile"
              className="flex items-center gap-3 min-w-0 flex-1"
              title="Edit Admin Profile & Photo"
            >
              <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#490570] text-xs font-black text-white overflow-hidden shadow-sm">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={adminName} className="h-full w-full object-cover" />
                ) : (
                  <span>{adminInitial}</span>
                )}
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-[#273142] bg-[#00B69B]" />
              </div>

              {!collapsed && (
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-xs font-bold text-white">
                    {adminName}
                  </p>
                  <p className="truncate text-[10.5px] font-semibold text-[#D599EC]">
                    {adminRoleName}
                  </p>
                </div>
              )}
            </Link>

            {!collapsed && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Are you sure you want to sign out from Admin Control?')) {
                    logoutAdmin();
                  }
                }}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-500/15 hover:text-rose-500 transition"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
