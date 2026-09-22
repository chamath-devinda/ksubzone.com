import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  subLabel?: string;
  accentColor?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  change,
  changeType = 'neutral',
  subLabel,
  accentColor = '#9E57F6',
}: StatCardProps) {
  const changeBadgeClass = changeType === 'positive'
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    : changeType === 'negative'
    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    : 'bg-slate-800 text-slate-400 border-white/5';

  return (
    <div className="p-5 rounded-2xl bg-[#141418] border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between relative overflow-hidden group">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {label}
        </span>
        <div
          className="p-2.5 rounded-xl border border-white/5 flex items-center justify-center transition-transform group-hover:scale-105"
          style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <div className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight">
          {value}
        </div>
        {change && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${changeBadgeClass}`}>
            {change}
          </span>
        )}
      </div>

      {subLabel && (
        <div className="mt-2 text-xs text-slate-500 font-medium">
          {subLabel}
        </div>
      )}
    </div>
  );
}
