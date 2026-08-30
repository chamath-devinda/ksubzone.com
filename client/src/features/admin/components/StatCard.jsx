'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ─── Color maps for icon tiles ──────────────────────────────────────────────
const ICON_TILE_COLORS = {
  violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', icon: 'text-violet-400' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'text-emerald-400' },
  cyan:    { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    icon: 'text-cyan-400' },
  amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   icon: 'text-amber-400' },
  pink:    { bg: 'bg-pink-500/10',    border: 'border-pink-500/20',    icon: 'text-pink-400' },
  sky:     { bg: 'bg-sky-500/10',     border: 'border-sky-500/20',     icon: 'text-sky-400' },
  rose:    { bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    icon: 'text-rose-400' },
  slate:   { bg: 'bg-white/[0.05]',   border: 'border-white/[0.08]',  icon: 'text-slate-400' },
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  trend = null,
  trendPeriod = 'vs last period',
  sparklineValues = [],
  sparklineColor = '#8b5cf6',
  variant = 'primary',
  href = null,
  badge = null,
  accentColor = 'slate',  // 'violet'|'emerald'|'cyan'|'amber'|'pink'|'sky'|'rose'|'slate'
}) {
  const isPositive = trend > 0;
  const isNegative = trend < 0;
  const tileColors = ICON_TILE_COLORS[accentColor] || ICON_TILE_COLORS.slate;

  const CardContent = () => {
    // ── Secondary (compact horizontal) ──────────────────────────────────────
    if (variant === 'secondary') {
      return (
        <div className="ksz-card relative flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-[#11131A] p-3.5 transition-all duration-200 hover:border-white/[0.1] hover:bg-[#13151D] hover:-translate-y-0.5 group">
          <div className="min-w-0 space-y-0.5">
            <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider truncate">{label}</p>
            <p className="text-[22px] font-bold text-slate-100 tracking-tight leading-none font-mono">{value}</p>
          </div>

          {Icon && (
            <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border ${tileColors.bg} ${tileColors.border}`}>
              <Icon className={`h-[15px] w-[15px] ${tileColors.icon}`} />
            </div>
          )}
        </div>
      );
    }

    // ── Primary KPI Card ─────────────────────────────────────────────────────
    return (
      <div className="ksz-card ksz-kpi-card relative flex flex-col justify-between rounded-2xl border border-white/[0.06] bg-[#11131A] p-5 transition-all duration-200 hover:border-white/[0.1] hover:bg-[#13151D] hover:-translate-y-0.5 group shadow-sm min-h-[140px]">
        {/* Top row: label + icon */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">
                {label}
              </span>
              {badge && (
                <span className="rounded-md border border-white/[0.06] bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
                  {badge}
                </span>
              )}
            </div>
            <h3 className="text-[30px] font-bold text-slate-100 tracking-tight leading-none font-mono mt-2">
              {value}
            </h3>
          </div>

          {Icon && (
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border ${tileColors.bg} ${tileColors.border}`}>
              <Icon className={`h-4 w-4 ${tileColors.icon}`} />
            </div>
          )}
        </div>

        {/* Bottom row: trend + sparkline */}
        <div className="flex items-end justify-between gap-3 mt-4 pt-3 border-t border-white/[0.04]">
          {trend !== null ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                  isPositive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : isNegative
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-white/[0.05] text-slate-400 border border-white/[0.07]'
                }`}
              >
                {isPositive ? <TrendingUp className="h-3 w-3" /> : isNegative ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {isPositive ? `+${trend}%` : `${trend}%`}
              </span>
              <span className="text-[10px] text-slate-600 truncate">{trendPeriod}</span>
            </div>
          ) : (
            <span className="text-[10px] text-slate-600 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/70" />
              Active catalog
            </span>
          )}

          <div className="flex items-center gap-2 flex-shrink-0">
            {sparklineValues && sparklineValues.length >= 2 && (
              <div className="opacity-60 group-hover:opacity-100 transition-opacity">
                <Sparkline values={sparklineValues} color={sparklineColor} />
              </div>
            )}
            {href && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 group-hover:text-violet-400">
                <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (href) {
    return (
      <Link href={href} className="block h-full focus:outline-none focus-visible:ring-1 focus-visible:ring-violet-500/60 rounded-2xl">
        <CardContent />
      </Link>
    );
  }

  return <CardContent />;
}

// ─── Minimal SVG Sparkline ───────────────────────────────────────────────────
function Sparkline({ values = [], color = '#8b5cf6', w = 60, h = 22 }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const rng = max - min || 1;
  const pad = 2;
  const pts = values.map((v, i) => {
    const x = (pad + (i / (values.length - 1)) * (w - pad * 2)).toFixed(1);
    const y = (h - pad - ((v - min) / rng) * (h - pad * 2)).toFixed(1);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
