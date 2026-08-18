'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSiteContent } from '@/hooks/useSiteContent';
import { resolveLogoUrl } from '@/utils/mediaImages';
import AdminNotifications from './AdminNotifications';
import {
  Film, Tv, Users, Languages, Star, TrendingUp,
  Settings, Database, LogOut, BookOpenText, Wand2, Server, Menu, X, Cloud
} from 'lucide-react';

export default function AdminSidebar() {
  const { admin, logoutAdmin } = useAuth();
  const pathname = usePathname();
  const { content } = useSiteContent();
  const brand = content?.brand || {};
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { to: '/management/dashboard', label: 'Dashboard Metrics', icon: TrendingUp, color: 'text-brand-primary' },
    { to: '/management/import', label: 'One-Click TMDB Importer', icon: Database, color: 'text-brand-accent' },
    { to: '/management/movies', label: 'Manage Movies', icon: Film, color: 'text-brand-primary' },
    { to: '/management/dramas', label: 'Manage Dramas', icon: Tv, color: 'text-brand-primary' },
    { to: '/management/articles', label: 'Manage Articles', icon: BookOpenText, color: 'text-brand-primary' },
    {to: '/management/subtitles', label: 'Subtitles Moderation', icon: Languages, color: 'text-emerald-400' },
    { to: '/management/subtitle-tools', label: 'Subtitle Brand/Translate', icon: Languages, color: 'text-brand-accent' },
    { to: '/management/srt-cleaner', label: 'SRT Cleaner Tool', icon: Wand2, color: 'text-brand-primary' },
    { to: '/management/comments', label: 'Comments & Reviews', icon: Star, color: 'text-yellow-400' },
    { to: '/management/users', label: 'Member Control', icon: Users, color: 'text-blue-400' },
    { to: '/management/settings', label: 'Site Builder', icon: Wand2, color: 'text-brand-accent' },
    { to: '/management/database', label: 'Database Browser', icon: Server, color: 'text-amber-400' },
    { to: '/management/backup', label: 'Backup & Restore', icon: Cloud, color: 'text-emerald-400' },
    { to: '/management/seo', label: 'Raw Config Keys', icon: Settings, color: 'text-slate-400' },
  ];

  const adminRoleName = admin?.role?.name || (typeof admin?.role === 'object' ? admin.role.name : String(admin?.role || 'Admin'));

  return (
    <>
      {/* Mobile Sticky Header */}
      <div className="flex lg:hidden items-center justify-between px-6 py-4 bg-luxury-900 border-b border-white/5 sticky top-0 z-40 w-full">
        <Link href="/" className="flex items-center gap-2.5 group">
          {resolveLogoUrl(brand.logoUrl) ? (
            <img src={resolveLogoUrl(brand.logoUrl)} alt={brand.siteName || 'Logo'} className="h-8 w-auto object-contain transition" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand-primary/30 bg-brand-primary/10">
              <span className="w-2.5 h-2.5 bg-brand-accent rounded-full animate-pulse" />
            </span>
          )}
          <span className="text-base font-black uppercase tracking-wider bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent bg-clip-text text-transparent font-milker truncate">
            {brand.logoText || brand.siteName || 'KSUBZONE'}
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <AdminNotifications />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1 rounded-md text-slate-400 hover:text-white transition"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Aside */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-luxury-900 border-r border-white/5 p-6 flex flex-col gap-6 lg:sticky lg:top-0 lg:h-screen overflow-y-auto flex-shrink-0 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Close Button */}
        <div className="flex lg:hidden justify-end">
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white transition"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="pb-4 border-b border-white/5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group" onClick={() => setMobileOpen(false)}>
              {resolveLogoUrl(brand.logoUrl) ? (
                <img src={resolveLogoUrl(brand.logoUrl)} alt={brand.siteName || 'Logo'} className="h-9 w-auto object-contain transition" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-primary/30 bg-brand-primary/10">
                  <span className="w-2.5 h-2.5 bg-brand-accent rounded-full animate-pulse" />
                </span>
              )}
              <span className="text-base font-black uppercase tracking-wider bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent bg-clip-text text-transparent font-milker truncate">
                {brand.logoText || brand.siteName || 'KSUBZONE'}
              </span>
            </Link>
            {/* Notification Bell — desktop */}
            <div className="hidden lg:block flex-shrink-0">
              <AdminNotifications />
            </div>
          </div>
          <div className="pl-1">
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Admin Workspace</p>
            <p className="text-[11px] text-slate-300 truncate mt-0.5 capitalize">{adminRoleName} • {admin?.username}</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1.5 flex-grow">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.to;
            return (
              <Link
                key={link.to}
                href={link.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 p-3 rounded-xl text-xs font-bold uppercase tracking-wider transition border-l-[3px] ${
                  isActive
                    ? 'bg-brand-primary/10 border-brand-primary text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
                }`}
              >
                <Icon className={`w-4 h-4 ${link.color}`} />
                <span className="truncate">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => { setMobileOpen(false); logoutAdmin(); }}
          className="flex items-center gap-3 p-3 mt-auto rounded-xl text-xs font-bold uppercase tracking-wider border border-white/5 hover:bg-brand-secondary/10 text-brand-secondary hover:border-brand-secondary/20 transition text-left flex-shrink-0"
        >
          <LogOut className="w-4 h-4" /> Terminate Session
        </button>
      </aside>
    </>
  );
}
