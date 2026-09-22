import React, { useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  LayoutDashboard,
  Film,
  Tv,
  BookOpenText,
  Languages,
  WandSparkles,
  Users,
  Database,
  Server,
  Settings2,
  Sparkles,
  MessageSquareText,
  UserCheck,
  Search,
  ExternalLink,
  LogOut,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Menu,
  X,
  Radio,
  FileCheck2,
} from 'lucide-react';

export interface AdminShellProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
}

interface NavItem {
  path: string;
  label: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export function AdminShell({ currentPath, onNavigate, children }: AdminShellProps) {
  const { admin, logoutAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const navGroups: NavGroup[] = [
    {
      group: 'WORKSPACE',
      items: [
        { path: '/management/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/management/profile', label: 'Admin Profile', icon: UserCheck },
      ],
    },
    {
      group: 'CONTENT',
      items: [
        { path: '/management/movies', label: 'Movies Catalog', icon: Film },
        { path: '/management/dramas', label: 'Dramas & TV', icon: Tv },
        { path: '/management/articles', label: 'Articles & News', icon: BookOpenText },
        { path: '/management/import', label: 'TMDB Import', icon: Sparkles, badge: 'AUTO', badgeColor: 'bg-[#9E57F6]/20 text-[#9E57F6]' },
        { path: '/management/comments', label: 'Comments & Reviews', icon: MessageSquareText },
      ],
    },
    {
      group: 'SUBTITLES SUITE',
      items: [
        { path: '/management/subtitles', label: 'Moderation Queue', icon: FileCheck2, badge: 'QUEUE', badgeColor: 'bg-amber-500/20 text-amber-400' },
        { path: '/management/subtitle-tools', label: 'Subtitle Studio', icon: WandSparkles },
        { path: '/management/srt-cleaner', label: 'SRT Cleaner', icon: Languages },
        { path: '/management/ai-translate', label: 'AI Translation', icon: Sparkles, badge: 'AI', badgeColor: 'bg-pink-500/20 text-pink-400' },
      ],
    },
    {
      group: 'SYSTEM & MEMBERS',
      items: [
        { path: '/management/users', label: 'Members & Roles', icon: Users },
        { path: '/management/database', label: 'Database GUI', icon: Database },
        { path: '/management/backup', label: 'Backup & Recovery', icon: Server },
        { path: '/management/settings', label: 'Site Builder', icon: Settings2 },
        { path: '/management/seo', label: 'SEO & Sitemaps', icon: Radio },
      ],
    },
  ];

  return (
    <div className="admin-shell min-h-screen bg-[#0C0C0E] text-slate-100 flex flex-col font-sans antialiased selection:bg-[#9E57F6]/30">
      <div className="flex flex-grow w-full overflow-hidden">
        {/* Mobile Backdrop */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed md:sticky top-0 z-50 h-screen bg-[#121215] border-r border-[#222228] transition-all duration-200 flex flex-col flex-shrink-0 ${
            collapsed ? 'w-20' : 'w-64'
          } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        >
          {/* Logo & Brand Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-[#222228]">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#9E57F6] to-pink-500 flex items-center justify-center text-white font-black text-lg shadow-[0_0_20px_rgba(158,87,246,0.4)] flex-shrink-0">
                K
              </div>
              {!collapsed && (
                <div className="flex flex-col truncate">
                  <span className="text-sm font-black text-white tracking-wider font-display">
                    KSubZone
                  </span>
                  <span className="text-[10px] font-bold text-[#9E57F6] uppercase tracking-widest">
                    Studio SaaS
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex-grow overflow-y-auto px-3 py-4 flex flex-col gap-6 custom-scrollbar">
            {navGroups.map((group) => (
              <div key={group.group} className="flex flex-col gap-1">
                {!collapsed && (
                  <span className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 font-mono">
                    {group.group}
                  </span>
                )}
                {group.items.map((item) => {
                  const isActive = currentPath === item.path || (item.path !== '/management/dashboard' && currentPath.startsWith(item.path));
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        onNavigate(item.path);
                        setMobileMenuOpen(false);
                      }}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 relative group ${
                        isActive
                          ? 'bg-[#9E57F6] text-white shadow-[0_0_20px_rgba(158,87,246,0.35)] font-bold'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                      } ${collapsed ? 'justify-center px-0' : ''}`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                      {!collapsed && <span className="truncate flex-grow text-left">{item.label}</span>}
                      {!collapsed && item.badge && (
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${item.badgeColor || 'bg-white/10 text-white'}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Admin Profile Footer */}
          <div className="p-3 border-t border-[#222228] bg-[#0E0E11]">
            <div className={`flex items-center gap-3 p-2 rounded-xl bg-white/[0.02] border border-white/5 ${collapsed ? 'justify-center p-1' : ''}`}>
              <div className="w-8 h-8 rounded-lg bg-[#9E57F6]/20 border border-[#9E57F6]/30 flex items-center justify-center text-[#9E57F6] font-bold text-xs flex-shrink-0">
                {admin?.name?.charAt(0) || 'A'}
              </div>
              {!collapsed && (
                <div className="flex flex-col truncate flex-grow text-left">
                  <span className="text-xs font-bold text-white truncate">{admin?.name || 'Administrator'}</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Super Admin</span>
                </div>
              )}
              {!collapsed && (
                <button
                  onClick={logoutAdmin}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  title="Sign out of Studio"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Main Workspace Column */}
        <div className="flex-grow flex flex-col min-w-0 overflow-hidden">
          {/* Top Bar */}
          <header className="h-16 bg-[#121215]/80 backdrop-blur-md border-b border-[#222228] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Status indicator */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>R2 CDN Live</span>
              </div>
            </div>

            {/* Quick Actions & Navigation */}
            <div className="flex items-center gap-3">
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 transition border border-white/10"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#C084FC]" />
                <span>Public Site</span>
              </a>

              <button
                onClick={() => onNavigate('/management/subtitle-tools')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#C084FC] bg-[#9E57F6]/10 border border-[#9E57F6]/30 hover:bg-[#9E57F6]/20 transition flex items-center gap-1.5"
              >
                <WandSparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Subtitle Studio</span>
              </button>
            </div>
          </header>

          {/* Dynamic Content Workspace */}
          <main className="flex-grow p-4 sm:p-6 lg:p-8 overflow-y-auto w-full">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
