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
      <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center text-slate-500 shadow-sm transition-colors duration-300 hover:border-brand-primary/20 hover:text-brand-primary">
        <Icon className="w-7 h-7" />
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-black text-white uppercase tracking-wider">{title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
      </div>

      {action && (
        <div className="pt-2">
          {action}
        </div>
      )}
    </div>
  );
}
