import React from 'react';

export default function Loading() {
  return (
    <div className="h-screen w-full bg-transparent flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Loading Page Content...</span>
    </div>
  );
}
