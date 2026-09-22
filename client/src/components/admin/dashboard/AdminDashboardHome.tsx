'use client';

import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '@/services/api/apiClient';
import {
  LayoutDashboard,
  Film,
  Tv,
  Languages,
  Users,
  DownloadCloud,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  WandSparkles,
  Server,
  Zap,
  Eye,
  FileText,
  Star,
  DollarSign,
  BarChart3,
  Calendar,
  Layers,
  Search,
  ArrowRight,
  Database,
  ExternalLink,
  Plus,
  Radio,
  Check,
  AlertTriangle,
  ChevronRight,
  HardDrive
} from 'lucide-react';

interface DashboardStats {
  counts?: {
    totalMovies?: number;
    movies?: number;
    totalDramas?: number;
    dramas?: number;
    totalEpisodes?: number;
    episodes?: number;
    totalSubtitles?: number;
    subtitles?: number;
    totalArticles?: number;
    articles?: number;
    totalUsers?: number;
    users?: number;
    totalReviews?: number;
    reviews?: number;
    totalViews?: number;
    views?: number;
    totalTrafficViews?: number;
    totalDownloads?: number;
    downloads?: number;
    pendingSubtitles?: number;
  };
  subtitleStats?: {
    pending?: number;
    approved?: number;
    rejected?: number;
  };
  topContent?: Array<{
    _id: string;
    title: string;
    slug: string;
    poster?: string;
    type: 'Movie' | 'Drama';
    viewCount?: number;
    tmdbRating?: number;
    isTrending?: boolean;
    status?: string;
  }>;
  upcomingEpisodes?: Array<{
    _id: string;
    episodeNumber: number;
    episodeTitle?: string;
    airDate?: string;
    dramaTitle?: string;
    dramaSlug?: string;
    hasSubtitles?: boolean;
    isUpcoming?: boolean;
  }>;
  mostDownloaded?: Array<{
    _id: string;
    mediaTitle?: string;
    mediaType?: string;
    language?: string;
    downloads?: number;
    uploaderName?: string;
    lastDownloadedAt?: string;
  }>;
  latestDownloads?: Array<{
    _id: string;
    mediaTitle?: string;
    mediaType?: string;
    language?: string;
    downloads?: number;
    uploaderName?: string;
    lastDownloadedAt?: string;
  }>;
  trafficLogs?: Array<{
    date: string;
    views: number;
    visitors?: number;
  }>;
  trendingSearches?: Array<{
    query: string;
    count?: number;
  }>;
  systemHealth?: {
    dbDriver?: string;
    serverTime?: string;
    phpVersion?: string;
    dbStatus?: string;
    apiStatus?: string;
    timezone?: string;
  };
  storageStats?: {
    activeProvider?: string;
    totalSubtitles?: number;
    r2Count?: number;
    supabaseCount?: number;
    migrationProgressPercent?: number;
  };
}

interface AdsterraMetrics {
  configured?: boolean;
  state?: string;
  summary?: {
    impressions?: number;
    revenue?: number;
    cpm?: number;
    clicks?: number;
    ctr?: number;
  };
}

export interface AdminDashboardHomeProps {
  onNavigate: (path: string) => void;
}

function formatNum(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return Number(n).toLocaleString();
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr.replace(' ', 'T'));
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (isNaN(diff)) return dateStr;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return dateStr;
  }
}

export function AdminDashboardHome({ onNavigate }: AdminDashboardHomeProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [adsterra, setAdsterra] = useState<AdsterraMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [clearingCache, setClearingCache] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'radar' | 'topContent' | 'downloads' | 'traffic'>('radar');
  const [episodeFilter, setEpisodeFilter] = useState<'all' | 'missing' | 'subbed'>('missing');
  const [trafficRange, setTrafficRange] = useState<'7d' | '30d'>('7d');

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashRes, adRes] = await Promise.allSettled([
        apiClient.get('/api/admin/dashboard'),
        apiClient.get('/api/admin/adsterra/stats?range=30')
      ]);

      if (dashRes.status === 'fulfilled') {
        setStats(dashRes.value.data || {});
      } else {
        setError('Could not retrieve telemetry from analytics server.');
      }

      if (adRes.status === 'fulfilled') {
        setAdsterra(adRes.value.data || {});
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleClearCache = async () => {
    setClearingCache(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/api/admin/clear-cache');
      setSuccess('Runtime cache purged successfully across all edge nodes.');
      setTimeout(() => setSuccess(''), 5000);
    } catch {
      setError('Cache purge failed.');
    } finally {
      setClearingCache(false);
    }
  };

  // Safe normalized metrics
  const counts = stats?.counts || {};
  const totalMovies = counts.totalMovies ?? counts.movies ?? 0;
  const totalDramas = counts.totalDramas ?? counts.dramas ?? 0;
  const totalEpisodes = counts.totalEpisodes ?? counts.episodes ?? 0;
  const totalSubtitles = counts.totalSubtitles ?? counts.subtitles ?? 0;
  const totalArticles = counts.totalArticles ?? counts.articles ?? 0;
  const totalUsers = counts.totalUsers ?? counts.users ?? 0;
  const totalViews = counts.totalViews ?? counts.views ?? 0;
  const totalDownloads = counts.totalDownloads ?? counts.downloads ?? 0;
  const totalReviews = counts.totalReviews ?? counts.reviews ?? 0;
  const pendingSubtitles = stats?.subtitleStats?.pending ?? counts.pendingSubtitles ?? 0;

  // Filtered episodes
  const upcomingEpisodes = stats?.upcomingEpisodes || [];
  const filteredEpisodes = useMemo(() => {
    if (episodeFilter === 'missing') return upcomingEpisodes.filter(e => !e.hasSubtitles);
    if (episodeFilter === 'subbed') return upcomingEpisodes.filter(e => e.hasSubtitles);
    return upcomingEpisodes;
  }, [upcomingEpisodes, episodeFilter]);

  // Traffic series
  const trafficLogs = stats?.trafficLogs || [];
  const trafficSeries = useMemo(() => {
    const days = trafficRange === '7d' ? 7 : 30;
    return trafficLogs.slice(-days);
  }, [trafficLogs, trafficRange]);

  const maxTraffic = useMemo(() => {
    if (!trafficSeries.length) return 1;
    return Math.max(...trafficSeries.map(t => Number(t.views || 0)), 1);
  }, [trafficSeries]);

  const trafficTotal = useMemo(() => {
    return trafficSeries.reduce((acc, curr) => acc + Number(curr.views || 0), 0);
  }, [trafficSeries]);

  return (
    <div className="space-y-6 pb-12">
      {/* ─── Top Command Center Header ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-lg bg-[#9E57F6]/15 text-[#9E57F6] border border-[#9E57F6]/30">
              <LayoutDashboard className="w-4 h-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">KSubZone Command Center</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SYSTEM ONLINE
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
              R2 CDN Live
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Real-time management radar for streaming catalog, subtitle moderation queue, Cloudflare R2 object delivery, and traffic telemetry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={clearingCache}
            onClick={handleClearCache}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/10 border border-amber-500/25 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/40 hover:text-white transition active:scale-95 disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 text-amber-400 ${clearingCache ? 'animate-bounce' : ''}`} />
            <span>{clearingCache ? 'Purging...' : 'Purge Edge Cache'}</span>
          </button>
          <button
            type="button"
            onClick={fetchStats}
            disabled={loading}
            className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-400 hover:bg-purple-500/20 hover:text-white transition active:scale-95"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#9E57F6]' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── Alerts ─── */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={fetchStats} className="text-[11px] underline font-bold hover:text-white">Retry</button>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
          <span className="font-medium">{success}</span>
        </div>
      )}

      {/* ─── Primary 8-KPI High Density Grid ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Movies */}
        <div className="p-4 rounded-2xl bg-[#141418] border border-white/[0.06] hover:border-purple-500/30 transition flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Movies in Library</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Film className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white">{totalMovies}</span>
            <button
              type="button"
              onClick={() => onNavigate('/management/movies')}
              className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] transition flex items-center gap-1"
            >
              Catalog <ChevronRight className="w-2.5 h-2.5" />
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-white/[0.04]">
            <span>Published titles</span>
            <button
              onClick={() => onNavigate('/management/movies')}
              className="text-purple-400 font-semibold hover:underline flex items-center gap-0.5"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
        </div>

        {/* 2. Dramas & TV */}
        <div className="p-4 rounded-2xl bg-[#141418] border border-white/[0.06] hover:border-sky-500/30 transition flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dramas & TV Series</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Tv className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white">{totalDramas}</span>
            <button
              type="button"
              onClick={() => onNavigate('/management/dramas')}
              className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] transition flex items-center gap-1"
            >
              Series <ChevronRight className="w-2.5 h-2.5" />
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-white/[0.04]">
            <span>{totalEpisodes} Episodes tracked</span>
            <button
              onClick={() => onNavigate('/management/dramas')}
              className="text-sky-400 font-semibold hover:underline flex items-center gap-0.5"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
        </div>

        {/* 3. Subtitles */}
        <div className="p-4 rounded-2xl bg-[#141418] border border-white/[0.06] hover:border-pink-500/30 transition flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Subtitles Served</span>
            <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
              <Languages className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white">{totalSubtitles}</span>
            {pendingSubtitles > 0 ? (
              <button
                onClick={() => onNavigate('/management/subtitles')}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse"
              >
                ● {pendingSubtitles} Pending
              </button>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                ● Clean
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-white/[0.04]">
            <span>Verified Sinhala SRTs</span>
            <button
              onClick={() => onNavigate('/management/subtitles')}
              className="text-pink-400 font-semibold hover:underline flex items-center gap-0.5"
            >
              Queue
            </button>
          </div>
        </div>

        {/* 4. Articles */}
        <div className="p-4 rounded-2xl bg-[#141418] border border-white/[0.06] hover:border-amber-500/30 transition flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Articles & News</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white">{totalArticles}</span>
            <button
              type="button"
              onClick={() => onNavigate('/management/articles')}
              className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] transition flex items-center gap-1"
            >
              Articles <ChevronRight className="w-2.5 h-2.5" />
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-white/[0.04]">
            <span>Guides & editorial</span>
            <button
              onClick={() => onNavigate('/management/articles')}
              className="text-amber-400 font-semibold hover:underline flex items-center gap-0.5"
            >
              <Plus className="w-3 h-3" /> Write
            </button>
          </div>
        </div>

        {/* 5. Total Views */}
        <div className="p-4 rounded-2xl bg-[#141418] border border-white/[0.06] hover:border-emerald-500/30 transition flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Content Views</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white">{formatNum(totalViews)}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +Live
            </span>
          </div>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-white/[0.04] truncate">
            {formatNum(counts.totalTrafficViews || 0)} site visits tracked
          </div>
        </div>

        {/* 6. Total Downloads */}
        <div className="p-4 rounded-2xl bg-[#141418] border border-white/[0.06] hover:border-indigo-500/30 transition flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Subtitle Downloads</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <DownloadCloud className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white">{formatNum(totalDownloads)}</span>
            <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
              0 Egress
            </span>
          </div>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-white/[0.04]">
            Cloudflare R2 global stream
          </div>
        </div>

        {/* 7. Members */}
        <div className="p-4 rounded-2xl bg-[#141418] border border-white/[0.06] hover:border-teal-500/30 transition flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Registered Members</span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white">{totalUsers}</span>
            <button
              onClick={() => onNavigate('/management/users')}
              className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/[0.04] text-slate-400 hover:text-white transition flex items-center gap-1"
            >
              Users <ChevronRight className="w-2.5 h-2.5" />
            </button>
          </div>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-white/[0.04]">
            Translators & active members
          </div>
        </div>

        {/* 8. Reviews */}
        <div className="p-4 rounded-2xl bg-[#141418] border border-white/[0.06] hover:border-rose-500/30 transition flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Reviews & Ratings</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Star className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white">{totalReviews}</span>
            <button
              onClick={() => onNavigate('/management/comments')}
              className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/[0.04] text-slate-400 hover:text-white transition flex items-center gap-1"
            >
              Reviews <ChevronRight className="w-2.5 h-2.5" />
            </button>
          </div>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-white/[0.04]">
            Audience ratings & feedback
          </div>
        </div>
      </div>

      {/* ─── Adsterra Monetization Radar Banner ─── */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#141418] via-[#16161d] to-[#141418] border border-white/[0.08] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/20">
                <DollarSign className="w-3.5 h-3.5" />
              </span>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Adsterra Monetization Telemetry</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Active & Serving
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Multi-format ad delivery: 728x90 Leaderboard, 300x250 Square, 160x600 Sidebar, Native Grid, Social Bar & Popunder.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="text-left md:text-right border-l md:border-l-0 md:border-r border-white/10 pl-3 md:pl-0 md:pr-4">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">30D Est. Revenue</span>
              <span className="text-base font-black text-amber-400">
                ${adsterra?.summary?.revenue ? Number(adsterra.summary.revenue).toFixed(2) : '0.00'}
                <span className="text-xs font-normal text-slate-400 ml-1.5">
                  (≈ Rs. {Math.round((adsterra?.summary?.revenue || 0) * 330).toLocaleString()})
                </span>
              </span>
            </div>

            <div className="text-left md:text-right border-l md:border-l-0 md:border-r border-white/10 pl-3 md:pl-0 md:pr-4">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Impressions</span>
              <span className="text-base font-black text-slate-200">
                {formatNum(adsterra?.summary?.impressions || 0)}
              </span>
            </div>

            <div className="text-left md:text-right border-l md:border-l-0 pl-3 md:pl-0">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Avg CPM</span>
              <span className="text-base font-black text-emerald-400">
                ${adsterra?.summary?.cpm ? Number(adsterra.summary.cpm).toFixed(2) : '0.00'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Interactive Deep-Dive Deck (Tabs) ─── */}
      <div className="bg-[#141418] border border-white/[0.06] rounded-2xl overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-white/[0.06] px-5 pt-3 gap-2 bg-[#0E0E12]">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('radar')}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border-b-2 transition ${
                activeTab === 'radar'
                  ? 'border-[#9E57F6] text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-[#9E57F6]" />
              <span>Episode Subtitle Radar</span>
              {upcomingEpisodes.filter(e => !e.hasSubtitles).length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500/20 text-rose-400 font-bold">
                  {upcomingEpisodes.filter(e => !e.hasSubtitles).length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('topContent')}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border-b-2 transition ${
                activeTab === 'topContent'
                  ? 'border-sky-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
              <span>Top Content</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('downloads')}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border-b-2 transition ${
                activeTab === 'downloads'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <DownloadCloud className="w-3.5 h-3.5 text-indigo-400" />
              <span>Downloads Stream</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('traffic')}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border-b-2 transition ${
                activeTab === 'traffic'
                  ? 'border-emerald-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Traffic Velocity</span>
            </button>
          </div>

          {activeTab === 'radar' && (
            <div className="flex items-center gap-1.5 pb-2">
              <button
                onClick={() => setEpisodeFilter('missing')}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition ${
                  episodeFilter === 'missing'
                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 bg-white/5 border border-white/10'
                }`}
              >
                Missing Subs Only
              </button>
              <button
                onClick={() => setEpisodeFilter('all')}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition ${
                  episodeFilter === 'all'
                    ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 bg-white/5 border border-white/10'
                }`}
              >
                All Episodes
              </button>
            </div>
          )}

          {activeTab === 'traffic' && (
            <div className="flex items-center gap-1 pb-2">
              <button
                onClick={() => setTrafficRange('7d')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                  trafficRange === '7d' ? 'bg-[#9E57F6] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setTrafficRange('30d')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                  trafficRange === '30d' ? 'bg-[#9E57F6] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                30 Days
              </button>
            </div>
          )}
        </div>

        {/* Tab Body */}
        <div className="p-5">
          {/* TAB 1: Episode Radar */}
          {activeTab === 'radar' && (
            <div className="space-y-3">
              {filteredEpisodes.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400/60 mx-auto mb-2" />
                  <p className="font-bold text-slate-300">All Episodes are fully subtitled!</p>
                  <p className="mt-0.5">No ongoing drama episodes are missing Sinhala subtitles right now.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="pb-2.5">Drama / Series</th>
                        <th className="pb-2.5">Episode</th>
                        <th className="pb-2.5">Air Date</th>
                        <th className="pb-2.5">Status</th>
                        <th className="pb-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {filteredEpisodes.slice(0, 10).map((ep) => (
                        <tr key={ep._id} className="hover:bg-white/[0.02] transition group">
                          <td className="py-3 font-semibold text-slate-200">
                            <span className="group-hover:text-sky-400 transition">{ep.dramaTitle}</span>
                          </td>
                          <td className="py-3 text-slate-300">
                            <span className="px-2 py-0.5 rounded bg-white/[0.05] font-mono text-[11px]">
                              EP {ep.episodeNumber}
                            </span>
                          </td>
                          <td className="py-3 text-slate-400 font-mono text-[11px]">
                            {ep.airDate ? ep.airDate.slice(0, 10) : '—'}
                          </td>
                          <td className="py-3">
                            {ep.hasSubtitles ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                <Check className="w-3 h-3" /> Subtitled
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/20 animate-pulse">
                                <AlertTriangle className="w-3 h-3" /> Missing Subtitle
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() => onNavigate('/management/ai-translate')}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#9E57F6]/15 text-[#9E57F6] hover:bg-[#9E57F6]/25 transition border border-[#9E57F6]/30 inline-flex items-center gap-1"
                            >
                              <Sparkles className="w-3 h-3" /> Translate AI
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Top Content */}
          {activeTab === 'topContent' && (
            <div className="space-y-3">
              {(stats?.topContent || []).length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No view activity recorded yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {(stats?.topContent || []).map((item) => (
                    <div
                      key={item._id}
                      className="p-3 rounded-xl bg-[#0C0C0E] border border-white/[0.06] flex items-center gap-3 hover:border-white/20 transition group"
                    >
                      {item.poster ? (
                        <img
                          src={item.poster}
                          alt={item.title}
                          className="w-12 h-16 object-cover rounded-lg flex-shrink-0 bg-slate-800"
                        />
                      ) : (
                        <div className="w-12 h-16 rounded-lg bg-slate-800 flex items-center justify-center text-slate-600 flex-shrink-0">
                          <Film className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            item.type === 'Movie' ? 'bg-purple-500/20 text-purple-300' : 'bg-sky-500/20 text-sky-300'
                          }`}>
                            {item.type}
                          </span>
                          {item.isTrending && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                              HOT
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-slate-200 truncate group-hover:text-[#9E57F6] transition">
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                          <span className="flex items-center gap-1 text-slate-400">
                            <Eye className="w-3 h-3 text-emerald-400" /> {formatNum(item.viewCount || 0)}
                          </span>
                          {item.tmdbRating ? (
                            <span className="flex items-center gap-0.5 text-amber-400">
                              <Star className="w-3 h-3 fill-amber-400" /> {item.tmdbRating.toFixed(1)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Downloads Stream */}
          {activeTab === 'downloads' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Most Downloaded */}
                <div className="p-4 rounded-xl bg-[#0C0C0E] border border-white/[0.06] space-y-3">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                    All-Time Most Downloaded Subtitles
                  </h4>
                  {(stats?.mostDownloaded || []).length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">No downloads logged yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {(stats?.mostDownloaded || []).slice(0, 5).map((sub, i) => (
                        <div key={sub._id || i} className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.04]">
                          <div className="min-w-0 flex-1 pr-3">
                            <p className="font-semibold text-slate-200 truncate">{sub.mediaTitle || 'Unknown Title'}</p>
                            <span className="text-[10px] text-slate-500">{sub.mediaType || 'Media'} • {sub.language || 'Sinhala'}</span>
                          </div>
                          <span className="text-xs font-black text-indigo-400 whitespace-nowrap bg-indigo-500/10 px-2 py-0.5 rounded">
                            {formatNum(sub.downloads || 0)} DLs
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Latest Downloads Stream */}
                <div className="p-4 rounded-xl bg-[#0C0C0E] border border-white/[0.06] space-y-3">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    Latest Downloads Real-Time Stream
                  </h4>
                  {(stats?.latestDownloads || []).length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">No recent downloads yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {(stats?.latestDownloads || []).slice(0, 5).map((sub, i) => (
                        <div key={sub._id || i} className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.04]">
                          <div className="min-w-0 flex-1 pr-3">
                            <p className="font-semibold text-slate-200 truncate">{sub.mediaTitle || 'Unknown Title'}</p>
                            <span className="text-[10px] text-slate-500">By {sub.uploaderName || 'Community'}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                            {formatRelativeTime(sub.lastDownloadedAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Traffic Velocity */}
          {activeTab === 'traffic' && (
            <div className="space-y-4">
              <div className="flex items-baseline justify-between text-xs text-slate-400 border-b border-white/[0.06] pb-3">
                <div>
                  <span className="text-white font-bold text-sm">Traffic Velocity Curve</span>
                  <span className="ml-2">({trafficSeries.length} days telemetry)</span>
                </div>
                <div>
                  Period Total: <b className="text-emerald-400 text-sm font-black">{formatNum(trafficTotal)}</b> views
                </div>
              </div>

              {trafficSeries.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-xs text-slate-500 border border-dashed border-white/10 rounded-xl">
                  No traffic telemetry logs in this range.
                </div>
              ) : (
                <div className="h-44 w-full flex items-end gap-2 pt-4">
                  {trafficSeries.map((log, index) => {
                    const value = Number(log.views || 0);
                    const heightPercent = Math.max(8, Math.round((value / maxTraffic) * 100));
                    return (
                      <div key={log.date || index} className="flex-1 flex flex-col items-center justify-end h-full gap-2 group relative">
                        {/* Tooltip */}
                        <div className="pointer-events-none absolute -top-8 hidden group-hover:block z-20 rounded-md bg-[#1D1D23] border border-white/10 px-2 py-0.5 text-[10px] font-bold text-white whitespace-nowrap shadow-xl">
                          {log.date}: {value.toLocaleString()} views
                        </div>
                        <div
                          className="w-full max-w-10 rounded-t-md bg-gradient-to-t from-[#9E57F6] to-[#14B8A6] group-hover:brightness-125 transition"
                          style={{ height: `${heightPercent}%` }}
                        />
                        <span className="text-[9px] text-slate-500 truncate max-w-full font-mono">
                          {log.date ? String(log.date).slice(5) : `D${index + 1}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Trending Searches */}
              {(stats?.trendingSearches || []).length > 0 && (
                <div className="pt-3 border-t border-white/[0.06] flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                    <Search className="w-3 h-3 text-slate-500" /> Trending Searches:
                  </span>
                  {(stats?.trendingSearches || []).slice(0, 8).map((s, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-white/[0.05] text-slate-300 text-[10px]">
                      {s.query} {s.count ? `(${s.count})` : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Operations & Content Workflows Launchpad ─── */}
      <div className="bg-[#141418] border border-white/[0.06] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-200">Subtitles & Content Operations Launchpad</h2>
            <p className="text-xs text-slate-400 mt-0.5">Quick access to essential workflow studios</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/management/subtitles')}
            className="p-4 rounded-xl bg-[#0C0C0E] border border-white/[0.06] hover:border-amber-500/40 text-left transition group space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300">
                {pendingSubtitles > 0 ? `${pendingSubtitles} QUEUED` : 'QUEUE'}
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200 group-hover:text-amber-400 transition">
                Moderation Queue
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Review, approve, or replace subtitles</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/management/ai-translate')}
            className="p-4 rounded-xl bg-[#0C0C0E] border border-white/[0.06] hover:border-pink-500/40 text-left transition group space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center border border-pink-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-pink-500/15 text-pink-300">
                AI ENGINE
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200 group-hover:text-pink-400 transition">
                AI Translation Studio
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Sinhala translation with Gemini</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/management/subtitle-tools')}
            className="p-4 rounded-xl bg-[#0C0C0E] border border-white/[0.06] hover:border-[#9E57F6]/40 text-left transition group space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[#9E57F6]/10 text-[#9E57F6] flex items-center justify-center border border-[#9E57F6]/20">
                <WandSparkles className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#9E57F6]/15 text-[#9E57F6]">
                STUDIO
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200 group-hover:text-[#9E57F6] transition">
                Subtitle Studio
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Timeline shift, branding, watermark strip</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/management/srt-cleaner')}
            className="p-4 rounded-xl bg-[#0C0C0E] border border-white/[0.06] hover:border-emerald-500/40 text-left transition group space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <Languages className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                BATCH
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition">
                SRT Batch Cleaner
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Fix overlaps, SDH removal, UTF-8 clean</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/management/import')}
            className="p-4 rounded-xl bg-[#0C0C0E] border border-white/[0.06] hover:border-violet-500/40 text-left transition group space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-500/15 text-violet-300">
                AUTO
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200 group-hover:text-violet-400 transition">
                TMDB Auto Importer
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Discover Korean dramas & movies</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/management/database')}
            className="p-4 rounded-xl bg-[#0C0C0E] border border-white/[0.06] hover:border-sky-500/40 text-left transition group space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
                <Database className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/15 text-sky-300">
                DB GUI
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200 group-hover:text-sky-400 transition">
                Database GUI Viewer
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Inspect tables, records & migrations</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/management/backup')}
            className="p-4 rounded-xl bg-[#0C0C0E] border border-white/[0.06] hover:border-teal-500/40 text-left transition group space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20">
                <HardDrive className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/15 text-teal-300">
                BACKUP
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200 group-hover:text-teal-400 transition">
                Backup & Recovery
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Automated snapshots & downloads</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/management/seo')}
            className="p-4 rounded-xl bg-[#0C0C0E] border border-white/[0.06] hover:border-indigo-500/40 text-left transition group space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <Radio className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300">
                SEO
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition">
                SEO & Sitemaps Studio
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Googlebot indexing & robots.txt</div>
            </div>
          </button>
        </div>
      </div>

      {/* ─── Cloudflare R2 & Architecture Verification Cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* R2 */}
        <div className="bg-[#141418] border border-white/[0.06] rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <DownloadCloud className="w-4 h-4" />
            </span>
            <h3 className="text-xs font-bold text-slate-200">Cloudflare R2 Object Storage</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            All subtitles are streamed globally via Cloudflare R2 object storage with zero egress fees. Files are verified for UTF-8 Sinhala encoding.
          </p>
          <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Endpoint: files.ksubzone.com</span>
          </div>
        </div>

        {/* Astro */}
        <div className="bg-[#141418] border border-white/[0.06] rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <h3 className="text-xs font-bold text-slate-200">Astro SSR / SSG Hybrid Engine</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Public pages are fully pre-rendered to HTML for instant Googlebot indexation. Protected management routes run as client islands.
          </p>
          <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-violet-400" />
            <span>Core Web Vitals Optimized</span>
          </div>
        </div>

        {/* Database & Runtime */}
        <div className="bg-[#141418] border border-white/[0.06] rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Server className="w-4 h-4" />
            </span>
            <h3 className="text-xs font-bold text-slate-200">Database & API Gateway</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Backend powered by PHP 8.2+ with {stats?.systemHealth?.dbDriver ? stats.systemHealth.dbDriver.toUpperCase() : 'SQLite/PostgreSQL'} persistent store and edge caching.
          </p>
          <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Status: Healthy • {stats?.systemHealth?.phpVersion ? `PHP ${stats.systemHealth.phpVersion}` : 'PHP 8.2+'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
