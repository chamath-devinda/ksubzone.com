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
  Cloud,
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
  UserCheck
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    title: 'PAGES',
    items: [
      { to: '/management/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/management/profile', label: 'Admin Profile', icon: UserCheck, badge: 'PROFILE' },
      { to: '/management/import', label: 'TMDB Import', icon: Sparkles, badge: 'AUTO', permission: 'manage_movies' },
    ],
  },
  {
    title: 'CONTENT ENGINE',
    items: [
      { to: '/management/movies', label: 'Movies', icon: Film, permission: 'manage_movies' },
      { to: '/management/dramas', label: 'Dramas & TV', icon: Tv, permission: 'manage_dramas' },
      { to: '/management/articles', label: 'Articles', icon: BookOpenText, permission: 'manage_articles' },
      { to: '/management/subtitles', label: 'Subtitles', icon: Languages, permission: 'approve_subtitles' },
      { to: '/management/comments', label: 'Comments', icon: MessageSquareText, permission: 'manage_comments' },
    ],
  },
  {
    title: 'SYSTEM & TOOLS',
    items: [
      { to: '/management/users', label: 'Members', icon: Users, permission: 'manage_users' },
      { to: '/management/subtitle-tools', label: 'Subtitle Studio', icon: WandSparkles, permission: 'approve_subtitles' },
      { to: '/management/srt-cleaner', label: 'SRT Cleaner', icon: Languages, permission: 'approve_subtitles' },
      { to: '/management/settings', label: 'Site Builder', icon: Settings2, permission: 'manage_settings' },
      { to: '/management/database', label: 'Database', icon: Database, permission: 'manage_settings' },
      { to: '/management/seo', label: 'SEO & Config', icon: Server, permission: 'manage_settings' },
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

  const adminName = admin?.displayName || admin?.username || admin?.name || 'System Admin';
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

      {/* ── Fixed Frosted Glass Sidebar ── */}
      <aside
        ref={dialogRef} role={mobileOpen ? "dialog" : undefined} aria-modal={mobileOpen || undefined} aria-label="Admin navigation" tabIndex={-1}
        className={`admin-sidebar fixed inset-y-0 left-0 z-50 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          collapsed ? 'lg:w-[84px]' : 'lg:w-[248px]'
        } w-[280px] ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        } bg-white/85 dark:bg-[#0B0813]/85 backdrop-blur-2xl border-r border-slate-200/60 dark:border-white/[0.08]`}
        style={{
          boxShadow: isLight
            ? '4px 0 32px -4px rgba(124, 58, 237, 0.04)'
            : '4px 0 32px -4px rgba(0, 0, 0, 0.45)',
        }}
      >
        {/* ── Top Brand Section ── */}
        <div
          className={`flex h-[68px] items-center flex-shrink-0 ${
            collapsed ? 'justify-center px-0' : 'justify-between px-5'
          } border-b border-slate-200/60 dark:border-white/[0.08] bg-white dark:bg-[#161b26]`}
        >
          <Link
            href="/management/dashboard"
            className="flex items-center gap-3 min-w-0 group"
            title="KSubZone Control Center"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1976d2] to-[#42a5f5] text-white font-black shadow-md shadow-[#1976d2]/20 group-hover:scale-105 transition-all duration-200">
              {logoUrl ? (
                <img src={logoUrl} alt={brand.siteName || 'KSubZone'} className="h-5 w-5 object-contain" />
              ) : (
                <span className="font-sans text-base font-black tracking-tight">K</span>
              )}
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <span className="block truncate text-[16px] font-bold tracking-tight text-slate-900 dark:text-white">
                  {brand.logoText || brand.siteName || 'KSubZone'}
                </span>
                <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#1976d2] dark:text-[#60a5fa]">
                  Studio Admin
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
              className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-[#1976d2] hover:bg-[#1976d2]/10 transition"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ── SmartAngular Centered Profile Portrait Card ── */}
        {!collapsed ? (
          <div className="flex flex-col items-center justify-center py-5 px-4 border-b border-slate-200/60 dark:border-white/[0.08] text-center bg-slate-50/40 dark:bg-white/[0.02] flex-shrink-0">
            <div className="relative mb-2.5">
              <div className="h-16 w-16 rounded-full overflow-hidden ring-4 ring-[#1976d2]/15 bg-gradient-to-br from-[#1976d2] to-[#42a5f5] flex items-center justify-center text-white text-xl font-black shadow-md">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={adminName} className="h-full w-full object-cover" />
                ) : (
                  <span>{adminInitial}</span>
                )}
              </div>
              <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#161b26]" />
            </div>
            <Link href="/management/profile" className="group">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight group-hover:text-[#1976d2] transition truncate max-w-[190px]">
                {adminName}
              </h3>
            </Link>
            <span className="inline-block mt-0.5 text-[11px] font-semibold text-[#1976d2] dark:text-[#60a5fa]">
              {adminRoleName || 'Admin'}
            </span>
          </div>
        ) : (
          <div className="flex justify-center py-3 border-b border-slate-200/60 dark:border-white/[0.08] flex-shrink-0">
            <Link href="/management/profile">
              <div className="h-10 w-10 rounded-full overflow-hidden bg-[#1976d2] ring-2 ring-[#1976d2]/20 flex items-center justify-center text-white text-sm font-bold">
                {avatarUrl ? <img src={avatarUrl} alt={adminName} className="h-full w-full object-cover" /> : adminInitial}
              </div>
            </Link>
          </div>
        )}

        {/* ── Navigation List (SmartAngular Transport Menu Layout) ── */}
        <nav
          className="admin-custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden py-3 px-3 space-y-3 min-h-0 bg-white dark:bg-[#161b26]"
          aria-label="Main navigation"
        >
          {NAV_SECTIONS.map((section, sIdx) => {
            const visibleItems = section.items.filter(canSee);
            if (!visibleItems.length) return null;
            return (
              <div key={sIdx} className="space-y-1">
                {!collapsed && (
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                    {section.title === 'PAGES' ? 'MAIN' : section.title}
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
                      className={`group relative flex items-center gap-3 rounded-[10px] text-[13px] font-medium transition-all duration-150 ${
                        collapsed ? 'h-10 w-10 mx-auto justify-center' : 'h-10 px-3'
                      } ${
                        isActive
                          ? 'bg-[#e8effd] dark:bg-[#1976d2]/20 text-[#1976d2] dark:text-[#60a5fa] font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-[#1976d2] dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      <Icon
                        className={`h-4.5 w-4.5 flex-shrink-0 transition-colors ${
                          isActive
                            ? 'text-[#1976d2] dark:text-[#60a5fa]'
                            : 'text-slate-400 dark:text-slate-500 group-hover:text-[#1976d2] dark:group-hover:text-white'
                        }`}
                        strokeWidth={isActive ? 2.2 : 1.9}
                      />

                      {!collapsed && (
                        <span className="flex-1 truncate tracking-tight">{item.label}</span>
                      )}

                      {!collapsed && item.badge && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider ${
                            isActive
                              ? 'bg-[#1976d2] text-white'
                              : 'bg-slate-200/70 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300'
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

        {/* ── Bottom Section: Actions & Logout ── */}
        <div className="flex-shrink-0 p-3 border-t border-slate-200/60 dark:border-white/[0.08] space-y-1.5 bg-white dark:bg-[#161b26]">
          {collapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden lg:flex mx-auto mb-1 h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-[#1976d2] hover:bg-[#1976d2]/10 transition"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}

          {/* Clean Logout Button */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Are you sure you want to sign out from Admin Control?')) {
                logoutAdmin();
              }
            }}
            className={`flex items-center gap-2.5 rounded-[10px] text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all duration-150 w-full ${
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
