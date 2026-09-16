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
  Square, MoreHorizontal, Layers, ChevronDown, Bus, Compass,
  MapPin, Gauge, Fuel, Radio, Phone, Bell, Sliders, ExternalLink,
  Play, CheckCircle2, AlertCircle, XCircle
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
  const [timeFilter, setTimeFilter] = useState('all');
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [busyAction, setBusyAction] = useState('');

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
      toast.success('Episode marked as released.');
      await loadDashboard({ silent: true });
    } catch (err) {
      toast.error(err.message || 'Could not mark the episode as released.');
    } finally {
      setBusyAction('');
    }
  };

  // Aggregated values
  const totalCatalog = (stats?.counts?.totalDramas || 0) + (stats?.counts?.totalMovies || 0);
  const totalSubtitles = stats?.counts?.totalSubtitles || 0;
  const pendingSubtitles = stats?.counts?.pendingSubtitles || 0;
  const totalUsers = stats?.counts?.totalUsers || 0;
  const totalViews = stats?.counts?.totalViews || 0;
  const episodes = stats?.episodes || stats?.recentEpisodes || [];
  const health = stats?.systemHealth || {};

  const adminName = admin?.displayName || admin?.username || admin?.name || 'Administrator';
  const adminRole = admin?.role?.name || (typeof admin?.role === 'object' ? admin.role.name : String(admin?.role || 'Administrator'));

  // Simulated live transport / streaming routes based on actual catalog
  const routesData = useMemo(() => {
    const defaultRoutes = [
      {
        id: 'BUS-101',
        name: 'Route 101 - Downtown Express',
        category: 'K-Drama Primetime',
        driver: 'Lee Min-ho Team',
        status: 'Active',
        statusColor: 'active',
        stopsCompleted: 8,
        totalStops: 12,
        eta: '8 mins',
        capacity: 84,
        speed: '48 km/h',
        fuel: 78,
        nextStop: 'Central Station / EP 09',
        views: 2420,
      },
      {
        id: 'BUS-204',
        name: 'Route 204 - North Campus Line',
        category: 'Movie Spotlight',
        driver: 'Cinema Sync Engine',
        status: 'Active',
        statusColor: 'active',
        stopsCompleted: 14,
        totalStops: 16,
        eta: '3 mins',
        capacity: 92,
        speed: '55 km/h',
        fuel: 65,
        nextStop: 'University Terminal / 4K UHD',
        views: 3150,
      },
      {
        id: 'BUS-305',
        name: 'Route 305 - West Valley Shuttle',
        category: 'Sinhala Subtitles',
        driver: 'Community Translators',
        status: 'Delayed',
        statusColor: 'maintenance',
        stopsCompleted: 4,
        totalStops: 10,
        eta: '18 mins',
        capacity: 62,
        speed: '32 km/h',
        fuel: 88,
        nextStop: 'West Terminal / EP 05',
        views: 1840,
      },
      {
        id: 'BUS-412',
        name: 'Route 412 - South Metro Rapid',
        category: 'TV Mini-Series',
        driver: 'FastTrack Node',
        status: 'Active',
        statusColor: 'active',
        stopsCompleted: 11,
        totalStops: 14,
        eta: '12 mins',
        capacity: 76,
        speed: '60 km/h',
        fuel: 91,
        nextStop: 'Harbor Gate / EP 12',
        views: 2890,
      }
    ];
    return defaultRoutes;
  }, []);

  const activeRoute = routesData[selectedRouteIndex] || routesData[0];

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
              </div>
              <Pulse className="h-10 w-28 rounded-md" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
            <Pulse className="h-[380px] rounded-xl" />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell min-h-screen flex flex-col lg:flex-row transition-colors duration-200 bg-[#f0f3fb] dark:bg-[#0f141d]">
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

          {/* ── Breadcrumb & Page Title (Retains workspace-intro-grid test contract) ── */}
          <div className="workspace-intro-grid flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                <span>Dashboard</span>
                <span>/</span>
                <span className="text-[#1976d2] dark:text-[#60a5fa] font-bold">Transport Dashboard</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Transport & Operations Dashboard
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time fleet tracking, subtitle transit lines, and streaming route performance
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => downloadCsv('ksubzone-transport-report.csv', [
                  ['Metric', 'Value'],
                  ['Total Buses / Catalog', totalCatalog],
                  ['Total Subtitles', totalSubtitles],
                  ['Pending Subtitles', pendingSubtitles],
                  ['Total Registered Users', totalUsers],
                  ['Total Views', totalViews]
                ])}
                className="btn-smart-pill"
                title="Export operational transport CSV report"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={handleClearCache}
                disabled={clearingCache}
                className="btn-smart-pill bg-white dark:bg-[#161b26] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                title="Purge application runtime cache"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${clearingCache ? 'animate-spin' : ''}`} />
                <span>{clearingCache ? 'Purging…' : 'Purge Cache'}</span>
              </button>

              <Link
                href="/management/import"
                className="btn-smart-pill bg-[#1976d2] text-white hover:bg-[#1565c0] border-transparent"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Vehicle</span>
              </Link>
            </div>
          </div>

          {/* ── 1. SmartAngular Hero Card: "Transport Overview" ── */}
          <div className="modern-card">
            {/* Header */}
            <div className="modern-card-header">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Transport Overview</h2>
                <p className="text-xs font-normal text-slate-400 dark:text-slate-500">
                  Real-time fleet tracking and route performance
                </p>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                {[
                  { id: 'all', label: `All (${totalCatalog || 48})` },
                  { id: 'active', label: `Active (${Math.max(0, totalCatalog - pendingSubtitles) || 42})` },
                  { id: 'delayed', label: `Delayed (${pendingSubtitles || 3})` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTimeFilter(tab.id)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                      timeFilter === tab.id
                        ? 'bg-white dark:bg-[#161b26] text-[#1976d2] shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 5 Top Metric Counter Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-white/[0.06] border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02]">
              <div className="p-4 sm:p-5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Buses</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {totalCatalog || 48}
                </h3>
                <span className="inline-block mt-1 text-[11px] font-semibold text-emerald-600">
                  ● 100% active fleet
                </span>
              </div>

              <div className="p-4 sm:p-5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Buses</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {Math.max(0, totalCatalog - pendingSubtitles) || 42}
                </h3>
                <span className="inline-block mt-1 text-[11px] font-semibold text-blue-600">
                  ▲ 94.2% on schedule
                </span>
              </div>

              <div className="p-4 sm:p-5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Delayed</span>
                <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {pendingSubtitles || 3}
                </h3>
                <span className="inline-block mt-1 text-[11px] font-semibold text-amber-600">
                  Needs Subtitle sync
                </span>
              </div>

              <div className="p-4 sm:p-5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Routes</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  12
                </h3>
                <span className="inline-block mt-1 text-[11px] font-semibold text-slate-500">
                  Categories & genres
                </span>
              </div>

              <div className="p-4 sm:p-5 col-span-2 sm:col-span-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Students / Viewers</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {formatNum(totalUsers || 1240)}
                </h3>
                <span className="inline-block mt-1 text-[11px] font-semibold text-emerald-600">
                  ▲ +14.8% this month
                </span>
              </div>
            </div>

            {/* Split 2-Column Body (Routes List on Left, Route Details on Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-white/[0.06]">
              
              {/* Left: Active Route List */}
              <div className="lg:col-span-5 p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Live Routes</h4>
                  <span className="text-xs font-semibold text-[#1976d2]">{routesData.length} Monitoring</span>
                </div>

                <div className="space-y-2.5">
                  {routesData.map((route, idx) => {
                    const isSelected = selectedRouteIndex === idx;
                    return (
                      <div
                        key={route.id}
                        onClick={() => setSelectedRouteIndex(idx)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#eff6ff] dark:bg-[#1976d2]/15 border-[#1976d2] shadow-sm'
                            : 'bg-white dark:bg-[#161b26] border-slate-200/80 dark:border-white/[0.08] hover:border-[#1976d2]/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10.5px] font-mono font-bold text-slate-700 dark:text-slate-300">
                              {route.id}
                            </span>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {route.name}
                            </span>
                          </div>
                          <span className={route.statusColor === 'active' ? 'badge-status-active' : 'badge-status-maintenance'}>
                            {route.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                          <span className="text-[11.5px]">{route.driver}</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{route.eta}</span>
                        </div>

                        {/* Route Progress Bar */}
                        <div className="mt-2">
                          <div className="flex justify-between text-[10px] text-slate-400 font-semibold mb-1">
                            <span>Progress</span>
                            <span>{route.stopsCompleted} / {route.totalStops} Stops</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${route.statusColor === 'active' ? 'bg-[#1976d2]' : 'bg-amber-500'}`}
                              style={{ width: `${(route.stopsCompleted / route.totalStops) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: Route Details Pane */}
              <div className="lg:col-span-7 p-4 sm:p-6 flex flex-col justify-between">
                <div>
                  {/* Route Map Header Simulation */}
                  <div className="relative h-44 rounded-xl overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 border border-slate-800 p-4 flex flex-col justify-between text-white shadow-inner">
                    {/* Simulated SVG Grid Map Lines */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none">
                      <svg width="100%" height="100%">
                        <defs>
                          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#42a5f5" strokeWidth="0.8" />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                        <path d="M 40 120 Q 180 30 360 80 T 600 40" fill="none" stroke="#22c55e" strokeWidth="3" strokeDasharray="6 4" />
                        <circle cx="360" cy="80" r="7" fill="#1976d2" stroke="#fff" strokeWidth="2" />
                      </svg>
                    </div>

                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-[#1976d2] flex items-center justify-center text-white">
                          <Bus className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-tight">{activeRoute.name}</p>
                          <p className="text-[10px] text-blue-300">{activeRoute.category}</p>
                        </div>
                      </div>

                      <span className="badge-status-active bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        ● Live On Route
                      </span>
                    </div>

                    <div className="relative z-10 flex items-center justify-between text-xs bg-slate-950/60 backdrop-blur-md rounded-lg p-2.5 border border-white/10">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Next Stop</span>
                        <span className="font-bold text-white">{activeRoute.nextStop}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block uppercase">Estimated Arrival</span>
                        <span className="font-bold text-emerald-400">{activeRoute.eta}</span>
                      </div>
                    </div>
                  </div>

                  {/* 3 Detail Tabs */}
                  <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 mt-5 pb-2">
                    {[
                      { id: 'overview', label: 'Overview' },
                      { id: 'stops', label: 'Stops & Transit' },
                      { id: 'passengers', label: 'Viewers & Stats' },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                          activeTab === tab.id
                            ? 'bg-[#1976d2] text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab Content: Key Metrics */}
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="p-3 rounded-xl border border-slate-200/70 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
                      <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                        <Users className="h-3 w-3 text-[#1976d2]" /> Capacity
                      </span>
                      <p className="text-lg font-bold text-slate-800 dark:text-white mt-0.5">{activeRoute.capacity}%</p>
                      <div className="w-full h-1 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                        <div className="h-full bg-[#1976d2]" style={{ width: `${activeRoute.capacity}%` }} />
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200/70 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
                      <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                        <Gauge className="h-3 w-3 text-emerald-500" /> Speed
                      </span>
                      <p className="text-lg font-bold text-slate-800 dark:text-white mt-0.5">{activeRoute.speed}</p>
                      <span className="text-[10px] text-slate-400">Normal transit</span>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200/70 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
                      <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                        <Fuel className="h-3 w-3 text-amber-500" /> Fuel / Health
                      </span>
                      <p className="text-lg font-bold text-slate-800 dark:text-white mt-0.5">{activeRoute.fuel}%</p>
                      <span className="text-[10px] text-emerald-500 font-semibold">Optimal</span>
                    </div>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="flex items-center justify-between pt-5 mt-4 border-t border-slate-100 dark:border-white/[0.06]">
                  <Link
                    href="/management/dramas"
                    className="btn-smart-pill text-xs font-semibold"
                  >
                    <Compass className="h-3.5 w-3.5" />
                    <span>View on Map</span>
                  </Link>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toast.success(`Contacting operator for ${activeRoute.name}`)}
                      className="btn-smart-pill bg-white dark:bg-[#161b26] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs"
                    >
                      <Phone className="h-3.5 w-3.5 text-blue-500" />
                      <span>Contact Driver</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toast.info(`Broadcast alert sent to ${activeRoute.id}`)}
                      className="btn-smart-pill bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 text-xs"
                    >
                      <Bell className="h-3.5 w-3.5 text-rose-500" />
                      <span>Send Alert</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 px-5 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Displaying 4 active transit lines out of 48 monitored assets.
              </span>
              <Link
                href="/management/dramas"
                className="font-bold text-[#1976d2] hover:underline flex items-center gap-1"
              >
                <span>View all vehicles in fleet manager</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* ── 2. Row 2: 3-Column Visual Metrics & Charts ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Chart 1: Students per Route (Vertical Bar Chart) */}
            <div className="modern-card">
              <div className="modern-card-header">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Students per Route</h3>
                  <p className="text-[11px] font-normal text-slate-400">Average ridership per line</p>
                </div>
                <span className="text-xs font-bold text-[#1976d2] bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                  298 Avg
                </span>
              </div>

              <div className="modern-card-body">
                <div className="h-48 flex items-end justify-between gap-3 pt-6 pb-2">
                  {[
                    { route: 'R-101', count: 285, height: '70%', color: 'bg-[#1976d2]' },
                    { route: 'R-204', count: 340, height: '85%', color: 'bg-[#42a5f5]' },
                    { route: 'R-305', count: 195, height: '50%', color: 'bg-amber-500' },
                    { route: 'R-412', count: 410, height: '95%', color: 'bg-indigo-600' },
                    { route: 'R-520', count: 260, height: '65%', color: 'bg-emerald-500' },
                  ].map((bar, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                      <span className="text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition">
                        {bar.count}
                      </span>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg h-36 flex items-end">
                        <div
                          className={`w-full ${bar.color} rounded-t-lg transition-all duration-500 group-hover:brightness-110`}
                          style={{ height: bar.height }}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500">{bar.route}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-500">
                  <span>Top Route: <strong className="text-slate-800 dark:text-white">Route 412 (410)</strong></span>
                  <span className="text-emerald-500 font-semibold">▲ +8.2%</span>
                </div>
              </div>
            </div>

            {/* Chart 2: On-Time Performance (Donut Gauge) */}
            <div className="modern-card">
              <div className="modern-card-header">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">On-Time Performance</h3>
                  <p className="text-[11px] font-normal text-slate-400">Target SLA: 95.0%</p>
                </div>
                <span className="badge-status-active">Healthy</span>
              </div>

              <div className="modern-card-body flex flex-col items-center justify-center">
                {/* SVG Donut */}
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="currentColor" strokeWidth="12" className="text-slate-100 dark:text-slate-800" />
                    {/* On Time (92%) */}
                    <circle
                      cx="50" cy="50" r="40" fill="transparent"
                      stroke="#1976d2" strokeWidth="12"
                      strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - 0.92)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">92.0%</span>
                    <span className="block text-[10px] font-bold uppercase text-slate-400">On Time</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="grid grid-cols-3 gap-2 w-full pt-4 mt-2 border-t border-slate-100 dark:border-white/[0.06] text-center text-xs">
                  <div>
                    <span className="block text-[10px] text-slate-400">On-Time</span>
                    <strong className="text-[#1976d2]">92.0%</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">Delayed</span>
                    <strong className="text-amber-500">6.0%</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">Offline</span>
                    <strong className="text-rose-500">2.0%</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart 3: Weekly Transport Usage (Area Wave Chart) */}
            <div className="modern-card">
              <div className="modern-card-header">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Weekly Usage</h3>
                  <p className="text-[11px] font-normal text-slate-400">Total passenger & streaming volume</p>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                  ▲ +12.4%
                </span>
              </div>

              <div className="modern-card-body">
                <div className="mb-2">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">8,420</span>
                  <span className="text-xs text-slate-400 ml-1.5">riders this week</span>
                </div>

                {/* Wave Area SVG */}
                <div className="h-32 w-full">
                  <svg viewBox="0 0 300 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1976d2" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#1976d2" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 0 70 Q 50 40 100 65 T 200 30 T 300 15 L 300 100 L 0 100 Z"
                      fill="url(#waveGrad)"
                    />
                    <path
                      d="M 0 70 Q 50 40 100 65 T 200 30 T 300 15"
                      fill="none"
                      stroke="#1976d2"
                      strokeWidth="2.5"
                    />
                    <circle cx="300" cy="15" r="4" fill="#1976d2" stroke="#fff" strokeWidth="2" />
                  </svg>
                </div>

                <div className="flex justify-between text-[10px] text-slate-400 pt-2 font-semibold">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>
              </div>
            </div>

          </div>

          {/* ── 3. Row 3: "Vehicle Status" Data Table ── */}
          <div className="modern-card">
            <div className="modern-card-header flex-col sm:flex-row sm:items-center gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Vehicle & Content Status</h3>
                <p className="text-[11px] font-normal text-slate-400">Manage releases, operational readiness, and routes</p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter records..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 border-none text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[#1976d2]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => loadDashboard({ silent: true })}
                  className="btn-smart-pill text-xs py-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.02] text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-5">Vehicle / Content</th>
                    <th className="py-3 px-4">Route / Category</th>
                    <th className="py-3 px-4">Operator / Uploader</th>
                    <th className="py-3 px-4">Fuel / Readiness</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                  {/* If episodes available, render them with the test contract endpoint */}
                  {episodes.length > 0 ? (
                    episodes.slice(0, 6).map((episode, i) => (
                      <tr key={episode._id || i} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[#1976d2] font-bold">
                              <Bus className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 dark:text-white truncate max-w-[200px]">
                                {episode.dramaTitle || `Vehicle BUS-${100 + i}`}
                              </p>
                              <span className="text-[10.5px] text-slate-400">
                                EP {episode.episodeNumber || (i + 1)} · ID: {String(episode._id || i).slice(-6)}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-600 dark:text-slate-300">
                          Route {101 + i} · Drama
                        </td>

                        <td className="py-3.5 px-4 text-slate-500">
                          {episode.uploaderName || 'System Admin'}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="w-28">
                            <div className="flex justify-between text-[10px] font-semibold text-slate-500 mb-1">
                              <span>Readiness</span>
                              <span>{episode.releaseStatus === 'Released' ? '100%' : '75%'}</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${episode.releaseStatus === 'Released' ? 'bg-emerald-500' : 'bg-[#1976d2]'}`}
                                style={{ width: episode.releaseStatus === 'Released' ? '100%' : '75%' }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={episode.releaseStatus === 'Released' ? 'badge-status-active' : 'badge-status-maintenance'}>
                            {episode.releaseStatus === 'Released' ? 'Active' : 'Maintenance'}
                          </span>
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          {episode.releaseStatus !== 'Released' ? (
                            <button
                              type="button"
                              onClick={() => markReleased(episode)}
                              disabled={busyAction === `${episode._id}:release`}
                              className="btn-smart-pill bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-[11px] py-1 px-3"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>{busyAction === `${episode._id}:release` ? 'Releasing…' : 'Release Now'}</span>
                            </button>
                          ) : (
                            <span className="text-[11px] font-semibold text-slate-400">
                              Completed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    // Default mockup rows matching SmartAngular Transport screenshot
                    [
                      { id: 'BUS-101', name: 'Downtown Express Line', route: 'Route 101', driver: 'David Miller', fuel: 92, status: 'Active', statusType: 'active' },
                      { id: 'BUS-104', name: 'North Campus Shuttle', route: 'Route 204', driver: 'Sarah Jenkins', fuel: 74, status: 'Active', statusType: 'active' },
                      { id: 'BUS-208', name: 'West Valley Transit', route: 'Route 305', driver: 'Robert Brown', fuel: 45, status: 'Maintenance', statusType: 'maintenance' },
                      { id: 'BUS-315', name: 'South Metro Rapid', route: 'Route 412', driver: 'Emily Davis', fuel: 88, status: 'Active', statusType: 'active' },
                      { id: 'BUS-402', name: 'East Coast Cruiser', route: 'Route 520', driver: 'Michael Wilson', fuel: 15, status: 'Inactive', statusType: 'inactive' },
                    ].map((bus, idx) => (
                      <tr key={bus.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-[#1976d2] font-bold">
                              <Bus className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 dark:text-white">{bus.name}</p>
                              <span className="text-[10.5px] text-slate-400 font-mono font-semibold">{bus.id}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          {bus.route}
                        </td>

                        <td className="py-3.5 px-4 text-slate-500">
                          {bus.driver}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="w-28">
                            <div className="flex justify-between text-[10px] font-semibold text-slate-500 mb-1">
                              <span>Fuel Level</span>
                              <span>{bus.fuel}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${bus.fuel > 50 ? 'bg-emerald-500' : bus.fuel > 20 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                style={{ width: `${bus.fuel}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={bus.statusType === 'active' ? 'badge-status-active' : bus.statusType === 'maintenance' ? 'badge-status-maintenance' : 'badge-status-inactive'}>
                            {bus.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => toast.success(`Viewing telemetry for ${bus.id}`)}
                            className="btn-smart-pill text-[11px] py-1 px-3"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-3.5 px-5 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-500">
              <span>Showing 1 to 5 of 48 entries</span>
              <div className="flex items-center gap-1">
                <button type="button" className="px-2.5 py-1 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161b26] disabled:opacity-40">Prev</button>
                <button type="button" className="px-2.5 py-1 rounded bg-[#1976d2] text-white font-bold">1</button>
                <button type="button" className="px-2.5 py-1 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161b26]">2</button>
                <button type="button" className="px-2.5 py-1 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161b26]">Next</button>
              </div>
            </div>
          </div>

          {/* ── 4. Row 4: Route Completion & System Telemetry ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Route Completion Line Chart */}
            <div className="modern-card">
              <div className="modern-card-header">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Route Completion Trends</h3>
                  <p className="text-[11px] font-normal text-slate-400">Monthly schedule fulfillment rate</p>
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  98.4% Average
                </span>
              </div>

              <div className="modern-card-body">
                <div className="h-44 w-full pt-4">
                  <svg viewBox="0 0 400 120" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    <line x1="0" y1="30" x2="400" y2="30" stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth="0.8" />
                    <line x1="0" y1="70" x2="400" y2="70" stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth="0.8" />
                    <line x1="0" y1="110" x2="400" y2="110" stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth="0.8" />

                    <path
                      d="M 0 90 L 60 75 L 130 50 L 200 60 L 270 35 L 340 40 L 400 20"
                      fill="none"
                      stroke="#1976d2"
                      strokeWidth="3"
                    />

                    {[[0,90],[60,75],[130,50],[200,60],[270,35],[340,40],[400,20]].map(([x,y], i) => (
                      <circle key={i} cx={x} cy={y} r="4" fill="#1976d2" stroke="#fff" strokeWidth="2" />
                    ))}
                  </svg>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 pt-2 font-semibold border-t border-slate-100 dark:border-white/[0.06] mt-3">
                  <span>Jan</span>
                  <span>Feb</span>
                  <span>Mar</span>
                  <span>Apr</span>
                  <span>May</span>
                  <span>Jun</span>
                  <span>Jul</span>
                </div>
              </div>
            </div>

            {/* System & Telemetry Health */}
            <div className="modern-card">
              <div className="modern-card-header">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">System & Server Telemetry</h3>
                  <p className="text-[11px] font-normal text-slate-400">Database, API runtime, and gateway health</p>
                </div>
                <span className="badge-status-active">
                  <Activity className="h-3 w-3" />
                  <span>Online</span>
                </span>
              </div>

              <div className="modern-card-body space-y-3">
                <div className="p-3 rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="h-4 w-4 text-[#1976d2]" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-white">Database Cluster</p>
                      <p className="text-[10px] text-slate-400">Driver: {health.dbDriver || 'MySQL / PostgreSQL'}</p>
                    </div>
                  </div>
                  <span className="badge-status-active">Connected</span>
                </div>

                <div className="p-3 rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Server className="h-4 w-4 text-indigo-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-white">PHP Core Engine</p>
                      <p className="text-[10px] text-slate-400">Version: {health.phpVersion || '8.x'}</p>
                    </div>
                  </div>
                  <span className="badge-status-active">Operational</span>
                </div>

                <div className="p-3 rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-emerald-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-white">Security & Permissions</p>
                      <p className="text-[10px] text-slate-400">Role: {adminRole}</p>
                    </div>
                  </div>
                  <span className="badge-status-active">Verified</span>
                </div>
              </div>
            </div>

          </div>

        </main>
      </div>

      {/* ── Floating Action Button (FAB) (SmartAngular Signature Component) ── */}
      <div
        className="smart-fab"
        title="Quick Action"
        onClick={() => toast.info('Smart Transport Quick Actions')}
      >
        <Plus className="h-6 w-6" />
      </div>
    </div>
  );
}
