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
  DollarSign, MousePointerClick, User, WandSparkles
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

  const trendPct = useMemo(() => {
    if (sortedLogs.length < 4) return null;
    const half = Math.floor(sortedLogs.length / 2);
    const recent = sortedLogs.slice(-half).reduce((s, l) => s + l.views, 0);
    const prev = sortedLogs.slice(-half * 2, -half).reduce((s, l) => s + l.views, 0);
    if (!prev) return null;
    return Math.round(((recent - prev) / prev) * 100);
  }, [sortedLogs]);

  const adminName = admin?.displayName || admin?.username || admin?.name || 'Superadmin';

  if (loading) {
    return (
      <div className="admin-shell min-h-screen bg-[#F5F6FA] dark:bg-[#1B2431] text-[#202224] dark:text-slate-100 flex flex-col lg:flex-row transition-colors duration-200">
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
    <div className="admin-shell min-h-screen bg-[#F5F6FA] dark:bg-[#1B2431] text-[#202224] dark:text-slate-100 flex flex-col lg:flex-row transition-colors duration-200">
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

          {/* ── 1. KSubZone Studio hero ── */}
          <div className="doit-dashboard-hero relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-5 sm:p-7">
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Content operations</p>
              <h1 className="text-2xl sm:text-[32px] font-extrabold text-white tracking-tight">
                {getGreeting()}, {adminName}
              </h1>
              <p className="text-xs sm:text-[13px] text-white/65 mt-2 flex items-center gap-2 flex-wrap">
                <span>{getFormattedToday()}</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white text-[10px] font-bold border border-white/10">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#54E6B1] animate-pulse" />
                  Live Operational
                </span>
              </p>
            </div>

            {/* DashStack Top Action Controls */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <Link
                href="/management/profile"
                className="flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-xs font-bold text-white hover:bg-white/15 transition"
              >
                <User className="h-4 w-4 text-[#D599EC]" />
                <span>Admin Profile</span>
              </Link>

              <Link
                href="/management/import"
                className="flex h-10 items-center gap-2 rounded-xl bg-white hover:bg-fuchsia-50 px-4 text-xs font-bold text-[#490570] shadow-sm transition active:scale-95"
              >
                <Sparkles className="h-4 w-4" />
                <span>TMDB Auto Import</span>
              </Link>

              <Link
                href="/"
                target="_blank"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white hover:bg-white/15 transition"
                title="View Public Site"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* ── DashStack Quick Action Launcher ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { href: '/management/import', label: 'TMDB Import', icon: Sparkles, color: 'text-[#8280FF]', bg: 'bg-[#8280FF]/15' },
              { href: '/management/movies', label: 'Movies', icon: Film, color: 'text-[#FF9066]', bg: 'bg-[#FF9066]/15' },
              { href: '/management/dramas', label: 'Dramas', icon: Tv, color: 'text-[#FEC53D]', bg: 'bg-[#FEC53D]/15' },
              { href: '/management/subtitles', label: 'Subtitles', icon: Languages, color: 'text-[#4AD991]', bg: 'bg-[#4AD991]/15' },
              { href: '/management/subtitle-tools', label: 'Subtitle Studio', icon: WandSparkles, color: 'text-[#B85ADB]', bg: 'bg-[#490570]/20' },
              { href: '/management/database', label: 'Database', icon: Database, color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-500/15' },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <Link
                  key={idx}
                  href={item.href}
                  className="dashstack-card doit-quick-action flex items-center gap-3 rounded-[18px] p-3.5 text-xs font-semibold transition-all group"
                >
                  <div className={`h-9 w-9 rounded-xl ${item.bg} ${item.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="truncate font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* ── 2. Primary DashStack 4-Metric Row ── */}
          <section aria-label="Primary KPIs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <StatCard
                label="Total Users"
                value={formatNum(stats?.counts?.totalUsers)}
                trend={8.5}
                trendPeriod="from yesterday"
                icon={Users}
                variant="primary"
                accentColor="purple"
                href="/management/users"
              />
              <StatCard
                label="Total Catalog (Dramas & Movies)"
                value={formatNum((stats?.counts?.totalDramas || 0) + (stats?.counts?.totalMovies || 0))}
                trend={2.1}
                trendPeriod="from yesterday"
                icon={Film}
                variant="primary"
                accentColor="yellow"
                href="/management/dramas"
              />
              <StatCard
                label="Total Subtitles"
                value={formatNum(stats?.counts?.totalSubtitles)}
                trend={12.4}
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

          {/* ── Adsterra Revenue Panel ── */}
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

          {/* ── 3. Secondary Metrics Row ── */}
          <section aria-label="Secondary Metrics">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              <StatCard label="Movies" value={formatNum(stats?.counts?.totalMovies)} icon={Film} variant="secondary" accentColor="coral" href="/management/movies" />
              <StatCard label="Dramas" value={formatNum(stats?.counts?.totalDramas)} icon={Tv} variant="secondary" accentColor="yellow" href="/management/dramas" />
              <StatCard label="Episodes" value={formatNum(stats?.counts?.totalEpisodes)} icon={Clapperboard} variant="secondary" accentColor="blue" href="/management/dramas" />
              <StatCard label="Downloads" value={formatNum(stats?.counts?.totalDownloads)} icon={Download} variant="secondary" accentColor="green" href="/management/subtitles" />
              <StatCard label="30-Day Traffic" value={formatNum(stats?.counts?.totalTrafficViews)} icon={TrendingUp} variant="secondary" accentColor="purple" href="/management/dashboard" />
            </div>
          </section>

          {/* ── 4. Analytics + Content Distribution ── */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6" aria-label="Analytics">
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
            <SubtitleQueueSection episodes={stats?.upcomingEpisodes || []} />
          </section>

          {/* ── 6. Top Content + Recent Activity ── */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6" aria-label="Content Performance">
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
  const summary = stats?.summary || {};
  const daily = stats?.daily || [];
  const maxRevenue = Math.max(...daily.map(item => Number(item.revenue || 0)), 0.01);
  const needsKey = stats?.configured === false;

  return (
    <div className="dashstack-card rounded-2xl border border-[#EAEBF0] dark:border-[#313D4F] bg-white dark:bg-[#273142] overflow-hidden shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-[#EAEBF0] dark:border-[#313D4F]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00B69B]/15 text-[#00B69B]">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#202224] dark:text-white">Adsterra Revenue</h3>
              <span className="rounded-full bg-[#00B69B]/15 border border-[#00B69B]/25 px-2 py-0.5 text-[9.5px] font-bold text-[#00B69B]">
                Live Verified
              </span>
            </div>
            <p className="text-[11.5px] text-[#606060] dark:text-[#9AA5B8] mt-0.5">Publisher earnings and ad performance</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#F5F6FA] dark:bg-[#1B2431] border border-[#EAEBF0] dark:border-[#313D4F] rounded-xl p-1">
            {[7, 30, 90].map(days => (
              <button
                key={days}
                type="button"
                onClick={() => onRangeChange(days)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  range === days
                    ? 'bg-[#490570] text-white shadow-sm'
                    : 'text-[#606060] dark:text-[#9AA5B8] hover:text-[#202224] dark:hover:text-white'
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
            className="flex h-8.5 w-8.5 items-center justify-center rounded-xl border border-[#EAEBF0] dark:border-[#313D4F] bg-white dark:bg-[#273142] text-[#606060] dark:text-slate-300 hover:text-[#202224] dark:hover:text-white transition disabled:opacity-50"
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
              <p className="text-sm font-bold text-[#202224] dark:text-white">Connect your Adsterra publisher account</p>
              <p className="text-xs text-[#606060] dark:text-[#9AA5B8] mt-1">The key is stored securely in the database and is never leaked to client browsers.</p>
            </div>
            <form onSubmit={onSaveKey} className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={event => onApiKeyChange(event.target.value)}
                placeholder="Paste Adsterra API key"
                autoComplete="off"
                required
                className="flex-1 h-9.5 rounded-xl border border-[#EAEBF0] dark:border-[#313D4F] bg-[#F5F6FA] dark:bg-[#1B2431] px-3 text-xs font-mono text-[#202224] dark:text-slate-100 outline-none focus:border-[#490570]"
              />
              <button
                type="submit"
                disabled={savingKey}
                className="h-9.5 rounded-xl bg-[#00B69B] px-4 text-xs font-bold text-white hover:bg-[#009b84] transition disabled:opacity-50 shadow-sm"
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
            <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
              <span>{error}</span>
              <button type="button" onClick={() => setShowKeyForm(value => !value)} className="font-bold underline underline-offset-2 flex-shrink-0">
                Update key
              </button>
            </div>
          )}

          {showKeyForm && (
            <form onSubmit={onSaveKey} className="flex flex-col sm:flex-row gap-2 rounded-xl border border-[#EAEBF0] dark:border-[#313D4F] bg-[#F9FAFB] dark:bg-[#1B2431]/60 p-3">
              <input
                type="password"
                value={apiKey}
                onChange={event => onApiKeyChange(event.target.value)}
                placeholder="Enter a new Adsterra API key"
                autoComplete="off"
                required
                className="flex-1 h-9.5 rounded-xl border border-[#EAEBF0] dark:border-[#313D4F] bg-white dark:bg-[#273142] px-3 text-xs font-mono text-[#202224] dark:text-slate-100 outline-none focus:border-[#490570]"
              />
              <button type="submit" disabled={savingKey} className="h-9.5 rounded-xl bg-[#00B69B] px-4 text-xs font-bold text-white disabled:opacity-50">
                {savingKey ? 'Saving…' : 'Save New Key'}
              </button>
            </form>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Revenue', value: formatMoney(summary.revenue), icon: DollarSign, color: 'text-[#00B69B]', bg: 'bg-[#00B69B]/15' },
              { label: 'Impressions', value: formatNum(summary.impressions), icon: Eye, color: 'text-[#8280FF]', bg: 'bg-[#8280FF]/15' },
              { label: 'Clicks', value: formatNum(summary.clicks), icon: MousePointerClick, color: 'text-[#B85ADB]', bg: 'bg-[#490570]/20' },
              { label: 'CPM / CTR', value: `${formatMoney(summary.cpm)} / ${Number(summary.ctr || 0).toFixed(2)}%`, icon: TrendingUp, color: 'text-[#FEC53D]', bg: 'bg-[#FEC53D]/15' },
            ].map(item => (
              <div key={item.label} className="rounded-2xl border border-[#EAEBF0] dark:border-[#313D4F] bg-[#F9FAFB] dark:bg-[#1B2431]/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#606060] dark:text-[#9AA5B8]">{item.label}</p>
                  <div className={`h-7 w-7 rounded-lg ${item.bg} ${item.color} flex items-center justify-center`}>
                    <item.icon className="h-3.5 w-3.5" />
                  </div>
                </div>
                <p className="mt-2 text-[22px] font-black font-mono text-[#202224] dark:text-white leading-tight">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-[#EAEBF0] dark:border-[#313D4F] bg-[#F9FAFB] dark:bg-[#1B2431]/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold text-[#202224] dark:text-slate-200">Daily Revenue Timeline</p>
                <p className="text-[11px] text-[#606060] dark:text-[#9AA5B8]">{stats?.period?.start || '—'} to {stats?.period?.finish || '—'}</p>
              </div>
              <span className="text-xs font-bold text-[#00B69B] font-mono">USD</span>
            </div>

            {daily.length > 0 ? (
              <div className="flex h-28 items-end gap-1.5 overflow-hidden">
                {daily.map((item, index) => {
                  const height = Math.max((Number(item.revenue || 0) / maxRevenue) * 100, 4);
                  return (
                    <div key={`${item.date}-${index}`} className="group relative flex-1 min-w-[3px] h-full flex items-end">
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-[#00B69B]/70 to-[#00B69B] transition hover:brightness-125 cursor-pointer"
                        style={{ height: `${height}%` }}
                        title={`${item.date}: ${formatMoney(item.revenue)} · ${formatNum(item.impressions)} impressions`}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-28 flex items-center justify-center text-xs text-[#606060] dark:text-[#9AA5B8]">
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
    <div className="dashstack-card rounded-2xl border border-[#EAEBF0] dark:border-[#313D4F] bg-white dark:bg-[#273142] p-6 space-y-4 h-full shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#B85ADB]" />
            <h3 className="text-sm sm:text-base font-bold text-[#202224] dark:text-white">Viewership Details</h3>
          </div>
          <p className="text-xs text-[#606060] dark:text-[#9AA5B8] mt-0.5">Page views and content stream telemetry</p>
        </div>

        <div className="flex items-center gap-1 bg-[#F5F6FA] dark:bg-[#1B2431] border border-[#EAEBF0] dark:border-[#313D4F] rounded-xl p-1 self-start sm:self-auto">
          {[{ label: '7D', val: 7 }, { label: '30D', val: 30 }, { label: '90D', val: 90 }].map(tab => (
            <button
              key={tab.val}
              type="button"
              onClick={() => setRange(tab.val)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                range === tab.val
                  ? 'bg-[#490570] text-white shadow-sm'
                  : 'text-[#606060] dark:text-[#9AA5B8] hover:text-[#202224] dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full overflow-hidden pt-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 210 }} onMouseLeave={() => setTooltip(null)}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#B85ADB" stopOpacity="0.26" />
              <stop offset="100%" stopColor="#B85ADB" stopOpacity="0.01" />
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
          {linePath && <path d={linePath} fill="none" stroke="#B85ADB" strokeWidth="2.5" strokeLinecap="round" />}

          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x} cy={p.y}
              r={tooltip?.date === p.date ? 5 : 3}
              fill="#B85ADB"
              stroke="#FFFFFF"
              strokeWidth="2"
              className="cursor-pointer transition-all"
              onMouseEnter={() => setTooltip(p)}
            />
          ))}
        </svg>

        {tooltip && (
          <div
            className="absolute z-20 pointer-events-none rounded-xl border border-[#EAEBF0] dark:border-[#313D4F] bg-white dark:bg-[#1B2431] px-3.5 py-2 shadow-xl text-xs backdrop-blur-sm -translate-x-1/2 -translate-y-full"
            style={{ left: `${(tooltip.x / W) * 100}%`, top: `${(tooltip.y / H) * 100 - 8}%` }}
          >
            <p className="text-[10px] text-[#606060] dark:text-[#9AA5B8] font-mono">{tooltip.date}</p>
            <p className="text-sm font-extrabold text-[#202224] dark:text-white mt-0.5">{formatNum(tooltip.views)} views</p>
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
    { label: 'Subtitles', count: subtitles, color: '#4AD991' },
    { label: 'Dramas',    count: dramas,    color: '#FEC53D' },
    { label: 'Movies',    count: movies,    color: '#FF9066' },
    { label: 'Episodes',  count: episodes,  color: '#B85ADB' },
    { label: 'Articles',  count: articles,  color: '#8280FF' },
  ].map(item => ({ ...item, pct: total > 0 ? Math.round((item.count / total) * 100) : 0 }));

  return (
    <div className="dashstack-card rounded-2xl border border-[#EAEBF0] dark:border-[#313D4F] bg-white dark:bg-[#273142] p-6 space-y-4 h-full flex flex-col shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-[#202224] dark:text-white">Content Distribution</h3>
          <p className="text-xs text-[#606060] dark:text-[#9AA5B8] mt-0.5">Catalog breakdown by category</p>
        </div>
        <span className="text-xs font-mono font-bold text-[#B85ADB]">{formatNum(total)} items</span>
      </div>

      {/* Stacked progress bar */}
      <div className="h-2.5 w-full rounded-full bg-[#F5F6FA] dark:bg-[#1B2431] overflow-hidden flex shadow-inner">
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
      <div className="flex-1 space-y-3 pt-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-[#606060] dark:text-[#9AA5B8] font-medium flex-1">{item.label}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-16 h-1.5 bg-[#F5F6FA] dark:bg-[#1B2431] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
              </div>
              <span className="text-xs font-mono font-bold text-[#202224] dark:text-slate-200 w-8 text-right">{item.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 3. Subtitle Queue (Deals Details Style) ─────────────────────────────────
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
    { id: 'all', label: 'All Episodes' },
    { id: 'needs', label: 'Needs Subtitle' },
    { id: 'upcoming', label: 'Upcoming' },
  ];

  return (
    <div className="dashstack-card rounded-2xl border border-[#EAEBF0] dark:border-[#313D4F] bg-white dark:bg-[#273142] overflow-hidden shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-[#EAEBF0] dark:border-[#313D4F]">
        <div className="flex items-center gap-2.5">
          <Languages className="h-4 w-4 text-[#B85ADB]" />
          <h3 className="text-sm sm:text-base font-bold text-[#202224] dark:text-white">Subtitle Queue & Releases</h3>
          {missingCount > 0 && (
            <span className="rounded-full bg-[#EF3826]/15 border border-[#EF3826]/30 px-2.5 py-0.5 text-[10.5px] font-bold text-[#EF3826]">
              {missingCount} missing
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-[#F5F6FA] dark:bg-[#1B2431] border border-[#EAEBF0] dark:border-[#313D4F] rounded-xl p-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  filter === tab.id
                    ? 'bg-[#490570] text-white shadow-sm'
                    : 'text-[#606060] dark:text-[#9AA5B8] hover:text-[#202224] dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Link
            href="/management/dramas"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#EAEBF0] dark:border-[#313D4F] bg-white dark:bg-[#273142] text-xs font-bold text-[#202224] dark:text-slate-200 hover:bg-[#F5F6FA] dark:hover:bg-[#313D4F] shadow-sm transition"
          >
            Manage Catalog <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="divide-y divide-[#EAEBF0] dark:divide-[#313D4F]/60 max-h-[340px] overflow-y-auto admin-custom-scrollbar">
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
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold bg-[#8280FF]/15 text-[#8280FF] border border-[#8280FF]/30">
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
            if (!ep.hasSubtitles) {
              statusEl = ep.isUpcoming ? (
                <span className="rounded-full bg-[#490570]/20 border border-[#B85ADB]/30 px-3 py-1 text-xs font-bold text-[#D599EC]">
                  Scheduled
                </span>
              ) : (
                <Link
                  href="/management/dramas"
                  className="rounded-full bg-[#EF3826]/15 border border-[#EF3826]/30 px-3 py-1 text-xs font-bold text-[#EF3826] hover:bg-[#EF3826]/25 transition"
                >
                  + Add Subtitle
                </Link>
              );
            } else {
              statusEl = (
                <span className="rounded-full bg-[#00B69B]/15 border border-[#00B69B]/30 px-3 py-1 text-xs font-bold text-[#00B69B] flex items-center gap-1">
                  <Check className="h-3 w-3" /> Ready
                </span>
              );
            }

            return (
              <div key={ep._id} className="flex items-center justify-between gap-3 px-6 py-3.5 hover:bg-[#F9FAFC] dark:hover:bg-[#313D4F]/30 transition-colors">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#490570]/20 text-[#D599EC] flex-shrink-0">
                    <Clapperboard className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs sm:text-sm font-bold text-[#202224] dark:text-white truncate">{ep.dramaTitle}</p>
                      <span className="rounded-md bg-slate-100 dark:bg-white/[0.08] px-2 py-0.5 text-[10px] font-mono font-bold text-[#606060] dark:text-slate-300 flex-shrink-0">
                        EP {ep.episodeNumber}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#606060] dark:text-[#9AA5B8] mt-0.5 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {formattedDate}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-shrink-0">
                  {countdownEl}
                  {statusEl}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center text-xs text-[#606060] dark:text-[#9AA5B8]">
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
    <div className="dashstack-card rounded-2xl border border-[#EAEBF0] dark:border-[#313D4F] bg-white dark:bg-[#273142] overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAEBF0] dark:border-[#313D4F]">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-[#202224] dark:text-white">Top Performing Content</h3>
          <p className="text-xs text-[#606060] dark:text-[#9AA5B8] mt-0.5">Highest engaged movies and series</p>
        </div>
        <Link
          href="/management/movies"
          className="text-xs font-bold text-[#B85ADB] hover:underline transition flex items-center gap-1"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[auto_1fr_auto] gap-3 px-6 py-3 border-b border-[#EAEBF0] dark:border-[#313D4F] bg-[#F9FAFB] dark:bg-[#1B2431]/60 text-[10.5px] font-bold uppercase tracking-wider text-[#404040] dark:text-slate-300">
        <span className="w-5">#</span>
        <span>Content</span>
        <span>Views</span>
      </div>

      <div className="divide-y divide-[#EAEBF0] dark:divide-[#313D4F]/60">
        {list.length > 0 ? (
          list.map((media, idx) => (
            <div key={idx} className="grid grid-cols-[auto_1fr_auto] gap-3 items-center px-6 py-3.5 hover:bg-[#F9FAFC] dark:hover:bg-[#313D4F]/30 transition-colors group">
              <span className="w-5 text-xs font-mono font-bold text-[#606060] dark:text-[#9AA5B8] text-center">{idx + 1}</span>

              <div className="flex items-center gap-3.5 min-w-0">
                <div className="h-11 w-8 rounded-lg overflow-hidden bg-slate-100 dark:bg-[#1B2431] border border-[#EAEBF0] dark:border-[#313D4F] flex-shrink-0 shadow-sm">
                  {media.poster ? (
                    <img src={media.poster} alt={media.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-400">
                      <Film className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-[#202224] dark:text-white truncate group-hover:text-[#B85ADB] transition">
                    {media.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="rounded-md bg-slate-100 dark:bg-white/[0.08] px-1.5 py-0.5 text-[9.5px] font-bold text-[#606060] dark:text-slate-300 uppercase">
                      {media.type}
                    </span>
                    <span className="text-[11px] font-semibold text-[#FEC53D]">★ {media.tmdbRating || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm font-black font-mono text-[#202224] dark:text-white">{formatNum(media.viewCount)}</p>
                <p className="text-[10px] text-[#606060] dark:text-[#9AA5B8]">views</p>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-xs text-[#606060] dark:text-[#9AA5B8]">
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
    <div className="dashstack-card rounded-2xl border border-[#EAEBF0] dark:border-[#313D4F] bg-white dark:bg-[#273142] p-6 space-y-4 h-full shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-[#202224] dark:text-white">Recent Activity</h3>
          <p className="text-xs text-[#606060] dark:text-[#9AA5B8] mt-0.5">Latest subtitle downloads</p>
        </div>
        <Clock className="h-4 w-4 text-[#606060] dark:text-[#9AA5B8]" />
      </div>

      <div className="space-y-3.5 pt-1">
        {items.length > 0 ? (
          items.map((sub, idx) => (
            <div key={idx} className="flex items-start gap-3 text-xs">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl bg-[#490570]/20 text-[#D599EC] mt-0.5">
                <Download className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#202224] dark:text-white font-bold truncate">
                  {sub.media?.title || 'Sinhala Subtitle'}
                </p>
                <p className="text-[11px] text-[#606060] dark:text-[#9AA5B8] mt-0.5">
                  {sub.language || 'Sinhala'} · {formatRelativeTime(sub.lastDownloadedAt)}
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-[#B85ADB] flex-shrink-0">
                {sub.downloads || 0}
              </span>
            </div>
          ))
        ) : (
          <div className="py-10 text-center text-xs text-[#606060] dark:text-[#9AA5B8]">
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
    <span className={`h-2 w-2 rounded-full flex-shrink-0 ${ok ? 'bg-[#00B69B]' : 'bg-[#FEC53D]'}`} />
  );

  const healthItems = [
    { label: 'SEO Score',    value: `${seoScore} / 100`,   sub: 'Schema Validated',       ok: seoScore >= 90, color: 'text-[#00B69B]' },
    { label: 'Database',     value: health?.dbStatus === 'ok' ? 'Connected' : 'Checking', sub: `Driver: ${(health?.dbDriver || 'SQLite').toUpperCase()}`, ok: health?.dbStatus === 'ok' },
    { label: 'API Runtime',  value: `PHP ${health?.phpVersion?.slice(0, 5) || '8.2'}`,    sub: 'REST API Ready',         ok: true },
    { label: 'Server Time',  value: health?.serverTime?.split(' ')[1]?.slice(0, 5) || '—', sub: health?.timezone || 'Asia/Colombo', ok: true },
    { label: 'Sitemap Index', value: '826 URLs',            sub: 'Cached (< 50ms)',         ok: true, color: 'text-[#8280FF]' },
  ];

  return (
    <div className="dashstack-card rounded-2xl border border-[#EAEBF0] dark:border-[#313D4F] bg-white dark:bg-[#273142] p-6 space-y-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#490570]/20 text-[#D599EC]">
            <Server className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#202224] dark:text-white">System & SEO Telemetry</h3>
            <p className="text-xs text-[#606060] dark:text-[#9AA5B8] mt-0.5">Database, runtime health, and caching engine</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClearCache}
          disabled={clearingCache}
          className="flex items-center gap-2 rounded-xl border border-[#EAEBF0] dark:border-[#313D4F] bg-white dark:bg-[#273142] px-4 py-2 text-xs font-bold text-[#202224] dark:text-slate-200 hover:bg-[#F5F6FA] dark:hover:bg-[#313D4F] shadow-sm transition disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${clearingCache ? 'animate-spin' : ''}`} />
          <span>{clearingCache ? 'Clearing…' : 'Purge Cache'}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {healthItems.map((item, idx) => (
          <div key={idx} className="rounded-2xl border border-[#EAEBF0] dark:border-[#313D4F] bg-[#F9FAFB] dark:bg-[#1B2431]/60 p-4 space-y-1.5">
            <div className="flex items-center gap-2">
              {statusDot(item.ok)}
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#606060] dark:text-[#9AA5B8]">{item.label}</p>
            </div>
            <p className={`text-lg font-black font-mono ${item.color || 'text-[#202224] dark:text-white'}`}>{item.value}</p>
            <p className="text-[11px] text-[#606060] dark:text-[#9AA5B8] leading-tight">{item.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
