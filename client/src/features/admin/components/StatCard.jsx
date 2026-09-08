'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// KSubZone Frosted Soft-Tinted Squircle Schemes (Matching 70x70 Reference Image)
const SCHEMES = {
  purple: {
    bg: 'bg-[#7C3AED]/10 dark:bg-[#7C3AED]/20',
    text: 'text-[#7C3AED] dark:text-[#C084FC]',
    border: 'border-[#7C3AED]/20',
    hoverGlow: 'group-hover:shadow-[0_10px_25px_rgba(124,58,237,0.18)]',
  },
  violet: {
    bg: 'bg-[#8B5CF6]/10 dark:bg-[#8B5CF6]/20',
    text: 'text-[#8B5CF6] dark:text-[#DDD6FE]',
    border: 'border-[#8B5CF6]/20',
    hoverGlow: 'group-hover:shadow-[0_10px_25px_rgba(139,92,246,0.18)]',
  },
  blue: {
    bg: 'bg-[#3B82F6]/10 dark:bg-[#3B82F6]/20',
    text: 'text-[#3B82F6] dark:text-[#93C5FD]',
    border: 'border-[#3B82F6]/20',
    hoverGlow: 'group-hover:shadow-[0_10px_25px_rgba(59,130,246,0.18)]',
  },
  green: {
    bg: 'bg-[#10B981]/10 dark:bg-[#10B981]/20',
    text: 'text-[#10B981] dark:text-[#6EE7B7]',
    border: 'border-[#10B981]/20',
    hoverGlow: 'group-hover:shadow-[0_10px_25px_rgba(16,185,129,0.18)]',
  },
  emerald: {
    bg: 'bg-[#10B981]/10 dark:bg-[#10B981]/20',
    text: 'text-[#10B981] dark:text-[#6EE7B7]',
    border: 'border-[#10B981]/20',
    hoverGlow: 'group-hover:shadow-[0_10px_25px_rgba(16,185,129,0.18)]',
  },
  amber: {
    bg: 'bg-[#F59E0B]/10 dark:bg-[#F59E0B]/20',
    text: 'text-[#F59E0B] dark:text-[#FDE68A]',
    border: 'border-[#F59E0B]/20',
    hoverGlow: 'group-hover:shadow-[0_10px_25px_rgba(245,158,11,0.18)]',
  },
  yellow: {
    bg: 'bg-[#F59E0B]/10 dark:bg-[#F59E0B]/20',
    text: 'text-[#F59E0B] dark:text-[#FDE68A]',
    border: 'border-[#F59E0B]/20',
    hoverGlow: 'group-hover:shadow-[0_10px_25px_rgba(245,158,11,0.18)]',
  },
  coral: {
    bg: 'bg-[#F43F5E]/10 dark:bg-[#F43F5E]/20',
    text: 'text-[#F43F5E] dark:text-[#FECDD3]',
    border: 'border-[#F43F5E]/20',
    hoverGlow: 'group-hover:shadow-[0_10px_25px_rgba(244,63,94,0.18)]',
  },
  rose: {
    bg: 'bg-[#EF4444]/10 dark:bg-[#EF4444]/20',
    text: 'text-[#EF4444] dark:text-[#FECACA]',
    border: 'border-[#EF4444]/20',
    hoverGlow: 'group-hover:shadow-[0_10px_25px_rgba(239,68,68,0.18)]',
  },
  slate: {
    bg: 'bg-slate-500/10 dark:bg-slate-500/20',
    text: 'text-slate-500 dark:text-slate-300',
    border: 'border-slate-500/20',
    hoverGlow: 'group-hover:shadow-[0_10px_25px_rgba(100,116,139,0.18)]',
  },
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  trend = null,
  trendPeriod = 'from last week',
  trendText = null,
  variant = 'primary',
  href = null,
  badge = null,
  accentColor = 'purple',
}) {
  const isPositive = trend > 0;
  const isNegative = trend < 0;
  const scheme = SCHEMES[accentColor] || SCHEMES.purple;

  const CardContent = () => {
    // Secondary compact card (for quick launcher or secondary metrics)
    if (variant === 'secondary') {
      return (
        <div className="dashstack-card relative flex items-center justify-between gap-3.5 p-4 sm:p-5 rounded-[24px] bg-white/85 dark:bg-[#120E1E]/85 backdrop-blur-xl border border-slate-200/70 dark:border-white/[0.07] shadow-[0_8px_24px_-4px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:border-[#7C3AED]/30 transition-all duration-300 group">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-[1.5px] text-slate-400 dark:text-slate-500 truncate">
              {label}
            </p>
            <p className="text-[22px] sm:text-[24px] font-extrabold text-slate-900 dark:text-white leading-none tracking-tight">
              {value}
            </p>
          </div>

          {Icon && (
            <div className={`h-12 w-12 flex-shrink-0 flex items-center justify-center rounded-[18px] ${scheme.bg} ${scheme.text} group-hover:scale-105 transition-transform duration-200`}>
              <Icon className="h-5 w-5 stroke-[2]" />
            </div>
          )}
        </div>
      );
    }

    // ── Primary Stat Card (Frosted Glass with 70x70 Soft Squircle Icon Box) ──
    return (
      <div className="dashstack-card relative flex items-center justify-between gap-4 p-6 rounded-[28px] sm:rounded-[32px] bg-white/90 dark:bg-[#120E1E]/90 backdrop-blur-xl border border-slate-200/70 dark:border-white/[0.08] shadow-[0_10px_30px_-5px_rgba(0,0,0,0.03)] hover:-translate-y-1.5 hover:shadow-[0_20px_35px_-8px_rgba(124,58,237,0.08)] hover:border-[#7C3AED]/30 transition-all duration-300 group min-h-[142px]">
        {/* Left Side: Label, Big Bold Value, Trend */}
        <div className="flex flex-col justify-between h-full min-w-0 flex-1 space-y-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold text-slate-500 dark:text-slate-400 tracking-tight truncate">
                {label}
              </span>
              {badge && (
                <span className="rounded-full bg-slate-100 dark:bg-white/[0.08] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  {badge}
                </span>
              )}
            </div>

            <h3 className="text-[28px] sm:text-[34px] font-black text-slate-900 dark:text-white tracking-tight leading-tight font-sans mt-1">
              {value}
            </h3>
          </div>

          {/* Micro Trend or Subtitle */}
          <div className="flex items-center gap-1.5 pt-0.5 text-[11.5px] font-semibold flex-wrap">
            {trend !== null ? (
              <>
                <span className={`inline-flex items-center gap-0.5 font-bold ${
                  isPositive ? 'text-[#10B981]' : isNegative ? 'text-[#EF4444]' : 'text-slate-400'
                }`}>
                  {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : isNegative ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                  {isPositive ? `${trend}%` : `${Math.abs(trend)}%`}
                </span>
                <span className={`font-semibold ${isPositive ? 'text-[#10B981]' : isNegative ? 'text-[#EF4444]' : 'text-slate-400'}`}>
                  {isPositive ? 'Up' : isNegative ? 'Down' : 'Same'}
                </span>
                <span className="text-slate-400 dark:text-slate-500 font-normal">
                  {trendPeriod}
                </span>
              </>
            ) : (
              <span className="text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                {trendText || 'Real-time verified'}
              </span>
            )}
          </div>
        </div>

        {/* Right Side: 70x70 Soft-Tinted Squircle Icon Box */}
        {Icon && (
          <div
            className={`h-[68px] w-[68px] sm:h-[72px] sm:w-[72px] flex-shrink-0 flex items-center justify-center rounded-[22px] ${scheme.bg} ${scheme.text} ${scheme.hoverGlow} transition-all duration-300 group-hover:scale-105`}
          >
            <Icon className="h-8 w-8 stroke-[1.9]" />
          </div>
        )}

        {/* Hover Arrow Indicator */}
        {href && (
          <div className="absolute right-5 top-5 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowUpRight className="h-4 w-4 text-[#7C3AED]" />
          </div>
        )}
      </div>
    );
  };

  if (href) {
    return (
      <Link href={href} className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] rounded-[32px]">
        <CardContent />
      </Link>
    );
  }

  return <CardContent />;
}
