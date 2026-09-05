'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// DashStack Signature Squircle Color Schemes
const DASHSTACK_ICON_SCHEMES = {
  purple: {
    bg: 'bg-[#8280FF]/15 dark:bg-[#8280FF]/25',
    text: 'text-[#8280FF] dark:text-[#A4A3FF]',
    border: 'border-[#8280FF]/20',
  },
  yellow: {
    bg: 'bg-[#FEC53D]/15 dark:bg-[#FEC53D]/25',
    text: 'text-[#FEC53D] dark:text-[#FEC53D]',
    border: 'border-[#FEC53D]/20',
  },
  green: {
    bg: 'bg-[#4AD991]/15 dark:bg-[#4AD991]/25',
    text: 'text-[#4AD991] dark:text-[#4AD991]',
    border: 'border-[#4AD991]/20',
  },
  coral: {
    bg: 'bg-[#FF9066]/15 dark:bg-[#FF9066]/25',
    text: 'text-[#FF9066] dark:text-[#FF9066]',
    border: 'border-[#FF9066]/20',
  },
  blue: {
    bg: 'bg-[#490570]/15 dark:bg-[#490570]/30',
    text: 'text-[#72149A] dark:text-[#D599EC]',
    border: 'border-[#490570]/20',
  },
  slate: {
    bg: 'bg-slate-500/15 dark:bg-slate-500/25',
    text: 'text-slate-500 dark:text-slate-400',
    border: 'border-slate-500/20',
  },
};

// Color aliases for compatibility
DASHSTACK_ICON_SCHEMES.violet = DASHSTACK_ICON_SCHEMES.purple;
DASHSTACK_ICON_SCHEMES.amber = DASHSTACK_ICON_SCHEMES.yellow;
DASHSTACK_ICON_SCHEMES.emerald = DASHSTACK_ICON_SCHEMES.green;
DASHSTACK_ICON_SCHEMES.pink = DASHSTACK_ICON_SCHEMES.coral;
DASHSTACK_ICON_SCHEMES.orange = DASHSTACK_ICON_SCHEMES.coral;
DASHSTACK_ICON_SCHEMES.cyan = DASHSTACK_ICON_SCHEMES.blue;
DASHSTACK_ICON_SCHEMES.sky = DASHSTACK_ICON_SCHEMES.blue;

export default function StatCard({
  label,
  value,
  icon: Icon,
  trend = null,
  trendPeriod = 'from yesterday',
  trendText = null,
  variant = 'primary',
  href = null,
  badge = null,
  accentColor = 'purple', // 'purple' | 'yellow' | 'green' | 'coral' | 'blue' | 'slate'
}) {
  const isPositive = trend > 0;
  const isNegative = trend < 0;
  const scheme = DASHSTACK_ICON_SCHEMES[accentColor] || DASHSTACK_ICON_SCHEMES.purple;

  const CardContent = () => {
    // Secondary compact card (for secondary stats row)
    if (variant === 'secondary') {
      return (
        <div data-accent={accentColor} className="dashstack-card doit-stat doit-stat-secondary relative flex items-center justify-between gap-3 p-4 rounded-[20px] transition-all duration-200 group">
          <div className="min-w-0 space-y-1">
            <p className="text-[12px] font-semibold text-slate-500 dark:text-[#9AA5B8] truncate">
              {label}
            </p>
            <p className="text-[22px] font-black text-slate-900 dark:text-white leading-none font-mono">
              {value}
            </p>
          </div>

          {Icon && (
            <div className={`h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-xl ${scheme.bg} ${scheme.text} group-hover:scale-105 transition-transform`}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
      );
    }

    // DashStack Primary 4-Metric Card
    return (
      <div data-accent={accentColor} className="dashstack-card doit-stat doit-stat-primary relative flex items-center justify-between gap-4 p-5 sm:p-6 rounded-[22px] transition-all duration-200 group min-h-[148px]">
        {/* Left Side: Label, Number, Trend */}
        <div className="flex flex-col justify-between h-full space-y-2 min-w-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-slate-500 dark:text-[#9AA5B8] tracking-tight truncate">
                {label}
              </span>
              {badge && (
                <span className="rounded-md bg-slate-100 dark:bg-white/[0.08] px-1.5 py-0.5 text-[9.5px] font-bold text-slate-600 dark:text-slate-300">
                  {badge}
                </span>
              )}
            </div>

            <h3 className="text-[28px] sm:text-[32px] font-black text-slate-900 dark:text-white tracking-tight leading-tight font-sans mt-1">
              {value}
            </h3>
          </div>

          {/* DashStack Trend Indicator */}
          <div className="flex items-center gap-1.5 pt-1 text-[11.5px] font-semibold flex-wrap">
            {trend !== null ? (
              <>
                <span className={`inline-flex items-center gap-0.5 font-bold ${
                  isPositive ? 'text-[#00B69B]' : isNegative ? 'text-[#EF3826]' : 'text-slate-500'
                }`}>
                  {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : isNegative ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                  {isPositive ? `${trend}%` : `${Math.abs(trend)}%`}
                </span>
                <span className={`font-semibold ${isPositive ? 'text-[#00B69B]' : isNegative ? 'text-[#EF3826]' : 'text-slate-500'}`}>
                  {isPositive ? 'Up' : isNegative ? 'Down' : 'Same'}
                </span>
                <span className="text-slate-400 dark:text-[#9AA5B8] font-normal">
                  {trendPeriod}
                </span>
              </>
            ) : (
              <span className="text-slate-400 dark:text-[#9AA5B8] font-medium flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#00B69B]" />
                {trendText || 'Real-time verified'}
              </span>
            )}
          </div>
        </div>

        {/* Right Side: DashStack Squircle Icon Box */}
        {Icon && (
          <div className={`h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 flex items-center justify-center rounded-2xl ${scheme.bg} ${scheme.text} shadow-sm group-hover:scale-105 transition-transform`}>
            <Icon className="h-7 w-7 sm:h-8 sm:w-8 stroke-[1.8]" />
          </div>
        )}
      </div>
    );
  };

  if (href) {
    return (
      <Link href={href} className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B85ADB] rounded-2xl">
        <CardContent />
      </Link>
    );
  }

  return <CardContent />;
}
