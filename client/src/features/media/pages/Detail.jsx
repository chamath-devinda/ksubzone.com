'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/api/apiClient';
import { motion } from 'framer-motion';
import { Star, Plus, Check, Heart, Upload, Download, Film, Tv, Flame, Languages, ShieldCheck, Clock, CheckCircle2, MessageSquare, ThumbsUp, PlayCircle, Eye, CalendarClock, ChevronRight } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import SeoTags from '@/components/seo/SeoTags';

import GlassCard from '@/components/ui/GlassCard';
import { permalinkSlug } from '@/utils/slug';
import { getMediaImage, handleImageFallback } from '@/utils/mediaImages';
import { downloadSubtitle } from '@/utils/subtitleDownload';
import AdSlot from '@/components/ads/AdSlot';
import SideAdLayout from '@/components/ads/SideAdLayout';
import { cleanMediaText, cleanMediaTitle } from '@/utils/seo';
import MediaSubtitlesSection from '../components/MediaSubtitlesSection';

export default function Detail({ type = 'Movie', initialData, topOnly = false }) {
  const { slug } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, admin, refreshProfile } = useAuth();
  
  const [selectedSeason, setSelectedSeason] = useState(1);

  const [commentName, setCommentName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [replyText, setReplyText] = useState({});
  const [activeReplyBox, setActiveReplyBox] = useState(null);
  const [playTrailer, setPlayTrailer] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadAlert, setDownloadAlert] = useState(null);

  const [loadRecommendations, setLoadRecommendations] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadRecommendations(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);


  const isAdmin = !!admin || !!(user && user.hasDashboardAccess);

  // Fetch Media Details
  const endpoint = type === 'Drama' ? `/api/media/dramas/${slug}` : `/api/media/movies/${slug}`;
  const { data, isLoading, error } = useQuery({
    queryKey: ['mediaDetails', slug, type],
    queryFn: async () => {
      const res = await apiClient.get(endpoint);
      return res.data;
    },
    initialData,
    staleTime: 10_000,
    refetchOnMount: true
  });

  const media = type === 'Drama' ? data?.drama : data?.movie;
  const seasons = data?.seasons || [];
  const episodes = data?.episodes || [];
  const related = data?.related || [];

  const getId = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value._id || value.$oid || String(value);
  };

  // Sync selected season when seasons list changes
  useEffect(() => {
    if (type === 'Drama' && seasons.length > 0) {
      if (!seasons.some(s => s.seasonNumber === selectedSeason)) {
        setSelectedSeason(seasons[0].seasonNumber);
      }
    }
  }, [seasons, type, selectedSeason]);

  // Handle URL hash or query scroll for subtitles and clean the URL
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkAndScroll = () => {
      const hasSubtitlesHash = window.location.hash === '#subtitles' || window.location.hash === '#subtitle';
      const urlParams = new URLSearchParams(window.location.search);
      const hasSubtitlesQuery = urlParams.get('scrollTo') === 'subtitles';

      if (hasSubtitlesHash || hasSubtitlesQuery) {
        const element = document.getElementById('subtitles');
        if (element) {
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth' });
          }, 200);
        }

        // Clean URL by removing query param and hash
        const cleanUrl = window.location.pathname;
        window.history.replaceState(null, '', cleanUrl);
      }
    };

    // Run check on mount or when data loads
    if (media?._id) {
      checkAndScroll();
    }
  }, [media?._id]);

  const activeSeasonDoc = seasons.find(s => s.seasonNumber === selectedSeason);
  const activeEpisodes = episodes
    .filter(ep => getId(ep.seasonId) === getId(activeSeasonDoc?._id))
    .sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0));

  // Fetch Subtitles
  const { data: subtitles = [], refetch: refetchSubtitles } = useQuery({
    queryKey: ['mediaSubtitles', media?._id],
    queryFn: async () => {
      const res = await apiClient.get(`/api/subtitles/media/${media._id}`);
      return res.data;
    },
    enabled: !topOnly && !!media?._id,
    initialData: data?.subtitles || [],
    staleTime: 10_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false
  });

  const { data: episodeSubtitlesById = {}, isFetching: episodeSubtitlesLoading, refetch: refetchEpisodeSubtitles } = useQuery({
    queryKey: ['activeSeasonEpisodeSubtitles', media?._id, selectedSeason, activeEpisodes.map(ep => ep._id).join(',')],
    queryFn: async () => {
      const episodeIds = activeEpisodes.map(ep => ep._id).filter(Boolean).join(',');
      if (!episodeIds) return {};
      const res = await apiClient.get(`/api/subtitles/media/${episodeIds}`);
      const subs = res.data || [];
      const grouped = {};
      activeEpisodes.forEach(ep => {
        grouped[getId(ep._id)] = [];
      });
      subs.forEach(sub => {
        const subtitleMediaId = getId(sub.mediaId);
        if (subtitleMediaId) {
          if (!grouped[subtitleMediaId]) {
            grouped[subtitleMediaId] = [];
          }
          grouped[subtitleMediaId].push(sub);
        }
      });
      return grouped;
    },
    enabled: !topOnly && type === 'Drama' && activeEpisodes.length > 0,
    initialData: () => {
      if (!data?.episodeSubtitles) return undefined;
      const grouped = {};
      activeEpisodes.forEach(ep => {
        grouped[getId(ep._id)] = [];
      });
      data.episodeSubtitles.forEach(sub => {
        const subtitleMediaId = getId(sub.mediaId);
        if (subtitleMediaId && grouped[subtitleMediaId] !== undefined) {
          grouped[subtitleMediaId].push(sub);
        }
      });
      return grouped;
    },
    staleTime: 10_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false
  });

  // Fetch Comments
  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['mediaComments', media?._id],
    queryFn: async () => {
      const res = await apiClient.get(`/api/media/comments/target/${media._id}`);
      return res.data;
    },
    enabled: !topOnly && !!media?._id && !data?.comments,
    initialData: data?.comments || [],
    staleTime: 1000 * 60 // 1 minute
  });

  const { data: recommendationRows = [], isLoading: recommendationsLoading } = useQuery({
    queryKey: ['detailRecommendations', media?._id, type],
    queryFn: async () => {
      const res = await apiClient.get('/api/media/recommendations');
      const recs = res.data || {};

      const currentId = media?._id;
      const withType = (items, mediaType) => (items || [])
        .filter(item => item._id !== currentId)
        .map(item => ({ ...item, mediaType }));

      const recommendedMovies = withType(recs.recommendedMovies, 'movie');
      const recommendedDramas = withType(recs.recommendedDramas, 'drama');
      
      const trending = [
        ...withType(recs.trendingDramas, 'drama'),
        ...withType(recs.trendingMovies, 'movie')
      ]
        .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
        .slice(0, 12);

      const popularFallback = [...recommendedDramas, ...recommendedMovies]
        .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
        .slice(0, 12);

      return [
        {
          id: 'recommended-movies',
          title: 'Recommended Movies',
          icon: Film,
          type: 'movie',
          items: recommendedMovies
        },
        {
          id: 'recommended-dramas',
          title: 'Recommended Dramas',
          icon: Tv,
          type: 'drama',
          items: recommendedDramas
        },
        {
          id: 'trending-now',
          title: 'Trending Now',
          icon: Flame,
          type: 'mixed',
          items: trending.length > 0 ? trending : popularFallback
        }
      ];
    },
    enabled: !topOnly && !!media?._id && loadRecommendations,
    staleTime: 1000 * 60 * 10 // 10 minutes
  });

  // Check Watchlist / Favorites states
  const inWatchlist = user?.watchlist?.some(w => w.mediaId === media?._id);
  const inFavorites = user?.favorites?.some(f => f.mediaId === media?._id);

  // Mutations
  const toggleWatchlistMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/api/media/watchlist', { mediaId: media._id, mediaType: type });
    },
    onSuccess: () => {
      refreshProfile();
    }
  });

  const toggleFavoritesMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/api/media/favorites', { mediaId: media._id, mediaType: type });
    },
    onSuccess: () => {
      refreshProfile();
    }
  });

  const submitCommentMutation = useMutation({
    mutationFn: async (commentData) => {
      await apiClient.post('/api/media/comments', commentData);
    },
    onSuccess: () => {
      setCommentText('');
      setCommentError('');
      refetchComments();
    },
    onError: (err) => {
      setCommentError(err.response?.data?.message || 'Error submitting comment.');
    }
  });

  const submitReplyMutation = useMutation({
    mutationFn: async ({ commentId, replyData }) => {
      await apiClient.post(`/api/media/comments/${commentId}/reply`, replyData);
    },
    onSuccess: () => {
      setReplyText((prev) => ({ ...prev, [activeReplyBox]: '' }));
      setActiveReplyBox(null);
      refetchComments();
    }
  });

  const likeCommentMutation = useMutation({
    mutationFn: async (commentId) => {
      await apiClient.post(`/api/media/comments/${commentId}/like`);
    },
    onSuccess: () => {
      refetchComments();
    }
  });

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-transparent flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Loading Title File...</span>
      </div>
    );
  }

  if (error && !media) {
    return (
      <div className="h-screen w-full bg-transparent flex flex-col items-center justify-center gap-3">
        <p className="text-brand-secondary text-sm">Failed to retrieve media entry.</p>
        <button onClick={() => router.push('/')} className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-xl">Go Home</button>
      </div>
    );
  }

  if (!media) {
    return (
      <div className="h-screen w-full bg-transparent flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Loading Title Details...</span>
      </div>
    );
  }

  const handleDownloadSubtitle = async (subId, fileUrl, customFileName, subtitleObj = null) => {
    if (downloadingId) return;
    setDownloadingId(subId);
    setDownloadAlert(null);

    try {
      const baseUrl = (apiClient.defaults.baseURL && apiClient.defaults.baseURL !== '/') ? apiClient.defaults.baseURL : 'https://api.ksubzone.com';
      // Keep the filename out of the query string. Some shared-hosting
      // ModSecurity rules reject otherwise valid download requests containing
      // a `name` parameter with HTTP 403. The browser applies this filename
      // after receiving the file (see downloadSubtitle).
      const downloadUrl = `${baseUrl}/api/subtitles/${subId}/download`;

      await downloadSubtitle({
        subtitle: subtitleObj || { _id: subId, fileUrl },
        subId,
        downloadUrl,
        fileUrl,
        fileName: customFileName || `subtitle-${subId}.srt`
      });

      setTimeout(() => {
        refetchSubtitles?.();
        refetchEpisodeSubtitles?.();
      }, 1500);
    } catch (err) {
      console.error('Download error:', err);
      setDownloadAlert(err.message || 'උපසිරැසි ගොනුව බාගත කිරීමේදී දෝෂයක් සිදුවිය.');
      setTimeout(() => setDownloadAlert(null), 6000);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSubmitComment = (e) => {
    e.preventDefault();
    const trimmedName = commentName.trim();
    const trimmedComment = commentText.trim();

    if (!user && (trimmedName.length < 2 || trimmedName.length > 50)) {
      setCommentError('Please enter your name (2-50 characters)');
      return;
    }
    if (!trimmedComment) {
      setCommentError('Comment content is required');
      return;
    }
    setCommentError('');
    submitCommentMutation.mutate({
      targetId: media._id,
      targetType: type,
      content: trimmedComment,
      guestName: user ? undefined : trimmedName
    });
  };

  const handleAddReply = (commentId) => {
    const text = replyText[commentId];
    if (!text || !text.trim()) return;
    submitReplyMutation.mutate({
      commentId,
      replyData: { content: text }
    });
  };

  const imdbRating = media.imdbRating || media.tmdbRating || 0;
  const displayTitle = cleanMediaTitle(media.title) || media.title;
  const releaseYear = media.releaseDate ? new Date(media.releaseDate).getFullYear() : null;
  const synopsis = cleanMediaText(media.synopsisRewrite || media.description, media.title, displayTitle);
  const storyOverview = cleanMediaText(media.storyOverview, media.title, displayTitle);
  const mediaPermalink = permalinkSlug(media);
  const posterImage = getMediaImage(media, 'poster');
  const backdropImage = getMediaImage(media, 'backdrop');
  const sortedSubtitles = [...(subtitles || [])].sort((a, b) => {
    const aSinhala = a?.language?.toLowerCase() === 'sinhala' ? 0 : 1;
    const bSinhala = b?.language?.toLowerCase() === 'sinhala' ? 0 : 1;
    return aSinhala - bSinhala;
  });
  const titleLevelSubtitles = sortedSubtitles.filter(sub => !sub?.seasonNumber && !sub?.episodeNumber);
  const standaloneSubtitles = type === 'Drama' ? titleLevelSubtitles : sortedSubtitles;
  const sortSubtitleFiles = (items = []) => [...items].sort((a, b) => {
    const aSinhala = a?.language?.toLowerCase() === 'sinhala' ? 0 : 1;
    const bSinhala = b?.language?.toLowerCase() === 'sinhala' ? 0 : 1;
    if (aSinhala !== bSinhala) return aSinhala - bSinhala;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
  const mediaSubtitleSummary = media.subtitleSummary || {};
  const subtitleLanguages = mediaSubtitleSummary.languages || [];

  const getUploaderLabel = (sub) => {
    if (sub.uploaderRole === 'Admin') {
      return `Admin: ${sub.adminUploader?.username || 'Admin'}`;
    }
    return `User: ${sub.uploader?.username || 'Translator'}`;
  };

  const getEmbedUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    if (url.includes('/embed/')) return url;
    
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split(/[?#]/)[0];
    } else if (url.includes('youtube.com/watch')) {
      try {
        const urlParams = new URLSearchParams(new URL(url).search);
        videoId = urlParams.get('v');
      } catch (e) {
        // Fallback for malformed URLs
      }
    } else if (url.includes('youtube.com/v/')) {
      videoId = url.split('/v/')[1]?.split(/[?#]/)[0];
    }
    
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  return (
    <SideAdLayout enabled={!topOnly}>
    <div className="w-full flex flex-col gap-12 bg-transparent text-left pb-16">
      
      {/* Dynamic AI SEO Optimization tags */}
      {!topOnly && (
        <SeoTags
          title={media.metaTitle || `${displayTitle} Sinhala & English Subtitles | KSubZone`}
          description={media.metaDescription || `${synopsis || displayTitle} Sinhala and English subtitle downloads.`}
          keywords={media.seoKeywords || (displayTitle ? [displayTitle.toLowerCase()] : [])}
          canonical={`https://www.ksubzone.com/${type.toLowerCase()}/${mediaPermalink}`}
          image={media.poster}
          schemaMarkup={media.schemaMarkup}
        />
      )}

      {/* Cinematic Banner Backdrop Header */}
      <div className="relative w-full h-[42vh] min-h-[300px] sm:h-[70vh] lg:h-[85vh] overflow-hidden">
        <img
          src={backdropImage}
          alt={`${displayTitle} backdrop`}
          fetchPriority="high"
          decoding="async"
          className="w-full h-full object-cover object-top"
          onError={(event) => handleImageFallback(event, media, 'backdrop')}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-luxury-950 via-luxury-950/20 to-transparent" />
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* Media Metadata Layout */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full -mt-16 sm:-mt-52 lg:-mt-64 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 sm:gap-8 items-start">
          
          {/* LEFT: POSTER CARD */}
          <div className="flex flex-col gap-4 max-w-[230px] sm:max-w-xs mx-auto md:max-w-none md:w-full w-full">
            <div className="glass-panel border border-white/10 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl aspect-[2/3] w-full">
              <img
                src={posterImage}
                alt={`${displayTitle}${releaseYear ? ` (${releaseYear})` : ''} poster`}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
                onError={(event) => handleImageFallback(event, media, 'poster')}
              />
            </div>
            
            {/* Watchlist & Favorites Toggles */}
            {user && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => toggleWatchlistMutation.mutate()}
                  className={`h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${inWatchlist ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 backdrop-blur-md shadow-sm' : 'btn-glass-subtle'}`}
                >
                  {inWatchlist ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />} Watchlist
                </button>
                <button
                  onClick={() => toggleFavoritesMutation.mutate()}
                  className={`h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${inFavorites ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 backdrop-blur-md shadow-sm' : 'btn-glass-subtle'}`}
                >
                  <Heart className="w-3.5 h-3.5 fill-current" /> Favorite
                </button>
              </div>
            )}


          </div>

          {/* RIGHT: DETAILS CONTROLLER */}
          <div className="min-w-0 md:col-span-3 flex flex-col gap-6">
            <div>
              <nav aria-label="Breadcrumb" className="mb-4 flex min-w-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <Link href="/" className="transition hover:text-white">Home</Link>
                <ChevronRight className="h-3 w-3 flex-shrink-0 text-slate-600" aria-hidden="true" />
                <Link href={type === 'Drama' ? '/dramas' : '/movies'} className="transition hover:text-white">
                  {type === 'Drama' ? 'Dramas' : 'Movies'}
                </Link>
                <ChevronRight className="h-3 w-3 flex-shrink-0 text-slate-600" aria-hidden="true" />
                <span aria-current="page" className="truncate text-brand-primary">{displayTitle}</span>
              </nav>

              <div className="flex flex-wrap items-center gap-2 mb-3">
                {type === 'Drama' && mediaSubtitleSummary.totalSubtitles > 0 && (
                  <span className={`px-2.5 py-0.5 border text-[10px] font-extrabold uppercase tracking-widest rounded-full inline-flex items-center gap-1 ${
                    mediaSubtitleSummary.seasonStatus === 'Complete'
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 text-glow-rose'
                      : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 text-glow-emerald'
                  }`}>
                    {mediaSubtitleSummary.progressLabel}
                  </span>
                )}
                <span className="px-2.5 py-0.5 bg-brand-accent/20 border border-brand-accent/50 text-brand-accent text-[10px] font-extrabold uppercase tracking-widest rounded-full inline-flex items-center gap-1">
                  <Star className="w-2.5 h-2.5 fill-current" /> {imdbRating > 0 ? imdbRating.toFixed(1) : 'NR'} IMDb Rating
                </span>
                {media.tmdbRating > 0 && (
                  <span className="px-2.5 py-0.5 bg-white/5 border border-white/10 text-slate-300 text-[10px] font-extrabold uppercase tracking-widest rounded-full">
                    {media.tmdbRating.toFixed(1)} TMDB
                  </span>
                )}
                {subtitleLanguages.map((language) => (
                  <span key={language} className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[10px] font-extrabold uppercase tracking-widest rounded-full inline-flex items-center gap-1">
                    <Languages className="w-2.5 h-2.5" /> {language}
                  </span>
                ))}
                {mediaSubtitleSummary.latestUploaderRole && (
                  <span className="px-2.5 py-0.5 bg-sky-500/10 border border-sky-500/25 text-sky-300 text-[10px] font-extrabold uppercase tracking-widest rounded-full inline-flex items-center gap-1">
                    <ShieldCheck className="w-2.5 h-2.5" /> {mediaSubtitleSummary.latestUploaderRole}
                  </span>
                )}
                <span className="px-2.5 py-0.5 bg-brand-primary/10 border border-brand-primary/25 text-brand-primary text-[10px] font-extrabold uppercase tracking-widest rounded-full inline-flex items-center gap-1">
                  <Eye className="w-2.5 h-2.5" /> {media.viewCount || 0} Views
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight font-display">
                {displayTitle}{releaseYear ? ` (${releaseYear})` : ''} Sinhala Subtitles
              </h1>
              <p className="text-sm sm:text-base font-bold text-brand-primary/90 mt-1.5 flex items-center gap-2 flex-wrap">
                <span>{displayTitle} සිංහල උපසිරැසි (SRT / VTT / ASS)</span>
                {media.originalTitle && media.originalTitle !== displayTitle && (
                  <span className="text-slate-400 font-normal">({media.originalTitle})</span>
                )}
              </p>

              {/* Clickable Genre Badges */}
              {media.keywords && media.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {media.keywords.map((kw, idx) => {
                    const slug = (kw || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/, '');
                    const path = type.toLowerCase() === 'drama' ? `/drama/genre/${slug}` : `/movie/genre/${slug}`;
                    return (
                      <Link
                        key={idx}
                        href={path}
                        className="inline-flex items-center px-3 py-1 bg-white/[0.03] hover:bg-brand-primary/15 border border-white/10 hover:border-brand-primary/30 rounded-full text-xs text-slate-300 hover:text-white font-bold transition duration-200"
                      >
                        {kw}
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Tag Metadata Row */}
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-xs font-semibold text-slate-400">
                <span>{media.releaseDate ? new Date(media.releaseDate).getFullYear() : '2026'}</span>
                <span>•</span>
                <span>
                  {type === 'Drama'
                    ? 'TV Series'
                    : (media.runtime
                        ? (Math.floor(media.runtime / 60) > 0
                            ? `${Math.floor(media.runtime / 60)}h ${media.runtime % 60}m`
                            : `${media.runtime}m`)
                        : 'Feature Film')}
                </span>
                <span>•</span>
                <span className="uppercase">{media.country}</span>
                <span>•</span>
                <span className="uppercase">{media.language}</span>
                <span>•</span>
                <span>{media.viewCount || 0} Views</span>
              </div>

              {/* PROMINENT HERO DOWNLOAD ACTION BAR */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href="#subtitles"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('subtitles')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="min-h-12 px-6 sm:px-8 rounded-full btn-oio-pill btn-kz-cta text-white text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <Download className="w-4 h-4 animate-bounce" />
                  <span>Download Sinhala Subtitle</span>
                </a>

                {media.trailerUrl && (
                  <button
                    type="button"
                    onClick={() => setPlayTrailer(true)}
                    className="min-h-12 px-6 rounded-full btn-oio-glass text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <PlayCircle className="w-4 h-4 text-purple-300" />
                    <span>Trailer</span>
                  </button>
                )}
              </div>
            </div>

            {/* Prominent Subtitle Download Center (High Above the Fold) */}
            {!topOnly && (
              <MediaSubtitlesSection
                type={type}
                media={media}
                seasons={seasons}
                selectedSeason={selectedSeason}
                setSelectedSeason={setSelectedSeason}
                activeSeasonDoc={activeSeasonDoc}
                activeEpisodes={activeEpisodes}
                episodeSubtitlesById={episodeSubtitlesById}
                sortedSubtitles={sortedSubtitles}
                standaloneSubtitles={standaloneSubtitles}
                sortSubtitleFiles={sortSubtitleFiles}
                mediaPermalink={mediaPermalink}
                displayTitle={displayTitle}
                downloadAlert={downloadAlert}
                downloadingId={downloadingId}
                handleDownloadSubtitle={handleDownloadSubtitle}
                getId={getId}
              />
            )}

            {!topOnly && <AdSlot slotId="media_below_hero" className="my-2" />}

            {/* AI SEO Unique Rewrite Block */}
            <div className="glass-panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5 text-slate-300 flex flex-col gap-4 text-xs sm:text-sm">
              <div>
                <h2 className="font-extrabold text-white text-sm sm:text-base uppercase tracking-wider mb-2">Synopsis</h2>
                <p className="leading-relaxed speakable-synopsis">{synopsis}</p>
              </div>
              <hr className="border-white/5" />
              <div>
                <h2 className="font-extrabold text-white text-sm uppercase tracking-wider mb-2">Story Deep-Dive</h2>
                <p className="leading-relaxed text-slate-400">{storyOverview}</p>
              </div>
            </div>

            {!topOnly && <AdSlot slotId="media_after_description" className="my-2" />}

            {/* Quick Facts & AI Summary Table (GEO Optimized) */}
            <div className="glass-panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5 flex flex-col gap-4">
              <h2 className="font-black text-white text-sm sm:text-base uppercase tracking-wider">Quick Facts & Subtitle Details</h2>
              <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.01]">
                <table className="detail-facts-table min-w-full text-xs text-left divide-y divide-white/5 text-slate-300">
                  <tbody className="divide-y divide-white/[0.02]">
                    <tr>
                      <td className="px-4 py-3 font-bold text-slate-400 uppercase tracking-wider w-1/3">Title</td>
                      <td className="px-4 py-3 text-white font-semibold">{displayTitle}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-slate-400 uppercase tracking-wider">Director</td>
                      <td className="px-4 py-3 text-white font-semibold">{media.director || 'Unknown'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-slate-400 uppercase tracking-wider">Release Date</td>
                      <td className="px-4 py-3 text-white font-semibold">{media.releaseDate ? new Date(media.releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '2026'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-slate-400 uppercase tracking-wider">Runtime</td>
                      <td className="px-4 py-3 text-white font-semibold">
                        {type === 'Drama' ? 'TV Show (Multiple Episodes)' : (media.runtime ? `${media.runtime} Minutes` : 'Feature Length')}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-slate-400 uppercase tracking-wider">Country</td>
                      <td className="px-4 py-3 text-white font-semibold uppercase">{media.country || 'South Korea'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-slate-400 uppercase tracking-wider">Languages Available</td>
                      <td className="px-4 py-3 text-white font-semibold">Sinhala, English</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-slate-400 uppercase tracking-wider">Community Rating</td>
                      <td className="px-4 py-3 text-white font-semibold">⭐ {imdbRating > 0 ? `${imdbRating.toFixed(1)}/10 (IMDb)` : 'NR'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Casting / Studio Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="glass-panel p-4 rounded-2xl border border-white/5">
                <p className="text-slate-400 mb-1 font-semibold uppercase tracking-wider text-[10px]">Director</p>
                <p className="text-white font-bold">{media.director || 'Unknown'}</p>
              </div>
              <div className="glass-panel p-4 rounded-2xl border border-white/5">
                <p className="text-slate-400 mb-1 font-semibold uppercase tracking-wider text-[10px]">Production Company</p>
                <p className="text-white font-bold">{media.studio || 'N/A'}</p>
              </div>
            </div>

            {/* Cast details Section */}
            {media.cast && media.cast.length > 0 && (
              <div className="flex flex-col gap-4 text-left">
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-wider">Starring Cast</h2>
                <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-white/10 select-none">
                  {media.cast.map((member, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-white/[0.02] border border-white/5 p-3 rounded-2xl min-w-[200px] flex-shrink-0">
                      <img
                        src={member?.profilePath || `https://placehold.co/100x100/111/fff?text=${encodeURIComponent((member?.name || 'Cast').split(' ').map(n=>n[0]).join(''))}`}
                        alt={member?.name || 'Cast Member'}
                        loading="lazy"
                        decoding="async"
                        className="w-10 h-10 rounded-full object-cover border border-white/10"
                        onError={(e) => {
                          e.target.src = `https://placehold.co/100x100/111/fff?text=${encodeURIComponent((member?.name || 'Cast').split(' ').map(n=>n[0]).join(''))}`;
                        }}
                      />
                      <div className="min-w-0 flex flex-col">
                        <span className="text-xs font-bold text-white truncate">{member?.name || 'Unknown'}</span>
                        <span className="text-[10px] text-slate-400 truncate mt-0.5">{member?.character || 'Actor'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* YouTube Trailer Section */}
            {media.trailer && (
              <div className="flex flex-col gap-4 text-left">
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-brand-primary" /> Official Trailer
                </h2>
                <div className="relative aspect-video w-full rounded-3xl overflow-hidden border border-white/5 bg-black shadow-2xl group cursor-pointer">
                  {playTrailer ? (
                    <iframe
                      src={getEmbedUrl(media.trailer) + (getEmbedUrl(media.trailer).includes('?') ? '&autoplay=1' : '?autoplay=1')}
                      title={`${displayTitle} official trailer`}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div 
                      className="absolute inset-0 w-full h-full"
                      onClick={() => setPlayTrailer(true)}
                    >
                      <img
                        src={backdropImage}
                        alt={`${displayTitle} trailer cover`}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover brightness-75 group-hover:scale-105 transition-transform duration-700 ease-out"
                        onError={(event) => handleImageFallback(event, media, 'backdrop')}
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/15 transition-colors duration-300 flex items-center justify-center z-10">
                        <PlayCircle className="w-16 h-16 text-white/90 group-hover:text-brand-primary group-hover:scale-110 transition-all duration-300 drop-shadow-[0_0_15px_rgba(124,58,237,0.6)]" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!topOnly && (
              <>
            {/* Safe Mid-Page Ad Placement */}
            {!topOnly && <AdSlot slotId="media_after_downloads" className="my-6" />}

            {/* Visual FAQ Section (AEO / GEO optimized) */}
            {media.faq && media.faq.length > 0 && (
              <div className="flex flex-col gap-6 text-left speakable-faq-section">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary">Knowledge Center</p>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Frequently Asked Questions</h2>
                </div>
                <div className="flex flex-col gap-3">
                  {media.faq.map((item, idx) => (
                    <details
                      key={idx}
                      className="group rounded-2xl border border-white/5 bg-white/[0.01] p-4 [&_summary::-webkit-details-marker]:hidden cursor-pointer hover:border-brand-primary/20 transition-all duration-300"
                    >
                      <summary className="flex items-center justify-between gap-1.5 text-slate-200">
                        <h3 className="text-sm font-bold text-white leading-snug">{cleanMediaText(item.question, media.title, displayTitle)}</h3>
                        <span className="shrink-0 rounded-full bg-white/5 p-1.5 text-slate-400 group-open:rotate-180 transition duration-300">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4.5 w-4.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                      </summary>
                      <div className="mt-4 leading-relaxed text-xs sm:text-sm text-slate-300 border-t border-white/5 pt-3">
                        <p>{cleanMediaText(item.answer, media.title, displayTitle)}</p>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}

            {/* Discussion Comments */}
            <div className="flex flex-col gap-6 text-left" id="comments">
              <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2.5">
                <MessageSquare className="w-5 h-5 text-brand-primary" /> Discussion ({comments.length})
              </h2>
              
              {/* Form upload comment */}
              <form onSubmit={handleSubmitComment} className="glass-panel p-4 rounded-2xl sm:rounded-3xl border border-white/5 flex flex-col gap-3">
                {commentError && (
                  <div className="p-2 bg-brand-secondary/10 border border-brand-secondary/20 rounded-xl text-brand-secondary text-xs font-bold">
                    {commentError}
                  </div>
                )}

                {!user && (
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={50}
                    autoComplete="name"
                    placeholder="Your name"
                    value={commentName}
                    onChange={(e) => setCommentName(e.target.value)}
                    className="w-full h-10 px-3 rounded-2xl bg-luxury-800 border border-white/5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary"
                  />
                )}

                <textarea
                  required
                  maxLength={2000}
                  placeholder="Join the discussion..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  className="w-full p-3 rounded-2xl bg-luxury-800 border border-white/5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary resize-none"
                />

                <button
                  type="submit"
                  disabled={submitCommentMutation.isPending}
                  className="h-9 px-5 self-end btn-oio-pill disabled:opacity-50 text-white text-xs font-bold rounded-full flex items-center justify-center cursor-pointer shadow-md"
                >
                  {submitCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
                </button>
              </form>

              {/* Comments list */}
              <div className="flex flex-col gap-4">
                {comments.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No comments yet. Start the conversation!</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment._id} className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl flex flex-col gap-3" itemProp="review" itemScope itemType="https://schema.org/Review">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-brand-primary/20 flex items-center justify-center text-xs font-black uppercase text-brand-primary">
                            {(comment.user?.username || comment.guestName || 'Guest').slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white" itemProp="author" itemScope itemType="https://schema.org/Person"><span itemProp="name">{comment.user?.username || comment.guestName || 'Guest'}</span></p>
                            <p className="text-[9px] text-slate-500 mt-0.5">{new Date(comment.createdAt).toLocaleDateString()}</p>
                            <meta itemProp="datePublished" content={comment.createdAt} />
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            aria-label="Like comment"
                            onClick={() => {
                              if (!user) router.push('/auth');
                              else likeCommentMutation.mutate(comment._id);
                            }}
                            className={`flex items-center gap-1 text-[10px] font-bold ${comment.likes?.includes(user?._id) ? 'text-brand-primary' : 'text-slate-400 hover:text-white'} transition`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" /> {comment.likes?.length || 0}
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveReplyBox(activeReplyBox === comment._id ? null : comment._id)}
                            className="text-[10px] text-slate-400 hover:text-white font-bold transition"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed pl-1" itemProp="reviewBody">{comment.content}</p>

                      {/* Replies List */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="ml-2 sm:ml-6 pl-3 sm:pl-4 border-l border-white/5 flex flex-col gap-3 mt-1">
                          {comment.replies.map((reply) => (
                            <div key={reply._id} className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-brand-secondary/20 flex items-center justify-center text-[10px] font-black uppercase text-brand-secondary">
                                  {reply.user?.username ? reply.user.username.slice(0, 2) : 'U'}
                                </div>
                                <div>
                                  <span className="text-[11px] font-bold text-slate-200">{reply.user?.username || 'User'}</span>
                                  <span className="text-[8px] text-slate-500 ml-2">{new Date(reply.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <p className="text-xs text-slate-400 pl-8 leading-relaxed">{reply.content}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply Input Box */}
                      {activeReplyBox === comment._id && (
                        <div className="ml-2 sm:ml-6 pl-3 sm:pl-4 border-l border-white/5 mt-2 flex flex-col gap-2">
                          <textarea
                            placeholder={user ? "Write a reply..." : "Please log in to reply."}
                            disabled={!user}
                            value={replyText[comment._id] || ''}
                            onChange={(e) => setReplyText({ ...replyText, [comment._id]: e.target.value })}
                            rows={2}
                            className="w-full p-2.5 rounded-xl bg-luxury-800 border border-white/5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary resize-none"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveReplyBox(null)}
                              className="px-3 py-1 text-[10px] text-slate-400 hover:text-white font-bold rounded-lg transition"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddReply(comment._id)}
                              disabled={!user || !replyText[comment._id]?.trim()}
                              className="px-3.5 py-1 btn-oio-pill disabled:opacity-40 text-white text-[10px] font-bold rounded-full transition shadow-sm"
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
              </>
            )}

          </div>

        </div>
      </div>

      {!topOnly && (
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full flex flex-col gap-10">
        {recommendationsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-luxury-900 rounded-2xl border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          recommendationRows.map((section) => {
            if (section.items.length === 0) return null;
            const Icon = section.icon;
            return (
              <section key={section.id} className="flex flex-col gap-4 border-t border-white/5 pt-8">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <Icon className="w-5 h-5 text-brand-primary" /> {section.title}
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-6">
                  {section.items.map((item) => (
                    <GlassCard key={`${section.id}-${item.mediaType}-${item._id}`} item={item} type={item.mediaType} />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
      )}



    </div>
    </SideAdLayout>
  );
}
