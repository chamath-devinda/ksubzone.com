'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/api/apiClient';
import { 
  Download, ShieldCheck, CheckCircle2, BadgeCheck, Send,
  MessageSquare, ExternalLink, Tv, ChevronLeft, ChevronRight, AlertCircle
} from 'lucide-react';
import SeoTags from '@/components/seo/SeoTags';
import GlassCard from '@/components/ui/GlassCard';
import { permalinkSlug } from '@/utils/slug';
import { useAuth } from '@/features/auth/hooks/useAuth';
import Detail from '@/features/media/pages/Detail';

export default function Watch({ initialDramaData }) {
  const { slug, seasonPart, episodePart } = useParams();
  const router = useRouter();
  const { user, admin } = useAuth();

  const seasonNumber = Number(String(seasonPart || '').replace('season-', ''));
  const episodeNumber = Number(String(episodePart || '').replace('episode-', ''));

  // Comment state
  const [commentName, setCommentName] = useState('');
  const [commentMessage, setCommentMessage] = useState('');
  const [commentStatus, setCommentStatus] = useState({ loading: false, success: false, error: '' });
  
  // 1. Fetch Drama Details
  const { data: dramaData, isLoading: dramaLoading } = useQuery({
    queryKey: ['dramaDetails', slug],
    queryFn: async () => {
      const res = await apiClient.get(`/api/media/dramas/${slug}`);
      return res.data;
    },
    initialData: initialDramaData,
    staleTime: 0,
    refetchOnMount: 'always'
  });

  const drama = dramaData?.drama;
  const seasons = dramaData?.seasons || [];
  const episodes = dramaData?.episodes || [];
  const getId = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value._id || value.$oid || String(value);
  };

  // Identify active season and episode
  const activeSeasonDoc = seasons.find(s => s.seasonNumber === seasonNumber);
  const activeEpisodeDoc = episodes.find(
    ep => getId(ep.seasonId) === getId(activeSeasonDoc?._id) && ep.episodeNumber === episodeNumber
  );

  // 2. Fetch Approved Subtitles for this episode
  const { data: subtitles = [], refetch: refetchSubtitles } = useQuery({
    queryKey: ['episodeSubtitles', activeEpisodeDoc?._id],
    queryFn: async () => {
      const res = await apiClient.get(`/api/subtitles/media/${activeEpisodeDoc._id}`);
      return res.data;
    },
    enabled: !!activeEpisodeDoc?._id
  });

  // 3. Fetch Comments
  const targetCommentId = activeEpisodeDoc?._id || drama?._id;
  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['episodeComments', targetCommentId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/media/comments/target/${targetCommentId}`);
      return res.data;
    },
    enabled: !!targetCommentId,
    staleTime: 1000 * 60
  });

  // 4. Fetch Related Dramas for the bottom grid
  const { data: relatedDramas = [] } = useQuery({
    queryKey: ['relatedDramas', drama?._id],
    queryFn: async () => {
      const res = await apiClient.get('/api/media/dramas?limit=6&sort=popular');
      return (res.data?.dramas || []).filter(d => d._id !== drama?._id).slice(0, 5);
    },
    enabled: !!drama?._id,
    staleTime: 1000 * 60 * 10
  });

  const sortedSubtitles = [...subtitles].sort((a, b) => {
    const aSinhala = a?.language?.toLowerCase() === 'sinhala' ? 0 : 1;
    const bSinhala = b?.language?.toLowerCase() === 'sinhala' ? 0 : 1;
    return aSinhala - bSinhala;
  });

  const mainSubtitle = sortedSubtitles[0] || null;

  // Prev / Next episodes
  const prevEp = episodes.find(
    ep => getId(ep.seasonId) === getId(activeSeasonDoc?._id) && ep.episodeNumber === episodeNumber - 1
  );
  const nextEp = episodes.find(
    ep => getId(ep.seasonId) === getId(activeSeasonDoc?._id) && ep.episodeNumber === episodeNumber + 1
  );
  const dramaPermalink = drama ? permalinkSlug(drama) : slug;

  const handleDownloadSubtitle = (subId, fileUrl, customFileName) => {
    try {
      const baseUrl = apiClient.defaults.baseURL === '/' ? '' : apiClient.defaults.baseURL;
      const downloadUrl = `${baseUrl}/api/subtitles/${subId}/download?name=${encodeURIComponent(customFileName)}`;
      window.location.href = downloadUrl;

      setTimeout(() => {
        refetchSubtitles?.();
      }, 1500);
    } catch (err) {
      console.error(err);
      const absoluteFileUrl = fileUrl.startsWith('/') && apiClient.defaults.baseURL !== '/'
        ? `${apiClient.defaults.baseURL}${fileUrl}`
        : fileUrl;
      window.open(absoluteFileUrl, '_blank');
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentMessage.trim()) return;

    setCommentStatus({ loading: true, success: false, error: '' });
    try {
      const authorName = (user?.username || admin?.username || commentName.trim()) || 'K-Drama Fan';
      await apiClient.post('/api/media/comments', {
        targetId: targetCommentId,
        content: commentMessage.trim(),
        guestName: authorName,
        rating: 5
      });
      setCommentMessage('');
      setCommentStatus({ loading: false, success: true, error: '' });
      refetchComments();
      setTimeout(() => setCommentStatus(prev => ({ ...prev, success: false })), 4000);
    } catch (err) {
      console.error('Comment error:', err);
      setCommentStatus({ loading: false, success: false, error: 'Could not post comment. Please try again.' });
    }
  };

  if (dramaLoading) {
    return (
      <div className="min-h-screen w-full bg-luxury-950 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Subtitles...</span>
      </div>
    );
  }

  if (!drama || !activeEpisodeDoc) {
    return (
      <div className="min-h-screen w-full bg-luxury-950 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500" />
        <h2 className="text-xl font-bold text-white">Requested Episode Not Found</h2>
        <p className="text-slate-400 text-xs max-w-sm">This episode is not imported yet or has not aired.</p>
        <Link href={`/drama/${slug}`} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-bold text-white transition">
          Back to Drama
        </Link>
      </div>
    );
  }

  const formattedSeason = `S${String(seasonNumber).padStart(2, '0')}`;
  const formattedEpisode = `E${String(episodeNumber).padStart(2, '0')}`;
  const year = drama.releaseDate ? new Date(drama.releaseDate).getFullYear() : '2026';
  const totalDownloads = subtitles.reduce((acc, s) => acc + (s.downloads || 0), 0) || 128;

  // Primary Uploader Info
  const primaryUploaderName = mainSubtitle?.uploaderRole === 'Admin' 
    ? (mainSubtitle?.adminUploader?.username || 'KSubZone Team')
    : (mainSubtitle?.uploader?.username || 'Verified Translator');

  return (
    <div className="w-full bg-transparent text-slate-200 min-h-screen pb-20 selection:bg-rose-600 selection:text-white relative">
      
      {/* SEO & Meta Tags */}
      <SeoTags
        title={`${drama.title} ${year} [${formattedSeason} : ${formattedEpisode}] Sinhala Subtitles | ${activeEpisodeDoc.episodeTitle || 'සිංහල උපසිරසි'} | KSubZone`}
        description={activeEpisodeDoc.episodeDescription || `Download Sinhala and English subtitles for ${drama.title} ${formattedSeason}${formattedEpisode}.`}
        canonical={`https://www.ksubzone.com/drama/${dramaPermalink}/season-${seasonNumber}/episode-${episodeNumber}`}
      />

      {/* Keep the complete drama presentation above the episode download area. */}
      <Detail type="Drama" initialData={dramaData} topOnly />

      {/* Match the episode content to the same right-hand column used above. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
          <div className="hidden md:block" aria-hidden="true" />
          <div id="episode-download" className="md:col-span-3 w-full flex flex-col gap-7">
        <div className="flex flex-col gap-7">
          {/* Prominent Download Section */}
          <div className="flex flex-col items-center justify-center text-center gap-4 py-4 w-full">
          
          {/* Release Compatibility Notice */}
          <p className="text-xs sm:text-sm font-semibold text-slate-300 max-w-lg leading-relaxed">
            {mainSubtitle?.releaseNotes 
              ? `ලබා දී ඇති උපසිරැසිය ${mainSubtitle.releaseNotes} පිටපත් සඳහා ගැලපේ.`
              : `ලබා දී ඇති උපසිරැසිය 1080p. WEBRip. 2CH. x265. HEVC / HDRip පිටපත් සඳහා ගැලපේ.`}
          </p>

          {/* Big Brand Gradient Download Button */}
          {subtitles.length > 0 ? (
            <button
              onClick={() => {
                const sub = mainSubtitle || subtitles[0];
                const cleanTitle = (drama.title || 'Subtitle').trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                const subLang = sub.language || 'Sinhala';
                const customFileName = `${cleanTitle}_${formattedSeason}_${formattedEpisode}_${subLang}.${sub.format || 'srt'}`;
                handleDownloadSubtitle(sub._id, sub.fileUrl, customFileName);
              }}
              className="group relative w-full max-w-md h-14 rounded-full bg-gradient-to-r from-brand-primary via-purple-600 to-brand-secondary hover:from-brand-primary hover:to-purple-600 text-white font-black text-base uppercase tracking-wider flex items-center justify-center gap-3 shadow-xl shadow-brand-primary/30 hover:shadow-brand-primary/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border border-white/20"
            >
              <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
              <span>සිංහල උපසිරැසිය (DOWNLOAD)</span>
            </button>
          ) : (
            <div className="w-full max-w-md p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-slate-400 text-xs font-bold">
              මෙම කොටස සඳහා උපසිරැසි නිකුත් වෙමින් පවතී (Pending Release)
            </div>
          )}

          {/* Download Count */}
          <span className="text-xs font-bold text-slate-400">
            {totalDownloads} Downloads
          </span>

          {/* Verified Cloudflare Badge */}
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/[0.02] border border-white/10 mt-1">
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> VERIFIED
            </span>
            <span className="h-3 w-[1px] bg-white/10" />
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
              <ShieldCheck className="w-4 h-4 text-amber-400" /> Cloudflare Secured
            </span>
          </div>

          {/* Multiple Subtitles Variant List (if more than 1) */}
          {subtitles.length > 1 && (
            <div className="w-full max-w-md flex flex-col gap-2 mt-3 pt-3 border-t border-white/10">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Alternative Formats & Translators</p>
              {subtitles.map((sub) => (
                <button
                  key={sub._id}
                  onClick={() => {
                    const cleanTitle = (drama.title || 'Subtitle').trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                    const subLang = sub.language || 'Sinhala';
                    const customFileName = `${cleanTitle}_${formattedSeason}_${formattedEpisode}_${subLang}_v${sub.version}.${sub.format || 'srt'}`;
                    handleDownloadSubtitle(sub._id, sub.fileUrl, customFileName);
                  }}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-brand-primary/20 border border-white/10 text-xs font-bold text-white transition"
                >
                  <span className="flex items-center gap-2">
                    <Download className="w-3.5 h-3.5 text-brand-primary" />
                    {sub.language} ({(sub.format || 'srt').toUpperCase()}) v{sub.version}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    By {sub.uploaderRole === 'Admin' ? 'Admin' : sub.uploader?.username || 'Translator'}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Telegram Channel CTA Banner */}
          <div className="w-full max-w-md p-4 rounded-2xl bg-gradient-to-r from-sky-500/10 via-blue-500/5 to-transparent border border-sky-500/20 flex items-center justify-between gap-3 mt-2 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center flex-shrink-0 text-sky-400">
                <Send className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-white truncate">KSubZone Official Telegram</p>
                <p className="text-[10px] text-sky-300/80 mt-0.5">Instant release alerts & Sinhala subtitles</p>
              </div>
            </div>
            <a
              href="https://t.me/ksubzone"
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold flex items-center gap-1.5 transition flex-shrink-0"
            >
              Join <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          </div>
        </div>

        {/* ─── 3-PILL EPISODE NAVIGATION ─── */}
        <div className="w-full max-w-xl mx-auto flex items-center justify-between gap-2 p-1.5 rounded-2xl bg-luxury-900/80 border border-white/10 backdrop-blur-xl shadow-lg mt-2">
          {prevEp ? (
            <button
              onClick={() => router.push(`/drama/${dramaPermalink}/season-${seasonNumber}/episode-${prevEp.episodeNumber}`)}
              className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition flex items-center justify-center gap-1"
            >
              <ChevronLeft className="w-4 h-4 text-brand-primary" />
              <span>කලින් කොටස</span>
            </button>
          ) : (
            <div className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-slate-600 flex items-center justify-center gap-1 pointer-events-none">
              <ChevronLeft className="w-4 h-4 opacity-40" />
              <span>කලින් කොටස</span>
            </div>
          )}

          <Link
            href={`/drama/${dramaPermalink}#subtitles`}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-black text-white bg-gradient-to-r from-brand-primary/30 to-brand-secondary/30 hover:from-brand-primary/50 hover:to-brand-secondary/50 border border-brand-primary/40 transition flex items-center justify-center text-center shadow-sm"
          >
            සියලුම කොටස්
          </Link>

          {nextEp ? (
            <button
              onClick={() => router.push(`/drama/${dramaPermalink}/season-${seasonNumber}/episode-${nextEp.episodeNumber}`)}
              className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition flex items-center justify-center gap-1"
            >
              <span>ඊළඟ කොටස</span>
              <ChevronRight className="w-4 h-4 text-brand-primary" />
            </button>
          ) : (
            <div className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-slate-600 flex items-center justify-center gap-1 pointer-events-none">
              <span>ඊළඟ කොටස</span>
              <ChevronRight className="w-4 h-4 opacity-40" />
            </div>
          )}
        </div>

        {/* ─── UPLOADER PROFILE CARD (උපසිරැසි ගැන්වීම) ─── */}
        <div className="flex flex-col items-center justify-center text-center gap-3 pt-6 border-t border-white/[0.07]">
          <span className="text-xs font-black uppercase tracking-widest text-slate-400">
            උපසිරැසි ගැන්වීම
          </span>
          <div className="flex flex-col items-center">
            <h3 className="text-base font-black text-white inline-flex items-center gap-1.5 font-display">
              {primaryUploaderName}
              <BadgeCheck className="w-4 h-4 text-white fill-sky-500" strokeWidth={2.5} aria-label="Verified" />
            </h3>
            <span className="text-[11px] text-slate-400 mt-0.5 font-semibold">
              KSubZone Verified Subtitle Contributor
            </span>
          </div>
        </div>

        {/* ─── COMMENTS SECTION (LEAVE A REPLY) ─── */}
        <div className="flex flex-col gap-6 pt-8 border-t border-white/[0.07] text-left">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 font-display">
              <MessageSquare className="w-5 h-5 text-brand-primary" /> Leave a Reply ({comments.length})
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Leave a comment (No sign up required)
            </p>
          </div>

          {/* Comment Form */}
          <form onSubmit={handleCommentSubmit} className="flex flex-col gap-3">
            {!user && !admin && (
              <input
                type="text"
                placeholder="Your Name (e.g. Kasun Fernando)"
                value={commentName}
                onChange={(e) => setCommentName(e.target.value)}
                className="w-full h-11 px-4 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary focus:bg-white/[0.06] transition"
              />
            )}
            <textarea
              rows={3}
              placeholder="Write your message or feedback about this Sinhala subtitle..."
              value={commentMessage}
              onChange={(e) => setCommentMessage(e.target.value)}
              required
              className="w-full p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary focus:bg-white/[0.06] transition resize-none"
            />
            <div className="flex items-center justify-between gap-4">
              <button
                type="submit"
                disabled={commentStatus.loading}
                className="h-10 px-6 rounded-xl bg-gradient-to-r from-brand-primary to-purple-600 hover:from-purple-600 hover:to-brand-primary disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 transition shadow-lg shadow-brand-primary/25"
              >
                <Send className="w-3.5 h-3.5" />
                {commentStatus.loading ? 'Posting...' : 'Post Comment'}
              </button>
              {commentStatus.success && (
                <span className="text-xs text-emerald-400 font-bold">Comment posted successfully!</span>
              )}
              {commentStatus.error && (
                <span className="text-xs text-rose-400 font-bold">{commentStatus.error}</span>
              )}
            </div>
          </form>

          {/* Comments List */}
          <div className="flex flex-col gap-3 mt-2">
            {comments.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6 border border-dashed border-white/10 rounded-2xl">
                No comments yet. Be the first to leave a comment!
              </p>
            ) : (
              comments.map((c) => (
                <div key={c._id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      {c.user?.username || c.guestName || 'K-Drama Fan'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Recently'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{c.content}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ─── RELATED TV SERIES GRID ─── */}
        {relatedDramas.length > 0 && (
          <div className="flex flex-col gap-5 pt-10 border-t border-white/[0.07] text-left">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 font-display">
                <Tv className="w-5 h-5 text-brand-primary" /> Related TV Series
              </h2>
              <Link
                href="/dramas"
                className="text-xs font-bold text-brand-primary hover:text-brand-secondary flex items-center gap-1 transition"
              >
                Explore More <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {relatedDramas.map((item) => (
                <GlassCard key={item._id} item={item} type="drama" />
              ))}
            </div>
          </div>
        )}

          </div>
        </div>
      </div>

    </div>
  );
}
