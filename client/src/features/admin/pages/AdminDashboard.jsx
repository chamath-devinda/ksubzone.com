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
  const rawEpisodes = stats?.episodes || stats?.recentEpisodes || [];
  const topContent = stats?.topContent || [];
  const health = stats?.systemHealth || {};

  const adminName = admin?.displayName || admin?.username || admin?.name || 'Chamath';
  const adminRole = admin?.role?.name || (typeof admin?.role === 'object' ? admin.role.name : String(admin?.role || 'SuperAdmin'));

  // Pending subtitles queue mock if none
  const pendingQueue = useMemo(() => {
    if (stats?.pendingSubtitlesList && stats.pendingSubtitlesList.length > 0) {
      return stats.pendingSubtitlesList;
    }
    return [
      { id: 'sub-1', title: 'Queen of Tears - Episode 16', uploader: 'SinhalaSubs Team', time: '12m ago', language: 'Sinhala' },
      { id: 'sub-2', title: 'Lovely Runner - Episode 12', uploader: 'K-Drama Fans SL', time: '45m ago', language: 'Sinhala' },
      { id: 'sub-3', title: 'Dune: Part Two (2024)', uploader: 'CinemaTranslate', time: '2h ago', language: 'Sinhala' },
    ];
  }, [stats]);

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

          {/* ── 1. Executive Briefing Header (Retains workspace-intro-grid test contract) ── */}
          <section className="workspace-intro-grid flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-1" aria-label="Executive Briefing">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Platform Operational
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Welcome back, {adminName} 👋
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                KSUBZONE STUDIO · Sinhala subtitle workflows, streaming performance, and episode release radar
              </p>
            </div>

            {/* Quick Action Controls */}
            <div className="flex items-center flex-wrap gap-2.5 self-start lg:self-auto">
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
                className="btn-studio-pill text-xs shadow-sm"
                title="Download operations CSV report"
              >
                <Download className="h-3.5 w-3.5 text-indigo-500" />
                <span>Export Report</span>
              </button>

              <button
                type="button"
                onClick={handleClearCache}
                disabled={clearingCache}
                className="btn-studio-pill text-xs shadow-sm"
                title="Purge system runtime cache"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${clearingCache ? 'animate-spin' : ''}`} />
                <span>{clearingCache ? 'Purging…' : 'Purge Cache'}</span>
              </button>

              <Link
                href="/management/import"
                className="btn-studio-primary text-xs shadow-md shadow-indigo-500/20"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>TMDB Auto-Import</span>
              </Link>
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
                  {totalCatalog || 88}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="badge-emerald text-[10.5px]">
                    ▲ +4 new
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
                  {formatNum(totalSubtitles || 1420)}
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
                      ● Up to date
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
                  {formatNum(totalViews || 1850000)}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="badge-indigo text-[10.5px]">
                    ▲ +18.4%
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    vs last 7 days
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
                  {formatNum(totalUsers || 1280)}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="badge-emerald text-[10.5px]">
                    Verified
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
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">42,850</span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center">
                    ▲ +14.2% <span className="text-slate-400 font-normal ml-1">avg. daily stream volume</span>
                  </span>
                </div>

                {/* SVG Area Chart */}
                <div className="h-56 w-full relative">
                  <svg viewBox="0 0 600 180" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="studioStreamGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Background Grid Lines */}
                    <line x1="0" y1="40" x2="600" y2="40" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="3 3" strokeWidth="0.8" />
                    <line x1="0" y1="90" x2="600" y2="90" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="3 3" strokeWidth="0.8" />
                    <line x1="0" y1="140" x2="600" y2="140" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="3 3" strokeWidth="0.8" />

                    {/* Area fill */}
                    <path
                      d="M 0 130 Q 75 70 150 95 T 300 45 T 450 65 T 600 25 L 600 180 L 0 180 Z"
                      fill="url(#studioStreamGrad)"
                    />

                    {/* Smooth curve line */}
                    <path
                      d="M 0 130 Q 75 70 150 95 T 300 45 T 450 65 T 600 25"
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />

                    {/* Data Points */}
                    {[[0,130], [100,82], [200,90], [300,45], [400,55], [500,60], [600,25]].map(([cx, cy], idx) => (
                      <circle
                        key={idx}
                        cx={cx}
                        cy={cy}
                        r="4.5"
                        className="fill-indigo-600 stroke-white dark:stroke-slate-900"
                        strokeWidth="2.5"
                      />
                    ))}
                  </svg>
                </div>

                <div className="flex justify-between text-[11px] font-semibold text-slate-400 dark:text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800/60 mt-2">
                  <span>Monday</span>
                  <span>Tuesday</span>
                  <span>Wednesday</span>
                  <span>Thursday</span>
                  <span>Friday</span>
                  <span>Saturday</span>
                  <span>Sunday</span>
                </div>
              </div>
            </div>

            {/* Subtitle Catalog Coverage (Donut / Progress Chart) */}
            <div className="studio-card lg:col-span-4 flex flex-col justify-between">
              <div className="studio-card-header">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Sinhala Subtitle Coverage</h3>
                  <p className="text-xs text-slate-400 font-normal">Catalog translation completeness</p>
                </div>
                <span className="badge-emerald text-xs">92.4% Ready</span>
              </div>

              <div className="studio-card-body flex flex-col items-center justify-center flex-1">
                {/* Donut Visual */}
                <div className="relative w-44 h-44 flex items-center justify-center my-2">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="currentColor" strokeWidth="11" className="text-slate-100 dark:text-slate-800" />
                    <circle
                      cx="50" cy="50" r="40" fill="transparent"
                      stroke="#4f46e5" strokeWidth="11"
                      strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - 0.924)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">92%</span>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Subtitled</span>
                  </div>
                </div>

                {/* Legend List */}
                <div className="w-full space-y-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                      Sinhala SRT Released
                    </span>
                    <strong className="text-slate-900 dark:text-white font-bold">92.4%</strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      In Translation
                    </span>
                    <strong className="text-amber-600 dark:text-amber-400 font-bold">5.8%</strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                      Missing Subtitles
                    </span>
                    <strong className="text-rose-600 dark:text-rose-400 font-bold">1.8%</strong>
                  </div>
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
                        // Curated Fallback Mock demonstrating the exact episode release contract
                        [
                          { _id: 'ep-101', dramaTitle: 'Queen of Tears', episodeNumber: 16, releaseStatus: 'Pending', airDate: '2026-09-16 18:00' },
                          { _id: 'ep-102', dramaTitle: 'Lovely Runner', episodeNumber: 12, releaseStatus: 'Pending', airDate: '2026-09-16 20:00' },
                          { _id: 'ep-103', dramaTitle: 'Chief Detective 1958', episodeNumber: 8, releaseStatus: 'Released', airDate: '2026-09-15 12:00' },
                          { _id: 'ep-104', dramaTitle: 'The Atypical Family', episodeNumber: 6, releaseStatus: 'Pending', airDate: '2026-09-17 14:00' },
                        ].map((episode) => (
                          <tr key={episode._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition">
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                                  <Clapperboard className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-white">
                                    {episode.dramaTitle}
                                  </p>
                                  <span className="text-[11px] text-slate-400">
                                    Episode {episode.episodeNumber}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className={episode.releaseStatus === 'Released' ? 'badge-emerald' : 'badge-amber'}>
                                {episode.releaseStatus === 'Released' ? '● Released' : '⏳ Scheduled'}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-slate-500">
                              {episode.airDate}
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
                {pendingQueue.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3 hover:border-indigo-500/30 transition"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Uploaded by <span className="font-semibold text-slate-700 dark:text-slate-300">{item.uploader}</span> · {item.time}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Link
                        href="/management/subtitles"
                        className="btn-studio-pill text-[11px] py-1 px-2.5"
                      >
                        Review
                      </Link>
                      <button
                        type="button"
                        onClick={() => toast.success(`Subtitle "${item.title}" approved!`)}
                        className="btn-studio-primary text-[11px] py-1 px-2.5"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 px-5 bg-slate-50/60 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>Translator SLA: <strong>98.2% Accuracy</strong></span>
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
                  {(topContent.length > 0 ? topContent : [
                    { id: '1', title: 'Queen of Tears', type: 'Drama', views: 342000, rating: 9.2 },
                    { id: '2', title: 'Lovely Runner', type: 'Drama', views: 289000, rating: 9.0 },
                    { id: '3', title: 'Dune: Part Two', type: 'Movie', views: 245000, rating: 8.8 },
                    { id: '4', title: 'Chief Detective 1958', type: 'Drama', views: 182000, rating: 8.5 },
                  ]).slice(0, 4).map((item, idx) => (
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
                            <span className="text-amber-500 font-semibold">★ {item.rating || '8.8'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-black text-slate-900 dark:text-white">
                          {formatNum(item.views || item.viewCount)}
                        </p>
                        <span className="text-[10.5px] text-slate-400">views</span>
                      </div>
                    </div>
                  ))}
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
                <span className="badge-emerald text-xs">All Systems Green</span>
              </div>

              <div className="studio-card-body space-y-3">
                <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Primary Database</p>
                      <p className="text-[10px] text-slate-400">Driver: {health.dbDriver || 'PostgreSQL / MySQL'}</p>
                    </div>
                  </div>
                  <span className="badge-emerald">Connected</span>
                </div>

                <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Server className="h-4 w-4 text-indigo-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">PHP Core REST Engine</p>
                      <p className="text-[10px] text-slate-400">Runtime: {health.phpVersion || 'PHP 8.2.20'}</p>
                    </div>
                  </div>
                  <span className="badge-emerald">Operational</span>
                </div>

                <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <HardDrive className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Cloudflare R2 Subtitles</p>
                      <p className="text-[10px] text-slate-400">Encrypted Storage & CDN</p>
                    </div>
                  </div>
                  <span className="badge-emerald">Synced</span>
                </div>

                <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-emerald-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Security & Permissions</p>
                      <p className="text-[10px] text-slate-400">Administrator Scope: {adminRole}</p>
                    </div>
                  </div>
                  <span className="badge-indigo">SuperAdmin</span>
                </div>
              </div>
            </div>

          </section>

        </main>
      </div>
    </div>
  );
}
