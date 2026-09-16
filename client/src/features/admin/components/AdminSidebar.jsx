'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSiteContent } from '@/hooks/useSiteContent';
import useDialogFocus from './useDialogFocus';
import { resolveLogoUrl } from '@/utils/mediaImages';
import { useAdminTheme } from '@/features/admin/context/AdminThemeContext';
import {
  BookOpenText,
  Database,
  Film,
  Languages,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Server,
  Settings2,
  Sparkles,
  Tv,
  Users,
  WandSparkles,
  X,
  MessageSquareText,
  UserCheck,
  Clapperboard,
  ShieldAlert,
  Sliders
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    title: 'OVERVIEW',
    items: [
      { to: '/management/dashboard', label: 'Studio Dashboard', icon: LayoutDashboard },
      { to: '/management/profile', label: 'Admin Profile', icon: UserCheck },
      { to: '/management/import', label: 'TMDB Auto-Import', icon: Sparkles, badge: 'AUTO', permission: 'manage_movies' },
    ],
  },
  {
    title: 'MEDIA CATALOG',
    items: [
      { to: '/management/movies', label: 'Movies', icon: Film, permission: 'manage_movies' },
      { to: '/management/dramas', label: 'Dramas & TV', icon: Tv, permission: 'manage_dramas' },
      { to: '/management/articles', label: 'Articles & News', icon: BookOpenText, permission: 'manage_articles' },
      { to: '/management/subtitles', label: 'Subtitle Approvals', icon: Languages, badge: 'SRT', permission: 'approve_subtitles' },
      { to: '/management/comments', label: 'Reviews & Comments', icon: MessageSquareText, permission: 'manage_comments' },
    ],
  },
  {
    title: 'STUDIO & SYSTEM',
    items: [
      { to: '/management/users', label: 'Community Members', icon: Users, permission: 'manage_users' },
      { to: '/management/subtitle-tools', label: 'Subtitle Studio', icon: WandSparkles, permission: 'approve_subtitles' },
      { to: '/management/srt-cleaner', label: 'SRT Cleaner', icon: Languages, permission: 'approve_subtitles' },
      { to: '/management/settings', label: 'Site Builder', icon: Settings2, permission: 'manage_settings' },
      { to: '/management/database', label: 'System Database', icon: Database, permission: 'manage_settings' },
      { to: '/management/seo', label: 'SEO & Telemetry', icon: Server, permission: 'manage_settings' },
    ],
  },
];

export default function AdminSidebar({ mobileOpen = false, onCloseMobileNav = () => {} }) {
  const { admin, logoutAdmin } = useAuth();
  const { isLight } = useAdminTheme();
  const pathname = usePathname();
  const { content } = useSiteContent();
  const brand = content?.brand || {};
  const logoUrl = resolveLogoUrl(brand.adminLogoUrl) || '/ksubzone-icon.webp';

  const [desktopCollapsed, setCollapsed] = useState(false);
  const collapsed = desktopCollapsed && !mobileOpen;
  const dialogRef = useDialogFocus(mobileOpen, onCloseMobileNav);

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

  const adminName = admin?.displayName || admin?.username || admin?.name || 'Chamath';
  const adminInitial = adminName.charAt(0).toUpperCase();
  const adminRoleName = admin?.role?.name || (typeof admin?.role === 'object' ? admin.role.name : String(admin?.role || 'Administrator'));
  const avatarUrl = admin?.avatar;
  const permissions = Array.isArray(admin?.permissions) ? admin.permissions : [];
  const isSuperAdmin = admin?.isSuperAdmin || adminRoleName === 'SuperAdmin';
  const canSee = (item) => !item.permission || isSuperAdmin || permissions.includes(item.permission);

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onCloseMobileNav}
          aria-hidden="true"
        />
      )}

      {/* ── Executive Studio Sidebar ── */}
      <aside
        ref={dialogRef}
        role={mobileOpen ? 'dialog' : undefined}
        aria-modal={mobileOpen || undefined}
        aria-label="Admin navigation"
        tabIndex={-1}
        className={`admin-sidebar fixed inset-y-0 left-0 z-50 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          collapsed ? 'lg:w-[80px]' : 'lg:w-[260px]'
        } w-[280px] ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        } bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-slate-800`}
      >
        {/* ── Top Brand Header ── */}
        <div
          className={`flex h-[64px] items-center flex-shrink-0 ${
            collapsed ? 'justify-center px-0' : 'justify-between px-5'
          } border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a]`}
        >
          <Link
            href="/management/dashboard"
            className="flex items-center gap-3 min-w-0 group"
            title="KSubZone Studio Operations"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#4f46e5] via-[#6366f1] to-[#8b5cf6] text-white font-black shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-all duration-200">
              {logoUrl ? (
                <img src={logoUrl} alt={brand.siteName || 'KSubZone'} className="h-5 w-5 object-contain" />
              ) : (
                <Clapperboard className="h-5 w-5" />
              )}
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
                    KSUBZONE
                  </span>
                  <span className="rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase px-1.5 py-0.5 tracking-wider">
                    STUDIO
                  </span>
                </div>
                <span className="block text-[10.5px] font-semibold text-slate-400 dark:text-slate-500">
                  Media & Subtitles
                </span>
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
              className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ── Navigation Menu ── */}
        <nav
          className="admin-custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-4 min-h-0"
          aria-label="Main navigation"
        >
          {NAV_SECTIONS.map((section, sIdx) => {
            const visibleItems = section.items.filter(canSee);
            if (!visibleItems.length) return null;
            return (
              <div key={sIdx} className="space-y-1">
                {!collapsed && (
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {section.title}
                  </div>
                )}
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.to ||
                    (item.to !== '/management/dashboard' && pathname.startsWith(`${item.to}/`));

                  return (
                    <Link
                      key={item.to}
                      href={item.to}
                      title={collapsed ? item.label : undefined}
                      aria-label={item.label}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => {
                        if (mobileOpen) onCloseMobileNav();
                      }}
                      className={`group relative flex items-center gap-3 rounded-xl text-[13px] font-semibold transition-all duration-150 ${
                        collapsed ? 'h-10 w-10 mx-auto justify-center' : 'h-10 px-3'
                      } ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-500/15 via-indigo-500/10 to-transparent text-indigo-600 dark:text-indigo-400 border-l-4 border-indigo-600 dark:border-indigo-400 font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon
                        className={`h-4.5 w-4.5 flex-shrink-0 transition-colors ${
                          isActive
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-slate-300'
                        }`}
                        strokeWidth={isActive ? 2.2 : 1.9}
                      />

                      {!collapsed && (
                        <span className="flex-1 truncate tracking-tight">{item.label}</span>
                      )}

                      {!collapsed && item.badge && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider ${
                            isActive
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* ── Bottom Section: Profile & Sign Out ── */}
        <div className="flex-shrink-0 p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] space-y-2">
          {collapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden lg:flex mx-auto mb-1 h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}

          {/* User Profile Pill */}
          <Link
            href="/management/profile"
            className={`flex items-center gap-2.5 rounded-xl p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/30 transition group ${
              collapsed ? 'justify-center p-1.5' : ''
            }`}
            title="View Profile"
          >
            <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-[11px] font-black text-white shadow-sm overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt={adminName} className="h-full w-full object-cover" />
              ) : (
                <span>{adminInitial}</span>
              )}
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            </div>

            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-900 dark:text-white leading-tight group-hover:text-indigo-600 transition">
                  {adminName}
                </p>
                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                  {adminRoleName}
                </span>
              </div>
            )}
          </Link>

          {/* Clean Sign Out Button */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Are you sure you want to sign out from Studio Operations?')) {
                logoutAdmin();
              }
            }}
            className={`flex items-center gap-2.5 rounded-xl text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all w-full ${
              collapsed ? 'h-9 w-9 mx-auto justify-center' : 'h-9 px-3'
            }`}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
