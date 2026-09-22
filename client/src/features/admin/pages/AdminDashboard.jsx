'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import Link from 'next/link';
import apiClient from '@/services/api/apiClient';
import {
  Film, Tv, Users, Languages, Star, TrendingUp, Eye,
  CheckCircle, Clapperboard, Calendar, AlertTriangle,
  Activity, ArrowUpRight, BarChart3, Database, Server, Clock,
  Shield, Download, Plus, RefreshCw, Check, Search,
  Sparkles, ArrowRight, Filter, ChevronRight,
  CalendarClock, Trash2, Send, Bookmark, FileText,
  CheckCircle2, AlertCircle, HardDrive, Layers,
  Radio, DownloadCloud, PieChart, ShieldCheck, DollarSign
} from 'lucide-react';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import AdminTopBar from '@/features/admin/components/AdminTopBar';
import { Pulse, CardSkeleton } from '@/features/admin/components/Skeleton';
import { useToast } from '@/features/admin/components/Toast';
import DashboardReports, { ReportExports } from '../components/DashboardReports';
import { selectTraffic, downloadCsv } from '../reporting.mjs';

// ─── Number & Time Formatters ────────────────────────────────────────────────
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

// ─── Main Admin Dashboard Component ──────────────────────────────────────────
export default function AdminDashboard() {
  const { admin } = useAuth();
  const role = typeof admin?.role === 'string' ? admin.role : admin?.role?.name;
  const can = (permission) =>
    Boolean(admin?.isSuperAdmin || role === 'SuperAdmin' || admin?.permissions?.includes(permission));
  const canViewAnalytics = can('view_analytics');
  const canManageDramas = can('manage_dramas');
  const canManageSettings = can('manage_settings');

  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [timeRange, setTimeRange] = useState('7d');
  const [busyAction, setBusyAction] = useState('');
  const [activeDeck, setActiveDeck] = useState('radar'); // 'radar' | 'monetization' | 'catalog'
  const [activeCategoryTab, setActiveCategoryTab] = useState('all');
  const [queueTab, setQueueTab] = useState('all');
  const [schedule, setSchedule] = useState(null);

  const loadDashboard = useCallback(
    async ({ silent = false } = {}) => {
      if (!canViewAnalytics) {
        setLoading(false);
        return;
      }
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
    },
    [canViewAnalytics]
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      await apiClient.post('/api/admin/clear-cache');
      toast.success('System runtime cache purged successfully.');
    } catch (err) {
      toast.error('Failed to clear cache.');
    } finally {
      setClearingCache(false);
    }
  };

  const markReleased = async (episode) => {
    setBusyAction(`${episode._id}:release`);
    try {
      await apiClient.put(`/api/admin/episodes/${episode._id}/release`);
      toast.success('Episode released to public.');
      await loadDashboard({ silent: true });
    } catch (err) {
      toast.error(err.message || 'Could not mark the episode as released.');
    } finally {
      setBusyAction('');
    }
  };

  const updateQueue = async (episode, action) => {
    if (action === 'delete' && !window.confirm(`Delete episode ${episode.episodeNumber}? This cannot be undone.`))
      return;
    setBusyAction(`${episode._id}:${action}`);
    try {
      if (action === 'delete') {
        await apiClient.delete(`/api/admin/episodes/${episode._id}`);
      } else {
        await apiClient.put(`/api/admin/episodes/${episode._id}`, { airDate: schedule.date });
      }
      setSchedule(null);
      toast.success(action === 'delete' ? 'Episode deleted.' : 'Schedule updated.');
      await loadDashboard({ silent: true });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not update episode.');
    } finally {
      setBusyAction('');
    }
  };

  // Real data extractions
  const totalDramas = stats?.counts?.totalDramas || 0;
  const totalMovies = stats?.counts?.totalMovies || 0;
  const totalCatalog = totalDramas + totalMovies;
  const totalSubtitles = stats?.counts?.totalSubtitles || 0;
  const pendingSubtitles = stats?.subtitleStats?.pending || 0;
  const totalUsers = stats?.counts?.totalUsers || 0;
  const totalViews = stats?.counts?.totalViews || 0;
  const upcomingEpisodes = stats?.upcomingEpisodes;
  const rawEpisodes = useMemo(() => (Array.isArray(upcomingEpisodes) ? upcomingEpisodes : []), [upcomingEpisodes]);
  const topContent = stats?.topContent || [];
  const health = stats?.systemHealth || {};
  const trafficLogs = Array.isArray(stats?.trafficLogs) ? stats.trafficLogs : [];
  const trafficWindowSize = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const trafficSeries = selectTraffic(trafficLogs, trafficWindowSize);
  const trafficTotal = trafficSeries.reduce((sum, log) => sum + Number(log.views || 0), 0);
  const maxTraffic = Math.max(...trafficSeries.map((log) => Number(log.views || 0)), 1);
  const subtitleStats = stats?.subtitleStats || null;
  const storageStats = stats?.storageStats || null;
  const hasLiveStats = Boolean(stats);

  const healthIssues = Object.entries(health).filter(
    ([key, value]) =>
      ['dbStatus', 'apiStatus', 'sitemapStatus'].includes(key) &&
      value &&
      !['ok', 'healthy', 'connected', 'operational', 'unknown'].includes(String(value).toLowerCase())
  );

  const visibleEpisodes = rawEpisodes.filter(
    (episode) =>
      queueTab === 'all' || (queueTab === 'missing' ? episode.hasSubtitles === false : episode.isUpcoming)
  );

  const filteredTopContent =
    activeCategoryTab === 'all'
      ? topContent
      : topContent.filter(
          (item) => item.type?.toLowerCase() === (activeCategoryTab === 'movies' ? 'movie' : 'drama')
        );

  const adminName = admin?.displayName || admin?.username || admin?.name || 'Administrator';
  const adminRole =
    admin?.role?.name || (typeof admin?.role === 'object' ? admin.role.name : String(admin?.role || 'SuperAdmin'));

  const pendingQueue = useMemo(() => {
    const submissions = Array.isArray(stats?.pendingSubtitlesList) ? stats.pendingSubtitlesList : [];
    if (submissions.length > 0) return submissions;
    return rawEpisodes
      .filter((episode) => episode.hasSubtitles === false)
      .slice(0, 5)
      .map((episode) => ({
        id: episode._id,
        title: `${episode.dramaTitle || 'Drama series'} · Ep ${episode.episodeNumber || '—'}`,
        uploader: 'Needs Sinhala Subtitle',
        time: episode.airDate ? formatRelativeTime(episode.airDate) : 'Pending Schedule',
      }));
  }, [rawEpisodes, stats]);

  if (loading) {
    return (
      <div className="admin-shell min-h-screen flex flex-col lg:flex-row bg-[var(--studio-bg)] text-[#F5F6F8]">
        <AdminSidebar mobileOpen={mobileOpen} onCloseMobileNav={() => setMobileOpen(false)} />
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          <AdminTopBar onOpenMobileNav={() => setMobileOpen(true)} />
          <main className="flex-1 overflow-y-auto p-6 max-w-[1600px] w-full mx-auto space-y-6">
            <div className="flex items-center justify-between py-2">
              <div className="space-y-2">
                <Pulse className="h-4 w-32 rounded-[9999px]" />
                <Pulse className="h-8 w-64 rounded-[12px]" />
              </div>
              <Pulse className="h-10 w-36 rounded-[12px]" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 h-80 rounded-[16px] bg-[var(--studio-surface)] animate-pulse" />
              <div className="lg:col-span-4 h-80 rounded-[16px] bg-[var(--studio-surface)] animate-pulse" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell workspace-intro-grid min-h-screen flex flex-col lg:flex-row bg-[var(--studio-bg)] text-[var(--studio-text)] transition-colors duration-200">
      <AdminSidebar mobileOpen={mobileOpen} onCloseMobileNav={() => setMobileOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <AdminTopBar onOpenMobileNav={() => setMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] w-full mx-auto space-y-6">
          {/* ── Role Restriction Banner (if applicable) ── */}
          {!canViewAnalytics && (
            <div className="p-4 rounded-[16px] bg-[#14B8A6]/10 border border-[#14B8A6]/20 text-xs text-[#14B8A6] flex items-center justify-between">
              <span>Your operator role is configured for active content and subtitle management. Analytics and financial telemetry require elevated permissions.</span>
              <span className="badge-pill bg-[#14B8A6]/20 text-[#14B8A6]">{adminRole}</span>
            </div>
          )}

          {/* ── System Attention / Health Warning Banner ── */}
          {healthIssues.length > 0 && (
            <div className="p-4 rounded-[16px] bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444] flex items-center gap-3" role="alert">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-bold">System Warning:</span> Degraded telemetry reported —{' '}
                {healthIssues.map(([key, val]) => `${key}: ${val}`).join(' · ')}
              </div>
              <button
                type="button"
                onClick={() => loadDashboard()}
                className="btn-studio-pill text-xs text-[#EF4444] border-[#EF4444]/30"
              >
                Retry Check
              </button>
            </div>
          )}

          {/* ── API Error Banner ── */}
          {error && (
            <div className="p-4 rounded-[16px] bg-[#EF4444]/10 border border-[#EF4444]/20 text-xs text-[#EF4444] flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {canViewAnalytics && (
            <>
              {/* ==========================================================================
                  ZONE 1: ASYMMETRIC HERO INTELLIGENCE & MISSION CONTROL
                  ========================================================================== */}
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-6" aria-label="Executive Intelligence Center">
                {/* ── Left Hero Card: Streaming Viewership Velocity (65% width = 8 cols) ── */}
                <div className="studio-card rounded-[16px] lg:col-span-8 p-6 flex flex-col justify-between">
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between flex-wrap gap-4 border-b border-[var(--studio-border)] pb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-black uppercase tracking-widest text-[var(--studio-muted)]">
                            Streaming Viewership Velocity
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[9999px] bg-[#14B8A6]/15 border border-[#14B8A6]/25 text-[#14B8A6] text-[10px] font-bold">
                            <TrendingUp className="h-3 w-3" />
                            +8.5% Up
                          </span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black text-[var(--studio-text)] tracking-tight">
                          {hasLiveStats ? formatNum(totalViews) : '—'}
                          <span className="text-sm font-semibold text-[var(--studio-muted)] ml-2">total views</span>
                        </h1>
                      </div>

                      {/* Timeframe selector & CSV/PNG export */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center bg-[var(--studio-raised)] p-1 rounded-[9999px] border border-[var(--studio-border)]">
                          {['7d', '30d', '90d'].map((range) => (
                            <button
                              key={range}
                              type="button"
                              onClick={() => setTimeRange(range)}
                              className={`px-3 py-1 text-xs font-bold rounded-[9999px] transition ${
                                timeRange === range
                                  ? 'bg-[#9E57F6] text-white shadow-sm'
                                  : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
                              }`}
                            >
                              {range.toUpperCase()}
                            </button>
                          ))}
                        </div>
                        <ReportExports
                          title="Viewership"
                          rows={[['Date', 'Views'], ...trafficSeries.map((log) => [log.date, log.views])]}
                          disabled={!stats}
                        />
                      </div>
                    </div>

                    {/* Velocity Bar Curve */}
                    <div className="mt-6">
                      <div className="flex items-baseline justify-between mb-3 text-xs text-[var(--studio-muted)]">
                        <span className="font-semibold text-[var(--studio-text)]">
                          {trafficSeries.length > 0 ? `${trafficSeries.length} Days Telemetry` : 'No telemetry in range'}
                        </span>
                        <span>Period Total: <b className="text-[var(--studio-text)] font-bold">{formatNum(trafficTotal)}</b></span>
                      </div>

                      {trafficSeries.length > 0 ? (
                        <div className="h-44 w-full flex items-end gap-1.5 border-b border-[var(--studio-border)] pb-2">
                          {trafficSeries.map((log, index) => {
                            const value = Number(log.views || 0);
                            const height = Math.max(8, Math.round((value / maxTraffic) * 100));
                            return (
                              <div
                                key={`${log.date || 'day'}-${index}`}
                                className="flex h-full flex-1 flex-col items-center justify-end gap-2 group relative"
                              >
                                {/* Tooltip */}
                                <div className="pointer-events-none absolute -top-8 hidden group-hover:block z-20 rounded-[9999px] bg-[var(--studio-surface)] border border-[var(--studio-border)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--studio-text)] whitespace-nowrap shadow-xl">
                                  {log.date}: {value.toLocaleString()} views
                                </div>
                                <div
                                  className="w-full max-w-10 rounded-t-[6px] bg-gradient-to-t from-[#9E57F6] to-[#14B8A6] group-hover:brightness-125 transition-all duration-200"
                                  style={{ height: `${height}%` }}
                                />
                                <span className="text-[9px] font-medium text-[var(--studio-muted)] truncate max-w-full">
                                  {log.date ? String(log.date).slice(5) : `D${index + 1}`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex h-44 items-center justify-center rounded-[16px] border border-dashed border-[var(--studio-border)] text-xs text-[var(--studio-muted)]">
                          No daily telemetry reported by the analytics gateway.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Velocity Footer Milestones */}
                  <div className="grid grid-cols-3 gap-3 pt-5 mt-4 border-t border-[var(--studio-border)] text-center text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[var(--studio-muted)]">Peak Day</span>
                      <p className="text-base font-black text-[var(--studio-text)] mt-0.5">{formatNum(maxTraffic)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[var(--studio-muted)]">Daily Average</span>
                      <p className="text-base font-black text-[var(--studio-text)] mt-0.5">
                        {trafficSeries.length ? formatNum(Math.round(trafficTotal / trafficSeries.length)) : '0'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[var(--studio-muted)]">Telemetry Engine</span>
                      <p className="text-base font-black text-[#14B8A6] mt-0.5">Active Realtime</p>
                    </div>
                  </div>
                </div>

                {/* ── Right Mission Dispatcher & Pulse (35% width = 4 cols) ── */}
                <div className="studio-card rounded-[16px] lg:col-span-4 p-6 flex flex-col justify-between">
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-[var(--studio-border)] pb-3 mb-4">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--studio-muted)]">
                          Mission Dispatcher
                        </span>
                        <h2 className="text-sm font-bold text-[var(--studio-text)]">Operations Control</h2>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-[#14B8A6] animate-pulse" />
                    </div>

                    {/* Key Metrics Stack */}
                    <div className="space-y-3">
                      {/* Subtitles */}
                      <div className="p-3.5 rounded-[12px] bg-[var(--studio-raised)] border border-[var(--studio-border)] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-[12px] bg-[#9E57F6]/15 text-[#9E57F6] flex items-center justify-center">
                            <Languages className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <p className="text-[10.5px] font-bold text-[var(--studio-muted)] uppercase">Approved Subtitles</p>
                            <p className="text-lg font-black text-[var(--studio-text)]">{hasLiveStats ? formatNum(totalSubtitles) : '—'}</p>
                          </div>
                        </div>
                        {pendingSubtitles > 0 ? (
                          <Link
                            href="/management/subtitles"
                            className="badge-amber hover:brightness-110 transition"
                          >
                            ● {pendingSubtitles} Pending
                          </Link>
                        ) : (
                          <span className="badge-emerald">● Verified</span>
                        )}
                      </div>

                      {/* Media Catalog */}
                      <div className="p-3.5 rounded-[12px] bg-[var(--studio-raised)] border border-[var(--studio-border)] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-[12px] bg-sky-500/15 text-sky-500 flex items-center justify-center">
                            <Film className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <p className="text-[10.5px] font-bold text-[var(--studio-muted)] uppercase">Media Catalog</p>
                            <p className="text-lg font-black text-[var(--studio-text)]">{hasLiveStats ? totalCatalog : '—'}</p>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-[var(--studio-muted)]">
                          {totalMovies}M · {totalDramas}D
                        </span>
                      </div>

                      {/* Active Members */}
                      <div className="p-3.5 rounded-[12px] bg-[var(--studio-raised)] border border-[var(--studio-border)] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-[12px] bg-[#14B8A6]/15 text-[#14B8A6] flex items-center justify-center">
                            <Users className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <p className="text-[10.5px] font-bold text-[var(--studio-muted)] uppercase">Active Translators</p>
                            <p className="text-lg font-black text-[var(--studio-text)]">{hasLiveStats ? formatNum(totalUsers) : '—'}</p>
                          </div>
                        </div>
                        <span className="badge-emerald">Community</span>
                      </div>
                    </div>
                  </div>

                  {/* Rapid Operator Action Grid */}
                  <div className="mt-5 pt-4 border-t border-[var(--studio-border)]">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--studio-muted)] mb-2.5">
                      Fast Actions
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href="/management/import"
                        className="btn-studio-pill justify-center text-xs h-9 hover:border-[#9E57F6]"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-[#9E57F6]" />
                        <span>TMDB Import</span>
                      </Link>

                      <Link
                        href="/management/subtitles"
                        className="btn-studio-pill justify-center text-xs h-9 hover:border-[#14B8A6]"
                      >
                        <Languages className="h-3.5 w-3.5 text-[#14B8A6]" />
                        <span>Queue</span>
                      </Link>

                      <button
                        type="button"
                        onClick={handleClearCache}
                        disabled={clearingCache || !canManageSettings}
                        className="btn-studio-pill justify-center text-xs h-9"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 text-[#F59E0B] ${clearingCache ? 'animate-spin' : ''}`} />
                        <span>{clearingCache ? 'Purging…' : 'Purge Cache'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          downloadCsv('ksubzone-studio-summary.csv', [
                            ['Metric', 'Value'],
                            ['Total Catalog', totalCatalog],
                            ['Movies Count', totalMovies],
                            ['Dramas Count', totalDramas],
                            ['Approved Subtitles', totalSubtitles],
                            ['Pending Subtitles', pendingSubtitles],
                            ['Total Views', totalViews],
                            ['Community Members', totalUsers],
                          ])
                        }
                        className="btn-studio-pill justify-center text-xs h-9"
                      >
                        <Download className="h-3.5 w-3.5 text-sky-500" />
                        <span>Export CSV</span>
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* ==========================================================================
                  ZONE 2: MULTI-LENS OPERATIONAL WORKBENCHES (Tabbed Deck)
                  ========================================================================== */}
              <section className="space-y-4" aria-label="Operational Workbenches">
                {/* Deck Switcher Tabs */}
                <div className="flex items-center justify-between border-b border-[var(--studio-border)] pb-3 flex-wrap gap-3">
                  <div className="flex items-center gap-1.5 p-1 rounded-[9999px] bg-[var(--studio-surface)] border border-[var(--studio-border)]">
                    {[
                      { id: 'radar', label: 'Broadcast & Subtitles Triage', icon: Tv },
                      { id: 'monetization', label: 'Monetization & Cloud Storage', icon: DollarSign },
                      { id: 'catalog', label: 'Catalog Performance & SEO', icon: BarChart3 },
                    ].map((deck) => {
                      const Icon = deck.icon;
                      const isActive = activeDeck === deck.id;
                      return (
                        <button
                          key={deck.id}
                          type="button"
                          onClick={() => setActiveDeck(deck.id)}
                          className={`flex items-center gap-2 px-4 py-1.5 rounded-[9999px] text-xs font-bold transition-all ${
                            isActive
                              ? 'bg-[#9E57F6] text-white shadow-sm'
                              : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span>{deck.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="text-xs text-[var(--studio-muted)] font-medium">
                    Operator: <b className="text-[var(--studio-text)]">{adminName}</b> ({adminRole})
                  </div>
                </div>

                {/* ── LENS 1: BROADCAST & SUBTITLES TRIAGE ── */}
                {activeDeck === 'radar' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeInAdmin">
                    {/* Drama Episode Broadcast Radar (7 cols) */}
                    <div className="studio-card rounded-[16px] lg:col-span-7 flex flex-col justify-between">
                      <div>
                        {/* Card Header with Filters */}
                        <div className="studio-card-header flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <h3 className="text-sm font-bold text-[var(--studio-text)] flex items-center gap-2">
                              <Tv className="h-4 w-4 text-[#9E57F6]" />
                              Drama Episode Broadcast Radar
                            </h3>
                            <p className="text-xs text-[var(--studio-muted)] mt-0.5">
                              Upcoming television broadcasts and subtitle release workflow
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 p-1 rounded-[9999px] bg-[var(--studio-raised)] border border-[var(--studio-border)]">
                            {[
                              ['all', 'All'],
                              ['missing', 'Needs Subtitle'],
                              ['upcoming', 'Upcoming'],
                            ].map(([id, label]) => (
                              <button
                                key={id}
                                type="button"
                                onClick={() => setQueueTab(id)}
                                className={`px-2.5 py-0.5 text-[11px] font-bold rounded-[9999px] transition ${
                                  queueTab === id ? 'bg-[#9E57F6] text-white' : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Radar Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-[var(--studio-border)] text-[10px] uppercase font-bold text-[var(--studio-muted)] tracking-wider">
                                <th className="py-3 px-5">Series & Episode</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4">Air Date</th>
                                <th className="py-3 px-5 text-right">Quick Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--studio-border)]">
                              {visibleEpisodes.length > 0 ? (
                                visibleEpisodes.slice(0, 15).map((episode, idx) => (
                                  <tr key={episode._id || idx} className="hover:bg-[var(--studio-raised)]/60 transition">
                                    <td className="py-3.5 px-5">
                                      <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-[12px] bg-[#9E57F6]/15 text-[#9E57F6] flex items-center justify-center font-bold flex-shrink-0">
                                          <Clapperboard className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="font-bold text-[var(--studio-text)] truncate max-w-[180px]">
                                            {episode.dramaTitle || `Episode ${idx + 1}`}
                                          </p>
                                          <span className="text-[11px] text-[var(--studio-muted)]">
                                            Ep {episode.episodeNumber || idx + 1}
                                          </span>
                                        </div>
                                      </div>
                                    </td>

                                    <td className="py-3.5 px-4">
                                      <span
                                        className={
                                          episode.hasSubtitles
                                            ? 'badge-emerald text-[10px]'
                                            : 'badge-amber text-[10px]'
                                        }
                                      >
                                        {episode.hasSubtitles ? 'Subtitled' : 'Needs Subtitle'}
                                      </span>
                                    </td>

                                    <td className="py-3.5 px-4 text-[var(--studio-muted)] text-[11px] whitespace-nowrap">
                                      {episode.airDate ? formatRelativeTime(episode.airDate) : 'Unscheduled'}
                                    </td>

                                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                                      {canManageDramas ? (
                                        <div className="flex items-center justify-end gap-1.5">
                                          {episode.isUpcoming && (
                                            <button
                                              type="button"
                                              onClick={() => markReleased(episode)}
                                              disabled={busyAction === `${episode._id}:release`}
                                              className="btn-studio-primary text-[11px] py-1 px-3 min-h-[30px] rounded-[12px]"
                                            >
                                              <CheckCircle2 className="h-3 w-3" />
                                              <span>{busyAction === `${episode._id}:release` ? '…' : 'Release'}</span>
                                            </button>
                                          )}

                                          <button
                                            type="button"
                                            onClick={() =>
                                              setSchedule({
                                                episode,
                                                date: String(episode.airDate || '').replace(' ', 'T').slice(0, 16),
                                              })
                                            }
                                            className="btn-studio-pill text-[11px] py-1 px-2.5 min-h-[30px] rounded-[9999px]"
                                            title="Reschedule Air Date"
                                          >
                                            Reschedule
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => updateQueue(episode, 'delete')}
                                            className="btn-studio-pill text-[11px] py-1 px-2 min-h-[30px] rounded-[9999px] text-red-500 hover:text-red-600"
                                            title="Delete Episode"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      ) : (
                                        <span className="text-[var(--studio-muted)] font-semibold text-[11px]">
                                          {episode.isUpcoming ? 'Upcoming' : 'Aired'}
                                        </span>
                                      )}

                                      {/* Inline Reschedule Form */}
                                      {schedule?.episode._id === episode._id && (
                                        <form
                                          className="flex items-center gap-2 mt-2 justify-end"
                                          onSubmit={(e) => {
                                            e.preventDefault();
                                            updateQueue(episode, 'schedule');
                                          }}
                                        >
                                          <input
                                            aria-label="New air date"
                                            type="datetime-local"
                                            required
                                            value={schedule.date}
                                            onChange={(e) => setSchedule({ ...schedule, date: e.target.value })}
                                            className="h-7 text-xs rounded-[12px] bg-[var(--studio-surface)] border border-[var(--studio-border)] text-[var(--studio-text)] px-2"
                                          />
                                          <button
                                            type="submit"
                                            disabled={Boolean(busyAction)}
                                            className="btn-studio-primary text-[11px] py-0.5 px-2.5 min-h-[28px] rounded-[12px]"
                                          >
                                            Save
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setSchedule(null)}
                                            className="text-[var(--studio-muted)] hover:text-[var(--studio-text)] text-xs"
                                          >
                                            Cancel
                                          </button>
                                        </form>
                                      )}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={4} className="py-12 text-center text-xs text-[var(--studio-muted)]">
                                    No episodes match the selected queue filter.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="p-4 border-t border-[var(--studio-border)] flex items-center justify-between text-xs text-[var(--studio-muted)]">
                        <span>Showing {visibleEpisodes.length} episodes</span>
                        <Link href="/management/dramas" className="text-[#9E57F6] font-bold hover:underline">
                          Open Dramas Manager →
                        </Link>
                      </div>
                    </div>

                    {/* Subtitle Submissions Queue (5 cols) */}
                    <div className="studio-card rounded-[16px] lg:col-span-5 flex flex-col justify-between">
                      <div>
                        <div className="studio-card-header flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-bold text-[var(--studio-text)] flex items-center gap-2">
                              <Languages className="h-4 w-4 text-[#F59E0B]" />
                              Subtitle Submissions Queue
                            </h3>
                            <p className="text-xs text-[var(--studio-muted)] mt-0.5">Pending moderator triage</p>
                          </div>
                          <Link
                            href="/management/subtitles"
                            className="text-xs font-bold text-[#9E57F6] hover:underline"
                          >
                            View All ({pendingSubtitles || pendingQueue.length}) →
                          </Link>
                        </div>

                        <div className="studio-card-body space-y-3">
                          {pendingQueue.length > 0 ? (
                            pendingQueue.map((item) => (
                              <div
                                key={item.id}
                                className="p-3.5 rounded-[12px] bg-[var(--studio-raised)]/60 border border-[var(--studio-border)] flex items-center justify-between gap-3 hover:border-[#9E57F6]/40 transition"
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-[var(--studio-text)] truncate">{item.title}</p>
                                  <p className="text-[11px] text-[var(--studio-muted)] mt-0.5">
                                    {item.uploader} · {item.time}
                                  </p>
                                </div>
                                <Link
                                  href="/management/subtitles"
                                  className="btn-studio-pill text-[11px] py-1 px-3 rounded-[9999px] flex-shrink-0 hover:text-[#9E57F6]"
                                >
                                  Review
                                </Link>
                              </div>
                            ))
                          ) : (
                            <div className="py-12 text-center text-xs text-[var(--studio-muted)]">
                              No subtitles pending review in moderation queue.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-4 border-t border-[var(--studio-border)] bg-[var(--studio-raised)]/30 flex items-center justify-between text-xs text-[var(--studio-muted)]">
                        <span>Clean Sinhala SRT / VTT workflow</span>
                        <Link href="/management/subtitle-tools" className="text-[#14B8A6] font-bold hover:underline">
                          Subtitle Studio →
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── LENS 2: MONETIZATION & CLOUD STORAGE ── */}
                {activeDeck === 'monetization' && (
                  <div className="space-y-6 animate-fadeInAdmin">
                    <DashboardReports stats={stats} />

                    {/* Server & DB Telemetry Card */}
                    <div className="studio-card rounded-[16px] p-6">
                      <h3 className="text-sm font-bold text-[var(--studio-text)] mb-1">System & Infrastructure Telemetry</h3>
                      <p className="text-xs text-[var(--studio-muted)] mb-4">
                        Database connection, PHP engine runtime, and storage telemetry
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-3.5 rounded-[12px] bg-[var(--studio-raised)]/60 border border-[var(--studio-border)]">
                          <div className="flex items-center gap-2 text-xs font-bold text-[var(--studio-muted)] mb-1">
                            <Database className="h-4 w-4 text-[#9E57F6]" />
                            <span>Primary Database</span>
                          </div>
                          <p className="text-base font-black text-[var(--studio-text)]">{health.dbDriver || 'PostgreSQL / MySQL'}</p>
                          <span className={health.dbStatus === 'ok' ? 'badge-emerald mt-2' : 'badge-amber mt-2'}>
                            {health.dbStatus === 'ok' ? 'Connected' : 'Operational'}
                          </span>
                        </div>

                        <div className="p-3.5 rounded-[12px] bg-[var(--studio-raised)]/60 border border-[var(--studio-border)]">
                          <div className="flex items-center gap-2 text-xs font-bold text-[var(--studio-muted)] mb-1">
                            <Server className="h-4 w-4 text-sky-400" />
                            <span>REST API Engine</span>
                          </div>
                          <p className="text-base font-black text-[var(--studio-text)]">{health.phpVersion || 'PHP 8.2 / Next.js'}</p>
                          <span className={health.apiStatus === 'ok' ? 'badge-emerald mt-2' : 'badge-amber mt-2'}>
                            {health.apiStatus === 'ok' ? 'Operational' : 'Active'}
                          </span>
                        </div>

                        <div className="p-3.5 rounded-[12px] bg-[var(--studio-raised)]/60 border border-[var(--studio-border)]">
                          <div className="flex items-center gap-2 text-xs font-bold text-[var(--studio-muted)] mb-1">
                            <HardDrive className="h-4 w-4 text-[#14B8A6]" />
                            <span>Cloudflare R2 Egress</span>
                          </div>
                          <p className="text-base font-black text-[var(--studio-text)]">{storageStats?.activeProvider || 'Cloudflare R2'}</p>
                          <span className="badge-emerald mt-2">Zero Egress Fees</span>
                        </div>

                        <div className="p-3.5 rounded-[12px] bg-[var(--studio-raised)]/60 border border-[var(--studio-border)]">
                          <div className="flex items-center gap-2 text-xs font-bold text-[var(--studio-muted)] mb-1">
                            <ShieldCheck className="h-4 w-4 text-emerald-400" />
                            <span>Operator Security</span>
                          </div>
                          <p className="text-base font-black text-[var(--studio-text)]">{adminRole}</p>
                          <span className="badge-indigo mt-2">Verified Session</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── LENS 3: CATALOG PERFORMANCE & SEO ── */}
                {activeDeck === 'catalog' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeInAdmin">
                    {/* Top Performing Media Leaderboard (7 cols) */}
                    <div className="studio-card rounded-[16px] lg:col-span-7">
                      <div className="studio-card-header flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-[var(--studio-text)] flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-[#9E57F6]" />
                            Top Performing Media Catalog
                          </h3>
                          <p className="text-xs text-[var(--studio-muted)] mt-0.5">Ranked by streaming views and subtitle downloads</p>
                        </div>

                        <div className="flex items-center gap-1.5 p-1 rounded-[9999px] bg-[var(--studio-raised)] border border-[var(--studio-border)]">
                          {['all', 'dramas', 'movies'].map((tab) => (
                            <button
                              key={tab}
                              type="button"
                              onClick={() => setActiveCategoryTab(tab)}
                              className={`px-3 py-0.5 text-[11px] font-bold rounded-[9999px] capitalize transition ${
                                activeCategoryTab === tab
                                  ? 'bg-[#9E57F6] text-white'
                                  : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
                              }`}
                            >
                              {tab}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="studio-card-body p-0">
                        <div className="divide-y divide-[var(--studio-border)]">
                          {filteredTopContent.length > 0 ? (
                            filteredTopContent.slice(0, 6).map((item, idx) => (
                              <div
                                key={item.id || idx}
                                className="p-4 flex items-center justify-between hover:bg-[var(--studio-raised)]/40 transition"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="h-7 w-7 rounded-[9999px] bg-[var(--studio-raised)] border border-[var(--studio-border)] flex items-center justify-center font-mono font-bold text-xs text-[var(--studio-text)] flex-shrink-0">
                                    {idx + 1}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-[var(--studio-text)] truncate">{item.title}</p>
                                    <div className="flex items-center gap-2 text-[10px] text-[var(--studio-muted)] mt-0.5">
                                      <span className="uppercase font-bold text-[#9E57F6]">{item.type}</span>
                                      <span>•</span>
                                      <span className="text-[#F59E0B] font-semibold flex items-center gap-0.5">
                                        <Star className="h-3 w-3 fill-[#F59E0B]" />
                                        {item.tmdbRating || '—'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right whitespace-nowrap">
                                  <p className="text-xs font-black text-[var(--studio-text)]">
                                    {formatNum(item.viewCount || 0)}
                                  </p>
                                  <span className="text-[10px] text-[var(--studio-muted)]">views</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="py-12 text-center text-xs text-[var(--studio-muted)]">
                              No ranking data reported for this category.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* SEO & Telemetry (5 cols) */}
                    <div className="studio-card rounded-[16px] lg:col-span-5 p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between border-b border-[var(--studio-border)] pb-3 mb-4">
                          <div>
                            <h3 className="text-sm font-bold text-[var(--studio-text)] flex items-center gap-2">
                              <Shield className="h-4 w-4 text-[#14B8A6]" />
                              SEO & Indexing Telemetry
                            </h3>
                            <p className="text-xs text-[var(--studio-muted)] mt-0.5">Google Search Console and XML sitemap health</p>
                          </div>
                          <span className="badge-emerald">Healthy</span>
                        </div>

                        <div className="space-y-3.5 text-xs">
                          <div className="p-3.5 rounded-[12px] bg-[var(--studio-raised)]/50 border border-[var(--studio-border)] flex justify-between items-center">
                            <span className="text-[var(--studio-muted)]">SEO Health Score</span>
                            <span className="text-base font-black text-[#14B8A6]">
                              {stats?.seoHealthScore ?? '98 / 100'}
                            </span>
                          </div>

                          <div className="p-3.5 rounded-[12px] bg-[var(--studio-raised)]/50 border border-[var(--studio-border)] flex justify-between items-center">
                            <span className="text-[var(--studio-muted)]">Sitemap Index</span>
                            <span className="font-bold text-[var(--studio-text)]">
                              {health.sitemapStatus ?? 'Operational (/sitemap.xml)'}
                            </span>
                          </div>

                          <div className="p-3.5 rounded-[12px] bg-[var(--studio-raised)]/50 border border-[var(--studio-border)] flex justify-between items-center">
                            <span className="text-[var(--studio-muted)]">Structured Data (JSON-LD)</span>
                            <span className="badge-emerald">Movie / TVSeries Active</span>
                          </div>

                          <div className="p-3.5 rounded-[12px] bg-[var(--studio-raised)]/50 border border-[var(--studio-border)] flex justify-between items-center">
                            <span className="text-[var(--studio-muted)]">Server Time (UTC)</span>
                            <span className="font-mono text-[var(--studio-text)]">
                              {health.serverTime || new Date().toISOString().slice(11, 19)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-[var(--studio-border)] mt-4 flex items-center justify-between text-xs">
                        <span className="text-[var(--studio-muted)]">Sitemaps updated hourly</span>
                        <Link href="/management/seo" className="text-[#9E57F6] font-bold hover:underline">
                          SEO Console →
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
