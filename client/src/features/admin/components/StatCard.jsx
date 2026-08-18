'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({
  label,
  value,
  icon: Icon,
  trend = null,
  sparklineValues = [],
  sparklineColor = '#8b5cf6',
  borderClass = 'border-l-violet-500',
  iconBgClass = 'bg-violet-500/15',
  iconColorClass = 'text-violet-400',
  gradClass = 'from-violet-500/[0.07]',
  href = null
}) {
  const CardBody = () => (
    <div className={`relative overflow-hidden rounded-2xl border border-white/[0.06] bg-luxury-900/40 p-5 transition-all duration-300 hover:border-white/10 hover:bg-luxury-900/60 border-l-[3px] ${borderClass} flex flex-col justify-between h-full group`}>
      {/* Glow highlight */}
      <div className={`absolute -right-20 -top-20 h-40 w-40 rounded-full bg-gradient-to-br ${gradClass} to-transparent opacity-50 blur-3xl transition-all duration-500 group-hover:scale-150`} />

      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="space-y-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate">{label}</p>
          <h3 className="text-2xl font-black text-white tracking-tight font-display mt-1">{value}</h3>
        </div>
        
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBgClass} ${iconColorClass} flex-shrink-0 transition-transform duration-300 group-hover:scale-110 shadow-sm`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex items-end justify-between gap-3 mt-4 pt-3 border-t border-white/[0.03] relative z-10">
        {/* Trend Indicator */}
        {trend !== null ? (
          <div className="flex items-center gap-1">
            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-bold ${
              trend > 0 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : trend < 0 
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                  : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
            }`}>
              {trend > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : trend < 0 ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <Minus className="w-3 h-3" />
              )}
              {trend > 0 ? `+${trend}%` : `${trend}%`}
            </span>
            <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider pl-0.5">vs last period</span>
          </div>
        ) : (
          <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider">Metrics log</span>
        )}

        {/* Inline Sparkline */}
        {sparklineValues && sparklineValues.length >= 2 && (
          <div className="opacity-70 group-hover:opacity-100 transition-opacity">
            <Sparkline values={sparklineValues} color={sparklineColor} />
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        <CardBody />
      </Link>
    );
  }

  return <CardBody />;
}

// ─── Sparkline Helper Component ──────────────────────────────────────────────
function Sparkline({ values = [], color = '#8b5cf6', w = 72, h = 24 }) {
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
