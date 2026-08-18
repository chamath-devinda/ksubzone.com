import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Download, Languages, Loader2, AlertCircle, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import apiClient from '@/services/api/apiClient';

export default function SubtitleManageModal({ isOpen, onClose, mediaId, label, onDeleteSuccess }) {
  const [subtitles, setSubtitles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchSubtitles = useCallback(async () => {
    if (!mediaId) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get(`/api/admin/subtitles?mediaId=${mediaId}`);
      setSubtitles(res.data);
    } catch (err) {
      setError('Failed to load subtitles for this media item.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [mediaId]);

  useEffect(() => {
    if (isOpen && mediaId) {
      fetchSubtitles();
    }
  }, [isOpen, mediaId, fetchSubtitles]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this subtitle? This action cannot be undone.')) {
      return;
    }
    setDeletingId(id);
    setError('');
    try {
      await apiClient.delete(`/api/admin/subtitles/${id}`);
      setSubtitles(prev => prev.filter(sub => sub._id !== id));
      onDeleteSuccess?.(); // Trigger parent refresh to update subtitle count badges
    } catch (err) {
      setError('Failed to delete subtitle. Please try again.');
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-luxury-900 border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[80vh]"
      >
        {/* Decorative ambient background blur */}
        <div className="absolute -left-12 -top-12 w-28 h-28 bg-brand-primary/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Languages className="w-5 h-5 text-brand-primary" /> Manage Subtitles
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Viewing all uploaded subtitles for <span className="text-brand-primary font-bold">{label}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchSubtitles}
              disabled={loading}
              className="p-2 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition disabled:opacity-50"
              title="Refresh List"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-brand-secondary/10 border border-brand-secondary/25 rounded-xl text-brand-secondary text-xs flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content list */}
        <div className="flex-1 overflow-y-auto pr-1 min-h-[250px] relative">
          {loading && subtitles.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-xs">
              <Loader2 className="w-8 h-8 animate-spin text-brand-primary mb-2" />
              <span>Fetching subtitles queue...</span>
            </div>
          ) : subtitles.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-center p-6 bg-white/[0.01] rounded-2xl border border-white/5">
              <AlertCircle className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-400">No Subtitles Uploaded</p>
              <p className="text-[10px] text-slate-500 max-w-xs mt-1">There are no translations (Sinhala/English) recorded for this episode yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {subtitles.map((sub) => (
                <div
                  key={sub._id}
                  className="p-4 bg-luxury-950/60 hover:bg-luxury-950 border border-white/5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-brand-primary/10 border border-brand-primary/20 text-brand-primary font-bold uppercase text-[9px] tracking-wider">
                        {sub.language}
                      </span>
                      <span className="text-[10px] text-slate-300 font-mono bg-white/5 px-1.5 py-0.5 rounded">
                        v{sub.version} ({sub.format})
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                        sub.approvalStatus === 'Approved'
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                          : sub.approvalStatus === 'Rejected'
                            ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                            : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'
                      }`}>
                        {sub.approvalStatus === 'Approved' ? (
                          <CheckCircle className="w-2.5 h-2.5" />
                        ) : sub.approvalStatus === 'Pending' ? (
                          <Clock className="w-2.5 h-2.5" />
                        ) : (
                          <X className="w-2.5 h-2.5" />
                        )}
                        {sub.approvalStatus}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 space-y-0.5 leading-relaxed">
                      <p className="truncate">
                        Uploader:{' '}
                        <span className="text-slate-200 font-semibold">
                          {sub.uploaderRole === 'Admin'
                            ? sub.adminUploader?.username || 'Admin'
                            : sub.uploader?.username || 'User'}
                        </span>{' '}
                        <span className="text-brand-primary font-mono text-[9px]">({sub.uploaderRole})</span>
                      </p>
                      {sub.releaseNotes && (
                        <p className="italic text-slate-500 line-clamp-1">Notes: {sub.releaseNotes}</p>
                      )}
                      <p className="text-slate-500 text-[9px]">
                        Uploaded on {new Date(sub.createdAt).toLocaleString()} • Downloads:{' '}
                        <span className="font-bold text-slate-400">{sub.downloads || 0}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 self-end sm:self-auto flex-shrink-0">
                    <a
                      href={sub.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl transition border border-white/5 flex items-center justify-center"
                      title="Download Subtitle File"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      disabled={deletingId === sub._id}
                      onClick={() => handleDelete(sub._id)}
                      className="p-2 bg-brand-secondary/10 hover:bg-brand-secondary/20 text-brand-secondary disabled:opacity-50 rounded-xl transition flex items-center justify-center"
                      title="Delete Subtitle"
                    >
                      {deletingId === sub._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
