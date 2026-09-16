'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import apiClient from '@/services/api/apiClient';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import AdminTopBar from '@/features/admin/components/AdminTopBar';
import ModalDrawer from '@/features/admin/components/ModalDrawer';
import { useToast } from '@/features/admin/components/Toast';
import { useSiteContent } from '@/hooks/useSiteContent';
import { resolveSubtitleDownloadUrl, isR2Subtitle } from '@/utils/subtitleUrl';
import {
  Film, Languages, Check, X, Clipboard, Download,
  Edit2, Trash2, Eye, Sparkles, Wand2, Loader2, AlertCircle, UploadCloud, FileText,
  Cloud, Database, Copy, ExternalLink
} from 'lucide-react';

export default function SubtitleManager() {
  const { admin } = useAuth();
  const { content } = useSiteContent();
  const toast = useToast();
  const enableTranslation = content.ai?.enableTranslation !== false;
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [subtitles, setSubtitles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Note inputs
  const [moderatorNotes, setModeratorNotes] = useState({});
  const [processingId, setProcessingId] = useState(null);

  // Tabs & Storage filter
  const [filterTab, setFilterTab] = useState('Pending');
  const [storageFilter, setStorageFilter] = useState('All'); // 'All', 'r2', 'supabase', 'local'
  const [copiedUrlId, setCopiedUrlId] = useState(null);

  // View/Edit/Replace states
  const [selectedSubtitle, setSelectedSubtitle] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // 'edit', 'view', 'ai_translate', 'replace_file'
  const [replaceFileInput, setReplaceFileInput] = useState(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const [editForm, setEditForm] = useState({
    language: 'Sinhala',
    version: '1.0',
    format: 'srt',
    seasonNumber: '',
    episodeNumber: '',
    seasonStatus: 'Ongoing',
    approvalStatus: 'Pending',
    releaseNotes: '',
    moderatorNotes: ''
  });

  const [previewContent, setPreviewContent] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  // AI Translator States
  const [aiSourceText, setAiSourceText] = useState('');
  const [aiTranslatedText, setAiTranslatedText] = useState('');
  const [isAiTranslating, setIsAiTranslating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [translationEngine, setTranslationEngine] = useState('gemini');

  const handleOpenReplace = (sub) => {
    setSelectedSubtitle(sub);
    setReplaceFileInput(null);
    setActiveModal('replace_file');
  };

  const handleReplaceFileSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSubtitle || !replaceFileInput) {
      toast.error('Please select a subtitle file (.srt, .vtt, .ass)');
      return;
    }

    setIsReplacing(true);
    const formData = new FormData();
    formData.append('subtitle', replaceFileInput);

    try {
      const res = await apiClient.post(`/api/admin/subtitles/${selectedSubtitle._id}/replace-file`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const updatedSub = res.data.subtitle;
      setSubtitles(prev => prev.map(s => s._id === selectedSubtitle._id ? { ...s, ...updatedSub } : s));
      toast.success('Subtitle file replaced and updated successfully!');
      setActiveModal(null);
      setSelectedSubtitle(null);
      setReplaceFileInput(null);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to replace subtitle file.');
    } finally {
      setIsReplacing(false);
    }
  };

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/admin/subtitles');
      const list = Array.isArray(res.data) ? res.data : res.data?.subtitles;
      setSubtitles(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error('Failed to fetch subtitles queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateStatus = async (id, status) => {
    setProcessingId(id);
    const notes = moderatorNotes[id] || '';
    
    try {
      await apiClient.put(`/api/admin/subtitles/${id}/approve`, {
        status,
        moderatorNotes: notes
      });
      
      setSubtitles(prev => prev.map(sub => 
        sub._id === id ? { ...sub, approvalStatus: status, moderatorNotes: notes } : sub
      ));
      
      setModeratorNotes(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });

      toast.success(`Subtitle has been ${status.toLowerCase()} successfully.`);
    } catch (err) {
      toast.error('Failed to update subtitle approval state.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleNoteChange = (id, val) => {
    setModeratorNotes(prev => ({
      ...prev,
      [id]: val
    }));
  };

  const handleOpenView = (sub) => {
    setSelectedSubtitle(sub);
    setActiveModal('view');
    setPreviewContent('');
    setPreviewLoading(true);

    fetch(sub.fileUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load file');
        return res.text();
      })
      .then((text) => {
        setPreviewContent(text);
      })
      .catch(() => {
        setPreviewContent('Unable to load subtitle text preview directly. You can download the file to inspect.');
      })
      .finally(() => {
        setPreviewLoading(false);
      });
  };

  const handleOpenEdit = (sub) => {
    setSelectedSubtitle(sub);
    setEditForm({
      language: sub.language || 'Sinhala',
      version: sub.version || '1.0',
      format: sub.format || 'srt',
      seasonNumber: sub.seasonNumber || '',
      episodeNumber: sub.episodeNumber || '',
      seasonStatus: sub.seasonStatus || 'Ongoing',
      approvalStatus: sub.approvalStatus || 'Pending',
      releaseNotes: sub.releaseNotes || '',
      moderatorNotes: sub.moderatorNotes || ''
    });
    setActiveModal('edit');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSubtitle) return;

    try {
      await apiClient.put(`/api/admin/subtitles/${selectedSubtitle._id}`, editForm);
      toast.success('Subtitle details updated.');
      setSubtitles(prev => prev.map(sub => 
        sub._id === selectedSubtitle._id ? { ...sub, ...editForm } : sub
      ));
      setActiveModal(null);
    } catch (err) {
      toast.error('Failed to update subtitle.');
    }
  };

  const handleDeleteSubtitle = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this subtitle?')) return;

    try {
      await apiClient.delete(`/api/admin/subtitles/${id}`);
      toast.success('Subtitle deleted.');
      setSubtitles(prev => prev.filter(sub => sub._id !== id));
    } catch (err) {
      toast.error('Failed to delete subtitle.');
    }
  };

  const handleAiTranslate = async () => {
    if (!aiSourceText.trim()) {
      setAiError('Please enter text to translate.');
      return;
    }

    setIsAiTranslating(true);
    setAiError('');

    try {
      const res = await apiClient.post('/api/subtitles/translate', {
        text: aiSourceText,
        sourceLanguage: 'English',
        targetLanguage: 'Sinhala',
        engine: translationEngine
      });

      if (res.data?.translatedText) {
        setAiTranslatedText(res.data.translatedText);
      } else {
        setAiError('No translation returned.');
      }
    } catch (err) {
      setAiError(err.response?.data?.message || 'Translation service failed.');
    } finally {
      setIsAiTranslating(false);
    }
  };

  const filteredSubtitles = subtitles.filter(sub => {
    const statusMatch = filterTab === 'All' || sub.approvalStatus === filterTab;
    if (!statusMatch) return false;
    if (storageFilter === 'All') return true;

    const provider = (
      sub.storageProvider ||
      sub.storage_provider ||
      (isR2Subtitle(sub) ? 'r2' : (sub.fileUrl?.includes('supabase.co') ? 'supabase' : 'supabase'))
    ).toLowerCase();

    return provider === storageFilter.toLowerCase();
  });

  return (
    <div className="admin-shell min-h-screen bg-[var(--studio-bg)] text-[var(--studio-text)] flex flex-col lg:flex-row">
      <AdminSidebar mobileOpen={mobileOpen} onCloseMobileNav={() => setMobileOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <AdminTopBar onOpenMobileNav={() => setMobileOpen(true)} />

        <main className="admin-main flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-[1560px] w-full mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--studio-border)]">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[var(--studio-text)] font-display tracking-tight">Subtitle Queue & Moderation</h1>
              <p className="text-xs text-[var(--studio-muted)] mt-1">Review Sinhala and English subtitle uploads, verify formatting, and approve for live catalog</p>
            </div>
            {enableTranslation && (
              <button
                type="button"
                onClick={() => setActiveModal('ai_translate')}
                className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-[9999px] text-xs shadow-sm transition active:scale-95 flex-shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" /> AI Translate
              </button>
            )}
          </div>

          {/* Filters Row: Status + Storage Provider */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 bg-[var(--studio-raised)] p-1 rounded-[9999px] border border-[var(--studio-border)] w-fit">
              {['Pending', 'Approved', 'Rejected', 'All'].map((status) => {
                const count = status === 'All' ? subtitles.length : subtitles.filter(s => s.approvalStatus === status).length;
                const isActive = filterTab === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFilterTab(status)}
                    className={`px-3.5 py-1.5 rounded-[9999px] text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-[#2563EB] text-white shadow-sm'
                        : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
                    }`}
                  >
                    <span>{status}</span>
                    {count > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-[9999px] text-[10px] font-mono font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-[var(--studio-surface)] text-[var(--studio-muted)]'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Storage Provider Filter */}
            <div className="flex items-center gap-1 bg-[var(--studio-raised)] p-1 rounded-[9999px] border border-[var(--studio-border)] text-xs">
              <span className="text-[10px] uppercase font-bold text-[var(--studio-muted)] px-2.5">Storage:</span>
              {[
                { id: 'All', label: 'All' },
                { id: 'r2', label: 'Cloudflare R2' },
                { id: 'supabase', label: 'Supabase Legacy' }
              ].map((prov) => {
                const isActive = storageFilter === prov.id;
                return (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => setStorageFilter(prov.id)}
                    className={`px-3 py-1.5 rounded-[9999px] text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-[#2563EB] text-white shadow-sm'
                        : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
                    }`}
                  >
                    {prov.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subtitles List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-16 text-[var(--studio-muted)] text-xs">Checking pending subtitle uploads...</div>
            ) : filteredSubtitles.length === 0 ? (
              <div className="studio-card p-12 rounded-[16px] border border-[var(--studio-border)] text-center flex flex-col items-center justify-center gap-2">
                <AlertCircle className="w-6 h-6 text-[var(--studio-muted)] mb-1" />
                <span className="text-xs text-[var(--studio-muted)]">No subtitles found matching filter criteria.</span>
              </div>
            ) : (
              filteredSubtitles.map((sub) => {
                const publicUrl = resolveSubtitleDownloadUrl(sub);
                const isR2 = isR2Subtitle(sub);
                return (
                <div 
                  key={sub._id}
                  className="studio-card p-5 rounded-[16px] border border-[var(--studio-border)] flex flex-col lg:flex-row justify-between gap-5 transition-all"
                >
                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-[9999px] bg-[#2563EB]/15 border border-[#2563EB]/30 text-[#60A5FA] font-bold uppercase text-[10px] tracking-wider">
                        {sub.language}
                      </span>
                      {isR2 ? (
                        <span className="px-2.5 py-0.5 rounded-[9999px] bg-[#14B8A6]/15 border border-[#14B8A6]/30 text-[#14B8A6] font-bold text-[10px] flex items-center gap-1">
                          <Cloud className="w-3 h-3" /> Storage: Cloudflare R2
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-[9999px] bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B] font-bold text-[10px] flex items-center gap-1">
                          <Database className="w-3 h-3" /> Storage: Supabase Legacy
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-[9999px] bg-[var(--studio-raised)] text-[var(--studio-muted)] border border-[var(--studio-border)] font-mono text-[10px] uppercase">
                        Format: {sub.format}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-[9999px] bg-[var(--studio-raised)] text-[var(--studio-muted)] border border-[var(--studio-border)] font-mono text-[10px]">
                        v{sub.version}
                      </span>
                      {(sub.seasonNumber || sub.episodeNumber) && (
                        <span className="px-2.5 py-0.5 rounded-[9999px] bg-[#2563EB]/15 border border-[#2563EB]/25 text-[#60A5FA] font-mono text-[10px]">
                          S{sub.seasonNumber || 1} E{sub.episodeNumber || 1}
                        </span>
                      )}
                      {sub.seasonStatus && (
                        <span className="px-2.5 py-0.5 rounded-[9999px] bg-[#10B981]/15 border border-[#10B981]/25 text-[#10B981] font-mono text-[10px]">
                          {sub.seasonStatus}
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="text-[10px] text-[var(--studio-muted)] font-mono uppercase tracking-wider">Media target:</p>
                      <p className="text-xs font-bold text-[var(--studio-text)] mt-0.5 flex items-center gap-1.5 truncate">
                        <Film className="w-3.5 h-3.5 text-[#2563EB] flex-shrink-0" />
                        <span>{sub.mediaTitle || `${sub.mediaType} ID: ${sub.mediaId}`}</span>
                      </p>
                    </div>

                    {publicUrl && (
                      <div className="flex items-center gap-2 p-2 rounded-[12px] bg-[var(--studio-raised)] border border-[var(--studio-border)] w-fit max-w-full">
                        <span className="text-[10px] text-[var(--studio-muted)] font-mono truncate max-w-sm sm:max-w-md">
                          {publicUrl}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(publicUrl);
                            setCopiedUrlId(sub._id);
                            setTimeout(() => setCopiedUrlId(null), 2000);
                            toast.success('Direct public URL copied!');
                          }}
                          className="p-1 rounded-md hover:bg-white/10 text-[var(--studio-muted)] hover:text-[var(--studio-text)] transition flex-shrink-0"
                          title="Copy public URL"
                        >
                          {copiedUrlId === sub._id ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3 text-[var(--studio-muted)]" />}
                        </button>
                      </div>
                    )}

                    {sub.releaseNotes && (
                      <div className="bg-[var(--studio-raised)] p-3 rounded-[12px] border border-[var(--studio-border)] text-xs text-[var(--studio-muted)]">
                        <span className="font-bold text-[var(--studio-text)] block mb-0.5">Uploader Notes:</span>
                        {sub.releaseNotes}
                      </div>
                    )}

                    <div className="text-[11px] text-[var(--studio-muted)] flex gap-4 flex-wrap">
                      <span>
                        Uploader:
                        <b className="text-[var(--studio-text)]"> {sub.uploaderRole === 'Admin' ? sub.adminUploader?.username || 'Admin' : sub.uploader?.username || 'Unknown'}</b>
                        <b className="ml-1 text-[#2563EB]">({sub.uploaderRole || 'User'})</b>
                      </span>
                      <span>Submitted: <b className="text-[var(--studio-text)]">{new Date(sub.createdAt).toLocaleString()}</b></span>
                    </div>
                  </div>

                  {/* Actions Panel */}
                  <div className="flex flex-col justify-between w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-[var(--studio-border)] pt-4 lg:pt-0 lg:pl-5 space-y-3.5">
                    {sub.approvalStatus === 'Pending' && (
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--studio-muted)]">Moderator Remarks</label>
                        <input
                          type="text"
                          placeholder="Add reason or notes..."
                          value={moderatorNotes[sub._id] || sub.moderatorNotes || ''}
                          onChange={(e) => handleNoteChange(sub._id, e.target.value)}
                          className="w-full px-3 py-1.5 bg-[var(--studio-raised)] border border-[var(--studio-border)] rounded-[12px] text-[var(--studio-text)] text-xs outline-none focus:border-[#2563EB]"
                        />
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <a
                          href={publicUrl || sub.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="flex-1 p-2 bg-[var(--studio-raised)] hover:bg-white/[0.08] text-[var(--studio-text)] rounded-[12px] text-xs font-semibold text-center border border-[var(--studio-border)] transition flex items-center justify-center gap-1.5"
                          title="Download File"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => handleOpenView(sub)}
                          className="flex-1 p-2 bg-[#2563EB]/15 hover:bg-[#2563EB]/25 text-[#60A5FA] border border-[#2563EB]/30 rounded-[12px] text-xs font-semibold transition flex items-center justify-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(sub)}
                          className="flex-1 p-2 bg-[var(--studio-raised)] hover:bg-white/[0.08] text-[var(--studio-text)] border border-[var(--studio-border)] rounded-[12px] text-xs font-semibold transition flex items-center justify-center gap-1.5"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenReplace(sub)}
                          className="flex-1 p-2 bg-[#14B8A6]/15 hover:bg-[#14B8A6]/25 text-[#14B8A6] border border-[#14B8A6]/30 rounded-[12px] text-xs font-semibold transition flex items-center justify-center gap-1.5"
                          title="Re-upload or fix broken subtitle file"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Replace</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubtitle(sub._id)}
                          className="p-2 bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] border border-[#EF4444]/30 rounded-[12px] text-xs font-semibold transition flex items-center justify-center"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      {sub.approvalStatus === 'Pending' && (
                        <div className="flex gap-2 border-t border-[var(--studio-border)] pt-2 mt-1">
                          <button
                            type="button"
                            disabled={processingId === sub._id}
                            onClick={() => handleUpdateStatus(sub._id, 'Approved')}
                            className="flex-grow p-2 bg-[#10B981]/15 hover:bg-[#10B981]/25 text-[#10B981] border border-[#10B981]/30 rounded-[12px] text-xs font-bold transition flex items-center justify-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            type="button"
                            disabled={processingId === sub._id}
                            onClick={() => handleUpdateStatus(sub._id, 'Rejected')}
                            className="flex-grow p-2 bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] border border-[#EF4444]/30 rounded-[12px] text-xs font-bold transition flex items-center justify-center gap-1.5"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
            )}
          </div>
        </main>
      </div>

      {/* Edit Modal */}
      <ModalDrawer
        isOpen={activeModal === 'edit'}
        onClose={() => { setActiveModal(null); setSelectedSubtitle(null); }}
        title="Edit Subtitle Details"
        size="lg"
      >
        {selectedSubtitle && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="bg-[var(--studio-surface)] border border-[var(--studio-border)] rounded-[16px] p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--studio-muted)] uppercase tracking-wider mb-1.5">Language</label>
                  <input
                    type="text"
                    value={editForm.language}
                    onChange={e => setEditForm({ ...editForm, language: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--studio-raised)] border border-[var(--studio-border)] rounded-[12px] text-xs text-[var(--studio-text)] outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--studio-muted)] uppercase tracking-wider mb-1.5">Version</label>
                  <input
                    type="text"
                    value={editForm.version}
                    onChange={e => setEditForm({ ...editForm, version: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--studio-raised)] border border-[var(--studio-border)] rounded-[12px] text-xs text-[var(--studio-text)] outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--studio-muted)] uppercase tracking-wider mb-1.5">Format</label>
                  <input
                    type="text"
                    value={editForm.format}
                    onChange={e => setEditForm({ ...editForm, format: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--studio-raised)] border border-[var(--studio-border)] rounded-[12px] text-xs text-[var(--studio-text)] outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--studio-muted)] uppercase tracking-wider mb-1.5">Season No</label>
                  <input
                    type="number"
                    value={editForm.seasonNumber}
                    onChange={e => setEditForm({ ...editForm, seasonNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--studio-raised)] border border-[var(--studio-border)] rounded-[12px] text-xs text-[var(--studio-text)] outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--studio-muted)] uppercase tracking-wider mb-1.5">Episode No</label>
                  <input
                    type="number"
                    value={editForm.episodeNumber}
                    onChange={e => setEditForm({ ...editForm, episodeNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--studio-raised)] border border-[var(--studio-border)] rounded-[12px] text-xs text-[var(--studio-text)] outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--studio-muted)] uppercase tracking-wider mb-1.5">Approval Status</label>
                  <select
                    value={editForm.approvalStatus}
                    onChange={e => setEditForm({ ...editForm, approvalStatus: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--studio-raised)] border border-[var(--studio-border)] rounded-[12px] text-xs text-[var(--studio-text)] outline-none focus:border-[#2563EB]"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--studio-muted)] uppercase tracking-wider mb-1.5">Release Notes</label>
                <textarea
                  rows="2"
                  value={editForm.releaseNotes}
                  onChange={e => setEditForm({ ...editForm, releaseNotes: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--studio-raised)] border border-[var(--studio-border)] rounded-[12px] text-xs text-[var(--studio-text)] outline-none focus:border-[#2563EB]"
                  placeholder="Notes about sync, rips, or translator info..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--studio-border)]">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-[12px] border border-[var(--studio-border)] bg-[var(--studio-raised)] text-xs font-semibold text-[var(--studio-muted)] hover:text-[var(--studio-text)] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-[12px] bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-bold text-white shadow-sm transition active:scale-95"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}
      </ModalDrawer>

      {/* View Preview Modal */}
      <ModalDrawer
        isOpen={activeModal === 'view'}
        onClose={() => { setActiveModal(null); setSelectedSubtitle(null); }}
        title={`Subtitle Preview: ${selectedSubtitle?.language || 'Sinhala'} (${selectedSubtitle?.format?.toUpperCase() || 'SRT'})`}
        size="lg"
      >
        <div className="space-y-3">
          {previewLoading ? (
            <div className="text-center py-12 text-xs text-[var(--studio-muted)]">Loading subtitle contents...</div>
          ) : (
            <pre className="p-4 bg-[var(--studio-raised)] border border-[var(--studio-border)] rounded-[16px] text-xs font-mono text-[var(--studio-text)] overflow-x-auto max-h-[60vh] leading-relaxed select-all">
              {previewContent}
            </pre>
          )}
        </div>
      </ModalDrawer>

      {/* AI Translate Modal */}
      <ModalDrawer
        isOpen={activeModal === 'ai_translate'}
        onClose={() => setActiveModal(null)}
        title="AI Subtitle Translation Studio"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--studio-muted)]">Translate English lines directly to natural Sinhala:</span>
            <select
              value={translationEngine}
              onChange={e => setTranslationEngine(e.target.value)}
              className="px-3 py-1.5 bg-[var(--studio-raised)] border border-[var(--studio-border)] rounded-[12px] text-xs text-[var(--studio-text)] outline-none"
            >
              <option value="gemini">Google Gemini AI</option>
              <option value="groq">Groq Llama-3 (Fast)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--studio-muted)] mb-1.5">Source Text (English)</label>
            <textarea
              rows="4"
              value={aiSourceText}
              onChange={e => setAiSourceText(e.target.value)}
              placeholder="Paste English subtitle dialogue lines here..."
              className="w-full px-3 py-2 bg-[var(--studio-raised)] border border-[var(--studio-border)] rounded-[12px] text-xs text-[var(--studio-text)] outline-none focus:border-[#2563EB] font-mono"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAiTranslate}
              disabled={isAiTranslating}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-[12px] text-xs font-bold disabled:opacity-50 transition active:scale-95 shadow-sm"
            >
              {isAiTranslating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              <span>{isAiTranslating ? 'Translating...' : 'Translate to Sinhala'}</span>
            </button>
          </div>

          {aiError && (
            <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-xs rounded-[12px]">
              {aiError}
            </div>
          )}

          {aiTranslatedText && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#10B981] mb-1.5">Translated Sinhala Output</label>
              <textarea
                rows="4"
                readOnly
                value={aiTranslatedText}
                className="w-full px-3 py-2 bg-[var(--studio-raised)] border border-[#10B981]/30 rounded-[12px] text-xs text-[#10B981] outline-none font-sinhala leading-relaxed"
              />
            </div>
          )}
        </div>
      </ModalDrawer>

      {/* Replace File Modal */}
      <ModalDrawer
        isOpen={activeModal === 'replace_file'}
        onClose={() => { setActiveModal(null); setSelectedSubtitle(null); setReplaceFileInput(null); }}
        title="Replace Subtitle File"
        size="md"
      >
        <form onSubmit={handleReplaceFileSubmit} className="space-y-4">
          <p className="text-xs text-[var(--studio-muted)]">
            Upload a replacement file for this subtitle record without changing the media association:
          </p>

          <input
            type="file"
            accept=".srt,.vtt,.ass,.zip"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file && file.size > 10 * 1024 * 1024) {
                toast.error('File exceeds 10 MB limit.');
                e.target.value = '';
                setReplaceFileInput(null);
                return;
              }
              setReplaceFileInput(file || null);
            }}
            className="w-full px-3 py-2 bg-[var(--studio-raised)] border border-[var(--studio-border)] rounded-[12px] text-xs text-[var(--studio-text)] file:mr-3 file:py-1 file:px-3 file:rounded-[9999px] file:border-0 file:bg-[#2563EB] file:text-white file:text-xs file:font-bold cursor-pointer"
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--studio-border)]">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 rounded-[12px] border border-[var(--studio-border)] bg-[var(--studio-raised)] text-xs font-semibold text-[var(--studio-muted)] hover:text-[var(--studio-text)] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isReplacing || !replaceFileInput}
              className="px-4 py-2 rounded-[12px] bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              {isReplacing ? 'Uploading...' : 'Replace File'}
            </button>
          </div>
        </form>
      </ModalDrawer>
    </div>
  );
}
