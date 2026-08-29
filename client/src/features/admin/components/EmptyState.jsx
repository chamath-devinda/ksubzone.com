'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function EmptyState({
  title = 'No data available',
  description = 'There is currently no data matching your query in this workspace.',
  icon: Icon = AlertCircle,
  action = null
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto space-y-4">
      {/* Decorative Outer Ring */}
      <div className="w-16 h-16 rounded-[20px] bg-violet-500/[0.06] border border-violet-400/10 flex items-center justify-center text-violet-300/60 shadow-sm transition-colors duration-300 hover:border-violet-400/25 hover:text-violet-300">
        <Icon className="w-7 h-7" />
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-white tracking-tight">{title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed max-w-xs">{description}</p>
      </div>

      {action && (
        <div className="pt-2">
          {action}
        </div>
      )}
    </div>
  );
}
