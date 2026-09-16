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
  ChevronRight,
  Radio
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    title: 'WORKSPACE',
    items: [
      { to: '/management/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/management/profile', label: 'Admin Profile', icon: UserCheck },
      { to: '/management/import', label: 'TMDB Import', icon: Sparkles, badge: 'AUTO', permission: 'manage_movies' },
    ],
  },
  {
    title: 'CONTENT',
    items: [
      { to: '/management/movies', label: 'Movies', icon: Film, permission: 'manage_movies' },
      { to: '/management/dramas', label: 'Dramas & TV', icon: Tv, permission: 'manage_dramas' },
      { to: '/management/articles', label: 'Articles & News', icon: BookOpenText, permission: 'manage_articles' },
      { to: '/management/subtitles', label: 'Subtitles', icon: Languages, badge: 'SRT', permission: 'approve_subtitles' },
      { to: '/management/comments', label: 'Reviews', icon: MessageSquareText, permission: 'manage_comments' },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { to: '/management/users', label: 'Members', icon: Users, permission: 'manage_users' },
      { to: '/management/subtitle-tools', label: 'Subtitle Studio', icon: WandSparkles, permission: 'approve_subtitles' },
      { to: '/management/srt-cleaner', label: 'SRT Cleaner', icon: Languages, permission: 'approve_subtitles' },
      { to: '/management/settings', label: 'Site Builder', icon: Settings2, permission: 'manage_settings' },
      { to: '/management/database', label: 'Database', icon: Database, permission: 'manage_settings' },
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

  const [expanded, setExpanded] = useState(false);
  const dialogRef = useDialogFocus(mobileOpen, onCloseMobileNav);

  useEffect(() => {
    try {
      setExpanded(localStorage.getItem('ksz-admin-nav-expanded') === 'true');
    } catch (_) {}
  }, []);

  const toggleExpanded = () => {
    setExpanded((curr) => {
      const next = !curr;
      try {
        localStorage.setItem('ksz-admin-nav-expanded', String(next));
      } catch (_) {}
      return next;
    });
  };

  const adminName = admin?.displayName || admin?.username || admin?.name || 'Administrator';
  const adminInitial = adminName.charAt(0).toUpperCase();
  const adminRoleName = admin?.role?.name || (typeof admin?.role === 'object' ? admin.role.name : String(admin?.role || 'Admin'));
  const avatarUrl = admin?.avatar;
  const permissions = Array.isArray(admin?.permissions) ? admin.permissions : [];
  const isSuperAdmin = admin?.isSuperAdmin || adminRoleName === 'SuperAdmin';
  const canSee = (item) => !item.permission || isSuperAdmin || permissions.includes(item.permission);

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

      {/* ── Precision Action Rail Sidebar ── */}
      <aside
        ref={dialogRef}
        role={mobileOpen ? 'dialog' : undefined}
        aria-modal={mobileOpen || undefined}
        aria-label="Admin Navigation"
        tabIndex={-1}
        className={`fixed inset-y-0 left-0 z-50 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          expanded ? 'lg:w-[240px]' : 'lg:w-[72px]'
        } w-[260px] ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        } bg-[var(--studio-surface)] border-r border-[var(--studio-border)]`}
      >
        {/* ── Top Brand Section ── */}
        <div className="flex h-16 items-center justify-between px-3 border-b border-[var(--studio-border)]">
          <Link
            href="/management/dashboard"
            className="flex items-center gap-3 overflow-hidden group focus-visible:outline-none"
            title="KSubZone Studio Operations"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] bg-[#2563EB] text-white font-black shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
              {logoUrl ? (
                <img src={logoUrl} alt={brand.siteName || 'KSubZone'} className="h-5 w-5 object-contain" />
              ) : (
                <Clapperboard className="h-5 w-5" />
              )}
            </div>

            {(expanded || mobileOpen) && (
              <div className="min-w-0 transition-opacity duration-200">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs font-black tracking-wider text-[var(--studio-text)] uppercase">
                    KSUBZONE
                  </span>
                  <span className="badge-pill bg-[#2563EB]/15 text-[#2563EB] text-[9px] font-black uppercase px-1.5 py-0.2">
                    STUDIO
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-semibold mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#14B8A6] animate-pulse" />
                  <span>Control Plane</span>
                </div>
              </div>
            )}
          </Link>

          {/* Expand/Collapse Toggle on Desktop, Close on Mobile */}
          <button
            type="button"
            onClick={mobileOpen ? onCloseMobileNav : toggleExpanded}
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-[9999px] text-[var(--studio-muted)] hover:text-[var(--studio-text)] hover:bg-[var(--studio-raised)] transition"
            title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {expanded ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={onCloseMobileNav}
            className="lg:hidden flex h-8 w-8 items-center justify-center rounded-[9999px] text-[var(--studio-muted)] hover:text-[var(--studio-text)] hover:bg-[var(--studio-raised)] transition"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Navigation Items Rail ── */}
        <nav
          className="admin-custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden py-4 px-2.5 space-y-5"
          aria-label="Main navigation"
        >
          {NAV_SECTIONS.map((section, sIdx) => {
            const visibleItems = section.items.filter(canSee);
            if (!visibleItems.length) return null;
            return (
              <div key={sIdx} className="space-y-1">
                {(expanded || mobileOpen) && (
                  <div className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                    {section.title}
                  </div>
                )}
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.to || (item.to !== '/management/dashboard' && pathname.startsWith(item.to));

                  return (
                    <Link
                      key={item.to}
                      href={item.to}
                      onClick={() => { if (mobileOpen) onCloseMobileNav(); }}
                      title={item.label}
                      className={`group relative flex items-center gap-3 px-2.5 py-2.5 rounded-[12px] font-semibold text-xs transition-all duration-150 ${
                        isActive
                          ? 'bg-[#2563EB]/15 text-[#2563EB] shadow-sm'
                          : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)] hover:bg-[var(--studio-raised)]'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {/* Active Indicator Strip */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-[#2563EB]" />
                      )}

                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
                        <Icon className={`h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-[#2563EB]' : 'text-[var(--studio-muted)] group-hover:text-[var(--studio-text)]'}`} />
                      </div>

                      {(expanded || mobileOpen) && (
                        <span className="truncate flex-1 font-medium">{item.label}</span>
                      )}

                      {(expanded || mobileOpen) && item.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-[9999px] bg-[var(--studio-raised)] text-[var(--studio-muted)] border border-[var(--studio-border)]">
                          {item.badge}
                        </span>
                      )}

                      {/* Tooltip for collapsed state */}
                      {!expanded && !mobileOpen && (
                        <div className="pointer-events-none absolute left-full ml-3.5 z-50 hidden rounded-[9999px] bg-[var(--studio-surface)] border border-[var(--studio-border)] px-3 py-1 text-[11px] font-bold text-[var(--studio-text)] shadow-xl whitespace-nowrap group-hover:block">
                          {item.label}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* ── Bottom Operator Pill Dock ── */}
        <div className="p-2.5 border-t border-[var(--studio-border)]">
          <div className="flex items-center gap-2.5">
            <Link
              href="/management/profile"
              className="flex items-center gap-2.5 flex-1 p-1.5 rounded-[12px] hover:bg-[var(--studio-raised)] transition overflow-hidden group"
              title="View Admin Profile"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[9999px] bg-gradient-to-tr from-[#2563EB] to-[#14B8A6] text-white text-xs font-bold shadow">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={adminName} className="h-full w-full rounded-[9999px] object-cover" />
                ) : (
                  adminInitial
                )}
              </div>

              {(expanded || mobileOpen) && (
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-xs font-bold text-[var(--studio-text)]">
                    {adminName}
                  </p>
                  <p className="truncate text-[10px] text-[var(--studio-muted)] font-medium">
                    {adminRoleName}
                  </p>
                </div>
              )}
            </Link>

            {(expanded || mobileOpen) && (
              <button
                type="button"
                onClick={logoutAdmin}
                className="h-8 w-8 flex items-center justify-center rounded-[9999px] text-[var(--studio-muted)] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition"
                title="Log out of Studio"
                aria-label="Log out"
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
