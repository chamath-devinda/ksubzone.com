'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/api/apiClient';
import GlassCard from '@/components/ui/GlassCard';
import SeoTags from '@/components/seo/SeoTags';
import { Search as SearchIcon, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useSiteContent } from '@/hooks/useSiteContent';
import AdSlot from '@/components/ads/AdSlot';

export default function Search() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const setSearchParams = (newParams) => {
    const current = new URLSearchParams();
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        current.set(key, value);
      }
    });
    const search = current.toString();
    const query = search ? `?${search}` : '';
    router.push(`${pathname}${query}`);
  };

  const { content } = useSiteContent();
  const enableSmartSearch = content?.ai?.enableSmartSearch !== false;
  
  const initialQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || 'drama';
  const initialGenre = searchParams.get('genre') || '';
  const initialSort = searchParams.get('sort') || 'newest';
  const initialTrending = searchParams.get('trending') === 'true';
  const initialIsHistorical = searchParams.get('isHistorical') === 'true';
  const [searchText, setSearchText] = useState(initialQuery);
  const [debouncedSearchText, setDebouncedSearchText] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory); // all, drama or movie
  const [genre, setGenre] = useState(initialGenre);
  const [debouncedGenre, setDebouncedGenre] = useState(initialGenre);
  const [year, setYear] = useState('');
  const [country, setCountry] = useState('');
  const [rating, setRating] = useState('');
  const [sortBy, setSortBy] = useState(initialSort);
  const [trendingOnly, setTrendingOnly] = useState(initialTrending);
  const [isHistorical, setIsHistorical] = useState(initialIsHistorical);
  const [page, setPage] = useState(1);
  const [isAiMode, setIsAiMode] = useState(false);
  const [aiKeywords, setAiKeywords] = useState([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Sync state if query param changes externally
  useEffect(() => {
    setSearchText(initialQuery);
    setDebouncedSearchText(initialQuery);
    setCategory(initialCategory);
    setGenre(initialGenre);
    setDebouncedGenre(initialGenre);
    setSortBy(initialSort);
    setTrendingOnly(initialTrending);
    setIsHistorical(initialIsHistorical);
    setPage(1);
  }, [initialQuery, initialCategory, initialGenre, initialSort, initialTrending, initialIsHistorical]);

  // Debounce search text changes (Fast 180ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 180);
    return () => clearTimeout(handler);
  }, [searchText]);

  // Debounce genre changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedGenre(genre);
    }, 180);
    return () => clearTimeout(handler);
  }, [genre]);

  useEffect(() => {
    if (!enableSmartSearch) {
      setIsAiMode(false);
    }
  }, [enableSmartSearch]);

  // Fetch search results
  const fetchUrl = category === 'movie' ? '/api/media/movies' : '/api/media/dramas';
  const { data, isLoading } = useQuery({
    queryKey: ['searchResults', category, debouncedSearchText, debouncedGenre, year, country, rating, sortBy, trendingOnly, isHistorical, page, isAiMode],
    staleTime: 1000 * 60 * 3, // 3 minutes cache for fast back-and-forth search
    queryFn: async () => {
      // If AI mode is enabled and there is text, use the AI endpoint
      if (isAiMode && debouncedSearchText.trim().length > 2) {
        const res = await apiClient.post('/api/ai/search', { query: debouncedSearchText.trim() });
        setAiKeywords(res.data.keywords || []);
        return { items: res.data.results || [], totalPages: 1 };
      }

      setAiKeywords([]); // Clear keywords if not AI search or empty

      // Trigger search query logging (analytics) via backend when search starts
      if (debouncedSearchText.trim().length > 1) {
        apiClient.post('/api/analytics/search', { query: debouncedSearchText.trim() }).catch(() => {});
      }

      const params = {
        search: debouncedSearchText || undefined,
        genre: debouncedGenre || undefined,
        year: year || undefined,
        country: country || undefined,
        rating: rating || undefined,
        sort: sortBy,
        trending: trendingOnly ? 'true' : undefined,
        isHistorical: isHistorical ? 'true' : undefined,
        page,
        limit: 12
      };

      if (category === 'all') {
        const [moviesRes, dramasRes] = await Promise.all([
          apiClient.get('/api/media/movies', { params }),
          apiClient.get('/api/media/dramas', { params })
        ]);

        const movies = (moviesRes.data.movies || []).map(item => ({ ...item, _mediaType: 'movie' }));
        const dramas = (dramasRes.data.dramas || []).map(item => ({ ...item, _mediaType: 'drama' }));
        const items = [...movies, ...dramas];

        if (sortBy === 'rating') {
          items.sort((a, b) => (b.imdbRating || b.tmdbRating || 0) - (a.imdbRating || a.tmdbRating || 0));
        } else if (sortBy === 'newest') {
          items.sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0));
        } else if (sortBy === 'oldest') {
          items.sort((a, b) => new Date(a.releaseDate || 0) - new Date(b.releaseDate || 0));
        } else if (sortBy === 'views') {
          items.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
        } else if (sortBy === 'az') {
          items.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        }

        return {
          items,
          totalPages: Math.max(moviesRes.data.totalPages || 1, dramasRes.data.totalPages || 1)
        };
      }

      const res = await apiClient.get(fetchUrl, {
        params: {
          ...params
        }
      });
      return res.data;
    }
  });

  // If we are in AI mode, data is returned as { items: [] } directly
  const items = isAiMode 
    ? data?.items || [] 
    : category === 'all' ? data?.items || [] : category === 'movie' ? data?.movies || [] : data?.dramas || [];
  const totalPages = data?.totalPages || 1;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setDebouncedSearchText(searchText);
    setDebouncedGenre(genre);
    setSearchParams({
      ...(searchText ? { q: searchText } : {}),
      ...(category !== 'drama' ? { category } : {}),
      ...(genre ? { genre } : {}),
      ...(sortBy !== 'newest' ? { sort: sortBy } : {}),
      ...(trendingOnly ? { trending: 'true' } : {}),
      ...(isHistorical ? { isHistorical: 'true' } : {})
    });
    setPage(1);
    setShowMobileFilters(false);
  };

  const handleReset = () => {
    setSearchText('');
    setDebouncedSearchText('');
    setCategory('drama');
    setGenre('');
    setDebouncedGenre('');
    setYear('');
    setCountry('');
    setRating('');
    setSortBy('newest');
    setTrendingOnly(false);
    setIsHistorical(false);
    setSearchParams({});
    setPage(1);
  };

  const handleCategoryChange = (nextCategory) => {
    setCategory(nextCategory);
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-20 sm:pt-24 lg:pt-28 pb-8 text-left flex flex-col gap-7 sm:gap-8 min-h-screen">
      
      <SeoTags
        title="Advanced Search - KSubZone Catalog"
        description="Search through hundreds of Korean dramas, movies, and subtitles. Filter by genre, rating, release year, or language."
        keywords={['search kdramas', 'korean movies filter', 'ksubzone catalog']}
      />

      {/* Header Banner */}
      <div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight flex items-start sm:items-center gap-2 leading-tight">
          {isAiMode ? <Sparkles className="w-6 h-6 text-brand-accent flex-shrink-0" /> : <SearchIcon className="w-6 h-6 text-brand-primary flex-shrink-0" />}
          {isAiMode ? 'AI Smart Search' : 'Advanced Catalog Search'}
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {isAiMode ? 'Describe the plot, vibe, or trope you are looking for (e.g. "CEO falls in love with poor girl").' : 'Explore our deep library of Korean cinematic releases and series.'}
        </p>
      </div>

      {/* Search inputs */}
      <form onSubmit={handleSearchSubmit} className="relative w-full max-w-2xl flex flex-col sm:flex-row gap-2">
        <div className="relative flex-grow">
          <input
            type="text"
            placeholder={isAiMode ? "Describe what you want to watch..." : "Type keyword, title, cast names, description..."}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className={`w-full h-11 pl-11 pr-4 rounded-xl text-xs sm:text-sm glass-input transition-colors ${isAiMode ? 'focus:border-brand-accent bg-luxury-900/50' : 'focus:border-brand-primary'}`}
          />
          {isAiMode ? (
            <Sparkles className="absolute left-4 top-3.5 w-4 h-4 text-brand-accent" />
          ) : (
            <SearchIcon className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          {enableSmartSearch && (
            <button
              type="button"
              onClick={() => { setIsAiMode(!isAiMode); setPage(1); }}
              className={`h-11 px-3 sm:px-4 rounded-xl text-xs font-bold uppercase tracking-wide sm:tracking-wider transition shadow-lg flex items-center justify-center gap-1.5 ${isAiMode ? 'bg-brand-accent text-white' : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'}`}
              title="Toggle AI Search Mode"
            >
              <Sparkles className="w-3.5 h-3.5" /> AI Mode
            </button>
          )}
          <button
            type="submit"
            className={`h-11 px-4 sm:px-5 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-lg ${isAiMode ? 'bg-brand-accent/80 hover:bg-brand-accent' : 'bg-brand-primary hover:bg-brand-primary/80'}`}
          >
            Search
          </button>
        </div>
      </form>

      {/* AI Keywords Indicator */}
      {isAiMode && aiKeywords.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 -mt-4">
          <span className="text-[10px] text-slate-500 font-bold uppercase">AI Detected Elements:</span>
          {aiKeywords.map((kw, idx) => (
            <span key={idx} className="px-2 py-0.5 rounded border border-brand-accent/30 bg-brand-accent/10 text-brand-accent text-[9px] font-bold uppercase tracking-wider">
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* Search Grid Area */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">

        <button
          type="button"
          onClick={() => setShowMobileFilters((value) => !value)}
          aria-expanded={showMobileFilters}
          aria-controls="catalog-filters"
          className="md:hidden h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-xs font-black uppercase tracking-wider text-slate-200 flex items-center justify-between"
        >
          <span className="flex items-center gap-2"><SlidersHorizontal className="w-4 h-4 text-brand-primary" /> Catalog Filters</span>
          <span className="text-brand-primary">{showMobileFilters ? 'Hide' : 'Show'}</span>
        </button>
        
        {/* Sidebar Filters */}
        <div id="catalog-filters" className={`glass-panel p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-white/5 flex-col gap-5 ${showMobileFilters ? 'flex' : 'hidden'} md:flex ${isAiMode ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
            </h3>
            <button type="button" onClick={handleReset} className="text-[10px] font-bold text-brand-secondary hover:underline">
              Clear All
            </button>
          </div>

          {isAiMode && (
            <div className="p-2 -mt-2 bg-brand-accent/10 border border-brand-accent/20 rounded-lg text-[10px] text-brand-accent leading-relaxed">
              Filters are disabled in AI Mode. The AI searches the entire database directly based on your description.
            </div>
          )}

          <hr className="border-white/5" />

          {/* Category Selector */}
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 block">Category</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleCategoryChange('all')}
                className={`flex-1 h-9 rounded-xl text-xs font-bold transition ${category === 'all' ? 'bg-brand-primary text-white' : 'bg-white/5 border border-white/5 text-slate-400'}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => handleCategoryChange('drama')}
                className={`flex-1 h-9 rounded-xl text-xs font-bold transition ${category === 'drama' ? 'bg-brand-primary text-white' : 'bg-white/5 border border-white/5 text-slate-400'}`}
              >
                TV Shows
              </button>
              <button
                type="button"
                onClick={() => handleCategoryChange('movie')}
                className={`flex-1 h-9 rounded-xl text-xs font-bold transition ${category === 'movie' ? 'bg-brand-primary text-white' : 'bg-white/5 border border-white/5 text-slate-400'}`}
              >
                Movies
              </button>
            </div>
          </div>

          {/* Genre input */}
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 block">Genre</label>
            <input
              type="text"
              placeholder="e.g. Action, Horror, Romance"
              value={genre}
              onChange={(e) => { setGenre(e.target.value); setPage(1); }}
              className="w-full h-9 px-3 rounded-xl border border-white/5 bg-luxury-800 text-xs text-white focus:outline-none focus:border-brand-primary"
            />
          </div>

          {/* Year selector */}
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 block">Release Year</label>
            <select
              value={year}
              onChange={(e) => { setYear(e.target.value); setPage(1); }}
              className="w-full h-9 px-3 rounded-xl border border-white/5 bg-luxury-800 text-xs text-white focus:outline-none"
            >
              <option value="">All Years</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
              <option value="2020">2020s</option>
              <option value="2016">2016</option>
            </select>
          </div>

          {/* Country selector */}
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 block">Origin Country</label>
            <select
              value={country}
              onChange={(e) => { setCountry(e.target.value); setPage(1); }}
              className="w-full h-9 px-3 rounded-xl border border-white/5 bg-luxury-800 text-xs text-white focus:outline-none"
            >
              <option value="">All Countries</option>
              <option value="KR">South Korea</option>
              <option value="JP">Japan</option>
              <option value="CN">China</option>
              <option value="US">USA</option>
            </select>
          </div>

          {/* Sorting */}
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 block">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="w-full h-9 px-3 rounded-xl border border-white/5 bg-luxury-800 text-xs text-white focus:outline-none"
            >
              <option value="newest">Newest Released</option>
              <option value="oldest">Oldest Released</option>
              <option value="rating">Highest Rated (IMDb)</option>
              <option value="views">Most Viewed</option>
              <option value="az">A-Z</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => { setTrendingOnly(value => !value); setPage(1); }}
            className={`h-10 rounded-xl text-xs font-bold transition ${trendingOnly ? 'bg-brand-secondary/15 border border-brand-secondary/30 text-brand-secondary' : 'bg-white/5 border border-white/5 text-slate-400 hover:text-slate-200'}`}
          >
            Trending Only
          </button>

          <button
            type="button"
            onClick={() => { setIsHistorical(value => !value); setPage(1); }}
            className={`h-10 rounded-xl text-xs font-bold transition ${isHistorical ? 'bg-brand-accent/15 border border-brand-accent/30 text-brand-accent' : 'bg-white/5 border border-white/5 text-slate-400 hover:text-slate-200'}`}
          >
            Historical Only
          </button>

        </div>

        {/* Results grid */}
        <div className="md:col-span-3 flex flex-col gap-6">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-luxury-800 rounded-2xl animate-pulse border border-white/5" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="glass-panel p-8 sm:p-16 rounded-2xl sm:rounded-3xl border border-white/5 text-center text-slate-400">
              <p className="text-sm font-bold">No results match your search.</p>
              <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search keywords.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {items.map((item) => (
                  <GlassCard key={`${item._mediaType || category}-${item._id}`} item={item} type={item._mediaType || category} />
                ))}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="px-3 h-10 flex-1 max-w-24 bg-white/5 border border-white/10 disabled:bg-transparent disabled:text-slate-600 disabled:border-white/5 rounded-xl text-xs font-bold text-white transition"
                  >
                    Prev
                  </button>
                  <span className="text-[11px] sm:text-xs text-slate-400 font-semibold px-1 sm:px-2 whitespace-nowrap">Page {page} of {totalPages}</span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="px-3 h-10 flex-1 max-w-24 bg-white/5 border border-white/10 disabled:bg-transparent disabled:text-slate-600 disabled:border-white/5 rounded-xl text-xs font-bold text-white transition"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

      </div>

      <AdSlot slotId="search_results_banner" className="mt-4" />

    </div>
  );
}
