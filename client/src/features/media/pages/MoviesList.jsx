'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/api/apiClient';
import GlassCard from '@/components/ui/GlassCard';
import { Film, Filter, Flame, Star, Calendar, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MoviesList({ initialData }) {
  const [sortBy, setSortBy] = useState('popular');
  const [country, setCountry] = useState('');
  const [page, setPage] = useState(1);
  const limit = 24;

  const { data, isLoading } = useQuery({
    queryKey: ['moviesDirectory', sortBy, country, page],
    queryFn: async () => {
      const res = await apiClient.get(`/api/media/movies?sort=${sortBy}&country=${country}&page=${page}&limit=${limit}`);
      return res.data;
    },
    initialData: (sortBy === 'popular' && country === '' && page === 1) ? initialData : undefined,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const movies = (data?.movies || []).map(m => ({ ...m, mediaType: 'movie' }));
  const totalPages = data?.totalPages || 1;

  const mediaGridClass = 'grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(150px,180px))] justify-center gap-x-3.5 sm:gap-x-5 gap-y-6 sm:gap-y-8 items-start';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 lg:pt-28 pb-8 text-left flex flex-col gap-8 min-h-screen bg-transparent">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <Film className="w-8 h-8 text-brand-primary" /> Korean Movies Catalog
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Browse the complete catalog of Korean movies with synchronized Sinhala and English subtitles.
        </p>
      </div>

      {/* Filters and Sorting */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-6">
        {/* Sort pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3 h-3 text-brand-secondary" /> Sort By:
          </span>
          {[
            { id: 'popular', label: 'Popular', icon: Flame },
            { id: 'rating', label: 'Top Rated', icon: Star },
            { id: 'newest', label: 'New Releases', icon: Calendar }
          ].map((pill) => {
            const Icon = pill.icon;
            const active = sortBy === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => { setSortBy(pill.id); setPage(1); }}
                className={`px-3.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all duration-200 flex items-center gap-1.5 ${
                  active 
                    ? 'bg-brand-secondary/15 border-brand-secondary/30 text-brand-secondary' 
                    : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* Region Filters */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Region:</span>
          <div className="bg-luxury-900 border border-white/5 p-1 rounded-xl flex items-center gap-1">
            {[
              { id: '', label: 'All' },
              { id: 'KR', label: '🇰🇷 South Korea' },
              { id: 'JP', label: '🇯🇵 Japan' }
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => { setCountry(c.id); setPage(1); }}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all duration-150 ${
                  country === c.id 
                    ? 'bg-white/10 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Media Grid */}
      <div className="relative min-h-[400px]">
        {isLoading ? (
          <div className={mediaGridClass}>
            {[...Array(12)].map((_, i) => (
              <div key={i} className="flex min-w-0 flex-col gap-3">
                <div className="aspect-[2/3] w-full bg-luxury-900 rounded-lg relative overflow-hidden border border-white/5 animate-pulse">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                </div>
                <div className="h-4 bg-luxury-900 rounded-lg w-3/4 animate-pulse" />
                <div className="h-3 bg-luxury-900 rounded-lg w-1/2 animate-pulse" />
              </div>
            ))}
          </div>
        ) : movies.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/5 rounded-3xl bg-luxury-900/50"
          >
            <RefreshCw className="w-10 h-10 text-slate-600 mb-3 animate-spin" />
            <h4 className="text-base font-bold text-white mb-1">No Movies Found</h4>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              We couldn't find any movie matching the selected filters.
            </p>
          </motion.div>
        ) : (
          <motion.div 
            layout
            className={mediaGridClass}
          >
            <AnimatePresence mode="popLayout">
              {movies.map((item) => (
                <motion.div
                  key={item._id}
                  layout
                  className="min-w-0"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <GlassCard item={item} type="movie" />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8 border-t border-white/5 pt-6">
          <button
            disabled={page === 1 || isLoading}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="px-4 h-9 bg-white/5 border border-white/10 disabled:opacity-30 disabled:hover:bg-white/5 disabled:cursor-not-allowed rounded-xl text-xs font-bold text-white hover:bg-white/10 transition"
          >
            Previous
          </button>
          <span className="text-xs text-slate-400 font-semibold px-2">Page {page} of {totalPages}</span>
          <button
            disabled={page === totalPages || isLoading}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="px-4 h-9 bg-white/5 border border-white/10 disabled:opacity-30 disabled:hover:bg-white/5 disabled:cursor-not-allowed rounded-xl text-xs font-bold text-white hover:bg-white/10 transition"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
