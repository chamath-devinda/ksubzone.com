import React from 'react';

export interface StatusBadgeProps {
  status: string;
  variant?: 'status' | 'format' | 'storage' | 'role';
  className?: string;
}

export function StatusBadge({ status, variant = 'status', className = '' }: StatusBadgeProps) {
  const norm = String(status || '').toLowerCase().trim();

  // Status mapping
  if (variant === 'status') {
    if (norm === 'approved' || norm === 'published' || norm === 'active') {
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          {status}
        </span>
      );
    }
    if (norm === 'pending' || norm === 'ongoing' || norm === 'draft') {
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          {status}
        </span>
      );
    }
    if (norm === 'rejected' || norm === 'suspended') {
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          {status}
        </span>
      );
    }
  }

  // File Format Badge
  if (variant === 'format') {
    const isSrt = norm.includes('srt');
    const isVtt = norm.includes('vtt');
    const isAss = norm.includes('ass');
    const colorClass = isSrt
      ? 'bg-[#9E57F6]/10 text-[#9E57F6] border-[#9E57F6]/30'
      : isVtt
      ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
      : isAss
      ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
      : 'bg-slate-800 text-slate-300 border-slate-700';

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider border ${colorClass} ${className}`}>
        .{norm.replace(/^\./, '')}
      </span>
    );
  }

  // Storage Provider Badge
  if (variant === 'storage') {
    if (norm === 'r2') {
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-orange-500/10 text-orange-400 border border-orange-500/20 ${className}`}>
          R2 Edge
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${className}`}>
        Supabase
      </span>
    );
  }

  // Role Badge
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-800 text-slate-200 border border-white/10 ${className}`}>
      {status}
    </span>
  );
}
