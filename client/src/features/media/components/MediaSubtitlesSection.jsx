'use client';

import React from 'react';
import Link from 'next/link';
import { Download, CheckCircle2, CalendarClock, ShieldCheck } from 'lucide-react';
import AdSlot from '@/components/ads/AdSlot';

export default function MediaSubtitlesSection({
  type,
  media,
  seasons = [],
  selectedSeason,
  setSelectedSeason,
  activeSeasonDoc,
  activeEpisodes = [],
  episodeSubtitlesById = {},
  sortedSubtitles = [],
  standaloneSubtitles = [],
  sortSubtitleFiles,
  mediaPermalink,
  displayTitle,
  downloadAlert,
  downloadingId,
  handleDownloadSubtitle,
  getId
}) {
  return (
    <div id="subtitles" className="flex flex-col gap-6 w-full">
      {/* Drama Episode Subtitle Center */}
      {type === 'Drama' && seasons.length > 0 && (
        <div className="flex flex-col gap-4 text-left">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary">Subtitle Center</p>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Episodes & Downloads</h2>
            </div>
          </div>

          {/* Season selection pills */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {seasons.map((s) => (
              <button
                key={s._id}
                onClick={() => setSelectedSeason(s.seasonNumber)}
                className={`h-9 px-4 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                  selectedSeason === s.seasonNumber
                    ? 'btn-glass-purple text-white shadow-md'
                    : 'btn-glass-subtle text-slate-300'
                }`}
              >
                Season {s.seasonNumber}
              </button>
            ))}
          </div>

          {/* Season description info */}
          {activeSeasonDoc && (
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                {activeSeasonDoc.seasonDescription ||
                  `Season ${selectedSeason} subtitle files are organized episode by episode below.`}
              </p>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-emerald-300">
                  {activeEpisodes.reduce(
                    (count, ep) => count + ((episodeSubtitlesById[ep._id] || []).length > 0 ? 1 : 0),
                    0
                  )}{' '}
                  Ready
                </span>
                <span className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1">
                  {activeEpisodes.length} Episodes
                </span>
              </div>
            </div>
          )}

          {/* Next Episode Release Banner (Ongoing dramas) */}
          {activeEpisodes.length > 0 &&
            (() => {
              const now = new Date();
              const futureEp = activeEpisodes.find((ep) => ep.airDate && new Date(ep.airDate) > now);
              if (!futureEp) return null;
              const nextDate = new Date(futureEp.airDate);
              const formattedDate = nextDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });
              const daysUntil = Math.ceil((nextDate - now) / (1000 * 60 * 60 * 24));

              return (
                <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-fuchsia-500/10 p-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_50%,rgba(139,92,246,0.12),transparent_60%)]" />
                  <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                    <CalendarClock className="w-5 h-5 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-violet-400 mb-0.5">
                      Next Episode Coming
                    </p>
                    <p className="text-sm font-bold text-white">
                      Episode {futureEp.episodeNumber}
                      {futureEp.episodeTitle &&
                        futureEp.episodeTitle.toLowerCase() !== `episode ${futureEp.episodeNumber}`.toLowerCase() &&
                        ` — ${futureEp.episodeTitle}`}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{formattedDate}</p>
                  </div>
                  <div className="flex-shrink-0 text-left sm:text-right">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[10px] font-black uppercase tracking-wider">
                      {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
                    </span>
                  </div>
                </div>
              );
            })()}

          {/* Episode listing blocks */}
          <div className="flex flex-col gap-3.5">
            {activeEpisodes.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center border border-dashed border-white/10 rounded-2xl">
                No episodes added for this season yet.
              </p>
            ) : (
              activeEpisodes.map((ep, index) => {
                const summary = ep.subtitleSummary || {};
                const directEpisodeFiles = episodeSubtitlesById[getId(ep._id)] || [];
                const taggedTitleFiles = sortedSubtitles.filter(
                  (sub) =>
                    Number(sub?.seasonNumber || selectedSeason) === Number(selectedSeason) &&
                    Number(sub?.episodeNumber) === Number(ep.episodeNumber)
                );
                const episodeFiles = sortSubtitleFiles(
                  [...directEpisodeFiles, ...taggedTitleFiles].filter(
                    (sub, index, arr) => sub && arr.findIndex((item) => item?._id === sub?._id) === index
                  )
                );
                const hasSubtitles = episodeFiles.length > 0 || (summary.totalSubtitles || 0) > 0 || (Number(ep?.subtitleCount) || 0) > 0;
                const episodeUrl = `/drama/${mediaPermalink}/season-${selectedSeason}/episode-${ep.episodeNumber}`;
                const formattedEpisode = `E${String(ep.episodeNumber).padStart(2, '0')}`;

                return (
                  <React.Fragment key={ep._id}>
                  <div
                    className="rounded-2xl sm:rounded-3xl border border-white/10 bg-luxury-900/60 p-4 sm:p-5 transition-all duration-200 hover:border-brand-primary/40 hover:bg-luxury-900/90 shadow-lg flex flex-col gap-3.5"
                  >
                    {/* Top Row: Episode Info & Direct Download */}
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                      {/* Left: Info */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="min-w-0 flex flex-col justify-center">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={episodeUrl}
                              className="text-sm sm:text-base font-black text-white hover:text-brand-primary transition truncate"
                            >
                              {ep.episodeTitle &&
                              typeof ep.episodeTitle === 'string' &&
                              ep.episodeTitle.toLowerCase() !== `episode ${ep.episodeNumber}`.toLowerCase()
                                ? `Episode ${ep.episodeNumber}: ${ep.episodeTitle}`
                                : `Episode ${ep.episodeNumber}`}
                            </Link>
                            {hasSubtitles ? (
                              <span className="px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Ready
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/15 text-amber-300 text-[9px] font-black uppercase tracking-wider">
                                Waiting
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                            {ep.episodeDescription ||
                              `Season ${selectedSeason} Episode ${ep.episodeNumber} Sinhala & English subtitle downloads.`}
                          </p>
                          {ep.airDate &&
                            (() => {
                              const airDateObj = new Date(ep.airDate);
                              const isUpcoming = airDateObj > new Date();
                              const formatted = airDateObj.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              });
                              return isUpcoming ? (
                                <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-black uppercase tracking-wider text-brand-secondary">
                                  <CalendarClock className="w-3 h-3" /> Coming {formatted}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                                  <CalendarClock className="w-3 h-3" /> Aired {formatted}
                                </span>
                              );
                            })()}
                        </div>
                      </div>

                      {/* Right: Primary Download Button */}
                      <div className="flex flex-shrink-0 items-center justify-end w-full sm:w-auto gap-2">
                        {hasSubtitles ? (
                          <Link
                            href={episodeUrl}
                            className="w-full sm:w-auto h-10 px-5 rounded-full btn-oio-pill text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
                          >
                            <Download className="w-4 h-4" /> {formattedEpisode} සිංහල උපසිරැසිය
                          </Link>
                        ) : (
                          <button
                            disabled
                            className="w-full sm:w-auto h-10 px-5 rounded-full bg-white/5 border border-white/10 text-slate-500 text-xs font-bold uppercase flex items-center justify-center gap-2 cursor-not-allowed"
                          >
                            <Download className="w-4 h-4 opacity-40" /> Pending Release
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* A content-break placement preserves every episode's
                      direct-download action while using the long list space. */}
                  {index === 3 && activeEpisodes.length > 4 && (
                    <AdSlot slotId="subtitle_list_banner" className="my-2" />
                  )}
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Subtitle Downloads list (Movie & Full Title Subtitles) */}
      {!(type === 'Drama' && standaloneSubtitles.length === 0) && (
        <div className="flex flex-col gap-5 text-left pt-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary">Official Subtitles</p>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {type === 'Drama' ? 'Full Title Subtitles' : 'Download Sinhala Subtitles'}
              </h2>
            </div>
            {standaloneSubtitles.length > 0 && (
              <span className="px-3 py-1 rounded-full bg-brand-primary/20 border border-brand-primary/40 text-brand-primary text-[10px] font-black uppercase">
                {standaloneSubtitles.length} Subtitles Ready
              </span>
            )}
          </div>

          {standaloneSubtitles.length === 0 ? (
            <div className="p-8 bg-white/[0.02] border border-white/10 rounded-3xl text-center text-xs text-slate-400">
              No Sinhala subtitles uploaded for this title yet.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {standaloneSubtitles.map((sub) => {
                const downloadTitle = (displayTitle || 'Subtitle')
                  .trim()
                  .replace(/[^a-zA-Z0-9]+/g, '_')
                  .replace(/^_+|_+$/g, '');
                let customFileName = '';
                const subLang = sub.language || 'Sinhala';
                if (media.type === 'movie' || (!sub.seasonNumber && !sub.episodeNumber)) {
                  customFileName = `${downloadTitle}_${subLang}.${sub.format || 'srt'}`;
                } else {
                  const formattedSeason = String(sub.seasonNumber || 1).padStart(2, '0');
                  const formattedEpisode = String(sub.episodeNumber || 1).padStart(2, '0');
                  customFileName = `${downloadTitle}_S${formattedSeason}_E${formattedEpisode}_${subLang}.${
                    sub.format || 'srt'
                  }`;
                }

                return (
                  <div
                    key={sub._id}
                    className="p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-luxury-900/70 border border-white/10 flex flex-col items-center justify-center text-center gap-4 shadow-2xl backdrop-blur-xl"
                  >
                    {/* Format Badges */}
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-brand-primary/20 border border-brand-primary/40 text-brand-primary text-[10px] font-black uppercase">
                        .{sub.format?.toUpperCase() || 'SRT'} FORMAT
                      </span>
                      <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase">
                        සිංහල උපසිරැසි (UTF-8)
                      </span>
                      <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[10px] font-extrabold uppercase">
                        1080p / 720p SYNC
                      </span>
                    </div>

                    {/* Release Compatibility Notice */}
                    <p className="text-xs sm:text-sm font-semibold text-slate-300 max-w-lg leading-relaxed">
                      {sub.releaseNotes
                        ? `ලබා දී ඇති උපසිරැසිය ${sub.releaseNotes} පිටපත් සඳහා ගැලපේ.`
                        : `ලබා දී ඇති උපසිරැසිය 1080p. WEBRip. 2CH. x265. HEVC / HDRip පිටපත් සඳහා ගැලපේ.`}
                    </p>

                    {/* Download Alert if error occurs */}
                    {downloadAlert && (
                      <div className="w-full max-w-md p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 text-center animate-shake">
                        <span>⚠️ {downloadAlert}</span>
                      </div>
                    )}

                    {/* Big Brand Gradient Download Button */}
                    <button
                      type="button"
                      disabled={downloadingId === sub._id}
                      onClick={() => handleDownloadSubtitle(sub._id, sub.fileUrl, customFileName, sub)}
                      className="group relative w-full max-w-md min-h-14 rounded-full px-6 btn-oio-pill disabled:opacity-60 text-white font-black text-sm sm:text-base uppercase tracking-wide sm:tracking-wider flex items-center justify-center gap-3 text-center cursor-pointer"
                    >
                      <Download
                        className={`w-5 h-5 ${
                          downloadingId === sub._id ? 'animate-bounce' : 'group-hover:-translate-y-0.5'
                        } transition-transform`}
                      />
                      <span>
                        {downloadingId === sub._id
                          ? 'බාගත වෙමින් පවතී...'
                          : `${sub.language || 'SINHALA'} උපසිරැසිය (DOWNLOAD)`}
                      </span>
                    </button>

                    {/* Download stats & trust badges */}
                    <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
                      <span className="font-bold text-slate-300">{sub.downloads || 0} Downloads</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified Subtitle
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-slate-400 font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Cloudflare Secured
                      </span>
                      <span>•</span>
                      <span>
                        By{' '}
                        {sub.uploaderRole === 'Admin'
                          ? sub.adminUploader?.username || 'Admin'
                          : sub.uploader?.username || 'Contributor'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
