import React, { useState, useEffect } from 'react';
import apiClient from '@/services/api/apiClient';
import { StatusBadge } from '../ui/StatusBadge';
import { Drawer } from '../ui/Drawer';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { resolveSubtitleDownloadUrl, isR2Subtitle } from '@/utils/subtitleUrl';
import {
  FileCheck2,
  Check,
  X,
  Eye,
  Trash2,
  UploadCloud,
  Search,
  RefreshCw,
  Sparkles,
  Download,
  Loader2,
  ExternalLink,
  Languages,
} from 'lucide-react';

export function SubtitleModerationQueue({ onOpenStudio }: { onOpenStudio?: (sub: any) => void }) {
  const [subtitles, setSubtitles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Pending' | 'Approved' | 'Rejected'>('Pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [storageFilter, setStorageFilter] = useState('All');

  // Preview Drawer
  const [previewSub, setPreviewSub] = useState<any | null>(null);
  const [previewLines, setPreviewLines] = useState<Array<{ id: number; time: string; text: string }>>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Replace Modal
  const [replaceSub, setReplaceSub] = useState<any | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);

  // Delete Confirm
  const [deleteSub, setDeleteSub] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Action status
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      // The PHP API exposes the moderation queue at /subtitles. Keep the
      // client on the canonical route so direct navigation and refresh work.
      const res = await apiClient.get('/api/admin/subtitles');
      const list = Array.isArray(res.data) ? res.data : (res.data?.subtitles || []);
      setSubtitles(list);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to fetch subtitle moderation queue' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  // Filter subtitles
  const filteredSubtitles = subtitles.filter((sub) => {
    const statusMatch = (sub.approvalStatus || 'Pending').toLowerCase() === activeTab.toLowerCase();
    if (!statusMatch) return false;

    if (storageFilter !== 'All') {
      const provider = (sub.storageProvider || 'supabase').toLowerCase();
      if (provider !== storageFilter.toLowerCase()) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const title = (sub.mediaTitle || sub.title || '').toLowerCase();
      const lang = (sub.language || '').toLowerCase();
      const uploader = (sub.uploaderName || '').toLowerCase();
      return title.includes(q) || lang.includes(q) || uploader.includes(q);
    }

    return true;
  });

  const handleApprove = async (id: string) => {
    setActionLoadingId(id);
    try {
      await apiClient.put(`/api/admin/subtitles/${id}/approve`, { status: 'Approved' });
      setSubtitles((prev) => prev.map((s) => (s._id === id ? { ...s, approvalStatus: 'Approved' } : s)));
      setMessage({ type: 'success', text: 'Subtitle approved and published successfully' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to approve subtitle' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoadingId(id);
    try {
      await apiClient.put(`/api/admin/subtitles/${id}/approve`, { status: 'Rejected' });
      setSubtitles((prev) => prev.map((s) => (s._id === id ? { ...s, approvalStatus: 'Rejected' } : s)));
      setMessage({ type: 'success', text: 'Subtitle rejected' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to reject subtitle' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteSub) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/admin/subtitles/${deleteSub._id}`);
      setSubtitles((prev) => prev.filter((s) => s._id !== deleteSub._id));
      setMessage({ type: 'success', text: 'Subtitle permanently deleted' });
      setDeleteSub(null);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete subtitle' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenPreview = async (sub: any) => {
    setPreviewSub(sub);
    setPreviewLoading(true);
    setPreviewLines([]);

    try {
      const downloadUrl = resolveSubtitleDownloadUrl(sub);
      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error('Could not fetch file contents');
      const text = await res.text();

      // Parse SRT blocks
      const blocks = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n\n');
      const parsed: Array<{ id: number; time: string; text: string }> = [];

      let seq = 1;
      for (const block of blocks.slice(0, 80)) {
        const lines = block.trim().split('\n');
        if (lines.length >= 2) {
          const timeIndex = lines[0].includes('-->') ? 0 : 1;
          const time = lines[timeIndex] || '';
          const subtitleText = lines.slice(timeIndex + 1).join(' ');
          if (time.includes('-->')) {
            parsed.push({ id: seq++, time, text: subtitleText });
          }
        }
      }
      setPreviewLines(parsed);
    } catch (err) {
      setPreviewLines([
        { id: 1, time: '00:00:00,000 --> 00:00:05,000', text: 'උපසිරැසි ගොනුව පූර්වදර්ශනය (preview) කිරීමට නොහැකි විය. ගොනුව බාගත කර පරීක්ෂා කරන්න.' },
      ]);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleReplaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceSub || !replaceFile) return;

    setIsReplacing(true);
    const formData = new FormData();
    formData.append('subtitle', replaceFile);

    try {
      const res = await apiClient.post(`/api/admin/subtitles/${replaceSub._id}/replace-file`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updated = res.data.subtitle;
      setSubtitles((prev) => prev.map((s) => (s._id === replaceSub._id ? { ...s, ...updated } : s)));
      setMessage({ type: 'success', text: 'Subtitle replaced successfully on R2. Download counts preserved!' });
      setReplaceSub(null);
      setReplaceFile(null);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to replace subtitle file' });
    } finally {
      setIsReplacing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-left w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-white flex items-center gap-2.5">
            <FileCheck2 className="w-7 h-7 text-[#9E57F6]" />
            Subtitle Moderation Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Review community uploads, verify sync quality, inspect live preview, or replace corrupt files
          </p>
        </div>

        <button
          onClick={fetchQueue}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/5 transition flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Queue
        </button>
      </div>

      {/* Feedback Alert */}
      {message && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-current hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Controls Bar: Tabs, Search & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-[#141418] border border-white/5">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-[#1A1A20] p-1 rounded-xl border border-white/5 self-start">
          {(['Pending', 'Approved', 'Rejected'] as const).map((tab) => {
            const count = subtitles.filter((s) => (s.approvalStatus || 'Pending').toLowerCase() === tab.toLowerCase()).length;
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-[#9E57F6] text-white shadow-[0_0_15px_rgba(158,87,246,0.3)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{tab}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Storage Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-grow sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search title, language, uploader..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#181820] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#9E57F6]"
            />
          </div>

          <select
            value={storageFilter}
            onChange={(e) => setStorageFilter(e.target.value)}
            className="bg-[#181820] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-[#9E57F6]"
          >
            <option value="All">All Storage</option>
            <option value="r2">Cloudflare R2</option>
            <option value="supabase">Supabase</option>
          </select>
        </div>
      </div>

      {/* Subtitles Queue Table */}
      <div className="rounded-2xl bg-[#141418] border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-[#181820] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Title / Release</th>
                <th className="py-3 px-3">Type / Ep</th>
                <th className="py-3 px-3">Language</th>
                <th className="py-3 px-3">Storage</th>
                <th className="py-3 px-3">Format</th>
                <th className="py-3 px-3">Uploader</th>
                <th className="py-3 px-3">Downloads</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#9E57F6]" />
                    <span>Loading queue items...</span>
                  </td>
                </tr>
              ) : filteredSubtitles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No subtitles found in {activeTab} queue.
                  </td>
                </tr>
              ) : (
                filteredSubtitles.map((sub) => {
                  const title = sub.mediaTitle || sub.title || 'Untitled';
                  const isEp = (sub.mediaType || '').toLowerCase() === 'episode' || sub.episodeNumber;
                  const isActionLoading = actionLoadingId === sub._id;
                  const downloadUrl = resolveSubtitleDownloadUrl(sub);

                  return (
                    <tr key={sub._id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white max-w-xs truncate">{title}</div>
                        {sub.releaseNotes && <div className="text-[11px] text-slate-500 truncate">{sub.releaseNotes}</div>}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        {isEp ? (
                          <span className="font-mono text-slate-300">
                            S{String(sub.seasonNumber || 1).padStart(2, '0')}E{String(sub.episodeNumber || 1).padStart(2, '0')}
                          </span>
                        ) : (
                          <span className="text-slate-400">Movie</span>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-medium text-white">{sub.language || 'Sinhala'}</span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <StatusBadge status={sub.storageProvider || 'supabase'} variant="storage" />
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <StatusBadge status={sub.format || 'srt'} variant="format" />
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-slate-400">
                        {sub.uploaderName || 'Staff'}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap font-mono font-bold text-white">
                        {(sub.downloads || 0).toLocaleString()}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Live Preview Button */}
                          <button
                            onClick={() => handleOpenPreview(sub)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
                            title="Live Subtitle Preview (Sanitized)"
                          >
                            <Eye className="w-4 h-4 text-sky-400" />
                          </button>

                          {/* Approve / Reject buttons */}
                          {activeTab !== 'Approved' && (
                            <button
                              onClick={() => handleApprove(sub._id)}
                              disabled={isActionLoading}
                              className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition"
                              title="Approve & Publish"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}

                          {activeTab !== 'Rejected' && (
                            <button
                              onClick={() => handleReject(sub._id)}
                              disabled={isActionLoading}
                              className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}

                          {/* Replace File */}
                          <button
                            onClick={() => {
                              setReplaceSub(sub);
                              setReplaceFile(null);
                            }}
                            className="p-1.5 rounded-lg text-purple-400 hover:bg-purple-500/10 transition"
                            title="Replace File on R2 (Preserve metrics)"
                          >
                            <UploadCloud className="w-4 h-4" />
                          </button>

                          {/* Direct Download Link */}
                          {downloadUrl && (
                            <a
                              href={downloadUrl}
                              download
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
                              title="Download File"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteSub(sub)}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition"
                            title="Delete Subtitle"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Subtitle Preview Drawer */}
      <Drawer
        isOpen={Boolean(previewSub)}
        onClose={() => setPreviewSub(null)}
        title={previewSub ? `${previewSub.mediaTitle || 'Subtitle'} Preview` : 'Preview'}
        subtitle="Safe, sanitized inspection of subtitle blocks and Sinhala Unicode rendering"
        width="xl"
      >
        {previewLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#9E57F6]" />
            <span>Parsing subtitle stream...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-white/5 text-xs text-slate-400">
              <span>Format: <strong className="text-white">.{previewSub?.format || 'srt'}</strong></span>
              <span>Language: <strong className="text-white">{previewSub?.language}</strong></span>
              <span>Encoding: <strong className="text-emerald-400">UTF-8 Normalized</strong></span>
            </div>

            <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {previewLines.map((line) => (
                <div key={line.id} className="p-3 rounded-xl bg-[#181820] border border-white/5 flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>#{line.id}</span>
                    <span className="text-slate-400">{line.time}</span>
                  </div>
                  <div className="text-sm font-medium text-white leading-relaxed font-sans">
                    {line.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Drawer>

      {/* Replace Subtitle File Modal */}
      <Modal
        isOpen={Boolean(replaceSub)}
        onClose={() => setReplaceSub(null)}
        title="Replace Subtitle File"
        subtitle="Upload a clean or re-timed subtitle file. The database ID, content relations, and download count will be strictly preserved."
        maxWidth="md"
      >
        <form onSubmit={handleReplaceSubmit} className="flex flex-col gap-4">
          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
            Target Title: <strong className="text-white">{replaceSub?.mediaTitle || replaceSub?.title}</strong>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">New Subtitle File (.srt, .vtt, .ass)</label>
            <input
              type="file"
              accept=".srt,.vtt,.ass"
              onChange={(e) => setReplaceFile(e.target.files?.[0] || null)}
              required
              className="file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#9E57F6] file:text-white hover:file:bg-[#8B3CE8] text-xs text-slate-400 cursor-pointer bg-[#181820] p-2 rounded-xl border border-white/10"
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={() => setReplaceSub(null)}
              disabled={isReplacing}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!replaceFile || isReplacing}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#9E57F6] hover:bg-[#8B3CE8] transition flex items-center gap-2 disabled:opacity-50"
            >
              {isReplacing && <Loader2 className="w-4 h-4 animate-spin" />}
              Replace on R2
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteSub)}
        onClose={() => setDeleteSub(null)}
        onConfirm={handleDelete}
        title="Permanently Delete Subtitle"
        message={`Are you sure you want to delete this subtitle release for "${deleteSub?.mediaTitle || deleteSub?.title}"? This will remove the file from storage and the database.`}
        confirmLabel="Delete Permanently"
        isDangerous={true}
        isLoading={isDeleting}
      />
    </div>
  );
}
