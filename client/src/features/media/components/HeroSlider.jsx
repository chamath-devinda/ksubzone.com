'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, Clock3, Download, Film, Globe2, Info, Star, Languages } from 'lucide-react';
import { permalinkSlug } from '@/utils/slug';
import { getMediaImage, imageFallbackFor } from '@/utils/mediaImages';
import { formatTimeAgo } from '@/utils/timeAgo';
import { cleanMediaText, cleanMediaTitle } from '@/utils/seo';

const EMPTY_ITEMS = [];

export default function HeroSlider({ items = EMPTY_ITEMS, loading = false }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();

  // Adjust state inline during render if items change
  const [prevItemsLength, setPrevItemsLength] = useState(items.length);
  if (items.length !== prevItemsLength) {
    setPrevItemsLength(items.length);
    setCurrentIndex(0);
  }

  useEffect(() => {
    if (items.length === 0) return undefined;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 7500);
    return () => clearInterval(timer);
  }, [items]);

  const currentItem = items[currentIndex] || items[0] || {};
  const initialBackdrop = getMediaImage(currentItem, 'backdrop');
  const initialPoster = getMediaImage(currentItem, 'poster');

  const [backdropUrl, setBackdropUrl] = useState(initialBackdrop);
  const [posterUrl, setPosterUrl] = useState(initialPoster);

  useEffect(() => {
    setBackdropUrl(initialBackdrop);
    setPosterUrl(initialPoster);
  }, [initialBackdrop, initialPoster]);

  if (loading || items.length === 0) {
    return (
      <section className="relative w-full min-h-[calc(100svh-3.5rem)] sm:min-h-[calc(100svh-4rem)] overflow-hidden bg-luxury-950 flex items-center pt-10 lg:pt-16 pb-12 sm:pb-20">
        <div className="absolute inset-0 bg-luxury-900/60 animate-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_35%,rgba(139,92,246,0.12),transparent_40%),linear-gradient(90deg,#030008_0%,rgba(3,0,8,0.75)_35%,rgba(3,0,8,0.3)_70%,rgba(3,0,8,0.5)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-luxury-950 via-luxury-950/15 to-black/30" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-luxury-950 to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_370px] gap-8 lg:gap-16 items-center">
            {/* Left Column Skeleton */}
            <div className="max-w-3xl text-left flex flex-col gap-6">
              <div className="h-6 w-32 bg-white/5 border border-white/10 rounded-full animate-pulse" />
              <div className="flex flex-col gap-3">
                <div className="h-12 sm:h-16 w-3/4 bg-white/10 rounded-2xl animate-pulse" />
                <div className="h-6 sm:h-8 w-1/3 bg-white/5 rounded-xl animate-pulse" />
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="h-8 w-24 bg-white/5 rounded-xl animate-pulse" />
                <div className="h-8 w-20 bg-white/5 rounded-xl animate-pulse" />
                <div className="h-8 w-28 bg-white/5 rounded-xl animate-pulse" />
              </div>
              <div className="flex flex-col gap-2.5 mt-2">
                <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
                <div className="h-4 w-11/12 bg-white/5 rounded animate-pulse" />
                <div className="h-4 w-4/5 bg-white/5 rounded animate-pulse" />
              </div>
              <div className="flex gap-3 mt-4">
                <div className="h-12 w-36 bg-white/10 rounded-2xl animate-pulse" />
                <div className="h-12 w-32 bg-white/5 rounded-2xl animate-pulse" />
              </div>
            </div>

            {/* Right Poster Skeleton */}
            <div className="hidden sm:flex justify-center w-full lg:block order-first lg:order-none">
              <div className="relative rounded-[2rem] border border-white/5 bg-white/[0.02] p-3 max-w-[220px] sm:max-w-[300px] lg:max-w-none mx-auto w-full animate-pulse">
                <div className="relative overflow-hidden rounded-2xl aspect-[2/3] bg-white/5 flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const current = items[currentIndex] || items[0] || {};
  const type = current.mediaType || (current.seasons ? 'drama' : 'movie');
  const currentSlug = permalinkSlug(current);
  const releaseYear = current.releaseDate ? new Date(current.releaseDate).getFullYear() : 'TBA';
  const releaseDate = current.releaseDate
    ? new Date(current.releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Coming soon';
  const genres = current.genres || current.genre || current.keywords || [];
  const primaryGenre = Array.isArray(genres) ? genres[0] : genres;
  const rating = current.imdbRating || current.tmdbRating || 0;
  const timeAgo = formatTimeAgo(current.contentUpdatedAt || current.createdAt);
  const displayTitle = (current.title || 'Korean entertainment').replace(/Subtitiles/gi, 'Subtitles');
  const synopsis = current.synopsisRewrite || current.description || '';

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % items.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  const openDetails = () => router.push(`/${type}/${currentSlug}`);
  const openDownloads = () => router.push(`/${type}/${currentSlug}?scrollTo=subtitles`);

  return (
    <section className="relative w-full min-h-[calc(100svh-3.5rem)] sm:min-h-[calc(100svh-4rem)] overflow-hidden group bg-luxury-950">
      {/* Background Cinematic Backdrop */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current._id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          {/* Load portrait artwork on phones and the wide backdrop from tablet upward. */}
          <picture className="absolute inset-0 block h-full w-full">
            <source media="(max-width: 639px)" srcSet={posterUrl} />
            <img
              src={backdropUrl}
              alt=""
              fetchPriority={currentIndex === 0 ? 'high' : 'auto'}
              loading={currentIndex === 0 ? 'eager' : 'lazy'}
              decoding="async"
              className="h-full w-full object-cover object-center filter brightness-[0.74] contrast-[1.04] saturate-[0.94] sm:brightness-[0.58] sm:contrast-[1.08] sm:saturate-[0.9]"
              onError={() => {
                const isMobile = window.matchMedia('(max-width: 639px)').matches;
                const fallbackKind = isMobile ? 'poster' : 'backdrop';
                const fallback = imageFallbackFor(current, fallbackKind);
                if (isMobile && posterUrl !== fallback) {
                  setPosterUrl(fallback);
                } else if (!isMobile && backdropUrl !== fallback) {
                  setBackdropUrl(fallback);
                }
              }}
            />
          </picture>
          {/* Layered cinematic vignettes & light gradients */}
          <div className="absolute inset-0 sm:hidden bg-[linear-gradient(180deg,rgba(3,0,8,0.42)_0%,rgba(3,0,8,0.22)_25%,rgba(3,0,8,0.56)_62%,rgba(3,0,8,0.96)_100%)]" />
          <div className="absolute inset-0 hidden sm:block bg-[linear-gradient(90deg,#030008_0%,rgba(3,0,8,0.92)_34%,rgba(3,0,8,0.5)_66%,rgba(3,0,8,0.72)_100%)]" />
          <div className="absolute inset-0 hidden sm:block bg-[radial-gradient(ellipse_at_76%_38%,rgba(139,92,246,0.22),transparent_44%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-luxury-950 via-transparent to-black/45" />
          <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-luxury-950 via-luxury-950/70 to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 flex min-h-[calc(100svh-3.5rem)] sm:min-h-[calc(100svh-4rem)] items-center pt-10 sm:pt-12 lg:pt-20 pb-16 sm:pb-20 lg:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_370px] gap-7 sm:gap-10 lg:gap-16 items-center">
            
            {/* Left Hero Details */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${current._id}-content`}
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-4xl text-left min-w-0"
              >
                {/* Eyebrow Pill */}
                <div className="mb-5 flex flex-wrap items-center gap-2.5">
                  <span className="px-3 sm:px-3.5 py-1.5 rounded-xl border border-white/10 bg-black/30 text-violet-200 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.12em] sm:tracking-[0.2em] flex items-center gap-2 backdrop-blur-xl">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-60 animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-primary" />
                    </span>
                    Featured Release
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {type === 'drama' ? 'TV Series' : 'Movie'} Spotlight
                  </span>
                  {timeAgo && (
                    <span
                      title="Latest KSubZone update"
                      suppressHydrationWarning
                      className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-black tracking-tight text-slate-950 shadow-[0_4px_16px_rgba(0,0,0,0.28)]"
                    >
                      <Clock3 className="h-3 w-3" strokeWidth={2.5} />
                      {timeAgo}
                    </span>
                  )}
                </div>

                {/* Main Heading */}
                <h2 className="max-w-4xl text-2xl sm:text-4xl lg:text-5xl xl:text-[3.5rem] font-black tracking-[-0.03em] text-white leading-[1.18] sm:leading-[1.12] font-display drop-shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
                  {displayTitle}
                </h2>
                
                {current.originalTitle && current.originalTitle !== displayTitle && (
                  <p className="mt-3 text-base sm:text-xl font-extrabold text-violet-200/80 leading-snug tracking-tight font-display">
                    {current.originalTitle}
                  </p>
                )}

                {/* Badges Row */}
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 backdrop-blur-md">
                    <Languages className="w-3.5 h-3.5" /> Sinhala Subs
                  </span>
                  <span className="px-3 py-1.5 bg-amber-400/12 border border-amber-400/25 text-amber-300 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 backdrop-blur-md">
                    <Star className="w-3.5 h-3.5 fill-current text-amber-400" /> {rating ? rating.toFixed(1) : 'NR'} IMDb
                  </span>
                  {current.country && (
                    <span className="px-3 py-1.5 bg-black/25 border border-white/10 text-slate-200 text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1.5 backdrop-blur-md">
                      <Globe2 className="w-3.5 h-3.5 text-brand-primary" />
                      {current.country === 'KR' ? 'South Korea' : current.country}
                    </span>
                  )}
                  <span className="px-3 py-1.5 bg-black/25 border border-white/10 text-slate-200 text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1.5 backdrop-blur-md">
                    <Film className="w-3.5 h-3.5 text-brand-secondary" />
                    {primaryGenre || (type === 'drama' ? 'K-Drama' : 'Korean Movie')}
                  </span>
                  <span className="px-3 py-1.5 bg-black/25 border border-white/10 text-slate-200 text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1.5 backdrop-blur-md">
                    <Calendar className="w-3.5 h-3.5 text-brand-accent" />
                    {releaseYear}
                  </span>
                </div>

                {/* Synopsis */}
                <p className="mt-4 sm:mt-5 max-w-2xl border-l-2 border-brand-primary/60 pl-3 sm:pl-4 text-sm sm:text-[15px] text-slate-300 leading-6 sm:leading-7 line-clamp-2 sm:line-clamp-3 font-normal">
                  {synopsis}
                </p>

                {/* Fast Meta Info Cards */}
                <div className="mt-5 hidden sm:grid grid-cols-2 gap-2.5 max-w-2xl text-xs text-slate-300">
                  <div className="group flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-black/20 p-3.5 backdrop-blur-xl hover:bg-white/[0.04] hover:border-brand-primary/25 transition">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-primary/15 border border-brand-primary/20">
                      <Clock3 className="w-4 h-4 text-brand-primary" />
                    </span>
                    <div className="min-w-0">
                      <span className="block text-slate-500 font-bold uppercase tracking-[0.14em] text-[9px]">Format / Length</span>
                      <p className="mt-0.5 truncate text-white font-black">
                      {current.runtime 
                        ? (Math.floor(current.runtime / 60) > 0 
                          ? `${Math.floor(current.runtime / 60)}h ${current.runtime % 60}m` 
                          : `${current.runtime} min`)
                        : type === 'drama' ? 'Multi-Episode Series' : 'Feature Film'}
                      </p>
                    </div>
                  </div>
                  <div className="group flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-black/20 p-3.5 backdrop-blur-xl hover:bg-white/[0.04] hover:border-brand-secondary/25 transition">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-secondary/15 border border-brand-secondary/20">
                      <Calendar className="w-4 h-4 text-brand-secondary" />
                    </span>
                    <div className="min-w-0">
                      <span className="block text-slate-500 font-bold uppercase tracking-[0.14em] text-[9px]">Premiered</span>
                      <p className="mt-0.5 truncate text-white font-black">{releaseDate}</p>
                    </div>
                  </div>
                </div>

                {/* Action CTA Buttons */}
                <div className="mt-5 sm:mt-6 grid w-full max-w-md grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
                  <button
                    onClick={openDownloads}
                    onMouseEnter={() => router.prefetch(`/${type}/${currentSlug}?scrollTo=subtitles`)}
                    onTouchStart={() => router.prefetch(`/${type}/${currentSlug}?scrollTo=subtitles`)}
                    className="min-h-12 px-3 sm:px-8 bg-gradient-to-r from-brand-primary via-purple-600 to-brand-secondary hover:brightness-110 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-[0.04em] sm:tracking-[0.08em] rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-xl shadow-brand-primary/25 ring-1 ring-white/15 hover:-translate-y-0.5 active:translate-y-0 text-center"
                  >
                    <Download className="w-4 h-4" /> Download Subtitles
                  </button>
                  <button
                    onClick={openDetails}
                    onMouseEnter={() => router.prefetch(`/${type}/${currentSlug}`)}
                    onTouchStart={() => router.prefetch(`/${type}/${currentSlug}`)}
                    className="min-h-12 px-3 sm:px-7 border border-white/15 bg-black/25 hover:bg-white/10 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-[0.04em] sm:tracking-[0.08em] rounded-xl flex items-center justify-center gap-2 transition-all duration-200 backdrop-blur-xl hover:border-white/25 hover:-translate-y-0.5 active:translate-y-0 text-center"
                  >
                    <Info className="w-4 h-4 text-slate-300" /> Details
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Right Poster Display with 3D Aura Glow */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${current._id}-poster`}
                initial={{ opacity: 0, x: 25, rotate: 1.5 }}
                animate={{ opacity: 1, x: 0, rotate: 0 }}
                exit={{ opacity: 0, x: 25 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="hidden sm:flex justify-center w-full lg:block order-first lg:order-none mb-2 sm:mb-0"
              >
                <div className="relative rounded-[2rem] border border-white/10 bg-luxury-950/45 p-2.5 shadow-2xl shadow-black/80 backdrop-blur-2xl max-w-[190px] sm:max-w-[300px] lg:max-w-[340px] mx-auto w-full group">
                  {/* Dynamic 3D lighting glow */}
                  <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-brand-primary/35 via-purple-600/15 to-brand-secondary/25 blur-3xl opacity-60 group-hover:opacity-90 transition-opacity duration-700 pointer-events-none" />
                  
                  <div className="relative overflow-hidden rounded-2xl aspect-[2/3] bg-luxury-900 border border-white/10">
                    <Image
                      src={posterUrl}
                      alt={`${displayTitle} poster`}
                      fill
                      priority={currentIndex === 0}
                      sizes="(max-width: 640px) 200px, (max-width: 1024px) 280px, 340px"
                      className="h-full w-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                      onError={() => {
                        const fallback = imageFallbackFor(current, 'poster');
                        if (posterUrl !== fallback) {
                          setPosterUrl(fallback);
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/10 pointer-events-none" />

                    <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/55 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white backdrop-blur-xl">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                      Now Showing
                    </div>
                    
                    {/* Integrated poster caption */}
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black via-black/85 to-transparent px-4 pb-4 pt-16">
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-violet-300">Featured Pick</p>
                          <p className="mt-0.5 text-xs font-black text-white line-clamp-2">{displayTitle}</p>
                        </div>
                        <span className="rounded-lg border border-white/10 bg-brand-primary/90 px-2 py-1 text-[8px] font-black text-white flex-shrink-0 uppercase">
                          {type === 'drama' ? 'Series' : 'Movie'}
                        </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

          </div>
        </div>
      </div>

      {/* Slider Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 hidden sm:flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/45 hover:bg-brand-primary/80 text-white transition-all duration-200 z-20 opacity-60 group-hover:opacity-100 backdrop-blur-xl shadow-lg hover:scale-105"
        aria-label="Previous hero title"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/45 hover:bg-brand-primary/80 text-white transition-all duration-200 z-20 opacity-60 group-hover:opacity-100 backdrop-blur-xl shadow-lg hover:scale-105"
        aria-label="Next hero title"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Pagination Dots */}
      <div className="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 bg-black/45 border border-white/10 px-3 py-2 rounded-full backdrop-blur-xl">
        {items.map((item, i) => (
          <button
            key={item._id || i}
            onClick={() => setCurrentIndex(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              currentIndex === i 
                ? 'w-8 bg-gradient-to-r from-brand-primary to-brand-secondary shadow-[0_0_12px_rgba(139,92,246,0.65)]' 
                : 'w-2 bg-white/25 hover:bg-white/60'
            }`}
            aria-label={`Show hero title ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
