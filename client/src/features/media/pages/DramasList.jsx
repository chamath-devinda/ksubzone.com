'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import apiClient from '@/services/api/apiClient';
import GlassCard from '@/components/ui/GlassCard';
import {
  Tv,
  Filter,
  Flame,
  Star,
  Calendar,
  RefreshCw,
  Search,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdSlot from '@/components/ads/AdSlot';

export default function DramasList({ initialData, initialPage = 1, totalPages: totalPagesProp = 1 }) {
  const [sortBy, setSortBy] = useState('popular');
  const [country, setCountry] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const page = initialPage;
  const limit = 50;
  const hasInitialData = Array.isArray(initialData?.dramas) && initialData.dramas.length > 0;

  const { data, isLoading } = useQuery({
    queryKey: ['dramasDirectory', sortBy, country, page],
    queryFn: async () => {
      const res = await apiClient.get(`/api/media/dramas?status=Published&sort=${sortBy}&country=${country}&page=${page}&limit=${limit}`);
      return res.data;
    },
    initialData: (sortBy === 'popular' && country === '' && page === 1 && hasInitialData) ? initialData : undefined,
    staleTime: 15_000,
    refetchOnMount: 'always',
    retry: 2,
  });

  const rawDramas = (data?.dramas || []).map((d) => ({ ...d, mediaType: 'drama' }));
  const totalPages = data?.totalPages || totalPagesProp || 1;

  // Optional client-side search query filtering for fast responsive exploration
  const filteredDramas = useMemo(() => {
    if (!searchQuery.trim()) return rawDramas;
    const q = searchQuery.toLowerCase().trim();
    return rawDramas.filter((d) => {
      const title = (d.title || '').toLowerCase();
      const originalTitle = (d.originalTitle || '').toLowerCase();
      return title.includes(q) || originalTitle.includes(q);
    });
  }, [rawDramas, searchQuery]);

  // Responsive 6-column grid filling modern screens without dark empty gaps
  const mediaGridClass = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-5 lg:gap-6 items-start';

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-20 sm:pt-24 lg:pt-28 pb-12 text-left flex flex-col gap-8 min-h-screen bg-transparent">
      
      {/* 1. Cinematic Hero Spotlight */}
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-brand-primary/15 via-luxury-900/60 to-luxury-950 p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
        {/* Ambient atmospheric lighting */}
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-brand-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-72 h-72 bg-brand-secondary/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl flex flex-col items-start gap-4">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-brand-primary/30 bg-brand-primary/10 text-brand-primary-light text-[10px] sm:text-[11px] font-black uppercase tracking-widest backdrop-blur-md shadow-sm">
            <Tv className="w-3.5 h-3.5 text-brand-primary" />
            Korean TV Series Catalog
          </span>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight font-display leading-tight">
            Korean Dramas{' '}
            <span className="bg-gradient-to-r from-brand-primary-light via-purple-300 to-pink-400 bg-clip-text text-transparent">
              Sinhala Subtitles
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl font-light">
            Browse the complete catalog of Korean TV dramas, mini-series, and ongoing romance, thriller, and historical hits with synchronized Sinhala (<span className="text-brand-primary-light font-semibold">සිංහල උපසිරැසි</span>) and English SRT subtitle downloads.
          </p>

          {/* Value Highlights */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold text-slate-300 backdrop-blur-sm">
              <Layers className="w-3 h-3 text-brand-accent" /> Complete Episode Packs
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold text-slate-300 backdrop-blur-sm">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> IMDb & MDL Ratings
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold text-slate-300 backdrop-blur-sm">
              <Sparkles className="w-3 h-3 text-brand-secondary" /> Free SRT Downloads
            </span>
          </div>
        </div>
      </section>

      {/* 2. Enhanced Filter & Control Toolbar */}
      <section className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur-lg shadow-lg">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Left: Sort Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mr-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-brand-primary" />
              Sort:
            </span>
            {[
              { id: 'popular', label: 'Popular', icon: Flame },
              { id: 'rating', label: 'Top Rated', icon: Star },
              { id: 'newest', label: 'New Releases', icon: Calendar },
            ].map((pill) => {
              const Icon = pill.icon;
              const active = sortBy === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => setSortBy(pill.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                    active
                      ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/30 scale-105'
                      : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* Right: Search & Region controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Quick Search */}
            <div className="relative flex-grow sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-8 rounded-xl bg-luxury-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary/60 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Region Selector */}
            <div className="flex items-center gap-1.5 bg-luxury-900 border border-white/10 p-1 rounded-xl">
              {[
                { id: '', label: 'All' },
                { id: 'KR', label: '🇰🇷 South Korea' },
                { id: 'CN', label: '🇨🇳 China' },
                { id: 'JP', label: '🇯🇵 Japan' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCountry(c.id)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    country === c.id
                      ? 'bg-brand-primary/25 border border-brand-primary/40 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Results Count / Filter Status Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-[11px] text-slate-400">
          <span>
            Showing <strong className="text-white">{filteredDramas.length}</strong> dramas
            {searchQuery && <span> matching &ldquo;{searchQuery}&rdquo;</span>}
          </span>
          <span className="text-slate-500">
            Page {page} of {totalPages}
          </span>
        </div>
      </section>

      <AdSlot slotId="listing_content_banner" />

      {/* 3. Media Grid */}
      <div className="relative min-h-[400px]">
        {isLoading ? (
          <div className={mediaGridClass}>
            {[...Array(12)].map((_, i) => (
              <div key={i} className="flex min-w-0 flex-col gap-3">
                <div className="aspect-[2/3] w-full bg-luxury-900 rounded-2xl relative overflow-hidden border border-white/5 animate-pulse">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                </div>
                <div className="h-4 bg-luxury-900 rounded-lg w-3/4 animate-pulse" />
                <div className="h-3 bg-luxury-900 rounded-lg w-1/2 animate-pulse" />
              </div>
            ))}
          </div>
        ) : filteredDramas.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/10 rounded-3xl bg-luxury-900/40 p-6"
          >
            <RefreshCw className="w-10 h-10 text-slate-600 mb-3" />
            <h4 className="text-base font-bold text-white mb-1">No Dramas Found</h4>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-4">
              We couldn&apos;t find any TV dramas matching your current filter or search criteria.
            </p>
            {(searchQuery || country) && (
              <button
                onClick={() => { setSearchQuery(''); setCountry(''); }}
                className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary-hover transition"
              >
                Clear Filters
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div layout className={mediaGridClass}>
            <AnimatePresence mode="popLayout">
              {filteredDramas.map((item, index) => (
                <React.Fragment key={item._id}>
                  <motion.div
                    layout
                    className="min-w-0"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25 }}
                  >
                    <GlassCard item={item} type="drama" />
                  </motion.div>
                  {index === 5 && (
                    <div className="col-span-full w-full my-4">
                      <AdSlot slotId="listing_mid_banner" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <AdSlot slotId="listing_bottom_banner" className="mt-4" />

      {/* 4. Luxury Glass Pagination */}
      {totalPages > 1 && (
        <nav
          aria-label="Drama listing pagination"
          className="flex items-center justify-center gap-2 mt-8 border-t border-white/5 pt-8"
        >
          {page > 1 ? (
            <Link
              href={page - 1 === 1 ? '/dramas' : `/dramas?page=${page - 1}`}
              className="px-4 h-10 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-bold text-white hover:bg-brand-primary hover:border-brand-primary transition inline-flex items-center gap-1.5 shadow-sm"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Link>
          ) : (
            <span className="px-4 h-10 rounded-xl bg-white/[0.02] border border-white/5 text-xs font-bold text-white/30 inline-flex items-center gap-1.5 cursor-not-allowed">
              <ChevronLeft className="w-4 h-4" />
              Previous
            </span>
          )}

          {/* Page numbers */}
          <div className="flex items-center gap-1.5 px-2">
            {[...Array(totalPages)].map((_, i) => {
              const p = i + 1;
              const isCurrent = p === page;
              return (
                <Link
                  key={p}
                  href={p === 1 ? '/dramas' : `/dramas?page=${p}`}
                  className={`w-10 h-10 rounded-xl text-xs font-bold inline-flex items-center justify-center transition ${
                    isCurrent
                      ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/30 scale-105'
                      : 'bg-white/[0.03] border border-white/5 text-slate-400 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  {p}
                </Link>
              );
            })}
          </div>

          {page < totalPages ? (
            <Link
              href={`/dramas?page=${page + 1}`}
              className="px-4 h-10 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-bold text-white hover:bg-brand-primary hover:border-brand-primary transition inline-flex items-center gap-1.5 shadow-sm"
              aria-label="Next page"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <span className="px-4 h-10 rounded-xl bg-white/[0.02] border border-white/5 text-xs font-bold text-white/30 inline-flex items-center gap-1.5 cursor-not-allowed">
              <ChevronRight className="w-4 h-4" />
              Next
            </span>
          )}
        </nav>
      )}
    </div>
  );
}
