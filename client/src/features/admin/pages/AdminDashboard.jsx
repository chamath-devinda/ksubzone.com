'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import Link from 'next/link';
import { motion } from 'framer-motion';
import apiClient from '@/services/api/apiClient';
import {
  Film, Tv, Users, Languages, Star, TrendingUp, Search, Eye,
  Award, CheckCircle, BookOpenText, Bell, Clapperboard, CalendarCheck2,
  AlertTriangle, Activity, Zap, ArrowUpRight, BarChart3, Globe,
  Database, Server, Clock, TrendingDown, Minus, Shield, XCircle,
  BarChart2, ChevronRight, RefreshCw, Check, Download
} from 'lucide-react';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import StatCard from '@/features/admin/components/StatCard';
import { Pulse, CardSkeleton } from '@/features/admin/components/Skeleton';
import { useToast } from '@/features/admin/components/Toast';

// ─── Animation Variants ──────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.42, ease: [0.22, 1, 0.36, 1] }
  })
};

// ─── Utility Helpers ─────────────────────────────────────────────────────────
function formatNum(n) {
  if (n === null || n === undefined) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function daysBefore(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
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

function polarToXY(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutPath(cx, cy, outerR, innerR, startDeg, endDeg) {
  const f = n => n.toFixed(2);
  const os = polarToXY(cx, cy, outerR, startDeg);
  const oe = polarToXY(cx, cy, outerR, endDeg);
  const is = polarToXY(cx, cy, innerR, startDeg);
  const ie = polarToXY(cx, cy, innerR, endDeg);
  const lg = endDeg - startDeg > 180 ? 1 : 0;
  return `M${f(os.x)},${f(os.y)} A${outerR},${outerR} 0 ${lg} 1 ${f(oe.x)},${f(oe.y)} L${f(ie.x)},${f(ie.y)} A${innerR},${innerR} 0 ${lg} 0 ${f(is.x)},${f(is.y)} Z`;
}

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
}

// ─── Custom Skeletons for Dashboard widgets ──────────────────────────────────
function WidgetSkeleton({ rows = 4, className = '' }) {
  return (
    <div className={`rounded-2xl border border-white/[0.06] bg-luxury-900/40 overflow-hidden ${className}`}>
      <div className="px-5 pt-5 pb-4 border-b border-white/[0.04] flex items-center gap-3">
        <Pulse className="w-9 h-9 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Pulse className="h-3 w-28" />
          <Pulse className="h-2 w-20" />
        </div>
      </div>
      <div className="p-5 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Pulse key={i} className="h-9 w-full" style={{ opacity: 1 - i * 0.18 }} />
        ))}
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-luxury-900/40 overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-white/[0.04] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Pulse className="w-9 h-9 rounded-xl" />
          <div className="space-y-2">
            <Pulse className="h-3 w-36" />
            <Pulse className="h-2 w-24" />
          </div>
        </div>
        <div className="flex gap-2">
          <Pulse className="h-7 w-16 rounded-lg" />
          <Pulse className="h-7 w-16 rounded-lg" />
          <Pulse className="h-7 w-16 rounded-lg" />
        </div>
      </div>
      <div className="p-6">
        <Pulse className="h-[180px] w-full rounded-xl" />
        <div className="flex justify-between mt-3">
          {[1,2,3,4,5].map(i => <Pulse key={i} className="h-2 w-8" />)}
        </div>
      </div>
    </div>
  );
}

// ─── Metric Card Config ──────────────────────────────────────────────────────
const METRIC_CARDS = [
  { key: 'totalMovies',       label: 'Movies',       icon: Film,      href: '/management/movies',    border: 'border-l-violet-500',  iconBg: 'bg-violet-500/15',  iconColor: 'text-violet-400',  spark: '#8b5cf6', grad: 'from-violet-500/[0.07]' },
  { key: 'totalDramas',       label: 'Dramas',       icon: Tv,        href: '/management/dramas',    border: 'border-l-fuchsia-500', iconBg: 'bg-fuchsia-500/15', iconColor: 'text-fuchsia-400', spark: '#d946ef', grad: 'from-fuchsia-500/[0.07]' },
  { key: 'totalEpisodes',     label: 'Episodes',     icon: Award,     href: '/management/dramas',    border: 'border-l-sky-500',     iconBg: 'bg-sky-500/15',     iconColor: 'text-sky-400',     spark: '#0ea5e9', grad: 'from-sky-500/[0.07]' },
  { key: 'totalUsers',        label: 'Members',      icon: Users,     href: '/management/users',     border: 'border-l-indigo-500',  iconBg: 'bg-indigo-500/15',  iconColor: 'text-indigo-400',  spark: '#6366f1', grad: 'from-indigo-500/[0.07]' },
  { key: 'totalSubtitles',    label: 'Subtitles',    icon: Languages, href: '/management/subtitles', border: 'border-l-emerald-500', iconBg: 'bg-emerald-500/15', iconColor: 'text-emerald-400', spark: '#10b981', grad: 'from-emerald-500/[0.07]' },
  { key: 'totalDownloads',    label: 'Downloads',    icon: Download,  href: '/management/subtitles', border: 'border-l-teal-500',     iconBg: 'bg-teal-500/15',    iconColor: 'text-teal-400',    spark: '#14b8a6', grad: 'from-teal-500/[0.07]' },
  { key: 'totalReviews',      label: 'Reviews',      icon: Star,      href: '/management/comments',  border: 'border-l-amber-500',   iconBg: 'bg-amber-500/15',   iconColor: 'text-amber-400',   spark: '#f59e0b', grad: 'from-amber-500/[0.07]' },
  { key: 'totalViews',        label: 'Total Views',  icon: Eye,       href: '/management/dashboard', border: 'border-l-teal-500',    iconBg: 'bg-teal-500/15',    iconColor: 'text-teal-400',    spark: '#14b8a6', grad: 'from-teal-500/[0.07]' },
  { key: 'totalTrafficViews', label: 'Site Traffic', icon: TrendingUp,href: '/management/dashboard', border: 'border-l-rose-500',    iconBg: 'bg-rose-500/15',    iconColor: 'text-rose-400',    spark: '#f43f5e', grad: 'from-rose-500/[0.07]' },
];

// ─── Traffic Chart ───────────────────────────────────────────────────────────
function TrafficChart({ allLogs }) {
  const [range, setRange] = useState(7);
  const [chartType, setChartType] = useState('line');
  const [tooltip, setTooltip] = useState(null);
  const svgRef = useRef(null);

  const cutoff = daysBefore(range);
  const prevCutoff = daysBefore(range * 2);

  const currentLogs = allLogs.filter(l => l.date >= cutoff).sort((a, b) => a.date.localeCompare(b.date));
  const prevLogs = allLogs.filter(l => l.date >= prevCutoff && l.date < cutoff).sort((a, b) => a.date.localeCompare(b.date));

  const displayLogs = currentLogs.length > 0 ? currentLogs : allLogs.slice(-range);
  const maxVal = Math.max(...displayLogs.map(l => l.views), ...prevLogs.map(l => l.views), 10);

  const W = 480, H = 160, PL = 34, PR = 12, PT = 12, PB = 28;
  const innerW = W - PL - PR;
  const innerH = H - PT - PB;

  const toPoint = (logs, idx, len) => {
    const step = len <= 1 ? 0 : innerW / (len - 1);
    const x = PL + idx * step;
    const y = PT + innerH - (logs[idx].views / maxVal) * innerH;
    return { x, y, ...logs[idx] };
  };

  const currentPoints = displayLogs.map((_, i) => toPoint(displayLogs, i, displayLogs.length));
  const prevPoints = prevLogs.length > 1 ? prevLogs.map((_, i) => toPoint(prevLogs, i, prevLogs.length)) : [];

  const linePath = pts => pts.length < 2 ? '' :
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const areaPath = pts => pts.length < 2 ? '' :
    `${linePath(pts)} L${pts[pts.length-1].x.toFixed(1)},${(PT+innerH).toFixed(1)} L${pts[0].x.toFixed(1)},${(PT+innerH).toFixed(1)} Z`;

  const barW = displayLogs.length > 0 ? Math.max(4, Math.min(24, (innerW / displayLogs.length) * 0.6)) : 12;

  const yLabels = [0, 0.5, 1].map(pct => ({
    val: Math.round(maxVal * pct),
    y: PT + innerH - pct * innerH
  }));

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}
      className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-luxury-900 to-luxury-950 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-brand-primary/15 flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-4 h-4 text-brand-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white">Site Traffic Analytics</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Page views — current vs previous period (dashed)</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {/* Chart type toggle */}
          <div className="flex bg-white/[0.04] border border-white/[0.06] rounded-lg p-0.5">
            <button onClick={() => setChartType('line')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition min-h-[28px] ${chartType === 'line' ? 'bg-brand-primary/20 text-brand-primary' : 'text-slate-500 hover:text-slate-300'}`}>
              Line
            </button>
            <button onClick={() => setChartType('bar')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition min-h-[28px] ${chartType === 'bar' ? 'bg-brand-primary/20 text-brand-primary' : 'text-slate-500 hover:text-slate-300'}`}>
              Bar
            </button>
          </div>
          {/* Range selector */}
          <div className="flex bg-white/[0.04] border border-white/[0.06] rounded-lg p-0.5">
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setRange(d)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition min-h-[28px] ${range === d ? 'bg-brand-primary/20 text-brand-primary' : 'text-slate-500 hover:text-slate-300'}`}>
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="px-4 pb-1 relative" onMouseLeave={() => setTooltip(null)}>
        {displayLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[180px] text-slate-600">
            <BarChart2 className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs">No traffic data for this period</p>
          </div>
        ) : (
          <>
            <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-[160px] sm:h-[180px] overflow-visible"
              onMouseMove={e => {
                const rect = svgRef.current?.getBoundingClientRect();
                if (!rect) return;
                const mouseX = ((e.clientX - rect.left) / rect.width) * W;
                let closest = currentPoints[0], minD = Infinity;
                currentPoints.forEach(p => {
                  const d = Math.abs(p.x - mouseX);
                  if (d < minD) { minD = d; closest = p; }
                });
                if (minD < 30) setTooltip(closest);
                else setTooltip(null);
              }}
            >
              <defs>
                <linearGradient id="tGradArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="tGradLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
                <filter id="glow"><feGaussianBlur in="SourceGraphic" stdDeviation="2.5" /></filter>
              </defs>

              {/* Grid lines */}
              {yLabels.map((l, i) => (
                <g key={i}>
                  <line x1={PL} y1={l.y} x2={W - PR} y2={l.y} stroke="rgba(255,255,255,0.04)" strokeDasharray={i === 0 ? '0' : '4 4'} />
                  <text x={PL - 4} y={l.y + 3.5} textAnchor="end" fill="rgba(148,163,184,0.4)" fontSize="8" fontFamily="monospace">{formatNum(l.val)}</text>
                </g>
              ))}

              {chartType === 'line' ? (
                <>
                  {/* Area */}
                  <path d={areaPath(currentPoints)} fill="url(#tGradArea)" />
                  {/* Glow */}
                  <path d={linePath(currentPoints)} fill="none" stroke="url(#tGradLine)" strokeWidth="5" filter="url(#glow)" opacity="0.25" />
                  {/* Line */}
                  <path d={linePath(currentPoints)} fill="none" stroke="url(#tGradLine)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  {/* Comparison overlay */}
                  {prevPoints.length > 1 && (
                    <path d={linePath(prevPoints)} fill="none" stroke="rgba(148,163,184,0.3)" strokeWidth="1.5" strokeDasharray="5 3" strokeLinecap="round" />
                  )}
                  {/* Data points */}
                  {currentPoints.map((p, i) => (
                    <g key={i} style={{ cursor: 'pointer' }}>
                      <circle cx={p.x} cy={p.y} r={tooltip?.date === p.date ? 7 : 5} fill="#8b5cf6" opacity="0.12" />
                      <circle cx={p.x} cy={p.y} r={tooltip?.date === p.date ? 4 : 3} className="fill-luxury-900" stroke="url(#tGradLine)" strokeWidth="2" />
                    </g>
                  ))}
                </>
              ) : (
                <>
                  {/* Bar chart */}
                  {currentPoints.map((p, i) => (
                    <g key={i}>
                      <rect
                        x={p.x - barW / 2} y={p.y}
                        width={barW} height={PT + innerH - p.y}
                        rx="3" fill="url(#tGradLine)"
                        opacity={tooltip?.date === p.date ? 0.9 : 0.5}
                        style={{ cursor: 'pointer' }}
                      />
                    </g>
                  ))}
                  {/* Comparison bars */}
                  {prevPoints.map((p, i) => (
                    <rect key={i}
                      x={p.x - barW / 2 + barW * 0.6} y={p.y}
                      width={barW * 0.5} height={PT + innerH - p.y}
                      rx="2" fill="rgba(148,163,184,0.15)"
                    />
                  ))}
                </>
              )}
            </svg>

            {/* X-axis labels */}
            <div className="flex justify-between text-[9px] font-mono text-slate-600 px-2 pb-3 -mt-1">
              {displayLogs.map((l, i) => {
                // Show fewer labels on small data sets
                const skip = displayLogs.length > 14 ? Math.ceil(displayLogs.length / 7) : 1;
                if (i % skip !== 0 && i !== displayLogs.length - 1) return <span key={i} />;
                return <span key={i}>{l.date.slice(5).replace('-', '/')}</span>;
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 px-2 pb-4 text-[10px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-0.5 bg-gradient-to-r from-brand-primary to-brand-secondary rounded inline-block" />
                Current {range}d
              </span>
              {prevPoints.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-px border-t border-dashed border-slate-500 inline-block" />
                  Previous {range}d
                </span>
              )}
            </div>

            {/* Tooltip */}
            {tooltip && (
              <div className="absolute top-3 right-5 bg-luxury-800 border border-white/[0.1] rounded-xl px-3 py-2 text-xs pointer-events-none shadow-xl z-10">
                <div className="text-slate-300 font-mono font-bold">{tooltip.date}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Eye className="w-3 h-3 text-brand-primary" />
                  <span className="text-white font-black">{tooltip.views} views</span>
                </div>
                {tooltip.uniqueVisitors !== undefined && (
                  <div className="text-slate-500 text-[10px] mt-0.5">{tooltip.uniqueVisitors} unique</div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─── Content Donut Chart ─────────────────────────────────────────────────────
function ContentDonut({ movies, dramas, episodes }) {
  const total = (movies || 0) + (dramas || 0) + (episodes || 0);
  const data = [
    { label: 'Movies',   value: movies || 0,   color: '#8b5cf6' },
    { label: 'Dramas',   value: dramas || 0,   color: '#d946ef' },
    { label: 'Episodes', value: episodes || 0, color: '#0ea5e9' },
  ];

  const cx = 50, cy = 50, outerR = 38, innerR = 26;
  let angle = -90;
  const segments = data.map(d => {
    const sweep = total > 0 ? (d.value / total) * 360 : 120;
    const endAngle = angle + sweep;
    const path = total > 0 ? donutPath(cx, cy, outerR, innerR, angle, endAngle) : '';
    const result = { ...d, path, sweep, startAngle: angle, endAngle };
    angle = endAngle;
    return result;
  });

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={7}
      className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-luxury-900 to-luxury-950 overflow-hidden">
      <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-white/[0.04]">
        <div className="w-9 h-9 rounded-xl bg-brand-primary/15 flex items-center justify-center">
          <Activity className="w-4 h-4 text-brand-primary" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Content Distribution</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Movies vs Dramas vs Episodes</p>
        </div>
      </div>

      <div className="p-5 flex flex-col items-center gap-5">
        <div className="relative w-[120px] h-[120px]">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              {total === 0 && (
                <linearGradient id="emptyDonut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
                </linearGradient>
              )}
            </defs>
            {total === 0 ? (
              <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={outerR - innerR} />
            ) : (
              segments.map((seg, i) => (
                <path key={i} d={seg.path} fill={seg.color} opacity="0.85" className="transition-opacity hover:opacity-100" />
              ))
            )}
            <circle cx={cx} cy={cy} r={innerR} className="fill-luxury-950" />
            <text x={cx} y={cy - 4} textAnchor="middle" className="fill-slate-100 font-bold" fontSize="13" fontWeight="900" fontFamily="monospace">{formatNum(total)}</text>
            <text x={cx} y={cy + 9} textAnchor="middle" className="fill-slate-500" fontSize="7" fontFamily="monospace">TOTAL</text>
          </svg>
        </div>

        <div className="w-full space-y-2.5">
          {data.map((d, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-xs text-slate-400 font-medium">{d.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: total > 0 ? `${(d.value / total * 100).toFixed(1)}%` : '0%', backgroundColor: d.color, opacity: 0.7 }} />
                </div>
                <span className="text-xs font-bold font-mono text-white w-8 text-right">{d.value || 0}</span>
              </div>
            </div>
          ))}
          {total === 0 && <p className="text-[11px] text-slate-600 text-center pt-1">No content imported yet</p>}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Subtitle Moderation Summary ─────────────────────────────────────────────
function SubtitleStats({ stats }) {
  const items = [
    { label: 'Pending Review', value: stats?.pending || 0, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-400' },
    { label: 'Approved',       value: stats?.approved || 0, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
    { label: 'Rejected',       value: stats?.rejected || 0, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', dot: 'bg-rose-400' },
  ];
  const total = (stats?.pending || 0) + (stats?.approved || 0) + (stats?.rejected || 0);

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={5}
      className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-luxury-900 to-luxury-950 overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Subtitle Moderation</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">{total} total submissions</p>
          </div>
        </div>
        <Link href="/management/subtitles" className="text-[10px] font-bold text-emerald-400/80 hover:text-emerald-300 transition flex items-center gap-1 min-h-[44px] px-1">
          Queue <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="p-5 grid grid-cols-3 gap-3">
        {items.map((item, i) => (
          <div key={i} className={`rounded-xl border ${item.border} ${item.bg} p-3 text-center`}>
            <div className={`text-xl font-black font-mono ${item.color}`}>{item.value}</div>
            <div className="text-[9px] text-slate-500 mt-1 uppercase tracking-wide font-bold leading-tight">{item.label}</div>
          </div>
        ))}
      </div>
      {(stats?.pending || 0) > 0 && (
        <div className="px-5 pb-4">
          <Link href="/management/subtitles"
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-amber-500/[0.08] border border-amber-500/20 text-amber-300 text-xs font-bold hover:bg-amber-500/[0.12] transition min-h-[44px]">
            <AlertTriangle className="w-3.5 h-3.5" />
            Review {stats.pending} pending subtitle{stats.pending !== 1 ? 's' : ''}
          </Link>
        </div>
      )}
    </motion.div>
  );
}

// ─── Hot Searches ────────────────────────────────────────────────────────────
function HotSearches({ searches }) {
  const [filter, setFilter] = useState('all');
  const now = new Date();

  const filtered = (searches || []).filter(s => {
    if (filter === 'all') return true;
    if (!s.lastSearched) return filter === 'all';
    const d = new Date(s.lastSearched);
    const diff = (now - d) / (1000 * 60 * 60 * 24);
    if (filter === 'today') return diff < 1;
    if (filter === '7d') return diff <= 7;
    return true;
  });

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={6}
      className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-luxury-900 to-luxury-950 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-5 pt-5 pb-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-brand-secondary/15 flex items-center justify-center flex-shrink-0">
            <Search className="w-4 h-4 text-brand-secondary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white">Hot Searches</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">User query logs</p>
          </div>
        </div>
        <div className="flex bg-white/[0.04] border border-white/[0.06] rounded-lg p-0.5 flex-shrink-0">
          {[['today','Today'],['7d','7d'],['all','All']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wide transition min-h-[28px] ${filter === val ? 'bg-brand-secondary/20 text-brand-secondary' : 'text-slate-500 hover:text-slate-300'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pb-5">
        {filtered.length > 0 ? (
          <div className="space-y-1 mt-2">
            {filtered.slice(0, 10).map((s, i) => (
              <Link key={i} href={`/search?q=${encodeURIComponent(s.query)}`} target="_blank"
                className="flex justify-between items-center py-2 px-2.5 rounded-lg hover:bg-white/[0.03] -mx-0.5 transition-colors group min-h-[44px]">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <span className="text-slate-600 font-mono text-[10px] font-bold w-4 flex-shrink-0">{i + 1}</span>
                  <span className="text-slate-300 text-xs font-medium truncate">"{s.query}"</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.06] text-slate-400 text-[10px] font-mono font-bold">
                    {s.count}×
                  </span>
                  <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-slate-400 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <Search className="w-7 h-7 text-slate-700 mx-auto mb-2" />
            <p className="text-xs text-slate-600">No searches logged{filter !== 'all' ? ' for this period' : ' yet'}.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Most Visited Titles ─────────────────────────────────────────────────────
function TopTitles({ content }) {
  const [page, setPage] = useState(0);
  const PER_PAGE = 5;
  const total = (content || []).length;
  const pages = Math.ceil(total / PER_PAGE);
  const visible = (content || []).slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={5}
      className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-luxury-900 to-luxury-950 overflow-hidden">
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-brand-accent/15 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-brand-accent" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white">Most Visited Titles</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Top content by view count</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pages > 1 && (
            <div className="flex items-center gap-1">
              {Array.from({ length: pages }).map((_, i) => (
                <button key={i} onClick={() => setPage(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${i === page ? 'bg-brand-primary w-3' : 'bg-white/20 hover:bg-white/40'}`} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-6 pb-5">
        {visible.length > 0 ? (
          <div className="divide-y divide-white/[0.04]">
            {visible.map((media, idx) => (
              <div key={idx} className="py-3 flex items-center gap-3 group">
                {/* Rank */}
                <span className="text-slate-700 font-mono text-xs font-bold w-5 text-center flex-shrink-0">
                  {String(page * PER_PAGE + idx + 1).padStart(2, '0')}
                </span>
                {/* Poster */}
                <div className="w-9 h-[52px] rounded-lg overflow-hidden flex-shrink-0 bg-luxury-800 border border-white/[0.06]">
                  {media.poster ? (
                    <img src={media.poster} alt={media.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {media.type === 'Movie' ? <Film className="w-4 h-4 text-slate-700" /> : <Tv className="w-4 h-4 text-slate-700" />}
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border flex-shrink-0 ${
                      media.type === 'Movie' ? 'bg-violet-500/10 text-violet-400 border-violet-500/15' : 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/15'
                    }`}>{media.type}</span>
                    {media.isTrending && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-brand-accent/10 text-brand-accent border border-brand-accent/15 flex-shrink-0">
                        Trending
                      </span>
                    )}
                  </div>
                  <p className="text-slate-200 font-semibold text-sm truncate">{media.title}</p>
                </div>
                {/* Stats */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-brand-accent/60" />
                    <span className="text-brand-accent font-bold text-xs font-mono">{media.tmdbRating || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3 text-slate-600" />
                    <span className="text-slate-400 font-bold text-xs font-mono">{formatNum(media.viewCount)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center">
            <Eye className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="text-xs text-slate-600">No view data recorded yet.</p>
            <p className="text-[10px] text-slate-700 mt-1">Views accumulate as users browse content.</p>
          </div>
        )}
        {total > PER_PAGE && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-white/[0.04]">
            <Link href="/management/movies" className="flex-1 py-2.5 text-center text-[10px] font-bold text-slate-400 hover:text-slate-200 bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] rounded-xl transition uppercase tracking-wider min-h-[44px] flex items-center justify-center gap-1">
              <Film className="w-3 h-3" /> All Movies
            </Link>
            <Link href="/management/dramas" className="flex-1 py-2.5 text-center text-[10px] font-bold text-slate-400 hover:text-slate-200 bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] rounded-xl transition uppercase tracking-wider min-h-[44px] flex items-center justify-center gap-1">
              <Tv className="w-3 h-3" /> All Dramas
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Most Downloaded Subtitles ────────────────────────────────────────────────
function MostDownloadedSubtitles({ subtitles }) {
  const [page, setPage] = useState(0);
  const PER_PAGE = 5;
  const list = subtitles || [];
  const total = list.length;
  const pages = Math.ceil(total / PER_PAGE);
  const visible = list.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={6}
      className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-luxury-900 to-luxury-950 overflow-hidden flex flex-col justify-between h-full min-h-[350px]">
      <div>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.04]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0">
              <Download className="w-4 h-4 text-violet-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white">Most Downloaded Subtitles</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Top subtitles by download count</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pages > 1 && (
              <div className="flex items-center gap-1">
                {Array.from({ length: pages }).map((_, i) => (
                  <button key={i} onClick={() => setPage(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === page ? 'bg-violet-500 w-3' : 'bg-white/20 hover:bg-white/40'}`} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-2 divide-y divide-white/[0.04]">
          {visible.length > 0 ? (
            visible.map((sub, idx) => {
              const globalIdx = page * PER_PAGE + idx + 1;
              return (
                <div key={sub._id || idx} className="py-3 flex items-center gap-3 group">
                  <span className="text-slate-700 font-mono text-xs font-bold w-5 text-center flex-shrink-0">
                    {String(globalIdx).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-slate-400 flex-shrink-0">
                        {sub.language || 'Sinhala'}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-brand-primary/10 text-brand-primary border border-brand-primary/15 flex-shrink-0">
                        {sub.format || 'srt'}
                      </span>
                      {sub.version && (
                        <span className="text-[9px] text-slate-500 truncate max-w-[120px]">
                          v{sub.version}
                        </span>
                      )}
                    </div>
                    {sub.media?.slug ? (
                      <Link href={`/${sub.media.type === 'movie' ? 'movie' : 'drama'}/${sub.media.slug}`} target="_blank"
                        className="text-slate-200 font-semibold text-xs hover:text-brand-primary transition-colors block truncate">
                        {sub.media.title || 'Untitled'}
                      </Link>
                    ) : (
                      <p className="text-slate-200 font-semibold text-xs truncate">
                        {sub.media?.title || 'Untitled'}
                      </p>
                    )}
                    {sub.uploader?.username && (
                      <p className="text-[9px] text-slate-500 mt-0.5">
                        by {sub.uploader.username}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 text-violet-400 bg-violet-500/10 border border-violet-500/15 px-2 py-1 rounded-lg">
                    <Download className="w-3 h-3" />
                    <span className="font-bold text-xs font-mono">{formatNum(sub.downloads)}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-10 text-center">
              <Download className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-600">No download statistics recorded yet.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Latest Downloaded Subtitles ──────────────────────────────────────────────
function LatestDownloadedSubtitles({ subtitles }) {
  const [page, setPage] = useState(0);
  const PER_PAGE = 5;
  const list = subtitles || [];
  const total = list.length;
  const pages = Math.ceil(total / PER_PAGE);
  const visible = list.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={7}
      className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-luxury-900 to-luxury-950 overflow-hidden flex flex-col justify-between h-full min-h-[350px]">
      <div>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.04]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white">Latest Downloaded</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Recently downloaded subtitles</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pages > 1 && (
              <div className="flex items-center gap-1">
                {Array.from({ length: pages }).map((_, i) => (
                  <button key={i} onClick={() => setPage(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === page ? 'bg-emerald-500 w-3' : 'bg-white/20 hover:bg-white/40'}`} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-2 divide-y divide-white/[0.04]">
          {visible.length > 0 ? (
            visible.map((sub, idx) => {
              return (
                <div key={sub._id || idx} className="py-3 flex items-center justify-between gap-3 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-slate-400 flex-shrink-0">
                        {sub.language || 'Sinhala'}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-brand-primary/10 text-brand-primary border border-brand-primary/15 flex-shrink-0">
                        {sub.format || 'srt'}
                      </span>
                      {sub.version && (
                        <span className="text-[9px] text-slate-500 truncate max-w-[120px]">
                          v{sub.version}
                        </span>
                      )}
                    </div>
                    {sub.media?.slug ? (
                      <Link href={`/${sub.media.type === 'movie' ? 'movie' : 'drama'}/${sub.media.slug}`} target="_blank"
                        className="text-slate-200 font-semibold text-xs hover:text-brand-primary transition-colors block truncate">
                        {sub.media.title || 'Untitled'}
                      </Link>
                    ) : (
                      <p className="text-slate-200 font-semibold text-xs truncate">
                        {sub.media?.title || 'Untitled'}
                      </p>
                    )}
                    {sub.uploader?.username && (
                      <p className="text-[9px] text-slate-500 mt-0.5">
                        by {sub.uploader.username}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className="text-[10px] font-medium font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/15">
                      {formatRelativeTime(sub.lastDownloadedAt)}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Download className="w-3 h-3" />
                      <span className="font-mono">{sub.downloads || 0}</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-10 text-center">
              <Clock className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-600">No recent downloads logged yet.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── System Health Row ────────────────────────────────────────────────────────
function SystemHealthRow({ health }) {
  if (!health) return null;
  const items = [
    {
      label: 'DB Status',
      value: health.dbStatus === 'ok' ? 'Operational' : 'Error',
      icon: health.dbStatus === 'ok' ? Check : XCircle,
      color: health.dbStatus === 'ok' ? 'text-emerald-400' : 'text-rose-400',
      bg: health.dbStatus === 'ok' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20',
    },
    { label: 'DB Driver', value: (health.dbDriver || '—').toUpperCase(), icon: Database, color: 'text-brand-primary', bg: 'bg-brand-primary/10 border-brand-primary/20' },
    { label: 'PHP Version', value: health.phpVersion?.split('.').slice(0,2).join('.') || '—', icon: Server, color: 'text-brand-accent', bg: 'bg-brand-accent/10 border-brand-accent/20' },
    { label: 'Server Time', value: health.serverTime?.split(' ')[1]?.slice(0,5) || '—', icon: Clock, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
    { label: 'Timezone', value: health.timezone || '—', icon: Globe, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
  ];

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={10}
      className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-luxury-900 to-luxury-950 overflow-hidden">
      <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-white/[0.04]">
        <div className="w-9 h-9 rounded-xl bg-sky-500/15 flex items-center justify-center">
          <Server className="w-4 h-4 text-sky-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">System Health</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">API & database status snapshot</p>
        </div>
      </div>
      <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className={`rounded-xl border ${item.bg} p-3`}>
              <div className="flex items-center gap-2 mb-1.5">
                <Icon className={`w-3.5 h-3.5 ${item.color} flex-shrink-0`} />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide truncate">{item.label}</span>
              </div>
              <p className={`text-sm font-black font-mono truncate ${item.color}`}>{item.value}</p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Episode Alerts ───────────────────────────────────────────────────────────
function EpisodeAlerts({ episodes }) {
  if (!episodes || episodes.length === 0) return null;
  const urgentCount = episodes.filter(ep => !ep.hasSubtitles && !ep.isUpcoming).length;
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}
      className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.06] via-transparent to-orange-500/[0.03] overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-amber-500/[0.08] bg-amber-500/[0.03]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Bell className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <span className="text-xs font-bold text-amber-200/90 tracking-wide">Episode Subtitle Status</span>
          {urgentCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/25 text-red-300 text-[9px] font-bold animate-pulse">
              {urgentCount} Missing
            </span>
          )}
        </div>
        <Link href="/management/dramas" className="text-[10px] font-bold text-amber-400/80 hover:text-amber-300 transition flex items-center gap-1 min-h-[44px] px-1">
          Manage <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="divide-y divide-white/[0.04] max-h-[280px] overflow-y-auto">
        {episodes.map(ep => {
          const now = new Date();
          const airDate = ep.airDate ? new Date(ep.airDate) : null;
          const daysUntil = airDate ? Math.ceil((airDate - now) / 86400000) : null;
          const formattedDate = airDate
            ? airDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'No date set';
          let ctLabel = '', ctClass = 'bg-white/5 text-slate-500';
          if (daysUntil !== null) {
            if (ep.isUpcoming) {
              ctLabel = daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'TOMORROW' : `In ${daysUntil}d`;
              ctClass = daysUntil <= 1 ? 'bg-red-500/15 text-red-300 border border-red-500/20' : daysUntil <= 3 ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20' : 'bg-violet-500/10 text-violet-300 border border-violet-500/15';
            } else {
              const ago = Math.abs(daysUntil);
              ctLabel = ago === 0 ? 'TODAY' : `${ago}d ago`;
              ctClass = ago <= 3 ? 'bg-red-500/15 text-red-300 border border-red-500/20' : 'bg-white/5 text-slate-500';
            }
          }
          return (
            <div key={ep._id} className={`flex items-center gap-3 px-5 py-3 transition-colors ${!ep.hasSubtitles ? 'bg-red-500/[0.03] hover:bg-red-500/[0.06]' : 'hover:bg-white/[0.02]'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ep.hasSubtitles ? 'bg-emerald-500/12 text-emerald-400' : 'bg-red-500/12 text-red-400'}`}>
                <Clapperboard className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate">
                  {ep.dramaTitle} — <span className="text-slate-400">Ep {ep.episodeNumber}</span>
                  {ep.episodeTitle && ep.episodeTitle.toLowerCase() !== `episode ${ep.episodeNumber}`.toLowerCase() && (
                    <span className="text-slate-500"> ({ep.episodeTitle})</span>
                  )}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                  <CalendarCheck2 className="w-3 h-3 flex-shrink-0" />
                  {ep.isUpcoming ? '🔵 Upcoming — ' : '⚡ Aired — '}{formattedDate}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!ep.hasSubtitles ? (
                  ep.isUpcoming ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-500/12 border border-violet-500/20 text-violet-300 text-[9px] font-bold">
                      Not Aired
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/12 border border-red-500/20 text-red-300 text-[9px] font-bold">
                      <AlertTriangle className="w-2.5 h-2.5" /> Add Subs
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/12 border border-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                    <CheckCircle className="w-2.5 h-2.5" /> Ready
                  </span>
                )}
                {ctLabel && (
                  <span className={`text-[9px] font-mono font-bold px-2 py-1 rounded-lg ${ctClass} hidden sm:inline`}>{ctLabel}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Quick Actions ─────────────────────────────────────────────────────────────
function QuickActions() {
  const toast = useToast();
  const [clearingCache, setClearingCache] = useState(false);

  const handleClearCache = async () => {
    if (clearingCache) return;
    setClearingCache(true);
    try {
      const res = await apiClient.get('/api/clear-cache-xyz');
      toast.success(res.data || 'Redis cache flushed successfully!');
    } catch (err) {
      toast.error(err.response?.data || err.message || 'Failed to flush cache');
    } finally {
      setClearingCache(false);
    }
  };

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={9}
      className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-luxury-900 to-luxury-950 overflow-hidden">
      <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-white/[0.04]">
        <div className="w-9 h-9 rounded-xl bg-brand-primary/15 flex items-center justify-center">
          <Zap className="w-4 h-4 text-brand-primary" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Quick Actions</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Common admin tasks</p>
        </div>
      </div>
      <div className="p-5 space-y-2.5">
        <Link href="/management/import"
          className="group w-full flex items-center gap-3 bg-gradient-to-r from-brand-primary to-brand-secondary hover:brightness-110 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-brand-primary/15 uppercase tracking-wider min-h-[44px] px-4">
          <Database className="w-4 h-4 opacity-80 flex-shrink-0" />
          <span className="flex-1">Launch Importer</span>
          <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition flex-shrink-0" />
        </Link>
        <Link href="/management/articles"
          className="group w-full flex items-center gap-3 bg-white/[0.03] hover:bg-white/[0.06] text-slate-200 font-bold text-xs border border-white/[0.06] rounded-xl transition uppercase tracking-wider min-h-[44px] px-4">
          <BookOpenText className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className="flex-1">Write Article</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition flex-shrink-0" />
        </Link>
        <Link href="/management/subtitles"
          className="group w-full flex items-center gap-3 bg-white/[0.03] hover:bg-white/[0.06] text-slate-200 font-bold text-xs border border-white/[0.06] rounded-xl transition uppercase tracking-wider min-h-[44px] px-4">
          <Languages className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className="flex-1">Subtitle Queue</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition flex-shrink-0" />
        </Link>
        <button
          onClick={handleClearCache}
          disabled={clearingCache}
          className="group w-full flex items-center gap-3 bg-white/[0.03] hover:bg-white/[0.06] text-slate-200 font-bold text-xs border border-white/[0.06] rounded-xl transition uppercase tracking-wider min-h-[44px] px-4 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 text-slate-400 flex-shrink-0 ${clearingCache ? 'animate-spin' : ''}`} />
          <span className="flex-1 text-left">{clearingCache ? 'Clearing...' : 'Clear System Cache'}</span>
        </button>
        <Link href="/" target="_blank"
          className="group w-full flex items-center gap-3 bg-white/[0.03] hover:bg-white/[0.06] text-slate-200 font-bold text-xs border border-white/[0.06] rounded-xl transition uppercase tracking-wider min-h-[44px] px-4">
          <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className="flex-1">View Frontend</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition flex-shrink-0" />
        </Link>
      </div>
    </motion.div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { admin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient.get('/api/admin/dashboard')
      .then(res => setStats(res.data))
      .catch(err => setError(err.response?.data?.message || 'Failed to load dashboard stats'))
      .finally(() => setLoading(false));
  }, []);

  // Compute sparkline values and trend from traffic logs
  const trafficLogs = stats?.trafficLogs || [];
  const sortedLogs = [...trafficLogs].sort((a, b) => a.date.localeCompare(b.date));
  const sparkValues = sortedLogs.slice(-7).map(l => l.views);

  const computeTrend = () => {
    if (sortedLogs.length < 4) return null;
    const half = Math.floor(sortedLogs.length / 2);
    const recent = sortedLogs.slice(-half).reduce((s, l) => s + l.views, 0);
    const prev = sortedLogs.slice(-half * 2, -half).reduce((s, l) => s + l.views, 0);
    if (!prev) return null;
    return Math.round(((recent - prev) / prev) * 100);
  };
  const trendPct = computeTrend();

  // Loading state
  if (loading) {
    return (
      <div className="admin-shell min-h-screen bg-luxury-950 text-slate-100 flex flex-col lg:flex-row">
        <AdminSidebar />
        <main className="admin-main flex-grow p-5 sm:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-7">
            {/* Header skeleton */}
            <div className="rounded-2xl border border-white/[0.06] bg-luxury-900/50 p-6 sm:p-8">
              <Pulse className="h-4 w-32 mb-3" />
              <Pulse className="h-8 w-56 mb-2" />
              <Pulse className="h-3 w-48" />
            </div>
            {/* Cards skeleton */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
              {Array.from({ length: 9 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
            {/* Chart + sidebar skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2"><ChartSkeleton /></div>
              <div className="space-y-6">
                <WidgetSkeleton rows={3} />
                <WidgetSkeleton rows={5} />
              </div>
            </div>
            {/* Bottom row skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2"><WidgetSkeleton rows={5} /></div>
              <WidgetSkeleton rows={4} />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-shell min-h-screen bg-luxury-950 text-slate-100 flex flex-col lg:flex-row">
      <AdminSidebar />

      <main className="admin-main flex-grow p-5 sm:p-8 overflow-y-auto min-w-0">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* ── Header Banner ── */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}
            className="admin-dashboard-header relative overflow-hidden rounded-[24px] border border-white/[0.07] p-6 sm:p-7">
            <div className="absolute top-0 right-0 w-80 h-80 bg-brand-primary/[0.07] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-56 h-56 bg-brand-secondary/[0.05] rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/80">Workspace online</p>
                </div>
                <h1 className="text-2xl sm:text-[32px] font-bold text-white tracking-tight">{getGreeting()}, {admin?.username || 'Admin'}</h1>
                <p className="text-slate-400 text-xs mt-2 flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-brand-primary" />
                  Here is what is happening across KSubZone today.
                </p>
              </div>
              {/* SEO Health */}
              <div className="flex items-center gap-3.5 px-5 py-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm flex-shrink-0">
                <div className="relative w-12 h-12">
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(16,185,129,0.12)" strokeWidth="3.5" />
                    <circle cx="20" cy="20" r="16" fill="none" stroke="#10b981" strokeWidth="3.5"
                      strokeDasharray={`${(stats?.seoHealthScore || 98) * 1.005} 100.5`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-emerald-400 font-mono">
                    {stats?.seoHealthScore || 98}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">SEO Health</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Schema Validated</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Error Banner ── */}
          {error && (
            <motion.div variants={fadeUp} initial="hidden" animate="visible"
              className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          {/* ── Metric Cards (2-col mobile → 3-col desktop) ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4">
            {METRIC_CARDS.map((card, idx) => (
              <motion.div key={card.key} variants={fadeUp} initial="hidden" animate="visible" custom={idx * 0.4}>
                <StatCard
                  label={card.label}
                  value={stats?.counts?.[card.key] !== undefined && stats?.counts?.[card.key] !== null ? formatNum(stats.counts[card.key]) : '0'}
                  icon={card.icon}
                  trend={card.key === 'totalTrafficViews' || card.key === 'totalViews' ? trendPct : null}
                  sparklineValues={sparkValues}
                  sparklineColor={card.spark}
                  borderClass={card.border}
                  iconBgClass={card.iconBg}
                  iconColorClass={card.iconColor}
                  gradClass={card.grad}
                  href={card.href}
                />
              </motion.div>
            ))}
          </div>

          {/* ── Episode Alerts ── */}
          <EpisodeAlerts episodes={stats?.upcomingEpisodes} />

          {/* ── Main Row: Chart + Right Column ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Traffic Chart — spans 2 cols */}
            <div className="lg:col-span-2">
              <TrafficChart allLogs={sortedLogs} />
            </div>
            {/* Right column */}
            <div className="space-y-6">
              <SubtitleStats stats={stats?.subtitleStats} />
              <HotSearches searches={stats?.trendingSearches} />
            </div>
          </div>

          {/* ── Second Row: Top Titles + Donut ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Most visited — spans 2 cols */}
            <div className="lg:col-span-2">
              <TopTitles content={stats?.topContent} />
            </div>
            {/* Content distribution donut */}
            <div className="space-y-6">
              <ContentDonut
                movies={stats?.counts?.totalMovies}
                dramas={stats?.counts?.totalDramas}
                episodes={stats?.counts?.totalEpisodes}
              />
              <QuickActions />
            </div>
          </div>

          {/* ── Third Row: Subtitle Downloads ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MostDownloadedSubtitles subtitles={stats?.mostDownloaded} />
            <LatestDownloadedSubtitles subtitles={stats?.latestDownloads} />
          </div>

          {/* ── System Health Row (full width) ── */}
          <SystemHealthRow health={stats?.systemHealth} />

        </div>
      </main>
    </div>
  );
}
