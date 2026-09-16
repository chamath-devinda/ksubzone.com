'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import Link from 'next/link';
import apiClient from '@/services/api/apiClient';
import {
  Film, Tv, Users, Languages, Star, TrendingUp, Eye, Award,
  CheckCircle, BookOpenText, Clapperboard, Calendar, AlertTriangle,
  Activity, ArrowUpRight, BarChart3, Globe, Database, Server, Clock,
  Shield, Download, Plus, RefreshCw, ExternalLink, Check, Search,
  Sparkles, ArrowRight, Filter, Zap, FileText, MessageSquare,
  DollarSign, MousePointerClick, User, WandSparkles, Cloud, ChevronRight,
  CalendarClock, Trash2, Send
} from 'lucide-react';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import AdminTopBar from '@/features/admin/components/AdminTopBar';
import StatCard from '@/features/admin/components/StatCard';
import { Pulse, CardSkeleton } from '@/features/admin/components/Skeleton';
import { useToast } from '@/features/admin/components/Toast';
import { AD_REVENUE_LKR_PER_USD } from '@/config/ads';

// ─── Utilities ──────────────────────────────────────────────────────────────
function formatNum(n) {
  if (n === null || n === undefined) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function formatUsd(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: amount < 1 ? 4 : 2,
  });
}

function formatLkr(value) {
  const amount = Number(value || 0) * AD_REVENUE_LKR_PER_USD;
  return amount.toLocaleString('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
    context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--studio-surface').trim() || '#17171f';
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

function ExportActions({ onCsv, onPng, label = 'Export' }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${label} options`}>
      <button type="button" onClick={onCsv} className="rounded-lg px-2 py-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-[#7C3AED] transition" title={`Download ${label} as CSV`}>CSV</button>
      <button type="button" onClick={onPng} className="rounded-lg px-2 py-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-[#7C3AED] transition" title={`Download ${label} as PNG`}>PNG</button>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { admin } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);


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

  const trendPct = useMemo(() => {
    if (sortedLogs.length < 4) return null;
    const half = Math.floor(sortedLogs.length / 2);
    const recent = sortedLogs.slice(-half).reduce((s, l) => s + l.views, 0);
    const prev = sortedLogs.slice(-half * 2, -half).reduce((s, l) => s + l.views, 0);
    if (!prev) return null;
    return Math.round(((recent - prev) / prev) * 100);
  }, [sortedLogs]);

  const adminName = admin?.displayName || admin?.username || admin?.name || 'Superadmin';
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
          <main className="admin-main flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-7 max-w-[1560px] w-full mx-auto space-y-6">
            <div className="flex items-center justify-between py-2">
              <div className="space-y-2">
                <Pulse className="h-4 w-32" />
                <Pulse className="h-8 w-56" />
                <Pulse className="h-4 w-44" />
              </div>
              <Pulse className="h-10 w-28 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => <Pulse key={i} className="h-[80px] rounded-2xl" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Pulse className="lg:col-span-2 h-[300px] rounded-2xl" />
              <Pulse className="h-[300px] rounded-2xl" />
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

        <main className="admin-main flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-7 max-w-[1560px] w-full mx-auto space-y-6">

          {/* ── Error Banner ── */}
          {error && (
            <div className="flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {healthIssues.length > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-300" role="alert">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-bold">System health needs attention</p>
                <p className="mt-1 text-amber-700/80 dark:text-amber-300/80">{healthIssues.join(' ')}</p>
              </div>
            </div>
          )}

          {/* ── 1. Operations command centre: intentionally different from the old hero/action grid ── */}
          <section className="workspace-intro-grid" aria-label="Operations command centre">
            <div className="workspace-intro-panel">
              <div className="workspace-kicker"><span className="workspace-kicker-dot" /> CONTROL ROOM / DAILY BRIEF</div>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="workspace-title">{getGreeting()}, {adminName}</h1>
                  <p className="workspace-subtitle">A live operational view of catalog throughput, subtitle readiness, and site health.</p>
                </div>
                <div className="workspace-date">{getFormattedToday()}</div>
              </div>
              <div className="workspace-context-row">
                <span><Activity className="h-3.5 w-3.5 text-emerald-400" /> Runtime connected</span>
                <span><Shield className="h-3.5 w-3.5 text-violet-400" /> {adminRole} scope</span>
                <span><Database className="h-3.5 w-3.5 text-sky-400" /> {canViewAnalytics ? 'Verified API data' : 'Limited data scope'}</span>
              </div>
            </div>

            <aside className="workspace-action-panel" aria-label="Operator actions">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="workspace-panel-label">Operator actions</p>
                  <p className="workspace-panel-hint">Jump into the next task</p>
                </div>
                <kbd className="workspace-kbd">Ctrl K</kbd>
              </div>
              <div className="workspace-action-grid">
                <Link href="/management/import" className="workspace-action"><Sparkles className="h-4 w-4 text-violet-400" /><span>Import title</span><ArrowUpRight className="ml-auto h-3.5 w-3.5" /></Link>
                <Link href="/management/subtitles" className="workspace-action"><Languages className="h-4 w-4 text-emerald-400" /><span>Review queue</span><ArrowUpRight className="ml-auto h-3.5 w-3.5" /></Link>
                <Link href="/management/profile" className="workspace-action"><User className="h-4 w-4 text-sky-400" /><span>My profile</span><ArrowUpRight className="ml-auto h-3.5 w-3.5" /></Link>
                <button type="button" onClick={handleClearCache} disabled={clearingCache || !canManageSettings} title={canManageSettings ? 'Clear application cache' : 'Requires manage_settings permission'} className="workspace-action text-left"><RefreshCw className={`h-4 w-4 text-amber-400 ${clearingCache ? 'animate-spin' : ''}`} /><span>{clearingCache ? 'Clearing…' : 'Purge cache'}</span><ChevronRight className="ml-auto h-3.5 w-3.5" /></button>
              </div>
            </aside>
          </section>

          {/* ── 2. Primary DashStack 4-Metric Row ── */}
          <section aria-label="Primary KPIs">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
              <StatCard
                label="Total Users"
                value={formatNum(stats?.counts?.totalUsers)}
                 trend={stats?.trends?.totalUsers ?? null}
                 trendText="Live account count"
                trendPeriod="from yesterday"
                icon={Users}
                variant="primary"
                accentColor="purple"
                href="/management/users"
              />
              <StatCard
                label="Total Catalog (Dramas & Movies)"
                value={formatNum((stats?.counts?.totalDramas || 0) + (stats?.counts?.totalMovies || 0))}
                 trend={stats?.trends?.totalCatalog ?? null}
                 trendText="Live catalog count"
                trendPeriod="from yesterday"
                icon={Film}
                variant="primary"
                accentColor="yellow"
                href="/management/dramas"
              />
              <StatCard
                label="Total Subtitles"
                value={formatNum(stats?.counts?.totalSubtitles)}
                 trend={stats?.trends?.totalSubtitles ?? null}
                 trendText="Live repository count"
                trendPeriod="from yesterday"
                icon={Languages}
                variant="primary"
                accentColor="green"
                href="/management/subtitles"
              />
              <StatCard
                label="Total Views"
                value={formatNum(stats?.counts?.totalViews)}
                trend={trendPct}
                trendPeriod="vs previous 30 days"
                icon={Eye}
                variant="primary"
                accentColor="coral"
                href="/management/dashboard"
              />
            </div>
          </section>



          {/* ── 3. Secondary Metrics Row ── */}
          <section aria-label="Secondary Metrics">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
              <StatCard label="Movies" value={formatNum(stats?.counts?.totalMovies)} icon={Film} variant="secondary" accentColor="coral" href="/management/movies" />
              <StatCard label="Dramas" value={formatNum(stats?.counts?.totalDramas)} icon={Tv} variant="secondary" accentColor="yellow" href="/management/dramas" />
              <StatCard label="Episodes" value={formatNum(stats?.counts?.totalEpisodes)} icon={Clapperboard} variant="secondary" accentColor="blue" href="/management/dramas" />
              <StatCard label="Downloads" value={formatNum(stats?.counts?.totalDownloads)} icon={Download} variant="secondary" accentColor="green" href="/management/subtitles" />
              <StatCard label="30-Day Traffic" value={formatNum(stats?.counts?.totalTrafficViews)} icon={TrendingUp} variant="secondary" accentColor="purple" href="/management/dashboard" />
            </div>
          </section>

          {/* ── 4. Analytics + Content Distribution ── */}
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-5 sm:gap-6" aria-label="Analytics">
            <div className="lg:col-span-2">
              <TrafficOverviewChart allLogs={sortedLogs} />
            </div>
            <div>
              <ContentDistributionWidget
                movies={stats?.counts?.totalMovies || 0}
                dramas={stats?.counts?.totalDramas || 0}
                episodes={stats?.counts?.totalEpisodes || 0}
                articles={stats?.counts?.totalArticles || 0}
                subtitles={stats?.counts?.totalSubtitles || 0}
              />
            </div>
          </section>

          {/* ── 5. Subtitle Queue (Deals Details Style) ── */}
          <section aria-label="Subtitle Queue">
            <SubtitleQueueSection
              episodes={stats?.upcomingEpisodes || []}
              canManageDramas={canManageDramas}
              onChanged={() => loadDashboard({ silent: true })}
            />
          </section>

          {/* ── 6. Top Content + Recent Activity ── */}
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-5 sm:gap-6" aria-label="Content Performance">
            <div className="lg:col-span-2">
              <TopPerformingContent content={stats?.topContent || []} />
            </div>
            <div>
              <RecentActivityTimeline latestDownloads={stats?.latestDownloads || []} />
            </div>
          </section>

          {/* ── 7. System Health ── */}
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

// ─── Adsterra Revenue Panel ──────────────────────────────────────────────────
function AdsterraRevenuePanel({
  stats,
  loading,
  error,
  range,
  onRangeChange,
  onRefresh,
  apiKey,
  onApiKeyChange,
  onSaveKey,
  savingKey,
}) {
  const [showKeyForm, setShowKeyForm] = useState(false);
  const revenueChartRef = useRef(null);
  const summary = stats?.summary || {};
  const daily = stats?.daily || [];
  const maxRevenue = Math.max(...daily.map(item => Number(item.revenue || 0)), 0.01);
  const needsKey = stats?.configured === false;

  return (
    <div className="dashstack-card rounded-[28px] sm:rounded-[32px] border border-slate-200/70 dark:border-white/[0.08] bg-white/90 dark:bg-[#120E1E]/90 backdrop-blur-xl overflow-hidden shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4.5 border-b border-slate-200/60 dark:border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#10B981]/15 text-[#10B981]">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Adsterra Revenue</h3>
              <span className={`rounded-full px-2.5 py-0.5 text-[9.5px] font-bold ${needsKey
                ? 'bg-amber-500/15 border border-amber-500/25 text-amber-400'
                : 'bg-[#10B981]/15 border border-[#10B981]/25 text-[#10B981]'}`}>
                {needsKey ? 'Setup Required' : 'Live Verified'}
              </span>
            </div>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5">Publisher earnings and ad performance</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-white/[0.06] border border-slate-200/60 dark:border-white/[0.08] rounded-xl p-1">
            {[7, 30, 90].map(days => (
              <button
                key={days}
                type="button"
                onClick={() => onRangeChange(days)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  range === days
                    ? 'bg-[#7C3AED] text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {days}D
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex h-8.5 w-8.5 items-center justify-center rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] text-slate-500 dark:text-slate-300 hover:text-[#7C3AED] dark:hover:text-white transition disabled:opacity-50"
            title="Refresh Adsterra statistics"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && !stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6">
          {Array.from({ length: 4 }).map((_, index) => <Pulse key={index} className="h-20 rounded-xl" />)}
        </div>
      ) : needsKey ? (
        <div className="p-6">
          <div className="max-w-xl space-y-3">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Connect your Adsterra publisher account</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">The key is stored securely in the database and is never leaked to client browsers.</p>
            </div>
            <form onSubmit={onSaveKey} className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={event => onApiKeyChange(event.target.value)}
                placeholder="Paste Adsterra API key"
                autoComplete="off"
                required
                className="flex-1 h-10 rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.05] px-3.5 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-[#7C3AED]"
              />
              <button
                type="submit"
                disabled={savingKey}
                className="h-10 rounded-xl bg-[#10B981] px-4 text-xs font-bold text-white hover:bg-[#059669] transition disabled:opacity-50 shadow-sm"
              >
                {savingKey ? 'Connecting…' : 'Connect API'}
              </button>
            </form>
            {error && <p className="text-xs text-amber-500">{error}</p>}
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
              <span>{error}</span>
              <button type="button" onClick={() => setShowKeyForm(value => !value)} className="font-bold underline underline-offset-2 flex-shrink-0">
                Update key
              </button>
            </div>
          )}

          {showKeyForm && (
            <form onSubmit={onSaveKey} className="flex flex-col sm:flex-row gap-2 rounded-2xl border border-slate-200/70 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.03] p-3.5">
              <input
                type="password"
                value={apiKey}
                onChange={event => onApiKeyChange(event.target.value)}
                placeholder="Enter a new Adsterra API key"
                autoComplete="off"
                required
                className="flex-1 h-10 rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-white dark:bg-[#120E1E] px-3.5 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-[#7C3AED]"
              />
              <button type="submit" disabled={savingKey} className="h-10 rounded-xl bg-[#10B981] px-4 text-xs font-bold text-white disabled:opacity-50">
                {savingKey ? 'Saving…' : 'Save New Key'}
              </button>
            </form>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Revenue (LKR)', value: formatLkr(summary.revenue), subvalue: formatUsd(summary.revenue), icon: DollarSign, color: 'text-[#10B981]', bg: 'bg-[#10B981]/15' },
              { label: 'Impressions', value: formatNum(summary.impressions), icon: Eye, color: 'text-[#7C3AED]', bg: 'bg-[#7C3AED]/15' },
              { label: 'Clicks', value: formatNum(summary.clicks), icon: MousePointerClick, color: 'text-[#8B5CF6]', bg: 'bg-[#8B5CF6]/15' },
              { label: 'CPM / CTR', value: `${formatLkr(summary.cpm)} / ${Number(summary.ctr || 0).toFixed(2)}%`, subvalue: `${formatUsd(summary.cpm)} CPM`, icon: TrendingUp, color: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/15' },
            ].map(item => (
              <div key={item.label} className="rounded-[22px] border border-slate-200/70 dark:border-white/[0.07] bg-slate-50/70 dark:bg-white/[0.03] p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{item.label}</p>
                  <div className={`h-7 w-7 rounded-lg ${item.bg} ${item.color} flex items-center justify-center`}>
                    <item.icon className="h-3.5 w-3.5" />
                  </div>
                </div>
                <p className="mt-2 text-[22px] font-black font-mono text-slate-900 dark:text-white leading-tight">{item.value}</p>
                {item.subvalue && <p className="mt-1 text-[10px] font-medium text-slate-400">{item.subvalue}</p>}
              </div>
            ))}
          </div>

          <div className="rounded-[24px] border border-slate-200/70 dark:border-white/[0.07] bg-slate-50/70 dark:bg-white/[0.03] p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-200">Daily Revenue Timeline</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">{stats?.period?.start || '—'} to {stats?.period?.finish || '—'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-xs font-bold text-[#10B981] font-mono">LKR · approx. Rs. {AD_REVENUE_LKR_PER_USD}/USD</span>
                <ExportActions
                  label="revenue"
                  onCsv={() => downloadCsv('ksubzone-revenue.csv', [
                    ['Date', 'Revenue USD', 'Revenue LKR', 'Impressions', 'Clicks', 'CPM', 'CTR'],
                    ...daily.map(item => [item.date, item.revenue || 0, Number(item.revenue || 0) * AD_REVENUE_LKR_PER_USD, item.impressions || 0, item.clicks || 0, item.cpm || 0, item.ctr || 0]),
                  ])}
                  onPng={() => downloadSvgAsPng('ksubzone-revenue.png', revenueChartRef.current)}
                />
              </div>
            </div>

            {daily.length > 0 ? (
              <svg ref={revenueChartRef} viewBox="0 0 700 120" className="h-28 w-full" role="img" aria-label="Daily revenue timeline">
                {daily.map((item, index) => {
                  const height = Math.max((Number(item.revenue || 0) / maxRevenue) * 100, 4);
                  const barWidth = 700 / Math.max(daily.length, 1);
                  return (
                    <rect key={`${item.date}-${index}`} x={index * barWidth + 1} y={120 - (height * 1.1)} width={Math.max(barWidth - 2, 2)} height={height * 1.1} rx="4" fill="#10B981" opacity="0.9">
                      <title>{`${item.date}: ${formatLkr(item.revenue)} (${formatUsd(item.revenue)}) · ${formatNum(item.impressions)} impressions`}</title>
                    </rect>
                  );
                })}
              </svg>
            ) : (
              <div className="h-28 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                No Adsterra activity recorded for this period yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 1. Traffic Overview Chart ───────────────────────────────────────────────
function TrafficOverviewChart({ allLogs }) {
  const [range, setRange] = useState(30);
  const [tooltip, setTooltip] = useState(null);
  const chartRef = useRef(null);

  const displayLogs = useMemo(() => allLogs.slice(-range), [allLogs, range]);

  const maxVal = useMemo(() => {
    const vals = displayLogs.map(l => l.views || 0);
    return Math.max(...vals, 10);
  }, [displayLogs]);

  const W = 700; const H = 210;
  const PT = 15; const PB = 28; const PL = 38; const PR = 12;
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

  const yLabels = [0, 0.5, 1];

  return (
    <div className="dashstack-card rounded-[28px] sm:rounded-[32px] border border-slate-200/70 dark:border-white/[0.08] bg-white/90 dark:bg-[#120E1E]/90 backdrop-blur-xl p-6 sm:p-7 space-y-4 h-full shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#7C3AED]" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Viewership Details</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Page views and content stream telemetry</p>
        </div>

          <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-white/[0.06] border border-slate-200/60 dark:border-white/[0.08] rounded-xl p-1 self-start sm:self-auto">
          {[{ label: '7D', val: 7 }, { label: '30D', val: 30 }, { label: '90D', val: 90 }].map(tab => (
            <button
              key={tab.val}
              type="button"
              onClick={() => setRange(tab.val)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                range === tab.val
                  ? 'bg-[#7C3AED] text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
            ))}
          </div>
          <ExportActions
            label="viewership"
            onCsv={() => downloadCsv('ksubzone-viewership.csv', [['Date', 'Views'], ...displayLogs.map(log => [log.date, log.views || 0])])}
            onPng={() => downloadSvgAsPng('ksubzone-viewership.png', chartRef.current)}
          />
        </div>

      <div className="relative w-full overflow-hidden pt-2">
        <svg ref={chartRef} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 210 }} onMouseLeave={() => setTooltip(null)}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.26" />
              <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {yLabels.map((pct, i) => {
            const y = PT + innerH - pct * innerH;
            return (
              <g key={i}>
                <line x1={PL} y1={y} x2={PL + innerW} y2={y} stroke="currentColor" className="text-slate-200 dark:text-white/[0.05]" strokeDasharray="4 4" />
                <text x={PL - 6} y={y + 3.5} textAnchor="end" fill="currentColor" className="text-slate-400 dark:text-slate-500 text-[9.5px] font-mono">
                  {formatNum(Math.round(maxVal * pct))}
                </text>
              </g>
            );
          })}

          {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}
          {linePath && <path d={linePath} fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" />}

          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x} cy={p.y}
              r={tooltip?.date === p.date ? 5 : 3}
              fill="#7C3AED"
              stroke="#FFFFFF"
              strokeWidth="2"
              className="cursor-pointer transition-all"
              onMouseEnter={() => setTooltip(p)}
            />
          ))}
        </svg>

        {tooltip && (
          <div
            className="absolute z-20 pointer-events-none rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-[#151124]/95 px-3.5 py-2 shadow-xl text-xs backdrop-blur-md -translate-x-1/2 -translate-y-full"
            style={{ left: `${(tooltip.x / W) * 100}%`, top: `${(tooltip.y / H) * 100 - 8}%` }}
          >
            <p className="text-[10px] text-slate-400 dark:text-slate-400 font-mono">{tooltip.date}</p>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">{formatNum(tooltip.views)} views</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 2. Content Distribution ─────────────────────────────────────────────────
function ContentDistributionWidget({ movies, dramas, episodes, articles, subtitles }) {
  const distributionRef = useRef(null);
  const total = movies + dramas + episodes + articles + subtitles || 1;

  const items = [
    { label: 'Subtitles', count: subtitles, color: '#10B981' },
    { label: 'Dramas',    count: dramas,    color: '#F59E0B' },
    { label: 'Movies',    count: movies,    color: '#3B82F6' },
    { label: 'Episodes',  count: episodes,  color: '#7C3AED' },
    { label: 'Articles',  count: articles,  color: '#8B5CF6' },
  ].map(item => ({ ...item, pct: total > 0 ? Math.round((item.count / total) * 100) : 0 }));

  return (
    <div className="dashstack-card rounded-[28px] sm:rounded-[32px] border border-slate-200/70 dark:border-white/[0.08] bg-white/90 dark:bg-[#120E1E]/90 backdrop-blur-xl p-6 sm:p-7 space-y-4 h-full flex flex-col shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Content Distribution</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Catalog breakdown by category</p>
        </div>
         <div className="flex items-center gap-2">
           <span className="text-xs font-mono font-bold text-[#7C3AED]">{formatNum(total)} items</span>
           <ExportActions
             label="content distribution"
             onCsv={() => downloadCsv('ksubzone-content-distribution.csv', [['Category', 'Count', 'Percent'], ...items.map(item => [item.label, item.count, `${item.pct}%`])])}
             onPng={() => downloadSvgAsPng('ksubzone-content-distribution.png', distributionRef.current)}
           />
         </div>
      </div>

      {/* Stacked progress bar */}
       <svg ref={distributionRef} viewBox="0 0 500 16" className="h-3 w-full rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden" role="img" aria-label="Content distribution breakdown">
         {items.map((item, idx) => (
           <rect
             key={idx}
             x={`${items.slice(0, idx).reduce((sum, previous) => sum + previous.pct, 0) * 5}`}
             y="0"
             width={`${item.pct * 5}`}
             height="16"
             fill={item.color}
           />
         ))}
       </svg>

      {/* Legend */}
      <div className="flex-1 space-y-3 pt-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium flex-1">{item.label}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-16 h-1.5 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
              </div>
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-200 w-8 text-right">{item.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 3. Subtitle Queue (Deals Details Style) ─────────────────────────────────
function SubtitleQueueSection({ episodes, canManageDramas = false, onChanged }) {
  const [filter, setFilter] = useState('all');
  const [busyAction, setBusyAction] = useState('');
  const [rescheduleId, setRescheduleId] = useState(null);
  const [rescheduleValue, setRescheduleValue] = useState('');
  const toast = useToast();

  const filteredEpisodes = useMemo(() => {
    if (!episodes || episodes.length === 0) return [];
    if (filter === 'needs') return episodes.filter(ep => !ep.hasSubtitles && !ep.isUpcoming);
    if (filter === 'upcoming') return episodes.filter(ep => ep.isUpcoming);
    return episodes;
  }, [episodes, filter]);

  const missingCount = useMemo(() =>
    (episodes || []).filter(ep => !ep.hasSubtitles && !ep.isUpcoming).length, [episodes]);

  const tabs = [
    { id: 'all', label: 'All Episodes' },
    { id: 'needs', label: 'Needs Subtitle' },
    { id: 'upcoming', label: 'Upcoming' },
  ];

  const toDateTimeLocal = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (part) => String(part).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

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
    <div className="dashstack-card rounded-[28px] sm:rounded-[32px] border border-slate-200/70 dark:border-white/[0.08] bg-white/90 dark:bg-[#120E1E]/90 backdrop-blur-xl overflow-hidden shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4.5 border-b border-slate-200/60 dark:border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <Languages className="h-4 w-4 text-[#7C3AED]" />
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Subtitle Queue & Releases</h3>
          {missingCount > 0 && (
            <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-[10.5px] font-bold text-rose-600 dark:text-rose-400">
              {missingCount} missing
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-white/[0.06] border border-slate-200/60 dark:border-white/[0.08] rounded-xl p-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  filter === tab.id
                    ? 'bg-[#7C3AED] text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Link
            href="/management/dramas"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-[#7C3AED]/30 shadow-sm transition"
          >
            Manage Catalog <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-white/[0.05] max-h-[340px] overflow-y-auto admin-custom-scrollbar">
        {filteredEpisodes.length > 0 ? (
          filteredEpisodes.map(ep => {
            const now = new Date();
            const airDate = ep.airDate ? new Date(ep.airDate) : null;
            const daysUntil = airDate ? Math.ceil((airDate - now) / 86400000) : null;
            const formattedDate = airDate
              ? airDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : 'Date TBD';

            let countdownEl = null;
            if (daysUntil !== null) {
              if (ep.isUpcoming) {
                const label = daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'TOMORROW' : `In ${daysUntil}d`;
                countdownEl = (
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold bg-[#7C3AED]/15 text-[#7C3AED] border border-[#7C3AED]/30">
                    {label}
                  </span>
                );
              } else {
                const ago = Math.abs(daysUntil);
                countdownEl = (
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400">
                    {ago === 0 ? 'Today' : `${ago}d ago`}
                  </span>
                );
              }
            }

            let statusEl;
            if (ep.releaseStatus === 'Released') {
              statusEl = (
                <span className="rounded-full bg-[#10B981]/15 border border-[#10B981]/30 px-3 py-1 text-xs font-bold text-[#10B981] flex items-center gap-1">
                  <Check className="h-3 w-3" /> Released
                </span>
              );
            } else if (!ep.hasSubtitles) {
              statusEl = ep.isUpcoming ? (
                <span className="rounded-full bg-[#7C3AED]/15 border border-[#7C3AED]/30 px-3 py-1 text-xs font-bold text-[#7C3AED] dark:text-[#C084FC]">
                  Scheduled
                </span>
              ) : (
                <Link
                  href="/management/dramas"
                  className="rounded-full bg-rose-500/15 border border-rose-500/30 px-3 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/25 transition"
                >
                  + Add Subtitle
                </Link>
              );
            } else {
              statusEl = (
                <span className="rounded-full bg-[#10B981]/15 border border-[#10B981]/30 px-3 py-1 text-xs font-bold text-[#10B981] flex items-center gap-1">
                  <Check className="h-3 w-3" /> Ready
                </span>
              );
            }

            return (
              <div key={ep._id} className="flex items-center justify-between gap-3 px-6 py-3.5 hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#7C3AED]/15 text-[#7C3AED] flex-shrink-0">
                    <Clapperboard className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">{ep.dramaTitle}</p>
                      <span className="rounded-md bg-slate-100 dark:bg-white/[0.08] px-2 py-0.5 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 flex-shrink-0">
                        EP {ep.episodeNumber}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {formattedDate}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-shrink-0 flex-wrap justify-end">
                  {countdownEl}
                  {statusEl}
                  {canManageDramas && (
                    <div className="flex items-center gap-1.5 ml-1" aria-label={`Actions for ${ep.dramaTitle} episode ${ep.episodeNumber}`}>
                      {rescheduleId === ep._id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="datetime-local"
                            value={rescheduleValue}
                            onChange={(event) => setRescheduleValue(event.target.value)}
                            className="h-7 rounded-md border border-slate-200 bg-white px-1.5 text-[10px] text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200"
                            aria-label="New episode schedule"
                          />
                          <button type="button" onClick={() => reschedule(ep)} disabled={busyAction === `${ep._id}:reschedule`} className="inline-flex h-7 items-center rounded-md bg-[#7C3AED] px-2 text-[10px] font-bold text-white disabled:opacity-50">Save</button>
                          <button type="button" onClick={() => setRescheduleId(null)} className="inline-flex h-7 items-center rounded-md border border-slate-200 px-2 text-[10px] font-bold text-slate-500 dark:border-white/10 dark:text-slate-300">Cancel</button>
                        </div>
                      ) : (
                        <>
                          {ep.releaseStatus !== 'Released' && (
                            <button type="button" onClick={() => markReleased(ep)} disabled={busyAction === `${ep._id}:release`} className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-500/25 px-2 text-[10px] font-bold text-emerald-600 hover:bg-emerald-500/10 disabled:opacity-50" title="Mark released">
                              <Send className="h-3 w-3" /> Release
                            </button>
                          )}
                          <button type="button" onClick={() => { setRescheduleId(ep._id); setRescheduleValue(toDateTimeLocal(ep.airDate)); }} className="inline-flex h-7 items-center justify-center rounded-md border border-slate-200 px-2 text-slate-500 hover:border-[#7C3AED]/40 hover:text-[#7C3AED] dark:border-white/10 dark:text-slate-300" title="Reschedule episode" aria-label="Reschedule episode">
                            <CalendarClock className="h-3 w-3" />
                          </button>
                          <button type="button" onClick={() => deleteEpisode(ep)} disabled={busyAction === `${ep._id}:delete`} className="inline-flex h-7 items-center justify-center rounded-md border border-rose-500/25 px-2 text-rose-500 hover:bg-rose-500/10 disabled:opacity-50" title="Delete episode" aria-label="Delete episode">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
            No episodes pending subtitles in this view.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 4. Top Performing Content ───────────────────────────────────────────────
function TopPerformingContent({ content }) {
  const list = content.slice(0, 6);

  return (
    <div className="dashstack-card rounded-[28px] sm:rounded-[32px] border border-slate-200/70 dark:border-white/[0.08] bg-white/90 dark:bg-[#120E1E]/90 backdrop-blur-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-200/60 dark:border-white/[0.06]">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Top Performing Content</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Highest engaged movies and series</p>
        </div>
        <Link
          href="/management/movies"
          className="text-xs font-bold text-[#7C3AED] hover:underline transition flex items-center gap-1"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[auto_1fr_auto] gap-3 px-6 py-3 border-b border-slate-200/60 dark:border-white/[0.06] bg-slate-50/80 dark:bg-white/[0.02] text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        <span className="w-5">#</span>
        <span>Content</span>
        <span>Views</span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-white/[0.05]">
        {list.length > 0 ? (
          list.map((media, idx) => (
            <div key={idx} className="grid grid-cols-[auto_1fr_auto] gap-3 items-center px-6 py-3.5 hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors group">
              <span className="w-5 text-xs font-mono font-bold text-slate-400 dark:text-slate-500 text-center">{idx + 1}</span>

              <div className="flex items-center gap-3.5 min-w-0">
                <div className="h-11 w-8 rounded-lg overflow-hidden bg-slate-100 dark:bg-white/[0.05] border border-slate-200/70 dark:border-white/[0.08] flex-shrink-0 shadow-sm">
                  {media.poster ? (
                    <img src={media.poster} alt={media.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-400">
                      <Film className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-[#7C3AED] transition">
                    {media.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="rounded-md bg-slate-100 dark:bg-white/[0.08] px-1.5 py-0.5 text-[9.5px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                      {media.type}
                    </span>
                    <span className="text-[11px] font-semibold text-[#F59E0B]">★ {media.tmdbRating || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm font-black font-mono text-slate-900 dark:text-white">{formatNum(media.viewCount)}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">views</p>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
            No performance data available yet.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 5. Recent Activity ──────────────────────────────────────────────────────
function RecentActivityTimeline({ latestDownloads }) {
  const items = latestDownloads.slice(0, 6);

  return (
    <div className="dashstack-card rounded-[28px] sm:rounded-[32px] border border-slate-200/70 dark:border-white/[0.08] bg-white/90 dark:bg-[#120E1E]/90 backdrop-blur-xl p-6 sm:p-7 space-y-4 h-full shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Recent Activity</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Latest subtitle downloads</p>
        </div>
        <Clock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
      </div>

      <div className="space-y-3.5 pt-1">
        {items.length > 0 ? (
          items.map((sub, idx) => (
            <div key={idx} className="flex items-start gap-3 text-xs">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl bg-[#7C3AED]/15 text-[#7C3AED] mt-0.5">
                <Download className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-900 dark:text-white font-bold truncate">
                  {sub.media?.title || 'Sinhala Subtitle'}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  {sub.language || 'Sinhala'} · {formatRelativeTime(sub.lastDownloadedAt)}
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-[#7C3AED] flex-shrink-0">
                {sub.downloads || 0}
              </span>
            </div>
          ))
        ) : (
          <div className="py-10 text-center text-xs text-slate-400 dark:text-slate-500">
            No recent activity recorded.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 5.5 Storage & Egress Observability Panel ────────────────────────────────
function StorageObservabilityPanel({ storageStats }) {
  if (!storageStats) return null;
  const isR2 = storageStats.activeProvider === 'r2';
  const progress = Number(storageStats.migrationProgressPercent || 0);

  return (
    <div className="dashstack-card rounded-[28px] sm:rounded-[32px] border border-slate-200/70 dark:border-white/[0.08] bg-white/90 dark:bg-[#120E1E]/90 backdrop-blur-xl p-6 sm:p-7 space-y-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/70 dark:border-white/[0.07]">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${isR2 ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/15 text-amber-600'}`}>
            <Cloud className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Cloudflare R2 & Egress Optimization</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider ${isR2 ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-600 border border-amber-500/30'}`}>
                {isR2 ? 'R2 Active' : 'Supabase Fallback'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Zero egress costs: Subtitle files are delivered via Cloudflare R2 Standard without depleting Supabase bandwidth.
            </p>
          </div>
        </div>
        <Link
          href="/management/subtitles"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#8A2BE2] bg-[#8A2BE2]/10 hover:bg-[#8A2BE2]/20 transition-colors self-start sm:self-auto"
        >
          Manage Subtitles <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-[22px] border border-slate-200/70 dark:border-white/[0.07] bg-slate-50/70 dark:bg-white/[0.03] p-4 backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">R2 Standard</p>
          <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">{storageStats.r2Count ?? 0}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Zero egress fees</p>
        </div>
        <div className="rounded-[22px] border border-slate-200/70 dark:border-white/[0.07] bg-slate-50/70 dark:bg-white/[0.03] p-4 backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Supabase Legacy</p>
          <p className="text-xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">{storageStats.supabaseCount ?? 0}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Legacy objects</p>
        </div>
        <div className="rounded-[22px] border border-slate-200/70 dark:border-white/[0.07] bg-slate-50/70 dark:bg-white/[0.03] p-4 backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Migration Status</p>
          <p className="text-xl font-black font-mono text-[#8A2BE2] mt-1">{progress}%</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Offloaded to R2</p>
        </div>
        <div className="rounded-[22px] border border-slate-200/70 dark:border-white/[0.07] bg-slate-50/70 dark:bg-white/[0.03] p-4 backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Edge Cache</p>
          <p className="text-xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1">{storageStats.edgeCacheStatus || 'Not reported'}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{storageStats.edgeCacheProvider || 'CDN telemetry unavailable'}</p>
        </div>
      </div>

      <div className="pt-2">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-semibold text-slate-600 dark:text-slate-300">Subtitle Storage Migration</span>
          <span className="font-mono text-slate-500">{storageStats.r2Count} of {storageStats.totalSubtitles} files</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/[0.07] overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#8A2BE2] to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      </div>
    </div>
  );
}

// ─── 6. System Health Panel ──────────────────────────────────────────────────
function SystemHealthPanel({ health, seoScore, onClearCache, clearingCache }) {
  const statusDot = (ok) => (
    <span className={`h-2 w-2 rounded-full flex-shrink-0 ${ok === null ? 'bg-slate-400' : ok ? 'bg-[#10B981]' : 'bg-[#F59E0B]'}`} />
  );

  const healthItems = [
    { label: 'SEO Score',    value: `${seoScore} / 100`,   sub: 'Schema Validated',       ok: seoScore >= 90, color: 'text-[#10B981]' },
    { label: 'Database',     value: health?.dbStatus === 'ok' ? 'Connected' : 'Unavailable', sub: `Driver: ${(health?.dbDriver || '—').toUpperCase()}`, ok: health?.dbStatus === 'ok' },
    { label: 'API Runtime',  value: health?.apiStatus === 'ok' ? `PHP ${health?.phpVersion?.slice(0, 5) || '—'}` : 'Unavailable', sub: health?.apiStatus === 'ok' ? 'REST API Ready' : 'Check server logs', ok: health?.apiStatus === undefined ? null : health.apiStatus === 'ok' },
    { label: 'Server Time',  value: health?.serverTime?.split(' ')[1]?.slice(0, 5) || '—', sub: health?.timezone || 'Timezone unavailable', ok: health?.serverTime ? true : null },
    { label: 'Sitemap Index', value: health?.sitemapStatus === 'ok' ? 'Healthy' : 'Not checked', sub: health?.sitemapStatus === 'ok' ? 'SEO endpoint available' : 'Open SEO & Config to verify', ok: health?.sitemapStatus === undefined ? null : health.sitemapStatus === 'ok', color: 'text-[#7C3AED]' },
  ];

  return (
    <div className="admin-system-panel dashstack-card rounded-[28px] sm:rounded-[32px] border border-slate-200/70 dark:border-white/[0.08] bg-white/90 dark:bg-[#120E1E]/90 backdrop-blur-xl p-6 sm:p-7 space-y-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#7C3AED]/15 text-[#7C3AED]">
            <Server className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">System & SEO Telemetry</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Database, runtime health, and caching engine</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClearCache}
          disabled={clearingCache}
          className="flex items-center gap-2 rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] px-4 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.08] hover:border-[#7C3AED]/30 shadow-sm transition disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${clearingCache ? 'animate-spin' : ''}`} />
          <span>{clearingCache ? 'Clearing…' : 'Purge Cache'}</span>
        </button>
      </div>

      <div className="admin-health-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {healthItems.map((item, idx) => (
          <div key={idx} className="rounded-[22px] border border-slate-200/70 dark:border-white/[0.07] bg-slate-50/70 dark:bg-white/[0.03] p-4.5 space-y-1.5 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              {statusDot(item.ok)}
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{item.label}</p>
            </div>
            <p className={`text-lg font-black font-mono ${item.color || 'text-slate-900 dark:text-white'}`}>{item.value}</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight">{item.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
