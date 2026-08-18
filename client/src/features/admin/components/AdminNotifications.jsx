'use client';

import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import apiClient from '@/services/api/apiClient';
import { Bell, X, Languages, RefreshCw, AlertCircle } from 'lucide-react';

const CACHE_KEY = 'admin_notif_v2';
const CACHE_TTL = 5 * 60 * 1000;

function getCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch { return null; }
}
function setCache(data) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch (_) {}
}

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function AdminNotifications() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState({ top: 80, left: 16 });
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  const updateCoords = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setCoords({
      top: rect.bottom + 8,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - 352)),
    });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (open) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [open, updateCoords]);

  const fetchMissing = useCallback(async (force = false) => {
    const cached = !force ? getCache() : null;
    if (cached) { setAlerts(cached); return; }

    setLoading(true);
    try {
      const res = await apiClient.get('/api/media/dramas?status=Published&limit=50');
      const dramas = res.data.dramas || res.data || [];
      const missing = [];
      const now = new Date();

      // Check up to 15 dramas (performance)
      await Promise.all(
        dramas.slice(0, 15).map(async (drama) => {
          try {
            if ((drama.status || 'Published') !== 'Published') return;

            const detail = await apiClient.get(`/api/media/dramas/${drama.slug}`);
            const episodes = detail.data.episodes || [];
            const isOngoing = drama.subtitleSummary?.seasonStatus === 'Ongoing';

            episodes.forEach((ep) => {
              // Skip future episodes that haven't aired yet or episodes without an air date
              if (!ep.airDate || new Date(ep.airDate) > now) {
                return;
              }

              const subCount = ep.subtitleCount ?? ep.subtitles?.length ?? 0;
              if (subCount === 0) {
                missing.push({
                  id: ep._id || `${drama._id}-s${ep.seasonNumber}e${ep.episodeNumber}`,
                  dramaTitle: drama.title,
                  dramaSlug: drama.slug,
                  season: ep.seasonNumber || 1,
                  episode: ep.episodeNumber || '?',
                  episodeTitle: ep.episodeTitle || ep.title || '',
                  poster: drama.poster || null,
                });
              }
            });
          } catch (_) {}
        })
      );

      // Sort: most recent episodes first (higher ep numbers)
      missing.sort((a, b) => Number(b.episode) - Number(a.episode));

      setAlerts(missing);
      setCache(missing);

      // Show toast for first 2 new alerts
      if (missing.length > 0) {
        missing.slice(0, 2).forEach((alert, i) => {
          setTimeout(() => {
            setToasts(prev => {
              if (prev.find(t => t.id === alert.id)) return prev;
              return [...prev, alert];
            });
            setTimeout(() => {
              setToasts(prev => prev.filter(t => t.id !== alert.id));
            }, 7000);
          }, i * 700);
        });
      }
    } catch (err) {
      console.error('Notification fetch error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMissing();
    const iv = setInterval(() => fetchMissing(true), 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, [fetchMissing]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <>
      {/* Bell Button */}
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 hover:bg-white/10 transition text-slate-400 hover:text-white flex-shrink-0"
        title="Subtitle Notifications"
      >
        <Bell className="w-4 h-4" />
        {alerts.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[9px] font-black text-white flex items-center justify-center leading-none shadow-lg">
            {alerts.length > 99 ? '99+' : alerts.length}
          </span>
        )}
      </button>

      {/* Notification Panel — FIXED position, always fully visible */}
      {open && mounted && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[9999] w-[340px] max-h-[520px] bg-luxury-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-glass-neon flex flex-col overflow-hidden"
          style={{
            top: coords.top,
            left: coords.left,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/5 bg-gradient-to-r from-luxury-800 to-luxury-900 flex-shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-brand-secondary" />
                <p className="text-xs font-black text-white uppercase tracking-wider">Subtitle Alerts</p>
                {alerts.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-lg bg-brand-secondary/20 text-brand-secondary text-[9px] font-black uppercase tracking-wider">
                    {alerts.length} missing
                  </span>
                )}
              </div>
              <p className="text-[9px] text-slate-400 mt-0.5 ml-6 font-medium">Episodes without Sinhala subtitles</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchMissing(true)}
                disabled={loading}
                className="p-1.5 rounded-lg hover:bg-white/[0.05] border border-transparent hover:border-white/5 text-slate-400 hover:text-white transition"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-primary' : ''}`} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/[0.05] border border-transparent hover:border-white/5 text-slate-400 hover:text-white transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-grow">
            {loading && alerts.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-3 text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin text-brand-primary" />
                <p className="text-xs">Scanning episodes...</p>
              </div>
            ) : alerts.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-3">
                <span className="text-3xl">✅</span>
                <p className="text-xs text-slate-400 font-bold">All episodes have subtitles!</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] hover:border-l-2 hover:border-brand-primary pl-4 hover:pl-3.5 transition-all duration-200">
                    {/* Poster */}
                    {alert.poster ? (
                      <img
                        src={alert.poster}
                        alt=""
                        className="w-9 h-13 object-cover rounded-xl bg-white/5 border border-white/5 flex-shrink-0 shadow-sm"
                      />
                    ) : (
                      <div className="w-9 h-13 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center flex-shrink-0">
                        <Languages className="w-4 h-4 text-brand-primary" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-grow min-w-0">
                      <p className="text-[11px] font-semibold text-white leading-tight truncate">
                        {alert.dramaTitle}
                      </p>
                      <p className="text-[10px] font-black text-brand-secondary font-mono mt-0.5 tracking-wider uppercase">
                        Season {alert.season} · Ep {alert.episode}
                      </p>
                      {alert.episodeTitle && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium italic">
                          "{alert.episodeTitle}"
                        </p>
                      )}
                      <span className="inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded-md bg-brand-secondary/10 border border-brand-secondary/20 text-brand-secondary text-[8px] font-bold uppercase tracking-wider">
                        <Languages className="w-2.5 h-2.5" />
                        No Subtitles
                      </span>
                    </div>

                    {/* Action */}
                    <Link
                      href="/management/subtitles"
                      onClick={() => setOpen(false)}
                      className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white border border-brand-primary/25 hover:border-transparent text-[10px] font-black uppercase tracking-wider transition-all duration-300 shadow-sm"
                    >
                      Import
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {alerts.length > 0 && (
            <div className="px-4 py-3.5 border-t border-white/5 bg-luxury-950/40 flex-shrink-0">
              <Link
                href="/management/subtitles"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 w-full h-9 rounded-xl bg-gradient-to-r from-brand-primary/10 to-brand-secondary/10 hover:from-brand-primary hover:to-brand-secondary border border-brand-primary/20 hover:border-transparent text-brand-primary hover:text-white text-[10px] font-black uppercase tracking-wider transition-all duration-300 shadow-sm shadow-brand-primary/5 hover:shadow-brand-secondary/20"
              >
                <Languages className="w-3.5 h-3.5" />
                Go to Subtitle Import Panel
              </Link>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Toast Bubbles — top right corner */}
      {mounted && createPortal(
        <div className="fixed top-20 right-6 z-[9998] flex flex-col gap-3 items-end pointer-events-none">
          {toasts.map((toast, i) => (
            <div
              key={toast.id}
              className="pointer-events-auto flex items-center gap-3 px-4 py-3.5 bg-luxury-900/95 backdrop-blur-xl border border-brand-primary/20 rounded-2xl shadow-glass-neon w-[300px]"
              style={{ animation: 'toastIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
            >
              {toast.poster && (
                <img src={toast.poster} alt="" className="w-9 h-12 object-cover rounded-lg flex-shrink-0 shadow-md border border-white/5" />
              )}
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-secondary animate-pulse flex-shrink-0" />
                  <p className="text-[9px] font-black uppercase tracking-wider text-brand-secondary">Sub Needed</p>
                </div>
                <p className="text-xs font-bold text-white truncate leading-tight">{toast.dramaTitle}</p>
                <p className="text-[10px] text-brand-primary font-mono font-bold mt-0.5">
                  Season {toast.season} · Ep {toast.episode} — No subs yet
                </p>
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="p-1 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(32px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0)    scale(1); }
        }
      `}</style>
    </>
  );
}
