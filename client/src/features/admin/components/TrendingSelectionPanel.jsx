'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Flame, X, RefreshCw, Loader2 } from 'lucide-react';
import apiClient from '@/services/api/apiClient';
import { useToast } from '@/features/admin/components/Toast';

const PUBLIC_STATUSES = new Set(['Published', 'Upcoming']);

/**
 * Toggle the homepage "Trending Now" flag without going through the full
 * edit endpoint (which also bumps the "Latest" activity clock).
 */
export async function setTrendingSelection(mediaType, id, isTrending) {
  const res = await apiClient.put(`/api/admin/${mediaType}s/${id}`, { isTrending });
  return res?.data?.[mediaType] || res?.data?.item || null;
}

function selectionTime(item) {
  const parsed = Date.parse(item?.trendingSelectedAt || '');
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatSelectedAt(value) {
  const parsed = Date.parse(value || '');
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

/**
 * Lists every title currently flagged for "Trending Now" so admins can see
 * exactly what feeds the homepage row and remove stale selections quickly.
 */
export default function TrendingSelectionPanel({ mediaType, refreshKey = 0, onChange }) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingId, setPendingId] = useState(null);
  const label = mediaType === 'movie' ? 'movies' : 'dramas';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get(`/api/admin/${mediaType}s?status=All&trending=true&limit=100`);
      const list = res?.data?.[`${mediaType}s`] || [];
      const flagged = (Array.isArray(list) ? list : []).filter((item) => item?.isTrending);
      // Same priority as the homepage: newest explicit selection first.
      flagged.sort((a, b) => selectionTime(b) - selectionTime(a)
        || (Number(b.viewCount) || 0) - (Number(a.viewCount) || 0));
      setItems(flagged);
    } catch (err) {
      setError(err?.response?.data?.message || `Trending ${label} could not be loaded.`);
    } finally {
      setLoading(false);
    }
  }, [mediaType, label]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleRemove = async (item) => {
    if (pendingId) return;
    setPendingId(item._id);
    try {
      await setTrendingSelection(mediaType, item._id, false);
      setItems((current) => current.filter((entry) => entry._id !== item._id));
      onChange?.(item._id, false);
      toast.success(`Removed "${item.title}" from Trending Now.`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not update Trending Now.');
    } finally {
      setPendingId(null);
    }
  };

  const legacyCount = items.filter((item) => !item.trendingSelectedAt).length;

  return (
    <section
      aria-labelledby={`trending-panel-${mediaType}`}
      className="rounded-2xl border border-orange-500/15 bg-gradient-to-br from-orange-500/[0.06] to-transparent p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`trending-panel-${mediaType}`} className="flex items-center gap-2 text-sm font-extrabold text-slate-100">
            <Flame className="w-4 h-4 text-orange-400" aria-hidden="true" />
            Trending Now selection
            <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-300">
              {loading ? '…' : items.length}
            </span>
          </h2>
          <p className="mt-1 text-[11px] text-slate-400">
            Homepage shows the 10 newest selections across movies and dramas (Published/Upcoming only).
            {legacyCount > 0 && (
              <span className="text-amber-300"> {legacyCount} old flag{legacyCount !== 1 ? 's' : ''} without a selection date are listed last.</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-[11px] font-bold text-slate-300 transition hover:bg-white/[0.05] disabled:opacity-50"
          aria-label={`Reload trending ${label}`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
          Reload
        </button>
      </div>

      {error ? (
        <div role="alert" className="mt-3 flex items-center gap-3 text-xs text-rose-300">
          {error}
          <button type="button" onClick={load} className="font-bold underline">Retry</button>
        </div>
      ) : loading && items.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">
          No {label} selected. Use the flame button in the table or “Show in Trending Now” in the edit form.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const selectedAt = formatSelectedAt(item.trendingSelectedAt);
            const isPublic = PUBLIC_STATUSES.has(item.status);
            return (
              <li
                key={item._id}
                className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#11131A] p-2"
              >
                <img
                  src={item.poster || 'https://placehold.co/40x60?text=No+Poster'}
                  alt=""
                  className="h-12 w-9 flex-shrink-0 rounded-md object-cover"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-100" title={item.title}>{item.title}</p>
                  <p className={`truncate text-[10px] ${selectedAt ? 'text-slate-400' : 'text-amber-300'}`}>
                    {selectedAt ? `Selected ${selectedAt}` : 'Old flag · no selection date'}
                  </p>
                  {!isPublic && (
                    <p className="text-[10px] font-bold text-slate-500">Hidden on homepage ({item.status || 'Draft'})</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(item)}
                  disabled={Boolean(pendingId)}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
                  aria-label={`Remove ${item.title} from Trending Now`}
                  title="Remove from Trending Now"
                >
                  {pendingId === item._id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    : <X className="w-3.5 h-3.5" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
