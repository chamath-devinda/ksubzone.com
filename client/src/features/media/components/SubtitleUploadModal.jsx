import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Upload, FileText, CheckCircle2, Loader2, Copy, ExternalLink, Cloud, Check } from 'lucide-react';
import apiClient from '@/services/api/apiClient';
import confetti from 'canvas-confetti';
import { useAuth } from '@/features/auth/hooks/useAuth';

const EMPTY_META = {};

export default function SubtitleUploadModal({
  isOpen,
  onClose,
  mediaId: mediaIdProp,
  mediaType: mediaTypeProp,
  targetMeta = EMPTY_META,
  onUploadSuccess,
  target,
  onSuccess
}) {
  const { user, admin } = useAuth();
  const resolvedTargetMeta = target || targetMeta;
  const mediaId = mediaIdProp || resolvedTargetMeta.mediaId;
  const mediaType = mediaTypeProp || resolvedTargetMeta.mediaType || 'Episode';
  const uploadSuccessCallback = onUploadSuccess || onSuccess;

  const [file, setFile] = useState(null);
  const [language, setLanguage] = useState('Sinhala');
  const [version, setVersion] = useState('1.0');
  const [seasonStatus] = useState('Ongoing');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [uploadedResult, setUploadedResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setError('');
      setUploadedResult(null);
      setUploadProgress(0);
    }
  }

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      const ext = selected.name.split('.').pop().toLowerCase();
      if (!['srt', 'vtt', 'ass', 'zip'].includes(ext)) {
        setError('Unsupported file format. Please upload .srt, .vtt, .ass, or .zip.');
        setFile(null);
        return;
      }
      if (selected.size > 10 * 1024 * 1024) {
        setError('File is too large. Maximum allowed size is 10 MB.');
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
    setUploadProgress(10);

    const formData = new FormData();
    formData.append('subtitle', file);
    formData.append('mediaId', mediaId);
    formData.append('mediaType', mediaType);
    formData.append('language', language);
    formData.append('version', version);
    formData.append('releaseNotes', releaseNotes);
    formData.append('seasonStatus', seasonStatus);
    if (resolvedTargetMeta.seasonNumber) formData.append('seasonNumber', resolvedTargetMeta.seasonNumber);
    if (resolvedTargetMeta.episodeNumber) formData.append('episodeNumber', resolvedTargetMeta.episodeNumber);

    try {
      const endpoint = admin ? '/api/admin/subtitles/upload' : '/api/subtitles/upload';
      const res = await apiClient.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(Math.min(percent, 95));
          }
        }
      });

      setUploadProgress(100);
      setUploadedResult(res.data?.subtitle || { fileUrl: '', storageProvider: 'r2' });
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      uploadSuccessCallback?.();
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

  const handleCopyUrl = () => {
    if (!uploadedResult?.fileUrl) return;
    navigator.clipboard.writeText(uploadedResult.fileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-sm bg-luxury-900 border border-white/10 rounded-2xl shadow-glass-neon z-10 overflow-hidden"
      >
        <div className="absolute -left-10 -top-10 w-24 h-24 bg-brand-primary/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white uppercase tracking-wider">Upload Subtitle</h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold">
                <Cloud className="w-2.5 h-2.5" /> Cloudflare R2
              </span>
            </div>
            <p className="text-[9px] text-slate-500 mt-0.5 font-medium">
              {resolvedTargetMeta.label ? resolvedTargetMeta.label : (mediaType === 'Episode' ? `S${resolvedTargetMeta.seasonNumber || 1} · E${resolvedTargetMeta.episodeNumber || 1}` : 'Title subtitle')}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {uploadedResult ? (
          <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2 animate-bounce" />
            <h3 className="text-sm font-bold text-white mb-0.5">Subtitle Uploaded Successfully!</h3>
            <p className="text-[11px] text-slate-400 max-w-xs mb-3">
              {admin ? 'Published directly to Cloudflare R2.' : 'Stored on R2. Pending moderator review.'}
            </p>

            {uploadedResult.fileUrl && (
              <div className="w-full p-2.5 rounded-xl bg-white/[0.03] border border-white/10 mb-3 text-left">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Direct Public URL</span>
                  <span className="text-[9px] text-emerald-400 font-bold">files.ksubzone.com</span>
                </div>
                <div className="text-[10px] text-slate-300 font-mono break-all line-clamp-2 bg-black/40 p-1.5 rounded-lg border border-white/5">
                  {uploadedResult.fileUrl}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    {copied ? 'Copied!' : 'Copy URL'}
                  </button>
                  <a
                    href={uploadedResult.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-1.5 px-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Test Download
                  </a>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full h-9 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-4 py-3 flex flex-col gap-2.5 relative z-10">
            {error && (
              <div className="p-2.5 bg-brand-secondary/10 border border-brand-secondary/30 rounded-xl text-brand-secondary text-[11px] font-semibold">
                {error}
              </div>
            )}

            {/* File pick */}
            <div>
              <label className="text-[9px] uppercase font-black tracking-widest text-slate-400 mb-1 block">Subtitle File</label>
              <label className="relative flex items-center gap-3 p-2.5 rounded-xl border border-dashed border-white/10 hover:border-brand-primary/50 bg-white/[0.02] cursor-pointer transition group">
                <input
                  type="file"
                  accept=".srt,.vtt,.ass,.zip"
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
                      <p className="text-[9px] text-slate-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB · Format: {file.name.split('.').pop().toUpperCase()}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-slate-300 font-medium">Click to select subtitle</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">SRT · VTT · ASS · ZIP (Max 10MB)</p>
                    </>
                  )}
                </div>
              </label>
            </div>

            {/* Language + Version */}
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

            {/* Target details */}
            {mediaType === 'Episode' && (
              <div className="flex items-center gap-2">
                <span className="text-[9px] uppercase font-black tracking-widest text-slate-500">Target:</span>
                <span className="px-2 py-0.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[10px] font-black font-mono">
                  S{resolvedTargetMeta.seasonNumber || 1}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[10px] font-black font-mono">
                  E{resolvedTargetMeta.episodeNumber || 1}
                </span>
              </div>
            )}

            {/* Release notes */}
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

            {/* Storage Destination indicator */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5 text-[10px]">
              <span className="text-slate-400 font-medium">Storage Destination:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Cloud className="w-3 h-3" /> Cloudflare R2
              </span>
            </div>

            {/* Upload progress bar */}
            {loading && (
              <div className="w-full">
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Uploading to Cloudflare R2...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 mt-1 btn-oio-pill disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-full flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
            >
              {loading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading to R2...</>
              ) : (
                admin ? '⚡ Publish to Cloudflare R2' : '📤 Submit Subtitle'
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>,
    document.body
  );
}
