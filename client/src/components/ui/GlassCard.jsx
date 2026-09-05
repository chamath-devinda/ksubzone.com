'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Star, Calendar, Globe, Download, Languages, Clock3 } from 'lucide-react';
import { permalinkSlug } from '@/utils/slug';
import { getMediaImage, imageFallbackFor } from '@/utils/mediaImages';
import { formatTimeAgo } from '@/utils/timeAgo';
import { cleanMediaTitle } from '@/utils/seo';

export default function GlassCard({ item, type, priority = false }) {
  const mediaType = type || (item.seasons ? 'drama' : 'movie');
  const detailsUrl = `/${mediaType}/${permalinkSlug(item)}`;
  const rating = item.imdbRating || item.tmdbRating || 0;
  const posterImage = getMediaImage(item, 'card');
  const displayTitle = (item.title || 'Korean title').replace(/Subtitiles/gi, 'Subtitles');
  // This activity clock only moves when the title or one of its subtitles is
  // imported. Generic record updates (views, admin edits, etc.) must not affect it.
  const timeAgo = formatTimeAgo(item.contentUpdatedAt || item.createdAt);
  const [imgSrc, setImgSrc] = useState(posterImage);
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();
  const prefetchedRef = useRef(false);

  useEffect(() => {
    setImgSrc(posterImage);
  }, [posterImage]);

  const triggerPrefetch = useCallback(() => {
    if (!prefetchedRef.current) {
      prefetchedRef.current = true;
      router.prefetch(detailsUrl);
    }
  }, [detailsUrl, router]);

  const handleClick = useCallback(() => {
    setIsNavigating(true);
  }, []);

  const subtitleSummary = item.subtitleSummary || {};
  const subtitleLanguages = subtitleSummary.languages || [];
  const progressLabel = subtitleSummary.progressLabel || (subtitleSummary.totalSubtitles ? `${subtitleSummary.totalSubtitles} subs` : 'No subs');
  const hasSubtitles = (subtitleSummary.totalSubtitles || 0) > 0;
  
  // Extract year
  const releaseYear = item.releaseDate ? new Date(item.releaseDate).getFullYear() : null;

  // Rating color scheme
  const getRatingBadgeClass = (val) => {
    if (val >= 8.0) return 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]';
    if (val >= 7.0) return 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]';
    return 'bg-slate-800/60 border-white/10 text-slate-300';
  };

  return (
    <Link 
      href={detailsUrl} 
      prefetch={true}
      className={`block relative group w-full min-w-0 perspective-1000 select-none cursor-pointer ${isNavigating ? 'pointer-events-none' : ''}`} 
      onMouseEnter={triggerPrefetch}
      onPointerDown={triggerPrefetch}
      onTouchStart={triggerPrefetch}
      onClick={handleClick}
    >
      <div className="relative flex w-full min-w-0 flex-col transition-transform duration-300 ease-out group-hover:-translate-y-1.5">
        {/* Poster Image Container */}
        <div className={`relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-luxury-900 border border-white/[0.08] shadow-lg shadow-black/60 group-hover:shadow-[0_12px_36px_-6px_rgba(139,92,246,0.3)] group-hover:border-brand-primary/40 transition-all duration-500 ${isNavigating ? 'ring-2 ring-brand-primary border-brand-primary' : ''}`}>
          
          {/* Ambient Lighting Sheen */}
          <div className="absolute inset-0 bg-gradient-to-t from-luxury-950 via-luxury-950/20 to-transparent z-10 opacity-75 group-hover:opacity-90 transition-opacity duration-300" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.15),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />

          {/* Poster Image */}
          <Image
            src={imgSrc}
            alt={`${displayTitle}${releaseYear ? ` (${releaseYear})` : ''} Sinhala subtitles poster`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
            className="w-full h-full object-cover object-center transform scale-100 group-hover:scale-108 transition-transform duration-700 ease-out"
            priority={priority}
            onError={() => {
              const fallback = imageFallbackFor(item, 'poster');
              if (imgSrc !== fallback) {
                setImgSrc(fallback);
              }
            }}
          />

          {/* Top Badges */}
          <div className="absolute top-1.5 left-1.5 right-1.5 sm:top-2.5 sm:left-2.5 sm:right-2.5 flex items-start justify-between gap-1 z-20">
            {/* Left Status Tags */}
            <div className="flex flex-col items-start gap-1 flex-shrink-0">
              {item.status === 'Upcoming' && (
                <span className="h-5 max-w-[74px] sm:max-w-none px-1.5 sm:px-2 inline-flex items-center justify-center rounded-full border border-indigo-500/40 bg-indigo-950/80 backdrop-blur-md text-indigo-300 text-[8px] sm:text-[9px] font-black uppercase tracking-wide sm:tracking-wider shadow-sm truncate">
                  Upcoming
                </span>
              )}
              {mediaType === 'drama' && hasSubtitles && (
                <span className={`h-5 max-w-[74px] sm:max-w-none px-1.5 sm:px-2 inline-flex items-center justify-center rounded-full border backdrop-blur-md text-[8px] sm:text-[9px] font-black uppercase tracking-wide sm:tracking-wider shadow-sm truncate ${
                  subtitleSummary.seasonStatus === 'Complete'
                    ? 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                    : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                }`}>
                  {progressLabel}
                </span>
              )}
              {item.isNew && (
                <span className="h-5 px-1.5 sm:px-2 inline-flex items-center justify-center rounded-full border border-purple-500/40 bg-purple-950/80 backdrop-blur-md text-purple-200 text-[8px] sm:text-[9px] font-black uppercase tracking-wide sm:tracking-wider">
                  New
                </span>
              )}
            </div>

            {/* Right IMDb rating badge */}
            <div className={`h-5 px-1.5 sm:px-2 inline-flex items-center justify-center gap-1 rounded-full border backdrop-blur-md text-[8px] sm:text-[9px] font-black uppercase tracking-wide sm:tracking-wider flex-shrink-0 ${getRatingBadgeClass(rating)}`}>
              <Star className="w-2.5 h-2.5 fill-current flex-shrink-0" />
              <span>{rating > 0 ? rating.toFixed(1) : 'NR'}</span>
            </div>
          </div>

          {/* Latest admin/content update time */}
          {timeAgo && (
            <div className="absolute bottom-3 left-3 z-20 transition-opacity duration-200 group-hover:opacity-0">
              <span
                title="Latest KSubZone update"
                suppressHydrationWarning
                className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[9px] font-black tracking-tight text-slate-950 shadow-[0_4px_14px_rgba(0,0,0,0.35)]"
              >
                <Clock3 className="h-2.5 w-2.5" strokeWidth={2.5} />
                {timeAgo}
              </span>
            </div>
          )}

          {/* Floating Category Tag */}
          <div className="absolute bottom-3 right-3 z-20 transition-opacity duration-200 group-hover:opacity-0">
            <span className="px-2 py-0.5 bg-black/70 border border-white/10 backdrop-blur-md rounded-full text-slate-200 text-[9px] font-extrabold uppercase tracking-wider">
              {mediaType === 'drama' ? 'Drama' : 'Movie'}
            </span>
          </div>

          {/* Hover Details Overlay */}
          <div className="hidden sm:flex absolute inset-x-0 bottom-0 p-4 translate-y-3 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out z-30 flex-col gap-2">
            {/* Keywords / Tags */}
            {item.keywords && item.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {item.keywords.slice(0, 2).map((kw, idx) => (
                  <span key={idx} className="px-1.5 py-0.5 bg-white/10 border border-white/10 rounded-md text-[9px] text-slate-300 font-medium">
                    {kw}
                  </span>
                ))}
              </div>
            )}

            {/* Title */}
            <h3 className="text-sm font-black text-white leading-snug tracking-tight drop-shadow-md line-clamp-2">
              {displayTitle}
            </h3>

            {/* Meta details */}
            <div className="flex min-w-0 items-center gap-2.5 text-[10px] text-slate-300 font-semibold mt-0.5">
              {releaseYear && (
                <span className="flex flex-shrink-0 items-center gap-1">
                  <Calendar className="w-3 h-3 text-brand-secondary" />
                  {releaseYear}
                </span>
              )}
              <span className="flex min-w-0 items-center gap-1">
                <Globe className="w-3 h-3 text-brand-accent" />
                <span className="truncate">{item.country === 'KR' ? 'South Korea' : item.country || 'Asian'}</span>
              </span>
            </div>

            {/* Subtitle language badges */}
            <div className="flex flex-wrap gap-1.5">
              {subtitleLanguages.length > 0 ? subtitleLanguages.map((language) => (
                <span key={language} className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[9px] font-black uppercase inline-flex items-center gap-1">
                  <Languages className="w-2.5 h-2.5" /> {language}
                </span>
              )) : (
                <span className="px-2 py-0.5 rounded-lg bg-white/10 border border-white/10 text-slate-300 text-[9px] font-black uppercase">
                  Sinhala
                </span>
              )}
            </div>

            {/* Action button */}
            <div className={`action-button-fill mt-1 py-1.5 bg-gradient-to-r from-brand-primary to-purple-600 hover:from-brand-primary-hover hover:to-purple-500 text-white rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-brand-primary/25 transition-all duration-200 ${isNavigating ? 'opacity-90 ring-1 ring-white/50' : ''}`}>
              {isNavigating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Opening...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 fill-current" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Download Subs</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Default Title & Meta below poster */}
        <div className="mt-3 px-1 flex flex-col gap-1 text-left">
          <h3 className="min-h-8 text-xs font-black text-slate-100 group-hover:text-brand-primary transition-colors line-clamp-2 leading-tight tracking-tight">
            {displayTitle}
          </h3>
          <div className="flex min-w-0 items-center justify-between gap-2 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
            <span className="flex-shrink-0 text-slate-500">{releaseYear || 'TBA'}</span>
            <span className="truncate text-right text-brand-primary/80 font-extrabold">
              {hasSubtitles 
                ? (subtitleLanguages.length > 0 ? subtitleLanguages.join(' • ') : 'Sinhala / English') 
                : (item.country === 'KR' ? '🇰🇷 KOREAN' : item.country || 'DRAMA')}
            </span>
          </div>
        </div>

      </div>
    </Link>
  );
}
