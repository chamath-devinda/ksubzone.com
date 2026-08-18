'use client';

import React from 'react';

// Basic pulsing base element
export function Pulse({ className = '', style = {} }) {
  return (
    <div 
      className={`animate-pulse rounded-lg bg-white/[0.05] ${className}`} 
      style={style}
    />
  );
}

// 1. Metric StatCard Loading Skeleton
export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-luxury-900/40 p-4 min-h-[96px] border-l-[3px] border-l-white/[0.08] flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <Pulse className="h-2 w-14" />
          <Pulse className="h-7 w-12" />
        </div>
        <Pulse className="w-9 h-9 rounded-xl flex-shrink-0" />
      </div>
      <Pulse className="h-2 w-20 mt-3" />
    </div>
  );
}

// 2. Table Loader Skeleton
export function TableSkeleton({ rows = 6 }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/5 text-[10px] uppercase font-bold tracking-widest text-slate-600 bg-luxury-950/30">
            <th className="p-4"><Pulse className="h-3.5 w-16" /></th>
            <th className="p-4"><Pulse className="h-3.5 w-24" /></th>
            <th className="p-4"><Pulse className="h-3.5 w-12" /></th>
            <th className="p-4"><Pulse className="h-3.5 w-12" /></th>
            <th className="p-4"><Pulse className="h-3.5 w-16" /></th>
            <th className="p-4 text-right"><Pulse className="h-3.5 w-16 ml-auto" /></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="hover:bg-white/[0.01]">
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <Pulse className="w-8 h-12 rounded flex-shrink-0" />
                  <div className="space-y-1.5">
                    <Pulse className="h-3 w-32" />
                    <Pulse className="h-2.5 w-20" />
                  </div>
                </div>
              </td>
              <td className="p-4"><Pulse className="h-3 w-16" /></td>
              <td className="p-4"><Pulse className="h-3 w-8" /></td>
              <td className="p-4"><Pulse className="h-3 w-8" /></td>
              <td className="p-4"><Pulse className="h-4 w-16 rounded-full" /></td>
              <td className="p-4">
                <div className="flex justify-end gap-2">
                  <Pulse className="h-7 w-7 rounded-lg" />
                  <Pulse className="h-7 w-7 rounded-lg" />
                  <Pulse className="h-7 w-7 rounded-lg" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 3. Grid Row/List Loader Skeleton
export function RowSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-luxury-900 border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 overflow-hidden w-full">
            <Pulse className="w-8 h-12 rounded flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Pulse className="h-3.5 w-1/3" />
              <Pulse className="h-2.5 w-1/4" />
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Pulse className="h-7 w-7 rounded-lg" />
            <Pulse className="h-7 w-7 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Default export container
const Skeleton = {
  Pulse,
  Card: CardSkeleton,
  Table: TableSkeleton,
  Row: RowSkeleton
};

export default Skeleton;
