import React from 'react';

export default function DramaDetailLoading() {
  return (
    <div className="min-h-screen bg-luxury-950 text-slate-100 pt-20 sm:pt-24 pb-16 animate-pulse">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8">
        
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-12 bg-white/10 rounded-md" />
          <span className="text-white/20">/</span>
          <div className="h-4 w-24 bg-white/10 rounded-md" />
          <span className="text-white/20">/</span>
          <div className="h-4 w-36 bg-brand-primary/20 rounded-md" />
        </div>

        {/* Hero Section Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] gap-8 lg:gap-12 items-start">
          
          {/* Left / Main Details */}
          <div className="flex flex-col gap-5">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="h-7 w-28 bg-emerald-500/15 rounded-lg border border-emerald-500/20" />
              <div className="h-7 w-20 bg-amber-400/10 rounded-lg border border-amber-400/20" />
              <div className="h-7 w-24 bg-white/5 rounded-lg border border-white/10" />
              <div className="h-7 w-16 bg-white/5 rounded-lg border border-white/10" />
            </div>

            {/* Title */}
            <div className="h-10 sm:h-14 w-3/4 bg-white/15 rounded-xl" />
            <div className="h-6 w-1/3 bg-violet-400/20 rounded-lg" />

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="h-12 w-44 bg-brand-primary/30 rounded-xl border border-brand-primary/40" />
              <div className="h-12 w-36 bg-white/5 rounded-xl border border-white/10" />
            </div>

            {/* Synopsis Skeleton */}
            <div className="space-y-2.5 pt-4">
              <div className="h-4 w-full bg-white/10 rounded" />
              <div className="h-4 w-11/12 bg-white/10 rounded" />
              <div className="h-4 w-4/5 bg-white/10 rounded" />
              <div className="h-4 w-2/3 bg-white/5 rounded" />
            </div>
          </div>

          {/* Right Poster Skeleton */}
          <div className="w-full max-w-[280px] lg:max-w-none mx-auto aspect-[2/3] rounded-2xl bg-luxury-900/80 border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-luxury-950 via-transparent to-white/5" />
            <div className="absolute bottom-4 left-4 right-4 h-8 bg-white/10 rounded-xl" />
          </div>

        </div>

        {/* Subtitle Section Skeleton */}
        <div className="mt-8 border-t border-white/10 pt-8 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="h-8 w-48 bg-white/10 rounded-xl" />
            <div className="h-8 w-32 bg-white/5 rounded-xl" />
          </div>

          {/* Episode List Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-luxury-900/50 border border-white/5 p-4 flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-white/10 rounded" />
                  <div className="h-3 w-16 bg-white/5 rounded" />
                </div>
                <div className="h-8 w-20 bg-brand-primary/20 rounded-lg border border-brand-primary/30" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
