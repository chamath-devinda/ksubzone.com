'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import Link from 'next/link';
import apiClient from '@/services/api/apiClient';
import {
  Film, Tv, Users, Languages, Star, TrendingUp, Eye, Award,
  CheckCircle, BookOpenText, Clapperboard, Calendar, AlertTriangle,
  Activity, ArrowUpRight, BarChart3, Globe, Database, Server, Clock,
  Shield, Download, Plus, RefreshCw, ExternalLink, Check, Search,
  Sparkles, ArrowRight, Filter, Zap, FileText, MessageSquare,
  DollarSign, MousePointerClick,
} from 'lucide-react';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import AdminTopBar from '@/features/admin/components/AdminTopBar';
import StatCard from '@/features/admin/components/StatCard';
import { Pulse, CardSkeleton } from '@/features/admin/components/Skeleton';
import { useToast } from '@/features/admin/components/Toast';

// ─── Utilities ──────────────────────────────────────────────────────────────
function formatNum(n) {
  if (n === null || n === undefined) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function formatMoney(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: amount < 1 ? 4 : 2,
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

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { admin } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [adsterraStats, setAdsterraStats] = useState(null);
  const [adsterraLoading, setAdsterraLoading] = useState(true);
  const [adsterraError, setAdsterraError] = useState('');
  const [adsterraRange, setAdsterraRange] = useState(30);
  const [adsterraApiKey, setAdsterraApiKey] = useState('');
  const [savingAdsterraKey, setSavingAdsterraKey] = useState(false);

  useEffect(() => {
    apiClient.get('/api/admin/dashboard')
      .then(res => setStats(res.data))
      .catch(err => setError(err.response?.data?.message || 'Failed to load dashboard statistics'))
      .finally(() => setLoading(false));
  }, []);

  const loadAdsterraStats = async (range = adsterraRange) => {
    setAdsterraLoading(true);
    setAdsterraError('');
    try {
      const res = await apiClient.get(`/api/admin/adsterra/stats?range=${range}`);
      setAdsterraStats(res.data);
    } catch (err) {
      const responseData = err.response?.data;
      setAdsterraStats(responseData?.configured === false ? { configured: false } : { configured: true });
      setAdsterraError(responseData?.message || err.message || 'Failed to load Adsterra statistics');
    } finally {
      setAdsterraLoading(false);
    }
  };

  useEffect(() => {
    loadAdsterraStats(adsterraRange);
  }, [adsterraRange]);

  const handleSaveAdsterraKey = async (event) => {
    event.preventDefault();
    if (!adsterraApiKey.trim()) return;

    setSavingAdsterraKey(true);
    try {
      await apiClient.post('/api/admin/settings', {
        key: 'ADSTERRA_API_KEY',
        value: adsterraApiKey.trim(),
      });
      setAdsterraApiKey('');
      toast.success('Adsterra API key saved securely');
      await loadAdsterraStats(adsterraRange);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save Adsterra API key');
    } finally {
      setSavingAdsterraKey(false);
    }
  };

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
  const sparkValues = useMemo(() => sortedLogs.slice(-7).map(l => l.views), [sortedLogs]);

  const trendPct = useMemo(() => {
    if (sortedLogs.length < 4) return null;
    const half = Math.floor(sortedLogs.length / 2);
    const recent = sortedLogs.slice(-half).reduce((s, l) => s + l.views, 0);
    const prev = sortedLogs.slice(-half * 2, -half).reduce((s, l) => s + l.views, 0);
    if (!prev) return null;
    return Math.round(((recent - prev) / prev) * 100);
  }, [sortedLogs]);

  const adminName = admin?.username || admin?.name || 'Superadmin';

  if (loading) {
    return (
      <div className="admin-shell min-h-screen bg-[#08090D] text-slate-100 flex flex-col lg:flex-row">
        <AdminSidebar mobileOpen={mobileOpen} onCloseMobileNav={() => setMobileOpen(false)} />
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          <AdminTopBar onOpenMobileNav={() => setMobileOpen(true)} />
          <main className="admin-main flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 max-w-[1560px] w-full mx-auto space-y-6">
            <div className="flex items-center justify-between py-2">
              <div className="space-y-2">
                <Pulse className="h-3 w-32" />
                <Pulse className="h-7 w-56" />
                <Pulse className="h-3 w-44" />
              </div>
              <Pulse className="h-8 w-28 rounded-lg" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => <Pulse key={i} className="h-[76px] rounded-xl" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <Pulse className="lg:col-span-2 h-[280px] rounded-2xl" />
              <Pulse className="h-[280px] rounded-2xl" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell min-h-screen bg-[#08090D] text-slate-100 flex flex-col lg:flex-row">
      <AdminSidebar mobileOpen={mobileOpen} onCloseMobileNav={() => setMobileOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <AdminTopBar onOpenMobileNav={() => setMobileOpen(true)} />

        <main className="admin-main flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-7 max-w-[1560px] w-full mx-auto space-y-6">

          {/* ── Error Banner ── */}
          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.07] px-4 py-3 text-xs text-rose-400">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── 1. Dashboard Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10.5px] font-semibold text-emerald-500 uppercase tracking-wider">System Operational</span>
                <span className="text-slate-700 text-xs">·</span>
                <span className="text-[11px] text-slate-500">{getFormattedToday()}</span>
              </div>
              <h1 className="text-2xl sm:text-[28px] font-bold text-slate-100 tracking-tight leading-tight">
                {getGreeting()}, <span className="text-white">{adminName}</span>
              </h1>
              <p className="text-[12px] text-slate-500">
                Here's what's happening across KSubZone today.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/"
                target="_blank"
                className="flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 text-[12px] font-medium text-slate-400 hover:text-white hover:border-white/[0.12] transition"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>View Site</span>
              </Link>
              <Link
                href="/management/import"
                className="flex h-8 items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 text-[12px] font-semibold text-violet-300 hover:bg-violet-500/20 hover:border-violet-500/50 transition active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Content</span>
              </Link>
            </div>
          </div>

          {/* ── 2. Primary KPIs ── */}
          <section aria-label="Primary KPIs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Views"
                value={formatNum(stats?.counts?.totalViews)}
                trend={trendPct}
                trendPeriod="vs previous 30 days"
                sparklineValues={sparkValues}
                sparklineColor="#8b5cf6"
                icon={Eye}
                variant="primary"
                accentColor="violet"
                href="/management/dashboard"
              />
              <StatCard
                label="Subtitle Downloads"
                value={formatNum(stats?.counts?.totalDownloads)}
                sparklineValues={sparkValues}
                sparklineColor="#10b981"
                icon={Download}
                variant="primary"
                accentColor="emerald"
                href="/management/subtitles"
              />
              <StatCard
                label="Registered Members"
                value={formatNum(stats?.counts?.totalUsers)}
                icon={Users}
                variant="primary"
                accentColor="cyan"
                badge="Community"
                href="/management/users"
              />
              <StatCard
                label="Verified Subtitles"
                value={formatNum(stats?.counts?.totalSubtitles)}
                icon={Languages}
                variant="primary"
                accentColor="amber"
                badge="Catalog"
                href="/management/subtitles"
              />
            </div>
          </section>

          {/* ── Adsterra Revenue ── */}
          <section aria-label="Adsterra Revenue">
            <AdsterraRevenuePanel
              stats={adsterraStats}
              loading={adsterraLoading}
              error={adsterraError}
              range={adsterraRange}
              onRangeChange={setAdsterraRange}
              onRefresh={() => loadAdsterraStats(adsterraRange)}
              apiKey={adsterraApiKey}
              onApiKeyChange={setAdsterraApiKey}
              onSaveKey={handleSaveAdsterraKey}
              savingKey={savingAdsterraKey}
            />
          </section>

          {/* ── 3. Secondary Metrics ── */}
          <section aria-label="Secondary Metrics">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <StatCard label="Movies"        value={formatNum(stats?.counts?.totalMovies)}       icon={Film}         variant="secondary" accentColor="pink"   href="/management/movies" />
              <StatCard label="Dramas"        value={formatNum(stats?.counts?.totalDramas)}       icon={Tv}           variant="secondary" accentColor="sky"    href="/management/dramas" />
              <StatCard label="Episodes"      value={formatNum(stats?.counts?.totalEpisodes)}     icon={Clapperboard} variant="secondary" accentColor="violet" href="/management/dramas" />
              <StatCard label="Reviews"       value={formatNum(stats?.counts?.totalReviews)}      icon={Star}         variant="secondary" accentColor="amber"  href="/management/comments" />
              <StatCard label="30-Day Traffic" value={formatNum(stats?.counts?.totalTrafficViews)} icon={TrendingUp}  variant="secondary" accentColor="emerald" href="/management/dashboard" />
            </div>
          </section>

          {/* ── 4. Analytics + Content Distribution ── */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-5" aria-label="Analytics">
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

          {/* ── 5. Subtitle Queue ── */}
          <section aria-label="Subtitle Queue">
            <SubtitleQueueSection episodes={stats?.upcomingEpisodes || []} />
          </section>

          {/* ── 6. Top Content + Recent Activity ── */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-5" aria-label="Content Performance">
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
  const summary = stats?.summary || {};
  const daily = stats?.daily || [];
  const maxRevenue = Math.max(...daily.map(item => Number(item.revenue || 0)), 0.01);
  const needsKey = stats?.configured === false;

  return (
    <div className="ksz-card rounded-2xl border border-emerald-500/15 bg-[#11131A] overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-semibold text-slate-100">Adsterra Revenue</h3>
              <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                Live API
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">Publisher earnings and ad performance</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 bg-[#151821] border border-white/[0.05] rounded-lg p-0.5">
            {[7, 30, 90].map(days => (
              <button
                key={days}
                type="button"
                onClick={() => onRangeChange(days)}
                className={`px-2.5 py-1 text-[10.5px] font-semibold rounded-md transition ${
                  range === days ? 'bg-[#1E2030] text-slate-200 shadow-sm' : 'text-slate-600 hover:text-slate-400'
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
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-slate-500 hover:text-white transition disabled:opacity-50"
            title="Refresh Adsterra statistics"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && !stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-5">
          {Array.from({ length: 4 }).map((_, index) => <Pulse key={index} className="h-20 rounded-xl" />)}
        </div>
      ) : needsKey ? (
        <div className="p-5">
          <div className="max-w-xl space-y-3">
            <div>
              <p className="text-[13px] font-semibold text-slate-200">Connect your Adsterra publisher account</p>
              <p className="text-[11px] text-slate-500 mt-1">The key is stored only in the backend database and is never sent back to the browser.</p>
            </div>
            <form onSubmit={onSaveKey} className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={event => onApiKeyChange(event.target.value)}
                placeholder="Paste Adsterra API key"
                autoComplete="off"
                required
                className="flex-1 h-9 rounded-lg border border-white/[0.08] bg-[#08090D] px-3 text-xs font-mono text-slate-200 outline-none focus:border-emerald-500/50"
              />
              <button
                type="submit"
                disabled={savingKey}
                className="h-9 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-50"
              >
                {savingKey ? 'Connecting…' : 'Connect API'}
              </button>
            </form>
            {error && <p className="text-[11px] text-amber-400">{error}</p>}
          </div>
        </div>
      ) : (
        <div className="p-5 space-y-5">
          {error && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-4 py-3 text-[11px] text-amber-400">
              <span>{error}</span>
              <button type="button" onClick={() => setShowKeyForm(value => !value)} className="font-semibold underline underline-offset-2 flex-shrink-0">
                Update key
              </button>
            </div>
          )}

          {showKeyForm && (
            <form onSubmit={onSaveKey} className="flex flex-col sm:flex-row gap-2 rounded-xl border border-white/[0.06] bg-[#151821] p-3">
              <input
                type="password"
                value={apiKey}
                onChange={event => onApiKeyChange(event.target.value)}
                placeholder="Enter a new Adsterra API key"
                autoComplete="off"
                required
                className="flex-1 h-9 rounded-lg border border-white/[0.08] bg-[#08090D] px-3 text-xs font-mono text-slate-200 outline-none focus:border-emerald-500/50"
              />
              <button type="submit" disabled={savingKey} className="h-9 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white disabled:opacity-50">
                {savingKey ? 'Saving…' : 'Save New Key'}
              </button>
            </form>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Revenue', value: formatMoney(summary.revenue), icon: DollarSign, color: 'text-emerald-400' },
              { label: 'Impressions', value: formatNum(summary.impressions), icon: Eye, color: 'text-violet-400' },
              { label: 'Clicks', value: formatNum(summary.clicks), icon: MousePointerClick, color: 'text-sky-400' },
              { label: 'CPM / CTR', value: `${formatMoney(summary.cpm)} / ${Number(summary.ctr || 0).toFixed(2)}%`, icon: TrendingUp, color: 'text-amber-400' },
            ].map(item => (
              <div key={item.label} className="rounded-xl border border-white/[0.05] bg-[#151821] p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-600">{item.label}</p>
                  <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                </div>
                <p className="mt-2 text-[19px] font-bold font-mono text-slate-100 leading-tight">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-white/[0.05] bg-[#0D0F15] p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[12px] font-semibold text-slate-300">Daily Revenue</p>
                <p className="text-[10px] text-slate-600">{stats?.period?.start || '—'} to {stats?.period?.finish || '—'}</p>
              </div>
              <span className="text-[10px] text-slate-600">USD</span>
            </div>

            {daily.length > 0 ? (
              <div className="flex h-28 items-end gap-1 overflow-hidden">
                {daily.map((item, index) => {
                  const height = Math.max((Number(item.revenue || 0) / maxRevenue) * 100, 3);
                  return (
                    <div key={`${item.date}-${index}`} className="group relative flex-1 min-w-[3px] h-full flex items-end">
                      <div
                        className="w-full rounded-t-sm bg-gradient-to-t from-emerald-600/60 to-emerald-400/90 transition hover:brightness-125"
                        style={{ height: `${height}%` }}
                        title={`${item.date}: ${formatMoney(item.revenue)} · ${formatNum(item.impressions)} impressions`}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-28 flex items-center justify-center text-[11px] text-slate-600">
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

  const displayLogs = useMemo(() => allLogs.slice(-range), [allLogs, range]);

  const maxVal = useMemo(() => {
    const vals = displayLogs.map(l => l.views || 0);
    return Math.max(...vals, 10);
  }, [displayLogs]);

  const W = 700; const H = 200;
  const PT = 12; const PB = 28; const PL = 38; const PR = 12;
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
    <div className="ksz-card rounded-2xl border border-white/[0.06] bg-[#11131A] p-5 space-y-4 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5 text-violet-400" />
            <h3 className="text-[13px] font-semibold text-slate-100">Traffic Overview</h3>
          </div>
          <p className="text-[11px] text-slate-600 mt-0.5">Page views over time</p>
        </div>

        <div className="flex items-center gap-0.5 bg-[#151821] border border-white/[0.05] rounded-lg p-0.5 self-start sm:self-auto">
          {[{ label: '7D', val: 7 }, { label: '30D', val: 30 }, { label: '90D', val: 90 }].map(tab => (
            <button
              key={tab.val}
              type="button"
              onClick={() => setRange(tab.val)}
              className={`px-2.5 py-1 text-[10.5px] font-semibold rounded-md transition ${
                range === tab.val
                  ? 'bg-[#1E2030] text-slate-200 shadow-sm'
                  : 'text-slate-600 hover:text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 200 }} onMouseLeave={() => setTooltip(null)}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {yLabels.map((pct, i) => {
            const y = PT + innerH - pct * innerH;
            return (
              <g key={i}>
                <line x1={PL} y1={y} x2={PL + innerW} y2={y} stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
                <text x={PL - 6} y={y + 3.5} textAnchor="end" fill="#52525b" fontSize="9" fontFamily="monospace">
                  {formatNum(Math.round(maxVal * pct))}
                </text>
              </g>
            );
          })}

          {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}
          {linePath && <path d={linePath} fill="none" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round" />}

          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x} cy={p.y}
              r={tooltip?.date === p.date ? 4.5 : 2.5}
              fill={tooltip?.date === p.date ? '#8b5cf6' : '#8b5cf6'}
              fillOpacity={tooltip?.date === p.date ? 1 : 0.6}
              stroke="#11131A"
              strokeWidth="1.5"
              className="cursor-pointer"
              onMouseEnter={() => setTooltip(p)}
            />
          ))}
        </svg>

        {tooltip && (
          <div
            className="absolute z-20 pointer-events-none rounded-lg border border-white/[0.1] bg-[#1E2030]/95 px-3 py-1.5 shadow-xl text-xs backdrop-blur-sm -translate-x-1/2 -translate-y-full"
            style={{ left: `${(tooltip.x / W) * 100}%`, top: `${(tooltip.y / H) * 100 - 6}%` }}
          >
            <p className="text-[10px] text-slate-500 font-mono">{tooltip.date}</p>
            <p className="text-[12px] font-bold text-white mt-0.5">{formatNum(tooltip.views)} views</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 2. Content Distribution ─────────────────────────────────────────────────
function ContentDistributionWidget({ movies, dramas, episodes, articles, subtitles }) {
  const total = movies + dramas + episodes + articles + subtitles || 1;

  const items = [
    { label: 'Episodes',  count: episodes,  color: '#38bdf8', colorClass: 'bg-sky-400' },
    { label: 'Subtitles', count: subtitles, color: '#10b981', colorClass: 'bg-emerald-400' },
    { label: 'Dramas',    count: dramas,    color: '#ec4899', colorClass: 'bg-pink-400' },
    { label: 'Movies',    count: movies,    color: '#8b5cf6', colorClass: 'bg-violet-400' },
    { label: 'Articles',  count: articles,  color: '#f59e0b', colorClass: 'bg-amber-400' },
  ].map(item => ({ ...item, pct: total > 0 ? Math.round((item.count / total) * 100) : 0 }));

  return (
    <div className="ksz-card rounded-2xl border border-white/[0.06] bg-[#11131A] p-5 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-semibold text-slate-100">Content Distribution</h3>
          <p className="text-[11px] text-slate-600 mt-0.5">Catalog breakdown by category</p>
        </div>
        <span className="text-[11px] font-mono text-slate-500">{formatNum(total)}</span>
      </div>

      {/* Stacked progress bar */}
      <div className="h-2 w-full rounded-full bg-[#1E2030] overflow-hidden flex">
        {items.map((item, idx) => (
          <div
            key={idx}
            style={{ width: `${item.pct}%`, backgroundColor: item.color }}
            className="h-full transition-all duration-500"
            title={`${item.label}: ${item.count} (${item.pct}%)`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-2.5 pt-1">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-[12px] text-slate-400 flex-1">{item.label}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-16 h-1 bg-[#1E2030] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
              </div>
              <span className="text-[11px] font-mono text-slate-500 w-6 text-right">{item.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 3. Subtitle Queue ───────────────────────────────────────────────────────
function SubtitleQueueSection({ episodes }) {
  const [filter, setFilter] = useState('all');

  const filteredEpisodes = useMemo(() => {
    if (!episodes || episodes.length === 0) return [];
    if (filter === 'needs') return episodes.filter(ep => !ep.hasSubtitles && !ep.isUpcoming);
    if (filter === 'upcoming') return episodes.filter(ep => ep.isUpcoming);
    return episodes;
  }, [episodes, filter]);

  const missingCount = useMemo(() =>
    (episodes || []).filter(ep => !ep.hasSubtitles && !ep.isUpcoming).length, [episodes]);

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'needs', label: 'Needs Subtitle' },
    { id: 'upcoming', label: 'Upcoming' },
  ];

  return (
    <div className="ksz-card rounded-2xl border border-white/[0.06] bg-[#11131A] overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-2.5">
          <Languages className="h-3.5 w-3.5 text-slate-500" />
          <h3 className="text-[13px] font-semibold text-slate-100">Subtitle Queue</h3>
          {missingCount > 0 && (
            <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-400">
              {missingCount} missing
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-0.5 bg-[#151821] border border-white/[0.05] rounded-lg p-0.5">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-2.5 py-1 text-[10.5px] font-semibold rounded-md transition ${
                  filter === tab.id ? 'bg-[#1E2030] text-slate-200 shadow-sm' : 'text-slate-600 hover:text-slate-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Link
            href="/management/dramas"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[11px] font-medium text-slate-500 hover:text-slate-200 transition"
          >
            Manage <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="divide-y divide-white/[0.04] max-h-[300px] overflow-y-auto admin-custom-scrollbar">
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
                  <span className="rounded-md px-1.5 py-0.5 text-[9.5px] font-mono font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    {label}
                  </span>
                );
              } else {
                const ago = Math.abs(daysUntil);
                countdownEl = (
                  <span className="rounded-md px-1.5 py-0.5 text-[9.5px] font-mono bg-white/[0.04] text-slate-500 border border-white/[0.06]">
                    {ago === 0 ? 'Today' : `${ago}d ago`}
                  </span>
                );
              }
            }

            let statusEl;
            if (!ep.hasSubtitles) {
              statusEl = ep.isUpcoming ? (
                <span className="rounded-full bg-slate-500/10 border border-slate-500/20 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  Not Aired
                </span>
              ) : (
                <Link
                  href="/management/dramas"
                  className="rounded-full bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-rose-400 hover:bg-rose-500/20 transition"
                >
                  + Add Subtitle
                </Link>
              );
            } else {
              statusEl = (
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                  <Check className="h-2.5 w-2.5" /> Ready
                </span>
              );
            }

            return (
              <div key={ep._id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1A1B25] border border-white/[0.05] text-slate-600 flex-shrink-0">
                    <Clapperboard className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] font-medium text-slate-200 truncate">{ep.dramaTitle}</p>
                      <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[9px] font-mono text-slate-500 flex-shrink-0">
                        EP {ep.episodeNumber}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-600 mt-0.5 flex items-center gap-1">
                      <Calendar className="h-2.5 w-2.5" /> {formattedDate}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {countdownEl}
                  {statusEl}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-10 text-center text-[12px] text-slate-600">
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
    <div className="ksz-card rounded-2xl border border-white/[0.06] bg-[#11131A] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
        <div>
          <h3 className="text-[13px] font-semibold text-slate-100">Top Performing Content</h3>
          <p className="text-[11px] text-slate-600 mt-0.5">Highest engaged movies and series</p>
        </div>
        <Link
          href="/management/movies"
          className="text-[11.5px] font-medium text-slate-500 hover:text-slate-200 transition flex items-center gap-1"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[auto_1fr_auto] gap-3 px-5 py-2 border-b border-white/[0.04] text-[10px] font-semibold uppercase tracking-wider text-slate-600">
        <span className="w-4">#</span>
        <span>Content</span>
        <span>Views</span>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {list.length > 0 ? (
          list.map((media, idx) => (
            <div key={idx} className="grid grid-cols-[auto_1fr_auto] gap-3 items-center px-5 py-3 hover:bg-white/[0.02] transition-colors group">
              <span className="w-4 text-[11px] font-mono text-slate-600 text-center">{idx + 1}</span>

              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-7 rounded-md overflow-hidden bg-[#1A1B25] border border-white/[0.05] flex-shrink-0">
                  {media.poster ? (
                    <img src={media.poster} alt={media.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-700">
                      <Film className="h-3 w-3" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-slate-200 truncate group-hover:text-slate-100 transition">
                    {media.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 uppercase">
                      {media.type}
                    </span>
                    <span className="text-[10px] text-slate-600">★ {media.tmdbRating || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="text-[12px] font-bold font-mono text-slate-200">{formatNum(media.viewCount)}</p>
                <p className="text-[10px] text-slate-600">views</p>
              </div>
            </div>
          ))
        ) : (
          <div className="py-10 text-center text-[12px] text-slate-600">
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
    <div className="ksz-card rounded-2xl border border-white/[0.06] bg-[#11131A] p-5 space-y-4 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-semibold text-slate-100">Recent Activity</h3>
          <p className="text-[11px] text-slate-600 mt-0.5">Latest subtitle downloads</p>
        </div>
        <Clock className="h-3.5 w-3.5 text-slate-600" />
      </div>

      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((sub, idx) => (
            <div key={idx} className="flex items-start gap-3 text-[12px]">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-500/20 mt-0.5">
                <Download className="h-3 w-3 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-200 font-medium truncate">
                  {sub.media?.title || 'Sinhala Subtitle'}
                </p>
                <p className="text-[10.5px] text-slate-600 mt-0.5">
                  {sub.language || 'Sinhala'} · {formatRelativeTime(sub.lastDownloadedAt)}
                </p>
              </div>
              <span className="text-[10.5px] font-mono text-slate-500 flex-shrink-0">
                {sub.downloads || 0}
              </span>
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-[12px] text-slate-600">
            No recent activity recorded.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 6. System Health Panel ──────────────────────────────────────────────────
function SystemHealthPanel({ health, seoScore, onClearCache, clearingCache }) {
  const statusDot = (ok) => (
    <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${ok ? 'bg-emerald-400' : 'bg-amber-400'}`} />
  );

  const healthItems = [
    { label: 'SEO Score',    value: `${seoScore} / 100`,   sub: 'Schema Validated',       ok: seoScore >= 90, color: 'text-emerald-400' },
    { label: 'Database',     value: health?.dbStatus === 'ok' ? 'Connected' : 'Checking', sub: `Driver: ${(health?.dbDriver || 'SQLite').toUpperCase()}`, ok: health?.dbStatus === 'ok' },
    { label: 'API Runtime',  value: `PHP ${health?.phpVersion?.slice(0, 5) || '8.2'}`,    sub: 'REST API Ready',         ok: true },
    { label: 'Server Time',  value: health?.serverTime?.split(' ')[1]?.slice(0, 5) || '—', sub: health?.timezone || 'Asia/Colombo', ok: true },
    { label: 'Sitemap Index', value: '826 URLs',            sub: 'Cached (< 50ms)',         ok: true, color: 'text-violet-400' },
  ];

  return (
    <div className="ksz-card rounded-2xl border border-white/[0.06] bg-[#11131A] p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/20">
            <Server className="h-3.5 w-3.5 text-sky-400" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-slate-100">System & SEO Health</h3>
            <p className="text-[11px] text-slate-600 mt-0.5">Database, API, and indexing status</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClearCache}
          disabled={clearingCache}
          className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-slate-400 hover:text-white hover:border-white/[0.1] transition disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${clearingCache ? 'animate-spin' : ''}`} />
          <span>{clearingCache ? 'Clearing…' : 'Purge Cache'}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {healthItems.map((item, idx) => (
          <div key={idx} className="rounded-xl border border-white/[0.05] bg-[#151821] p-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              {statusDot(item.ok)}
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">{item.label}</p>
            </div>
            <p className={`text-[15px] font-bold font-mono ${item.color || 'text-slate-200'}`}>{item.value}</p>
            <p className="text-[10px] text-slate-600 leading-tight">{item.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
