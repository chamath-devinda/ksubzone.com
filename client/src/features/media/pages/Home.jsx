'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/api/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
import HeroSlider from '@/features/media/components/HeroSlider';
import GlassCard from '@/components/ui/GlassCard';
import SeoTags from '@/components/seo/SeoTags';
import { useSiteContent } from '@/hooks/useSiteContent';
import { permalinkSlug } from '@/utils/slug';
import { 
  Film, Tv, Clock, Send, 
  Flame, Star, Calendar, Compass, 
  Layers, Filter, RefreshCw, ArrowRight, CheckCircle2
} from 'lucide-react';

export default function Home({ 
  initialHomeCatalog = {}, 
  initialSubtitles = [], 
  initialLibraryMovies = { movies: [] }, 
  initialLibraryDramas = { dramas: [] } 
}) {
  const { content } = useSiteContent();
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'dramas' | 'movies'
  const [sortBy, setSortBy] = useState('popular'); // 'popular' | 'rating' | 'newest'
  const [country, setCountry] = useState(''); // '' | 'KR' | 'JP'

  // Fetch combined Home Catalog data (single API request)
  const { data: homeCatalog = initialHomeCatalog, isLoading: homeCatalogLoading } = useQuery({
    queryKey: ['homeCatalog'],
    queryFn: async () => {
      const res = await apiClient.get('/api/media/home');
      return res.data;
    },
    initialData: initialHomeCatalog,
    staleTime: 0,
    refetchOnMount: 'always'
  });

  const featuredItems = React.useMemo(() => {
    const movies = (homeCatalog.latestMovies || []).map(item => ({ ...item, mediaType: 'movie' }));
    const dramas = (homeCatalog.latestDramas || []).map(item => ({ ...item, mediaType: 'drama' }));
    return [...dramas, ...movies]
      .sort((a, b) => new Date(b.contentUpdatedAt || b.createdAt || b.releaseDate || 0) - new Date(a.contentUpdatedAt || a.createdAt || a.releaseDate || 0))
      .slice(0, 10);
  }, [homeCatalog.latestMovies, homeCatalog.latestDramas]);

  const categoryRowsLoading = homeCatalogLoading;

  // Fetch Library Movies (reactive to sort and country)
  const { data: moviesData = initialLibraryMovies, isLoading: moviesLoading } = useQuery({
    queryKey: ['libraryMovies', sortBy, country],
    queryFn: async () => {
      const res = await apiClient.get(`/api/media/movies?sort=${sortBy}&country=${country}&limit=10`);
      return res.data;
    },
    initialData: (sortBy === 'popular' && country === '') ? initialLibraryMovies : undefined,
    staleTime: 0,
    refetchOnMount: 'always'
  });

  // Fetch Library Dramas (reactive to sort and country)
  const { data: dramasData = initialLibraryDramas, isLoading: dramasLoading } = useQuery({
    queryKey: ['libraryDramas', sortBy, country],
    queryFn: async () => {
      const res = await apiClient.get(`/api/media/dramas?sort=${sortBy}&country=${country}&limit=10`);
      return res.data;
    },
    initialData: (sortBy === 'popular' && country === '') ? initialLibraryDramas : undefined,
    staleTime: 0,
    refetchOnMount: 'always'
  });

  // Fetch Subtitles (Recent Updates)
  const { data: subtitleQueue = initialSubtitles, isLoading: subsLoading } = useQuery({
    queryKey: ['homeSubtitles'],
    queryFn: async () => {
      const res = await apiClient.get('/api/subtitles/recent?limit=4');
      return res.data;
    },
    initialData: initialSubtitles,
    staleTime: 0,
    refetchOnMount: 'always',
    retry: false
  });

  const categoryRows = React.useMemo(() => {
    if (homeCatalogLoading || !homeCatalog) return [];

    const withType = (items, type) => (items || []).map(item => ({ ...item, mediaType: type }));
    const latestMovies = withType(homeCatalog.latestMovies, 'movie').slice(0, 10);
    const latestDramas = withType(homeCatalog.latestDramas, 'drama').slice(0, 10);
    
    const historicalTitles = [
      ...withType(homeCatalog.historicalDramas, 'drama'),
      ...withType(homeCatalog.historicalMovies, 'movie')
    ]
      .sort((a, b) => (b.imdbRating || b.tmdbRating || 0) - (a.imdbRating || a.tmdbRating || 0))
      .slice(0, 10);

    const trendingTitles = [
      ...withType(homeCatalog.trendingDramas, 'drama'),
      ...withType(homeCatalog.trendingMovies, 'movie')
    ]
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, 10);

    const popularTitles = [
      ...withType(homeCatalog.popularDramas, 'drama'),
      ...withType(homeCatalog.popularMovies, 'movie')
    ]
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, 10);

    const upcomingTitles = [
      ...withType(homeCatalog.upcomingDramas, 'drama'),
      ...withType(homeCatalog.upcomingMovies, 'movie')
    ]
      .sort((a, b) => new Date(a.releaseDate || 0) - new Date(b.releaseDate || 0))
      .slice(0, 10);

    return [
      {
        id: 'trending',
        title: 'Trending Now',
        description: 'Most popular Korean titles this week across the platform.',
        icon: Flame,
        iconColor: 'text-rose-500',
        badge: 'HOT',
        link: '/search?category=all&trending=true&sort=views',
        items: trendingTitles.length > 0 ? trendingTitles : popularTitles
      },
      {
        id: 'upcoming',
        title: 'Upcoming Dramas & Movies',
        description: 'Highly anticipated Korean series and upcoming theatrical releases.',
        icon: Calendar,
        iconColor: 'text-brand-accent',
        link: '/search?category=all&status=Upcoming&sort=newest',
        items: upcomingTitles
      },
      {
        id: 'latest-tv-shows',
        title: 'Latest TV Dramas',
        description: 'Recently updated ongoing and completed K-Drama series.',
        icon: Tv,
        iconColor: 'text-brand-primary',
        link: '/search?category=drama&sort=newest',
        items: latestDramas
      },
      {
        id: 'latest-movies',
        title: 'Blockbuster Movies',
        description: 'Newest feature film additions available with Sinhala & English subtitles.',
        icon: Film,
        iconColor: 'text-brand-secondary',
        link: '/search?category=movie&sort=newest',
        items: latestMovies
      },
      {
        id: 'historical-drama',
        title: 'Historical & Sageuk',
        description: 'Royal dynasty sagas, epic period drama, and imperial history.',
        icon: Star,
        iconColor: 'text-amber-400',
        link: '/search?category=all&isHistorical=true&sort=rating',
        items: historicalTitles
      }
    ];
  }, [homeCatalog, homeCatalogLoading]);

  const movies = (moviesData?.movies || []).map(item => ({ ...item, mediaType: 'movie' }));
  const dramas = (dramasData?.dramas || []).map(item => ({ ...item, mediaType: 'drama' }));

  // Combine and sort on the client if 'all' is selected
  let displayedItems = [];
  if (activeTab === 'all') {
    displayedItems = [...movies, ...dramas];
    // Apply sorting
    if (sortBy === 'rating') {
      displayedItems.sort((a, b) => (b.imdbRating || b.tmdbRating || 0) - (a.imdbRating || a.tmdbRating || 0));
    } else if (sortBy === 'newest') {
      displayedItems.sort((a, b) => new Date(b.contentUpdatedAt || b.createdAt || 0) - new Date(a.contentUpdatedAt || a.createdAt || 0));
    } else {
      displayedItems.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    }
    displayedItems = displayedItems.slice(0, 10);
  } else if (activeTab === 'dramas') {
    displayedItems = dramas.slice(0, 10);
  } else {
    displayedItems = movies.slice(0, 10);
  }

  const librarySlides = [...dramas, ...movies]
    .sort((a, b) => new Date(b.contentUpdatedAt || b.createdAt || b.releaseDate || 0) - new Date(a.contentUpdatedAt || a.createdAt || a.releaseDate || 0))
    .slice(0, 10);

  // Handle slide fallbacks
  const slideItems = homeCatalogLoading
    ? []
    : (featuredItems.length > 0 ? featuredItems : librarySlides.length > 0 ? librarySlides : [
        {
          _id: "mock1",
          title: "Moving",
          originalTitle: "무빙",
          banner: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1925&auto=format&fit=crop",
          poster: "https://placehold.co/500x750/111/fff?text=Moving",
          tmdbRating: 8.4,
          imdbRating: 8.4,
          country: "KR",
          description: "Children with secret superpowers and their parents who harbor painful secrets from the past face a massive imminent danger together.",
          slug: "moving"
        }
      ]);

  const isLibraryLoading = moviesLoading || dramasLoading;
  const brand = content?.brand || {};
  const seo = content?.seo || {};
  const home = content?.home || {};
  const seoKeywords = (seo.keywords || '').split(',').map((item) => item.trim()).filter(Boolean);
  const mediaGridClass = 'grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(160px,190px))] justify-center gap-x-3 sm:gap-x-6 gap-y-6 sm:gap-y-9 items-start';

  let primaryUrl = brand.primaryUrl || 'https://www.ksubzone.com';
  primaryUrl = primaryUrl.trim().toLowerCase();
  if (primaryUrl.includes('ksubzone.com') && !primaryUrl.includes('www.ksubzone.com')) {
    primaryUrl = primaryUrl.replace('ksubzone.com', 'www.ksubzone.com');
  }
  if (!primaryUrl.startsWith('http://') && !primaryUrl.startsWith('https://')) {
    primaryUrl = 'https://' + primaryUrl;
  }

  const homeSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": brand.siteName || "KSubZone",
    "url": primaryUrl,
    "description": seo.homeDescription || "Premium Korean Entertainment Platform. Search and download Sinhala and English subtitles."
  };

  return (
    <div className="w-full flex flex-col gap-10 sm:gap-12 bg-transparent pb-12 sm:pb-20">
      
      {/* Dynamic SEO Tags */}
      <SeoTags
        title={seo.homeTitle || `${brand.siteName || 'KSubZone'} - ${brand.tagline || 'K-Drama & Movie Subtitles'}`}
        description={seo.homeDescription}
        keywords={seoKeywords}
        canonical={primaryUrl}
        image={seo.ogImage || slideItems[0]?.banner}
        schemaMarkup={homeSchema}
      />

      {/* Hero Banner Slider */}
      <HeroSlider items={slideItems} loading={homeCatalogLoading} />

      {/* Main Page Content Container */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full flex flex-col gap-12 sm:gap-16 mt-2 sm:mt-4">
        
        {/* Curated Category Rows */}
        <section className="flex flex-col gap-10 sm:gap-14 border-t border-white/[0.07] pt-9 sm:pt-12">
          {categoryRowsLoading ? (
            <div className={mediaGridClass}>
              {[...Array(12)].map((_, i) => (
                <div key={i} className="aspect-[2/3] w-full bg-luxury-900/80 rounded-2xl border border-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            categoryRows.map((section) => {
              const Icon = section.icon;
              return (
                <div key={section.id} className="flex flex-col gap-5">
                  <div className="flex flex-col items-start gap-3 border-b border-white/[0.04] pb-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5 font-display">
                        <span className={`p-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] ${section.iconColor || 'text-brand-primary'}`}>
                          <Icon className="w-5 h-5" />
                        </span>
                        {section.title}
                        {section.badge && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[9px] font-black uppercase tracking-wider">
                            {section.badge}
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 pl-1">{section.description}</p>
                    </div>
                    <Link
                      href={section.link}
                      className="h-9 px-4 rounded-xl bg-white/[0.03] border border-white/10 text-slate-300 hover:text-white hover:border-brand-primary/40 hover:bg-brand-primary/10 text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-all duration-200 flex-shrink-0 self-start"
                    >
                      Explore All <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {section.items.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-white/[0.07] bg-luxury-900/40 py-10 text-center text-xs text-slate-500">
                      No titles added to this category yet.
                    </div>
                  ) : (
                    <div className={mediaGridClass}>
                      {section.items.map((item) => (
                        <GlassCard key={`${section.id}-${item.mediaType}-${item._id}`} item={item} type={item.mediaType} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>

        {/* INTERACTIVE DISCOVERY & FILTERING SHOWCASE */}
        <section className="flex flex-col gap-8 border-t border-white/[0.07] pt-14">
          
          {/* Section Header & Tabs */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/[0.06] pb-6">
            <div className="text-left">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5 font-display">
                <span className="p-1.5 rounded-xl bg-brand-primary/15 border border-brand-primary/30 text-brand-primary">
                  <Compass className="w-6 h-6 animate-pulse-slow" />
                </span>
                {home.catalogTitle || 'Explore Full Catalog'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">{home.catalogDescription || 'Filter through our extensive collection of Korean dramas, series, and feature films.'}</p>
            </div>

            {/* Content Type Tabs (Spring Pill) */}
            <div className="bg-luxury-900/90 border border-white/10 p-1.5 rounded-2xl flex w-full items-center gap-1 self-start overflow-x-auto md:w-auto md:self-auto backdrop-blur-xl shadow-lg">
              {[
                { id: 'all', label: 'All Catalog', icon: Layers },
                { id: 'dramas', label: 'TV Dramas', icon: Tv },
                { id: 'movies', label: 'Movies', icon: Film }
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative min-w-max flex-1 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                      active ? 'text-white font-black' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="activeTabPill"
                        className="action-button-fill absolute inset-0 bg-gradient-to-r from-brand-primary to-purple-600 rounded-xl shadow-lg shadow-brand-primary/30"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Icon className="w-3.5 h-3.5 relative z-10" />
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Advanced Filtering Options Bar */}
          <div className="flex flex-col items-start justify-between gap-4 -mt-2 sm:flex-row sm:flex-wrap sm:items-center">
            
            {/* Sort pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider flex items-center gap-1">
                <Filter className="w-3 h-3 text-brand-secondary" /> Sort By:
              </span>
              {[
                { id: 'popular', label: 'Most Popular', icon: Flame },
                { id: 'rating', label: 'Highest Rated', icon: Star },
                { id: 'newest', label: 'Latest Additions', icon: Calendar }
              ].map((pill) => {
                const Icon = pill.icon;
                const active = sortBy === pill.id;
                return (
                  <button
                    key={pill.id}
                    onClick={() => setSortBy(pill.id)}
                    className={`px-3.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all duration-200 flex items-center gap-1.5 ${
                      active 
                        ? 'bg-brand-secondary/20 border-brand-secondary/40 text-brand-secondary shadow-[0_0_12px_rgba(236,72,153,0.25)]' 
                        : 'bg-white/[0.02] border-white/[0.07] text-slate-400 hover:text-slate-200 hover:border-white/15'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {pill.label}
                  </button>
                );
              })}
            </div>

            {/* Region / Country Filters */}
            <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Origin:</span>
              <div className="bg-luxury-900/90 border border-white/10 p-1 rounded-xl flex min-w-max items-center gap-1">
                {[
                  { id: '', label: 'All' },
                  { id: 'KR', label: '🇰🇷 S. Korea' },
                  { id: 'JP', label: '🇯🇵 Japan' }
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCountry(c.id)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all duration-150 ${
                      country === c.id 
                        ? 'bg-white/15 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Library Media Grid */}
          <div className="relative min-h-[400px]">
            {isLibraryLoading ? (
              <div className={mediaGridClass}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex min-w-0 flex-col gap-3">
                    <div className="aspect-[2/3] w-full bg-luxury-900 rounded-2xl relative overflow-hidden border border-white/5 animate-pulse">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />
                    </div>
                    <div className="h-4 bg-luxury-900 rounded-lg w-3/4 animate-pulse" />
                    <div className="h-3 bg-luxury-900 rounded-lg w-1/2 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : displayedItems.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/10 rounded-3xl bg-luxury-900/40"
              >
                <RefreshCw className="w-10 h-10 text-slate-600 mb-3 animate-spin" />
                <h4 className="text-base font-bold text-white mb-1">{home.emptyTitle || 'No Titles Found'}</h4>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  {home.emptyDescription || 'Try selecting a different filter or search term.'}
                </p>
              </motion.div>
            ) : (
              <motion.div 
                layout
                className={mediaGridClass}
              >
                <AnimatePresence mode="popLayout">
                  {displayedItems.map((item) => (
                    <motion.div
                      key={item._id}
                      layout
                      className="min-w-0"
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      transition={{ duration: 0.3 }}
                    >
                      <GlassCard item={item} type={item.mediaType} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>

        </section>

        {/* RECENT SUBTITLES SHOWCASE */}
        <div className="grid grid-cols-1 gap-8 border-t border-white/[0.07] pt-14">
          <div className="glass-panel-heavy rounded-3xl p-6 sm:p-8 border border-white/[0.08] flex flex-col gap-5 text-left relative overflow-hidden">
            
            {/* Ambient Background Flare */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-brand-primary/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2.5 font-display">
                <span className="p-1.5 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-400">
                  <Clock className="w-5 h-5" />
                </span>
                {home.subtitleTitle || 'Recent Subtitle Releases'}
              </h3>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:inline-block">
                Live Community Feed
              </span>
            </div>
            
            {subsLoading ? (
              <div className="flex flex-col gap-2.5">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-luxury-900/80 animate-pulse rounded-2xl border border-white/5" />
                ))}
              </div>
            ) : subtitleQueue.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                {home.subtitleEmpty || 'No recently uploaded subtitles.'}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {subtitleQueue.map((sub) => (
                  <div
                    key={sub._id}
                    className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between hover:bg-white/[0.05] hover:border-brand-primary/30 transition-all duration-300 group"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {sub.media?.title ? (
                          <Link
                            href={`/${sub.media.type}/${permalinkSlug(sub.media)}`}
                            className="text-xs sm:text-sm font-black text-white group-hover:text-brand-primary transition truncate max-w-[240px] sm:max-w-[420px]"
                          >
                            {sub.media.title}
                          </Link>
                        ) : (
                          <span className="text-xs font-black text-white uppercase">Unknown Title</span>
                        )}
                        {(sub.seasonNumber || sub.episodeNumber) && (
                          <span className="px-2 py-0.5 rounded-lg bg-brand-primary/15 border border-brand-primary/30 text-brand-primary text-[9px] font-black uppercase">
                            {sub.seasonNumber ? `S${sub.seasonNumber}` : ''} {sub.episodeNumber ? `EP ${sub.episodeNumber}` : ''}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-[9px] font-extrabold uppercase">
                          {sub.language} ({sub.format?.toUpperCase() || 'SRT'})
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Version: <span className="text-slate-300 font-bold">{sub.version}</span> • Uploader: <span className="text-brand-primary/90 font-bold">{sub.adminUploader?.username || sub.uploader?.username || 'Translator'}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-black rounded-xl flex items-center gap-1 shadow-sm">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Approved
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
