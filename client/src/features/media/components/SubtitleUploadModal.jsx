import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Upload, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import apiClient from '@/services/api/apiClient';
import confetti from 'canvas-confetti';
import { useAuth } from '@/features/auth/hooks/useAuth';

const EMPTY_META = {};

export default function SubtitleUploadModal({ isOpen, onClose, mediaId, mediaType, targetMeta = EMPTY_META, onUploadSuccess }) {
  const { user, admin } = useAuth();
  const [file, setFile] = useState(null);
  const [language, setLanguage] = useState('Sinhala');
  const [version, setVersion] = useState('1.0');
  const [seasonStatus] = useState('Ongoing');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) setError('');
  }

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      const ext = selected.name.split('.').pop().toLowerCase();
      if (!['srt', 'vtt', 'ass'].includes(ext)) {
        setError('Unsupported file. Please upload SRT, VTT, or ASS.');
        setFile(null);
        return;
      }
      setFile(selected);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please select a subtitle file.'); return; }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('subtitle', file);
    formData.append('mediaId', mediaId);
    formData.append('mediaType', mediaType);
    formData.append('language', language);
    formData.append('version', version);
    formData.append('releaseNotes', releaseNotes);
    formData.append('seasonStatus', seasonStatus);
    if (targetMeta.seasonNumber) formData.append('seasonNumber', targetMeta.seasonNumber);
    if (targetMeta.episodeNumber) formData.append('episodeNumber', targetMeta.episodeNumber);

    try {
      const endpoint = admin ? '/api/admin/subtitles/upload' : '/api/subtitles/upload';
      await apiClient.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

      setSuccess(true);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });

      setTimeout(() => {
        setSuccess(false);
        setFile(null);
        setReleaseNotes('');
        onUploadSuccess?.();
        onClose();
      }, 1000);
    } catch (err) {
      const serverMsg = err.response?.data?.message || '';
      const diag = err.response?.data?.diagnostics;
      let errorText = serverMsg || 'Error uploading subtitle. Please try again.';
      if (diag) errorText += ` [uploads_exists:${diag.uploads_dir_exists}, writable:${diag.uploads_dir_writable}]`;
      setError(errorText);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal — compact, no scroll */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-sm bg-luxury-900 border border-white/10 rounded-2xl shadow-glass-neon z-10 overflow-hidden"
      >
        {/* Glow accent */}
        <div className="absolute -left-10 -top-10 w-24 h-24 bg-brand-primary/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 relative z-10">
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-wider">Upload Subtitle</h2>
            <p className="text-[9px] text-slate-500 mt-0.5 font-medium">
              {targetMeta.label ? targetMeta.label : (mediaType === 'Episode' ? `S${targetMeta.seasonNumber || 1} · E${targetMeta.episodeNumber || 1}` : 'Drama subtitle')}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <CheckCircle2 className="w-14 h-14 text-emerald-400 mb-3 animate-bounce" />
            <h3 className="text-sm font-bold text-white mb-1">Subtitle Submitted!</h3>
            <p className="text-[11px] text-slate-400 max-w-xs">
              {admin ? 'Published immediately.' : 'Now in moderation review queue.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-4 py-3 flex flex-col gap-2.5 relative z-10">
            {error && (
              <div className="p-2.5 bg-brand-secondary/10 border border-brand-secondary/30 rounded-xl text-brand-secondary text-[11px] font-semibold">
                {error}
              </div>
            )}

            {/* File pick — inline row instead of tall drop zone */}
            <div>
              <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 mb-1 block">Subtitle File</label>
              <label className="relative flex items-center gap-3 p-2.5 rounded-xl border border-dashed border-white/10 hover:border-brand-primary/50 bg-white/[0.02] cursor-pointer transition group">
                <input
                  type="file"
                  accept=".srt,.vtt,.ass"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center group-hover:bg-brand-primary/20 transition">
                  {file ? <FileText className="w-4 h-4 text-brand-primary" /> : <Upload className="w-4 h-4 text-slate-400" />}
                </div>
                <div className="flex-grow min-w-0">
                  {file ? (
                    <>
                      <p className="text-xs font-semibold text-white truncate">{file.name}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-slate-300 font-medium">Click to browse file</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">SRT · VTT · ASS (max 5MB)</p>
                    </>
                  )}
                </div>
              </label>
            </div>

            {/* Language + Version in one row */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 mb-1 block">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-xl border border-white/5 bg-luxury-800 text-xs text-white focus:outline-none focus:border-brand-primary"
                >
                  <option value="Sinhala">Sinhala</option>
                  <option value="English">English</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 mb-1 block">Version</label>
                <input
                  type="text"
                  placeholder="1.0 (WEB-DL)"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-xl border border-white/5 bg-luxury-800 text-xs text-white focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>

            {/* Season / Episode badges — show-only, no extra space */}
            {mediaType === 'Episode' && (
              <div className="flex items-center gap-2">
                <span className="text-[9px] uppercase font-black tracking-widest text-slate-500">Target:</span>
                <span className="px-2 py-0.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[10px] font-black font-mono">
                  S{targetMeta.seasonNumber || 1}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[10px] font-black font-mono">
                  E{targetMeta.episodeNumber || 1}
                </span>
              </div>
            )}

            {/* Release notes — single line input instead of textarea */}
            <div>
              <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 mb-1 block">Release Notes (Optional)</label>
              <input
                type="text"
                placeholder="e.g. NF WEB-DL, synced to v1.0..."
                value={releaseNotes}
                onChange={(e) => setReleaseNotes(e.target.value)}
                className="w-full h-8 px-2.5 rounded-xl border border-white/5 bg-luxury-800 text-xs text-white focus:outline-none focus:border-brand-primary"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-9 mt-0.5 bg-brand-primary hover:bg-brand-primary/80 disabled:bg-slate-700 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-brand-primary/20"
            >
              {loading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</>
              ) : (
                admin ? '⚡ Publish Subtitle' : '📤 Submit Subtitle'
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>,
    document.body
  );
}
