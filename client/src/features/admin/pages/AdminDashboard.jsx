'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import Link from 'next/link';
import apiClient from '@/services/api/apiClient';
import {
  Film, Tv, Users, Languages, Star, TrendingUp, Eye, Award,
  CheckCircle, Clapperboard, Calendar, AlertTriangle,
  Activity, ArrowUpRight, BarChart3, Database, Server, Clock,
  Shield, Download, Plus, RefreshCw, Check, Search,
  Sparkles, ArrowRight, Filter, ChevronRight,
  CalendarClock, Trash2, Send, Bookmark, FileText, CheckSquare,
  Square, MoreHorizontal, Layers, ChevronDown
} from 'lucide-react';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import AdminTopBar from '@/features/admin/components/AdminTopBar';
import { Pulse, CardSkeleton } from '@/features/admin/components/Skeleton';
import { useToast } from '@/features/admin/components/Toast';

// ─── Utilities ──────────────────────────────────────────────────────────────
function formatNum(n) {
  if (n === null || n === undefined) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr.replace(' ', 'T'));
  const now = new Date();
  const diffMs = now - date;
  if (isNaN(diffMs)) return dateStr;
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return 'Just now';
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function getFormattedToday() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function downloadCsv(filename, rows) {
  const csv = rows.map(row => row.map(value => {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  }).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadSvgAsPng(filename, svgElement) {
  if (!svgElement) return;
  const source = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    const scale = 2;
    canvas.width = (svgElement.viewBox.baseVal.width || 700) * scale;
    canvas.height = (svgElement.viewBox.baseVal.height || 210) * scale;
    const context = canvas.getContext('2d');
    context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--studio-surface').trim() || '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const anchor = document.createElement('a');
    anchor.download = filename;
    anchor.href = canvas.toDataURL('image/png');
    anchor.click();
    URL.revokeObjectURL(url);
  };
  image.src = url;
}

// ─── Mini Sparkline Component (ArchitectUI Signature Widget) ─────────────────
function MiniSparkline({ color = '#3ac47d', points = [30, 45, 25, 60, 40, 70, 50, 85, 45, 90] }) {
  const W = 280;
  const H = 45;
  const min = Math.min(...points);
  const max = Math.max(...points, min + 1);
  const pts = points.map((p, i) => ({
    x: (i / (points.length - 1)) * W,
    y: H - 5 - ((p - min) / (max - min)) * (H - 14)
  }));
  const pathD = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = pts[i - 1];
    const cp1x = prev.x + (p.x - prev.x) / 2;
    return `${acc} C ${cp1x} ${prev.y}, ${cp1x} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-10 overflow-visible" preserveAspectRatio="none">
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Main Admin Dashboard Component ──────────────────────────────────────────
export default function AdminDashboard() {
  const { admin } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [starred, setStarred] = useState(false);

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/api/admin/dashboard');
      setStats(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard statistics');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      await apiClient.post('/api/admin/clear-cache');
      toast.success('System cache cleared successfully');
    } catch (err) {
      toast.error('Failed to clear cache');
    } finally {
      setClearingCache(false);
    }
  };

  const trafficLogs = stats?.trafficLogs || [];
  const sortedLogs = useMemo(() => [...trafficLogs].sort((a, b) => a.date.localeCompare(b.date)), [trafficLogs]);

  const totalCatalog = (stats?.counts?.totalDramas || 0) + (stats?.counts?.totalMovies || 0);
  const adminName = admin?.displayName || admin?.username || admin?.name || 'Chamath';
  const adminRole = admin?.role?.name || (typeof admin?.role === 'object' ? admin.role.name : String(admin?.role || 'Administrator'));
  const permissions = Array.isArray(admin?.permissions) ? admin.permissions : [];
  const isSuperAdmin = admin?.isSuperAdmin || adminRole === 'SuperAdmin';
  const canManageDramas = isSuperAdmin || permissions.includes('manage_dramas');
  const canViewAnalytics = isSuperAdmin || permissions.includes('view_analytics');
  const canManageSettings = isSuperAdmin || permissions.includes('manage_settings');

  const healthIssues = [
    stats?.systemHealth?.dbStatus !== undefined && stats.systemHealth.dbStatus !== 'ok' ? 'Database connection needs attention.' : null,
    stats?.systemHealth?.apiStatus !== undefined && stats.systemHealth.apiStatus !== 'ok' ? 'API runtime is reporting a problem.' : null,
    stats?.systemHealth?.sitemapStatus !== undefined && stats.systemHealth.sitemapStatus !== 'ok' ? 'Sitemap index is reporting a problem.' : null,
  ].filter(Boolean);

  if (loading) {
    return (
      <div className="admin-shell min-h-screen flex flex-col lg:flex-row transition-colors duration-200">
        <AdminSidebar mobileOpen={mobileOpen} onCloseMobileNav={() => setMobileOpen(false)} />
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          <AdminTopBar onOpenMobileNav={() => setMobileOpen(true)} />
          <main className="admin-main flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] w-full mx-auto space-y-6">
            <div className="flex items-center justify-between py-2">
              <div className="space-y-2">
                <Pulse className="h-4 w-32" />
                <Pulse className="h-8 w-56" />
                <Pulse className="h-4 w-44" />
              </div>
              <Pulse className="h-10 w-28 rounded-md" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Pulse className="lg:col-span-2 h-[320px] rounded-lg" />
              <Pulse className="h-[320px] rounded-lg" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell min-h-screen flex flex-col lg:flex-row transition-colors duration-200">
      <AdminSidebar mobileOpen={mobileOpen} onCloseMobileNav={() => setMobileOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <AdminTopBar onOpenMobileNav={() => setMobileOpen(true)} />

        <main className="admin-main flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] w-full mx-auto space-y-6">

          {/* ── Error Banner ── */}
          {error && (
            <div className="flex items-center gap-3 rounded-md border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {healthIssues.length > 0 && (
            <div className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-300" role="alert">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-bold">System health needs attention</p>
                <p className="mt-1 text-amber-700/80 dark:text-amber-300/80">{healthIssues.join(' ')}</p>
              </div>
            </div>
          )}

          {/* ── 1. ArchitectUI App Page Title (Retains workspace-intro-grid contract) ── */}
          <section className="app-page-title workspace-intro-grid flex flex-col md:flex-row md:items-center justify-between gap-4" aria-label="Page Title">
            <div className="page-title-wrapper flex items-center gap-4">
              <div className="page-title-icon">
                <BarChart3 className="h-6 w-6 text-[#3f6ad8]" />
              </div>
              <div className="page-title-heading">
                <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  Analytics Dashboard
                </h1>
                <p className="page-title-subheading text-xs text-slate-500 dark:text-slate-400 mt-1">
                  KSUBZONE STUDIO · Real-time catalog intelligence, viewership analytics, and operational release monitor.
                </p>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                  <span className="inline-flex items-center gap-1.5"><Activity className="h-3 w-3 text-[#3ac47d]" /> Runtime connected</span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1.5"><Shield className="h-3 w-3 text-[#3f6ad8]" /> {adminRole} scope</span>
                  <span>•</span>
                  <span><Database className="inline h-3 w-3 text-[#16aaff] mr-1" /> {canViewAnalytics ? 'Verified API Data' : 'Limited Scope'}</span>
                </div>
              </div>
            </div>

            <div className="page-title-actions flex items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setStarred(!starred)}
                className={`flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition ${
                  starred ? 'text-[#f7b924]' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
                title="Star this dashboard"
              >
                <Star className={`h-4 w-4 ${starred ? 'fill-[#f7b924]' : ''}`} />
              </button>

              <Link
                href="/management/import"
                className="btn-architect-success shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create New</span>
              </Link>

              <button
                type="button"
                onClick={handleClearCache}
                disabled={clearingCache || !canManageSettings}
                className="btn-architect-outline"
                title={canManageSettings ? 'Purge application cache' : 'Requires manage_settings permission'}
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${clearingCache ? 'animate-spin' : ''}`} />
                <span>{clearingCache ? 'Purging…' : 'Purge Cache'}</span>
              </button>
            </div>
          </section>

          {/* ── 2. ArchitectUI Portfolio Performance 3-Metric Hero Card ── */}
          <section aria-label="Portfolio Performance">
            <div className="architect-card">
              <div className="architect-card-header">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800 dark:text-white">Studio Performance</span>
                </div>
                <Link
                  href="/management/dramas"
                  className="btn-architect-outline text-xs"
                >
                  View All Catalog
                </Link>
              </div>

              <div className="architect-card-body">
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
                  {/* Metric 1 */}
                  <div className="flex items-center gap-4 py-4 md:py-2 md:px-6 first:pl-0">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f7b924] text-white flex-shrink-0 shadow-md">
                      <Languages className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Subtitles</p>
                      <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-0.5">
                        {formatNum(stats?.counts?.totalSubtitles)}
                      </h3>
                      <p className="text-[11.5px] font-semibold text-[#d92550] mt-1 flex items-center gap-1">
                        <span>▼ 54.1%</span> <span className="text-slate-400 font-normal">less earnings</span>
                      </p>
                    </div>
                  </div>

                  {/* Metric 2 */}
                  <div className="flex items-center gap-4 py-4 md:py-2 md:px-6">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#d92550] text-white flex-shrink-0 shadow-md">
                      <Eye className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Views</p>
                      <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-0.5">
                        {formatNum(stats?.counts?.totalViews)}
                      </h3>
                      <p className="text-[11.5px] font-semibold text-[#3f6ad8] mt-1 flex items-center gap-1">
                        <span className="text-slate-400 font-normal">Grow Rate:</span> <span>▲ 14.1%</span>
                      </p>
                    </div>
                  </div>

                  {/* Metric 3 */}
                  <div className="flex items-center gap-4 py-4 md:py-2 md:px-6 last:pr-0">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#3ac47d] text-white flex-shrink-0 shadow-md">
                      <Film className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Catalog</p>
                      <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-0.5">
                        {formatNum(totalCatalog)}
                      </h3>
                      <p className="text-[11.5px] font-semibold text-[#3ac47d] mt-1 flex items-center gap-1">
                        <span className="text-slate-400 font-normal">Increased by</span> <span>▲ 7.35%</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-center pt-6 pb-2 border-t border-slate-100 dark:border-slate-800 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      downloadCsv('ksubzone-studio-summary.csv', [
                        ['Metric', 'Value'],
                        ['Total Subtitles', stats?.counts?.totalSubtitles || 0],
                        ['Total Views', stats?.counts?.totalViews || 0],
                        ['Total Movies', stats?.counts?.totalMovies || 0],
                        ['Total Dramas', stats?.counts?.totalDramas || 0],
                        ['Total Episodes', stats?.counts?.totalEpisodes || 0],
                        ['Total Users', stats?.counts?.totalUsers || 0],
                      ]);
                      toast.success('Summary report exported');
                    }}
                    className="btn-architect-primary"
                  >
                    View Complete Report
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ── 3. Two-Column Row (Viewership Chart + Timeline Example) ── */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6" aria-label="Analytics & Activity">
            {/* Viewership Area Chart (Technical Support style) */}
            <div className="lg:col-span-7">
              <ArchitectViewershipChart allLogs={sortedLogs} totalViews={stats?.counts?.totalViews} />
            </div>

            {/* Timeline Example (Recent Activity Stream) */}
            <div className="lg:col-span-5">
              <ArchitectTimelineCard latestDownloads={stats?.latestDownloads || []} />
            </div>
          </section>

          {/* ── 4. The 4 ArchitectUI Bottom-Border Metric Cards (with Mini Wave Sparklines) ── */}
          <section aria-label="Key Performance Indicators">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Success Green */}
              <div className="architect-card card-btm-border border-success card-shadow-success p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Movies</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold text-slate-800 dark:text-white">
                    {formatNum(stats?.counts?.totalMovies)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">catalog library</p>
                <div className="mt-3">
                  <MiniSparkline color="#3ac47d" points={[40, 55, 35, 65, 50, 60, 45, 75, 65, 80]} />
                </div>
              </div>

              {/* Card 2: Primary Blue */}
              <div className="architect-card card-btm-border border-primary card-shadow-primary p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Drama Series</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold text-slate-800 dark:text-white">
                    {formatNum(stats?.counts?.totalDramas)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">shows ongoing</p>
                <div className="mt-3">
                  <MiniSparkline color="#3f6ad8" points={[30, 45, 60, 50, 70, 65, 80, 75, 90, 85]} />
                </div>
              </div>

              {/* Card 3: Warning Amber */}
              <div className="architect-card card-btm-border border-warning card-shadow-warning p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sinhala Subtitles</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold text-slate-800 dark:text-white">
                    {formatNum(stats?.counts?.totalSubtitles)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">repository count</p>
                <div className="mt-3">
                  <MiniSparkline color="#f7b924" points={[60, 50, 70, 55, 65, 80, 70, 75, 65, 85]} />
                </div>
              </div>

              {/* Card 4: Danger Red */}
              <div className="architect-card card-btm-border border-danger card-shadow-danger p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Downloads</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold text-slate-800 dark:text-white">
                    {formatNum(stats?.counts?.totalDownloads)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">total deliveries</p>
                <div className="mt-3">
                  <MiniSparkline color="#d92550" points={[45, 55, 65, 50, 60, 70, 85, 75, 80, 95]} />
                </div>
              </div>
            </div>
          </section>

          {/* ── 5. ArchitectUI Dynamic Tables Card (Subtitle Queue & Content Releases) ── */}
          <section aria-label="Dynamic Content Tables">
            <ArchitectDynamicTables
              episodes={stats?.upcomingEpisodes || []}
              canManageDramas={canManageDramas}
              onChanged={() => loadDashboard({ silent: true })}
            />
          </section>

          {/* ── 6. Two-Column Row (Tasks List + Top Performing Content) ── */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6" aria-label="Operations & Top Content">
            {/* Tasks List */}
            <div className="lg:col-span-6">
              <ArchitectTasksList />
            </div>

            {/* Top Performing Content */}
            <div className="lg:col-span-6">
              <ArchitectTopContent content={stats?.topContent || []} />
            </div>
          </section>

          {/* ── 7. Bottom ArchitectUI Summary Metric Strip ── */}
          <section aria-label="Summary KPI Strip">
            <div className="architect-summary-strip">
              <div className="architect-summary-item">
                <div>
                  <p className="text-xs font-semibold text-slate-400">Total Users</p>
                  <p className="text-xl font-bold text-[#3ac47d] mt-0.5">
                    {formatNum(stats?.counts?.totalUsers)}
                  </p>
                </div>
                <Users className="h-5 w-5 text-[#3ac47d]/40" />
              </div>

              <div className="architect-summary-item">
                <div>
                  <p className="text-xs font-semibold text-slate-400">Total Catalog</p>
                  <p className="text-xl font-bold text-[#3f6ad8] mt-0.5">
                    {formatNum(totalCatalog)}
                  </p>
                </div>
                <Film className="h-5 w-5 text-[#3f6ad8]/40" />
              </div>

              <div className="architect-summary-item">
                <div>
                  <p className="text-xs font-semibold text-slate-400">Total Views</p>
                  <p className="text-xl font-bold text-[#f7b924] mt-0.5">
                    {formatNum(stats?.counts?.totalViews)}
                  </p>
                </div>
                <Eye className="h-5 w-5 text-[#f7b924]/40" />
              </div>

              <div className="architect-summary-item">
                <div>
                  <p className="text-xs font-semibold text-slate-400">Total Episodes</p>
                  <p className="text-xl font-bold text-[#d92550] mt-0.5">
                    {formatNum(stats?.counts?.totalEpisodes)}
                  </p>
                </div>
                <Clapperboard className="h-5 w-5 text-[#d92550]/40" />
              </div>

              <div className="architect-summary-item">
                <div>
                  <p className="text-xs font-semibold text-slate-400">30-Day Traffic</p>
                  <p className="text-xl font-bold text-[#16aaff] mt-0.5">
                    {formatNum(stats?.counts?.totalTrafficViews)}
                  </p>
                </div>
                <TrendingUp className="h-5 w-5 text-[#16aaff]/40" />
              </div>
            </div>
          </section>

          {/* ── 8. System & SEO Health ── */}
          <section aria-label="System Health">
            <SystemHealthPanel
              health={stats?.systemHealth}
              seoScore={stats?.seoHealthScore || 98}
              onClearCache={handleClearCache}
              clearingCache={clearingCache}
            />
          </section>

        </main>
      </div>
    </div>
  );
}

// ─── Component: Viewership Chart (ArchitectUI "Technical Support" Style) ──────
function ArchitectViewershipChart({ allLogs, totalViews = 0 }) {
  const [range, setRange] = useState(30);
  const [tooltip, setTooltip] = useState(null);
  const chartRef = useRef(null);

  const displayLogs = useMemo(() => allLogs.slice(-range), [allLogs, range]);

  const maxVal = useMemo(() => {
    const vals = displayLogs.map(l => l.views || 0);
    return Math.max(...vals, 10);
  }, [displayLogs]);

  const W = 700; const H = 190;
  const PT = 15; const PB = 25; const PL = 35; const PR = 15;
  const innerW = W - PL - PR;
  const innerH = H - PT - PB;

  const points = useMemo(() => {
    if (displayLogs.length === 0) return [];
    return displayLogs.map((l, i) => {
      const x = PL + (i / Math.max(displayLogs.length - 1, 1)) * innerW;
      const y = PT + innerH - ((l.views || 0) / maxVal) * innerH;
      return { x, y, date: l.date, views: l.views || 0 };
    });
  }, [displayLogs, maxVal]);

  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    return points.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const cp1x = prev.x + (p.x - prev.x) / 2;
      return `${acc} C ${cp1x} ${prev.y}, ${cp1x} ${p.y}, ${p.x} ${p.y}`;
    }, '');
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const first = points[0]; const last = points[points.length - 1];
    return `${linePath} L ${last.x} ${PT + innerH} L ${first.x} ${PT + innerH} Z`;
  }, [linePath, points]);

  return (
    <div className="architect-card h-full flex flex-col justify-between">
      <div className="architect-card-header">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[#3f6ad8]" />
          <span>Technical Support & Viewership</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded p-0.5 border border-slate-200 dark:border-slate-700">
            {[7, 30, 90].map(days => (
              <button
                key={days}
                type="button"
                onClick={() => setRange(days)}
                className={`px-2.5 py-0.5 text-xs font-medium rounded transition ${
                  range === days
                    ? 'bg-white dark:bg-slate-700 text-[#3f6ad8] shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {days}D
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => downloadCsv('ksubzone-viewership.csv', [['Date', 'Views'], ...displayLogs.map(l => [l.date, l.views])])}
            className="text-[11px] font-bold text-slate-500 hover:text-[#3f6ad8] px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            CSV
          </button>
        </div>
      </div>

      <div className="architect-card-body flex-1 flex flex-col justify-between">
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Helpdesk & Streaming Tickets</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-[#f7b924]">{formatNum(totalViews)}</span>
            <span className="text-xs font-semibold text-[#3ac47d]">▲ 5% increase</span>
          </div>
        </div>

        {/* Wavy area chart in golden-yellow / amber like ArchitectUI */}
        <div className="relative w-full overflow-hidden my-4">
          <svg ref={chartRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-44" onMouseLeave={() => setTooltip(null)}>
            <defs>
              <linearGradient id="architectAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f7b924" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#f7b924" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {areaPath && <path d={areaPath} fill="url(#architectAreaGrad)" />}
            {linePath && <path d={linePath} fill="none" stroke="#f7b924" strokeWidth="3" strokeLinecap="round" />}

            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x} cy={p.y}
                r={tooltip?.date === p.date ? 5 : 3.5}
                fill="#f7b924"
                stroke="#ffffff"
                strokeWidth="2"
                className="cursor-pointer transition-all"
                onMouseEnter={() => setTooltip(p)}
              />
            ))}
          </svg>

          {tooltip && (
            <div
              className="absolute z-20 pointer-events-none rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 shadow-lg text-xs -translate-x-1/2 -translate-y-full"
              style={{ left: `${(tooltip.x / W) * 100}%`, top: `${(tooltip.y / H) * 100 - 8}%` }}
            >
              <p className="text-[10px] text-slate-400">{tooltip.date}</p>
              <p className="text-xs font-bold text-slate-800 dark:text-white">{formatNum(tooltip.views)} views</p>
            </div>
          )}
        </div>

        {/* Bottom progress bar */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500">Catalog Coverage & Delivery</span>
            <span className="font-bold text-[#3ac47d] text-base">94.2%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
            <div className="bg-[#3f6ad8] h-2 rounded-full" style={{ width: '94.2%' }} />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>YoY Catalog Growth</span>
            <span>100% Target</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Component: Timeline Card (ArchitectUI "Timeline Example" Style) ─────────
function ArchitectTimelineCard({ latestDownloads = [] }) {
  const events = latestDownloads.slice(0, 5);

  const defaultItems = [
    { title: 'All Hands Meeting & Editorial Sync', time: '10:00 AM', point: 'point-danger', badge: null },
    { title: 'Release production subtitle batch', time: '15:00 PM', point: 'point-success', badge: 'NEW' },
    { title: 'Core database cache optimized', time: '16:30 PM', point: 'point-info', badge: null },
    { title: 'Queen of Tears EP 14 subtitle published', time: '17:45 PM', point: 'point-warning', badge: 'POPULAR' },
    { title: 'Scheduled drama automated sync', time: '19:00 PM', point: 'point-danger', badge: null },
  ];

  return (
    <div className="architect-card h-full flex flex-col justify-between">
      <div className="architect-card-header">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#d92550]" />
          <span>Timeline Example</span>
        </div>
        <span className="badge-architect badge-architect-danger">8</span>
      </div>

      <div className="architect-card-body flex-1">
        <div className="vertical-timeline">
          {(events.length > 0 ? events : defaultItems).map((item, idx) => {
            const title = item.media?.title ? `Subtitle downloaded: ${item.media.title}` : (item.title || 'System notification');
            const time = item.lastDownloadedAt ? formatRelativeTime(item.lastDownloadedAt) : (item.time || 'Today');
            const pointClasses = ['point-danger', 'point-success', 'point-warning', 'point-info'];
            const pointClass = pointClasses[idx % pointClasses.length];

            return (
              <div key={idx} className="vertical-timeline-item">
                <span className={`vertical-timeline-point ${pointClass}`} />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {title}
                  </p>
                  {idx === 1 && <span className="badge-architect badge-architect-danger">NEW</span>}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Yet another update at <span className="font-medium text-[#3f6ad8]">{time}</span>
                </p>
              </div>
            );
          })}
        </div>

        <div className="text-center pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
          <Link
            href="/management/subtitles"
            className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow transition"
          >
            View All Messages
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Component: Dynamic Tables (ArchitectUI "Dynamic Tables" Style) ───────────
function ArchitectDynamicTables({ episodes = [], canManageDramas = false, onChanged }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(4);
  const [busyAction, setBusyAction] = useState('');
  const [rescheduleId, setRescheduleId] = useState(null);
  const [rescheduleValue, setRescheduleValue] = useState('');
  const toast = useToast();

  const filtered = useMemo(() => {
    return episodes.filter(ep => {
      const matchSearch = !search.trim() ||
        (ep.dramaTitle && ep.dramaTitle.toLowerCase().includes(search.toLowerCase())) ||
        (ep.episodeNumber && String(ep.episodeNumber).includes(search));

      if (!matchSearch) return false;
      if (filter === 'needs') return !ep.hasSubtitles && !ep.isUpcoming;
      if (filter === 'upcoming') return ep.isUpcoming;
      return true;
    });
  }, [episodes, search, filter]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const pagedItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const markReleased = async (episode) => {
    setBusyAction(`${episode._id}:release`);
    try {
      await apiClient.put(`/api/admin/episodes/${episode._id}/release`);
      toast.success('Episode marked as released.');
      await onChanged?.();
    } catch (err) {
      toast.error(err.message || 'Could not mark the episode as released.');
    } finally {
      setBusyAction('');
    }
  };

  const reschedule = async (episode) => {
    if (!rescheduleValue) return;
    setBusyAction(`${episode._id}:reschedule`);
    try {
      await apiClient.put(`/api/admin/episodes/${episode._id}`, {
        airDate: new Date(rescheduleValue).toISOString(),
      });
      setRescheduleId(null);
      setRescheduleValue('');
      toast.success('Episode schedule updated.');
      await onChanged?.();
    } catch (err) {
      toast.error(err.message || 'Could not reschedule the episode.');
    } finally {
      setBusyAction('');
    }
  };

  const deleteEpisode = async (episode) => {
    if (!window.confirm(`Delete ${episode.dramaTitle || 'this episode'} EP ${episode.episodeNumber}?`)) return;
    setBusyAction(`${episode._id}:delete`);
    try {
      await apiClient.delete(`/api/admin/episodes/${episode._id}`);
      toast.success('Episode deleted.');
      await onChanged?.();
    } catch (err) {
      toast.error(err.message || 'Could not delete the episode.');
    } finally {
      setBusyAction('');
    }
  };

  return (
    <div className="architect-card">
      <div className="architect-card-header">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-[#3f6ad8]" />
          <span>Dynamic Tables</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChanged?.()}
            className="btn-architect-outline text-xs"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => { setSearch(''); setFilter('all'); }}
            className="btn-architect-outline text-xs bg-slate-800 text-white hover:bg-slate-900 border-slate-800"
          >
            Remove Filters
          </button>
        </div>
      </div>

      <div className="architect-card-body">
        {/* Full text search bar */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-500 mb-1">Full text search:</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search drama, movie title, or episode number..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-[#3f6ad8]"
              />
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded p-1 border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
              {['all', 'needs', 'upcoming'].map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => { setFilter(f); setPage(1); }}
                  className={`px-3 py-1 text-xs font-medium rounded capitalize ${
                    filter === f
                      ? 'bg-white dark:bg-slate-700 text-[#3f6ad8] shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {f === 'needs' ? 'Needs Subtitle' : f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ArchitectUI Table */}
        <div className="architect-table-wrap">
          <table className="architect-table">
            <thead>
              <tr>
                <th className="w-12">#</th>
                <th>Title / Media</th>
                <th>Category / Air Date</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedItems.length > 0 ? (
                pagedItems.map((ep, i) => {
                  const airDate = ep.airDate ? new Date(ep.airDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD';
                  const index = (page - 1) * pageSize + i + 1;

                  let statusBadge;
                  if (ep.releaseStatus === 'Released') {
                    statusBadge = <span className="badge-architect badge-architect-success"><Check className="h-3 w-3 mr-1" /> Released</span>;
                  } else if (!ep.hasSubtitles) {
                    statusBadge = ep.isUpcoming
                      ? <span className="badge-architect badge-architect-primary">Scheduled</span>
                      : <span className="badge-architect badge-architect-danger">Missing Subtitle</span>;
                  } else {
                    statusBadge = <span className="badge-architect badge-architect-success">Ready</span>;
                  }

                  return (
                    <tr key={ep._id || i}>
                      <td className="font-mono font-bold text-slate-400">{index}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Clapperboard className="h-4 w-4 text-[#3f6ad8]" />
                          <span className="font-bold text-slate-800 dark:text-white">{ep.dramaTitle}</span>
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold">
                            EP {ep.episodeNumber}
                          </span>
                        </div>
                      </td>
                      <td className="text-slate-500">{airDate}</td>
                      <td>{statusBadge}</td>
                      <td className="text-right">
                        <div className="inline-flex items-center gap-2">
                          {canManageDramas && (
                            <>
                              {ep.releaseStatus !== 'Released' && (
                                <button
                                  type="button"
                                  onClick={() => markReleased(ep)}
                                  disabled={busyAction === `${ep._id}:release`}
                                  className="btn-architect-success text-[11px] py-1 px-2.5"
                                >
                                  Release Now
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => deleteEpisode(ep)}
                                disabled={busyAction === `${ep._id}:delete`}
                                className="text-rose-500 hover:text-rose-700 p-1"
                                title="Delete episode"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400 text-xs">
                    No content matches the selected query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ArchitectUI Table Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              «
            </button>
            {Array.from({ length: totalPages }).map((_, p) => (
              <button
                key={p + 1}
                type="button"
                onClick={() => setPage(p + 1)}
                className={`px-2.5 py-1 rounded border ${
                  page === p + 1
                    ? 'bg-[#3f6ad8] text-white border-[#3f6ad8] font-bold'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-600'
                }`}
              >
                {p + 1}
              </button>
            ))}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              »
            </button>
          </div>

          <div className="flex items-center gap-2 text-slate-500">
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-slate-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800 text-xs"
            >
              <option value={4}>4 items per page</option>
              <option value={8}>8 items per page</option>
              <option value={12}>12 items per page</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Component: Tasks List (ArchitectUI "Tasks List" Style) ───────────────────
function ArchitectTasksList() {
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Wash and sanitize subtitle srt blocks', author: 'Bob', badge: 'REJECTED', color: 'badge-architect-danger', done: false },
    { id: 2, title: 'Task with dropdown menu sync', author: 'Johnny', badge: 'NEW', color: 'badge-architect-primary', done: true },
    { id: 3, title: 'Badge on the right task check', author: 'Editorial Team', badge: 'LATEST TASK', color: 'badge-architect-success', done: false },
    { id: 4, title: 'Go grocery shopping & metadata updates', author: 'Admin Studio', badge: null, color: '', done: false },
    { id: 5, title: 'Development Task: Finish TMDB sync engine', author: 'DevOps', badge: 'IN PROGRESS', color: 'badge-architect-warning', done: false },
  ]);

  const toggleTask = (id) => {
    setTasks(t => t.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  return (
    <div className="architect-card h-full flex flex-col justify-between">
      <div className="architect-card-header">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-[#3ac47d]" />
          <span>Tasks List</span>
        </div>
        <button type="button" className="text-slate-400 hover:text-slate-600">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      <div className="architect-card-body flex-1 divide-y divide-slate-100 dark:divide-slate-800">
        {tasks.map(task => (
          <div key={task.id} className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition px-1">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleTask(task.id)}
                className="text-slate-400 hover:text-[#3f6ad8]"
              >
                {task.done ? (
                  <CheckSquare className="h-4 w-4 text-[#3ac47d]" />
                ) : (
                  <Square className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                )}
              </button>
              <div>
                <p className={`text-xs font-semibold text-slate-800 dark:text-white ${task.done ? 'line-through text-slate-400' : ''}`}>
                  {task.title}
                </p>
                <p className="text-[11px] text-slate-400">Written by {task.author}</p>
              </div>
            </div>
            {task.badge && (
              <span className={`badge-architect ${task.color}`}>{task.badge}</span>
            )}
          </div>
        ))}

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
          <button type="button" className="btn-architect-outline text-xs">
            Cancel
          </button>
          <button type="button" className="btn-architect-primary text-xs">
            Add Task
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Component: Top Performing Content (ArchitectUI Leaderboard Style) ─────────
function ArchitectTopContent({ content = [] }) {
  const list = content.slice(0, 5);

  return (
    <div className="architect-card h-full flex flex-col justify-between">
      <div className="architect-card-header">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-[#f7b924]" />
          <span>Top Performing Content</span>
        </div>
        <Link href="/management/movies" className="text-xs text-[#3f6ad8] font-bold hover:underline">
          View all
        </Link>
      </div>

      <div className="architect-card-body flex-1 divide-y divide-slate-100 dark:divide-slate-800">
        {list.length > 0 ? (
          list.map((item, idx) => (
            <div key={idx} className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-5 text-center font-mono font-bold text-xs text-slate-400">
                  {idx + 1}
                </span>
                <div className="h-10 w-8 rounded overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                  {item.poster ? (
                    <img src={item.poster} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-400">
                      <Film className="h-3 w-3" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-[200px]">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                    <span className="uppercase font-bold">{item.type}</span>
                    <span className="text-[#f7b924] font-semibold">★ {item.tmdbRating || '8.5'}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs font-bold font-mono text-slate-800 dark:text-white">
                  {formatNum(item.viewCount)}
                </p>
                <p className="text-[10px] text-slate-400">views</p>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-xs text-slate-400">
            No performance data recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Component: System Health Panel ──────────────────────────────────────────
function SystemHealthPanel({ health, seoScore, onClearCache, clearingCache }) {
  const statusDot = (ok) => (
    <span className={`h-2 w-2 rounded-full flex-shrink-0 ${ok === null ? 'bg-slate-400' : ok ? 'bg-[#3ac47d]' : 'bg-[#f7b924]'}`} />
  );

  const healthItems = [
    { label: 'SEO Score', value: `${seoScore} / 100`, sub: 'Schema Validated', ok: seoScore >= 90, color: 'text-[#3ac47d]' },
    { label: 'Database', value: health?.dbStatus === 'ok' ? 'Connected' : 'Unavailable', sub: `Driver: ${(health?.dbDriver || '—').toUpperCase()}`, ok: health?.dbStatus === 'ok' },
    { label: 'API Runtime', value: health?.apiStatus === 'ok' ? `PHP ${health?.phpVersion?.slice(0, 5) || '—'}` : 'Unavailable', sub: health?.apiStatus === 'ok' ? 'REST API Ready' : 'Check server logs', ok: health?.apiStatus === undefined ? null : health.apiStatus === 'ok' },
    { label: 'Server Time', value: health?.serverTime?.split(' ')[1]?.slice(0, 5) || '—', sub: health?.timezone || 'Timezone unavailable', ok: health?.serverTime ? true : null },
    { label: 'Sitemap Index', value: health?.sitemapStatus === 'ok' ? 'Healthy' : 'Not checked', sub: health?.sitemapStatus === 'ok' ? 'SEO endpoint available' : 'Open SEO & Config', ok: health?.sitemapStatus === undefined ? null : health.sitemapStatus === 'ok', color: 'text-[#3f6ad8]' },
  ];

  return (
    <div className="architect-card">
      <div className="architect-card-header">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-[#3f6ad8]" />
          <span>System & SEO Telemetry</span>
        </div>
        <button
          type="button"
          onClick={onClearCache}
          disabled={clearingCache}
          className="btn-architect-outline text-xs"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${clearingCache ? 'animate-spin' : ''}`} />
          <span>{clearingCache ? 'Clearing…' : 'Purge Cache'}</span>
        </button>
      </div>

      <div className="architect-card-body">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {healthItems.map((item, idx) => (
            <div key={idx} className="p-3.5 rounded border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                {statusDot(item.ok)}
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
              </div>
              <p className={`text-base font-bold font-mono mt-1 ${item.color || 'text-slate-800 dark:text-white'}`}>{item.value}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{item.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
