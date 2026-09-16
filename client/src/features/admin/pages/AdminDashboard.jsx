'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Square, MoreHorizontal, Layers, ChevronDown, CheckCircle2,
  AlertCircle, Play, Sliders, ExternalLink, HardDrive, Radio,
  Share2, ArrowDownRight, Compass, MessageSquare
} from 'lucide-react';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import AdminTopBar from '@/features/admin/components/AdminTopBar';
import { Pulse, CardSkeleton } from '@/features/admin/components/Skeleton';
import { useToast } from '@/features/admin/components/Toast';

// ─── Formatting Utilities ───────────────────────────────────────────────────
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

// ─── Main Admin Dashboard Component ──────────────────────────────────────────
export default function AdminDashboard() {
  const { admin } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [timeRange, setTimeRange] = useState('7d');
  const [busyAction, setBusyAction] = useState('');
  const [activeCategoryTab, setActiveCategoryTab] = useState('all');

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

  const markReleased = async (episode) => {
    setBusyAction(`${episode._id}:release`);
    try {
      await apiClient.put(`/api/admin/episodes/${episode._id}/release`);
      toast.success('Episode released and published to subscribers.');
      await loadDashboard({ silent: true });
    } catch (err) {
      toast.error(err.message || 'Could not mark the episode as released.');
    } finally {
      setBusyAction('');
    }
  };

  // Real data extractions
  const totalDramas = stats?.counts?.totalDramas || 0;
  const totalMovies = stats?.counts?.totalMovies || 0;
  const totalCatalog = totalDramas + totalMovies;
  const totalSubtitles = stats?.counts?.totalSubtitles || 0;
  const pendingSubtitles = stats?.counts?.pendingSubtitles || 0;
  const totalUsers = stats?.counts?.totalUsers || 0;
  const totalViews = stats?.counts?.totalViews || 0;
  const upcomingEpisodes = stats?.upcomingEpisodes;
  const rawEpisodes = useMemo(
    () => (Array.isArray(upcomingEpisodes) ? upcomingEpisodes : []),
    [upcomingEpisodes]
  );
  const topContent = stats?.topContent || [];
  const health = stats?.systemHealth || {};
  const trafficLogs = Array.isArray(stats?.trafficLogs) ? stats.trafficLogs : [];
  const trafficWindowSize = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const trafficSeries = trafficLogs.slice(-trafficWindowSize);
  const trafficTotal = trafficSeries.reduce((sum, log) => sum + Number(log.views || 0), 0);
  const maxTraffic = Math.max(...trafficSeries.map((log) => Number(log.views || 0)), 1);
  const subtitleStats = stats?.subtitleStats || null;
  const storageStats = stats?.storageStats || null;
  const hasLiveStats = Boolean(stats);
  const filteredTopContent = activeCategoryTab === 'all'
    ? topContent
    : topContent.filter((item) => item.type?.toLowerCase() === (activeCategoryTab === 'movies' ? 'movie' : 'drama'));

  const adminName = admin?.displayName || admin?.username || admin?.name || 'Chamath';
  const adminRole = admin?.role?.name || (typeof admin?.role === 'object' ? admin.role.name : String(admin?.role || 'SuperAdmin'));

  // Use only API-provided queue items. Upcoming episodes without an approved
  // subtitle are a real derived attention queue; no demo records are injected.
  const pendingQueue = useMemo(() => {
    const submissions = Array.isArray(stats?.pendingSubtitlesList) ? stats.pendingSubtitlesList : [];
    if (submissions.length > 0) return submissions;
    return rawEpisodes
      .filter((episode) => episode.hasSubtitles === false)
      .slice(0, 4)
      .map((episode) => ({
        id: episode._id,
        title: `${episode.dramaTitle || 'Drama episode'} · Episode ${episode.episodeNumber || '—'}`,
        uploader: 'No approved Sinhala subtitle',
        time: episode.airDate ? formatRelativeTime(episode.airDate) : 'Schedule not reported',
        language: 'Sinhala'
      }));
  }, [rawEpisodes, stats]);

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
                <Pulse className="h-8 w-64" />
              </div>
              <Pulse className="h-10 w-36 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
            <Pulse className="h-[340px] rounded-2xl" />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell min-h-screen flex flex-col lg:flex-row transition-colors duration-200 bg-[#f8fafc] dark:bg-[#0b0f19]">
      <AdminSidebar mobileOpen={mobileOpen} onCloseMobileNav={() => setMobileOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <AdminTopBar onOpenMobileNav={() => setMobileOpen(true)} />

        <main className="admin-main flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] w-full mx-auto space-y-6">
          
          {/* ── Error Banner ── */}
          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── 1. Command-centre briefing ── */}
          <section className="workspace-intro-grid" aria-label="Executive Briefing">
            <div className="workspace-intro-panel">
              <div>
                <div className="workspace-kicker">
                  <span className="workspace-kicker-dot" />
                  <span>{hasLiveStats ? 'Live platform operational' : 'Live data unavailable'}</span>
                  <span className="workspace-date">
                    {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                <h1 className="workspace-title">Welcome back, {adminName}</h1>
                <p className="workspace-subtitle">
                  Sinhala subtitle workflows, streaming performance, and episode release control in one operating view.
                </p>
              </div>

              <div className="workspace-context-row" aria-label="Workspace context">
                <span><Activity className={`h-3 w-3 ${hasLiveStats ? 'text-emerald-400' : 'text-rose-400'}`} /> {hasLiveStats ? 'API runtime healthy' : 'API response unavailable'}</span>
                <span><Shield className="h-3 w-3 text-violet-400" /> {adminRole}</span>
                <span><CheckCircle className={`h-3 w-3 ${hasLiveStats ? 'text-sky-400' : 'text-rose-400'}`} /> {hasLiveStats ? 'Live data verified' : 'Awaiting live data'}</span>
              </div>
            </div>

            <div className="workspace-action-panel">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="workspace-panel-label">Operator actions</div>
                  <p className="workspace-panel-hint">Move through the day without leaving the control room.</p>
                </div>
                <kbd className="workspace-kbd">⌘K</kbd>
              </div>

              <div className="workspace-action-grid">
                <button
                  type="button"
                  onClick={() => downloadCsv('ksubzone-studio-summary.csv', [
                    ['Metric', 'Value'],
                    ['Total Media Catalog', totalCatalog],
                    ['Movies Count', totalMovies],
                    ['Dramas Count', totalDramas],
                    ['Approved Subtitles', totalSubtitles],
                    ['Pending Subtitles', pendingSubtitles],
                    ['Total Viewership', totalViews],
                    ['Community Members', totalUsers],
                  ])}
                  className="workspace-action"
                  title="Download operations CSV report"
                >
                  <Download className="h-4 w-4 text-sky-400" />
                  <span>Export report</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearCache}
                  disabled={clearingCache}
                  className="workspace-action"
                  title="Purge system runtime cache"
                >
                  <RefreshCw className={`h-4 w-4 text-amber-400 ${clearingCache ? 'animate-spin' : ''}`} />
                  <span>{clearingCache ? 'Purging…' : 'Purge cache'}</span>
                </button>

                <Link href="/management/import" className="workspace-action">
                  <Sparkles className="h-4 w-4 text-violet-400" />
                  <span>Import titles</span>
                </Link>

                <Link href="/management/subtitles" className="workspace-action">
                  <Languages className="h-4 w-4 text-emerald-400" />
                  <span>Review queue</span>
                </Link>
              </div>
            </div>
          </section>

          {/* ── 2. Top 4 Executive KPI Cards ── */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Key Performance Indicators">
            
            {/* KPI 1: Total Media Catalog */}
            <div className="studio-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Media Catalog
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Film className="h-4.5 w-4.5" />
                </div>
              </div>

              <div className="mt-2">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {hasLiveStats ? totalCatalog : '—'}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="badge-emerald text-[10.5px]">
                    Reported
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                    {totalMovies} Movies · {totalDramas} Dramas
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 2: Subtitles Repository */}
            <div className="studio-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Subtitles Repository
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Languages className="h-4.5 w-4.5" />
                </div>
              </div>

              <div className="mt-2">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {hasLiveStats ? formatNum(totalSubtitles) : '—'}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  {pendingSubtitles > 0 ? (
                    <Link
                      href="/management/subtitles"
                      className="badge-amber text-[10.5px] hover:brightness-105 transition"
                    >
                      ● {pendingSubtitles} Pending Review
                    </Link>
                  ) : (
                    <span className="badge-emerald text-[10.5px]">
                      ● Reported
                    </span>
                  )}
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Sinhala SRT
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 3: Viewership Impressions */}
            <div className="studio-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Total Viewership
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Eye className="h-4.5 w-4.5" />
                </div>
              </div>

              <div className="mt-2">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {hasLiveStats ? formatNum(totalViews) : '—'}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="badge-indigo text-[10.5px]">
                    {hasLiveStats ? 'Reported total' : 'Not reported'}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    from API
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 4: Active Community & Translators */}
            <div className="studio-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Community & Translators
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Users className="h-4.5 w-4.5" />
                </div>
              </div>

              <div className="mt-2">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {hasLiveStats ? formatNum(totalUsers) : '—'}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="badge-emerald text-[10.5px]">
                    Reported
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Active Translators & Fans
                  </span>
                </div>
              </div>
            </div>

          </section>

          {/* ── 3. Row 2: Viewership Analytics & Subtitle Catalog Coverage ── */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6" aria-label="Analytics & Subtitle Coverage">
            
            {/* Viewership Streaming Velocity (Line/Area Chart) */}
            <div className="studio-card lg:col-span-8">
              <div className="studio-card-header">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Streaming Viewership Velocity</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-normal">
                    Daily viewer engagement and player impressions
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {['7d', '30d', '90d'].map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setTimeRange(range)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                        timeRange === range
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {range.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="studio-card-body">
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                    {hasLiveStats ? formatNum(trafficTotal) : '—'}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    {trafficSeries.length > 0 ? `${trafficSeries.length} reported days` : 'No daily telemetry reported'}
                  </span>
                </div>

                {trafficSeries.length > 0 ? (
                  <div className="h-56 w-full flex items-end gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-2">
                    {trafficSeries.map((log, index) => {
                      const value = Number(log.views || 0);
                      const height = Math.max(8, Math.round((value / maxTraffic) * 100));
                      return (
                        <div key={`${log.date || 'day'}-${index}`} className="flex h-full flex-1 flex-col items-center justify-end gap-2" title={`${log.date || 'Reported day'} · ${value.toLocaleString()} views`}>
                          <div className="w-full max-w-10 rounded-t-md bg-violet-500/70" style={{ height: `${height}%` }} />
                          <span className="text-[9px] text-slate-400 truncate max-w-full">{log.date ? String(log.date).slice(5) : `D${index + 1}`}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                    The analytics endpoint did not report daily traffic for this period.
                  </div>
                )}
              </div>
            </div>

            {/* Subtitle Catalog Coverage (Donut / Progress Chart) */}
            <div className="studio-card lg:col-span-4 flex flex-col justify-between">
              <div className="studio-card-header">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Sinhala Subtitle Coverage</h3>
                  <p className="text-xs text-slate-400 font-normal">Catalog translation completeness</p>
                </div>
                <span className={hasLiveStats ? 'badge-emerald text-xs' : 'badge-amber text-xs'}>
                  {hasLiveStats ? `${formatNum(subtitleStats?.approved || 0)} approved` : 'Not reported'}
                </span>
              </div>

              <div className="studio-card-body flex flex-col justify-center flex-1 gap-3">
                <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 p-4 text-center">
                  <Languages className="mx-auto h-7 w-7 text-violet-400" />
                  <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                    {hasLiveStats ? 'Subtitle moderation snapshot' : 'Coverage telemetry unavailable'}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {hasLiveStats ? 'The API reports moderation totals, not a catalog coverage percentage.' : 'No coverage value was reported by the dashboard endpoint.'}
                  </p>
                </div>

                <div className="w-full space-y-2 pt-1 text-xs">
                  {[
                    ['Approved', subtitleStats?.approved, 'text-emerald-400', 'bg-emerald-500'],
                    ['Pending', subtitleStats?.pending, 'text-amber-400', 'bg-amber-500'],
                    ['Rejected', subtitleStats?.rejected, 'text-rose-400', 'bg-rose-500']
                  ].map(([label, value, textColor, dotColor]) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-slate-500 dark:text-slate-300">
                        <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                        {label}
                      </span>
                      <strong className={`font-bold ${textColor}`}>{hasLiveStats ? formatNum(value || 0) : '—'}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </section>

          {/* ── 4. Row 3: Operational Command Centers ── */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6" aria-label="Operational Centers">
            
            {/* Episode Broadcast Radar & Release Queue (Left 7 cols) */}
            <div className="studio-card lg:col-span-7">
              <div className="studio-card-header">
                <div className="flex items-center gap-2">
                  <Tv className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Drama Episode Broadcast Radar</h3>
                    <p className="text-xs text-slate-400 font-normal">Upcoming television episodes and broadcast release control</p>
                  </div>
                </div>
                <Link
                  href="/management/dramas"
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Manage Dramas →
                </Link>
              </div>

              <div className="studio-card-body p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-5">Series & Episode</th>
                        <th className="py-3 px-4">Subtitle Status</th>
                        <th className="py-3 px-4">Air Date</th>
                        <th className="py-3 px-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {rawEpisodes.length > 0 ? (
                        rawEpisodes.slice(0, 5).map((episode, idx) => (
                          <tr key={episode._id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition">
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                                  <Clapperboard className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                                    {episode.dramaTitle || `Drama Series Episode ${idx + 1}`}
                                  </p>
                                  <span className="text-[11px] text-slate-400">
                                    Episode {episode.episodeNumber || (idx + 1)}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className={episode.releaseStatus === 'Released' ? 'badge-emerald' : 'badge-amber'}>
                                {episode.releaseStatus === 'Released' ? '● Released' : '⏳ Pending Broadcast'}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-slate-500">
                              {episode.airDate ? formatRelativeTime(episode.airDate) : 'Today'}
                            </td>

                            <td className="py-3.5 px-5 text-right">
                              {episode.releaseStatus !== 'Released' ? (
                                <button
                                  type="button"
                                  onClick={() => markReleased(episode)}
                                  disabled={busyAction === `${episode._id}:release`}
                                  className="btn-studio-primary text-[11px] py-1 px-3.5"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>{busyAction === `${episode._id}:release` ? 'Releasing…' : 'Release Now'}</span>
                                </button>
                              ) : (
                                <span className="text-slate-400 font-semibold text-[11px]">
                                  Live & Subtitled
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-12 px-5 text-center text-xs text-slate-400">
                            No upcoming episode data was reported by the dashboard endpoint.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Subtitle Approval Queue (Right 5 cols) */}
            <div className="studio-card lg:col-span-5 flex flex-col justify-between">
              <div className="studio-card-header">
                <div className="flex items-center gap-2">
                  <Languages className="h-4.5 w-4.5 text-amber-500" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Subtitle Submissions Queue</h3>
                    <p className="text-xs text-slate-400 font-normal">Pending moderator approval</p>
                  </div>
                </div>
                <Link
                  href="/management/subtitles"
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  View All ({pendingSubtitles || pendingQueue.length}) →
                </Link>
              </div>

              <div className="studio-card-body space-y-3">
                {pendingQueue.length > 0 ? pendingQueue.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3 hover:border-indigo-500/30 transition"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {item.uploader} · {item.time}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Link
                        href="/management/subtitles"
                        className="btn-studio-pill text-[11px] py-1 px-2.5"
                      >
                        Review
                      </Link>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 px-4 py-10 text-center text-xs text-slate-400">
                    No pending subtitle attention items were reported by the API.
                  </div>
                )}
              </div>

              <div className="p-3 px-5 bg-slate-50/60 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>Queue data is derived from the live moderation response.</span>
                <Link href="/management/subtitle-tools" className="text-indigo-600 font-bold hover:underline">
                  Open Subtitle Studio
                </Link>
              </div>
            </div>

          </section>

          {/* ── 5. Row 4: Trending Content Leaderboard & System Health ── */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6" aria-label="Catalog Leaderboard and Telemetry">
            
            {/* Top Trending Content (Left 7 cols) */}
            <div className="studio-card lg:col-span-7">
              <div className="studio-card-header">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top Performing Media Catalog</h3>
                  <p className="text-xs text-slate-400 font-normal">Highest streaming viewership and subscriber downloads</p>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-bold">
                  {['all', 'dramas', 'movies'].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveCategoryTab(tab)}
                      className={`px-2.5 py-0.5 rounded capitalize transition ${
                        activeCategoryTab === tab
                          ? 'bg-white dark:bg-[#0f172a] text-indigo-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="studio-card-body p-0">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTopContent.length > 0 ? filteredTopContent.slice(0, 4).map((item, idx) => (
                    <div key={item.id || idx} className="p-4 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition">
                      <div className="flex items-center gap-3">
                        <span className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-mono font-bold text-xs text-slate-500">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {item.title}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span className="uppercase font-bold text-indigo-600 dark:text-indigo-400">{item.type}</span>
                            <span>•</span>
                            <span className="text-amber-500 font-semibold">★ {item.tmdbRating || '—'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-black text-slate-900 dark:text-white">
                          {formatNum(item.viewCount || 0)}
                        </p>
                        <span className="text-[10.5px] text-slate-400">views</span>
                      </div>
                    </div>
                  )) : (
                    <div className="px-4 py-12 text-center text-xs text-slate-400">
                      No top-content ranking was reported by the analytics endpoint.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* System Telemetry & SEO Health (Right 5 cols) */}
            <div className="studio-card lg:col-span-5">
              <div className="studio-card-header">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">System & Server Telemetry</h3>
                  <p className="text-xs text-slate-400 font-normal">Database, API gateway, and R2 storage health</p>
                </div>
                <span className={hasLiveStats ? 'badge-emerald text-xs' : 'badge-amber text-xs'}>
                  {hasLiveStats ? 'Snapshot reported' : 'Not reported'}
                </span>
              </div>

              <div className="studio-card-body space-y-3">
                <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Primary Database</p>
                      <p className="text-[10px] text-slate-400">Driver: {health.dbDriver || 'Not reported'}</p>
                    </div>
                  </div>
                  <span className={health.dbStatus === 'ok' ? 'badge-emerald' : 'badge-amber'}>
                    {health.dbStatus === 'ok' ? 'Connected' : 'Not reported'}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Server className="h-4 w-4 text-indigo-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">PHP Core REST Engine</p>
                      <p className="text-[10px] text-slate-400">Runtime: {health.phpVersion || 'Not reported'}</p>
                    </div>
                  </div>
                  <span className={health.apiStatus === 'ok' ? 'badge-emerald' : 'badge-amber'}>
                    {health.apiStatus === 'ok' ? 'Operational' : 'Not reported'}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <HardDrive className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Cloudflare R2 Subtitles</p>
                      <p className="text-[10px] text-slate-400">Provider: {storageStats?.activeProvider || 'Not reported'}</p>
                    </div>
                  </div>
                  <span className={storageStats ? 'badge-emerald' : 'badge-amber'}>
                    {storageStats ? 'Reported' : 'Not reported'}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-emerald-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Security & Permissions</p>
                      <p className="text-[10px] text-slate-400">Administrator Scope: {adminRole}</p>
                    </div>
                  </div>
                  <span className="badge-indigo">{adminRole}</span>
                </div>
              </div>
            </div>

          </section>

        </main>
      </div>
    </div>
  );
}
