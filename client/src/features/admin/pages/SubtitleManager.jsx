'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import apiClient from '@/services/api/apiClient';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import AdminTopBar from '@/features/admin/components/AdminTopBar';
import ModalDrawer from '@/features/admin/components/ModalDrawer';
import { useToast } from '@/features/admin/components/Toast';
import { useSiteContent } from '@/hooks/useSiteContent';
import {
  Film, Languages, Check, X, Clipboard, Download,
  Edit2, Trash2, Eye, Sparkles, Wand2, Loader2, AlertCircle, UploadCloud, FileText
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

  // Tabs
  const [filterTab, setFilterTab] = useState('Pending');

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
    if (filterTab === 'All') return true;
    return sub.approvalStatus === filterTab;
  });

  return (
    <div className="admin-shell min-h-screen bg-[#08090D] text-slate-100 flex flex-col lg:flex-row">
      <AdminSidebar mobileOpen={mobileOpen} onCloseMobileNav={() => setMobileOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <AdminTopBar onOpenMobileNav={() => setMobileOpen(true)} />

        <main className="admin-main flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-[1560px] w-full mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.05]">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-100 font-display tracking-tight">Subtitle Queue & Moderation</h1>
              <p className="text-xs text-slate-400 mt-0.5">Review Sinhala and English subtitle uploads, verify formatting, and approve for live catalog</p>
            </div>
            {enableTranslation && (
              <button
                type="button"
                onClick={() => setActiveModal('ai_translate')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:brightness-110 text-white font-semibold rounded-lg text-xs shadow-sm transition active:scale-95 flex-shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" /> AI Translate
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex gap-1 bg-[#11131A] p-1 rounded-xl border border-white/[0.06] w-fit">
            {['Pending', 'Approved', 'Rejected', 'All'].map((status) => {
              const count = status === 'All' ? subtitles.length : subtitles.filter(s => s.approvalStatus === status).length;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilterTab(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    filterTab === status
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                  }`}
                >
                  <span>{status}</span>
                  {count > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      filterTab === status
                        ? 'bg-white/20 text-white'
                        : 'bg-white/[0.06] text-slate-400'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Subtitles List */}
          <div className="space-y-3.5">
            {loading ? (
              <div className="text-center py-16 text-slate-500 text-xs">Checking pending subtitle uploads...</div>
            ) : filteredSubtitles.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-[#11131A] border border-white/[0.06] rounded-xl flex flex-col items-center justify-center gap-2">
                <AlertCircle className="w-6 h-6 text-slate-500 mb-1" />
                <span className="text-xs">No subtitles found in the "{filterTab}" queue.</span>
              </div>
            ) : (
              filteredSubtitles.map((sub) => (
                <div 
                  key={sub._id}
                  className="bg-[#11131A] border border-white/[0.06] p-4 sm:p-5 rounded-xl flex flex-col lg:flex-row justify-between gap-5 hover:border-white/[0.12] transition-colors"
                >
                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-300 font-bold uppercase text-[10px] tracking-wider">
                        {sub.language}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#151821] text-slate-300 font-mono text-[10px] uppercase">
                        Format: {sub.format}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#151821] text-slate-400 font-mono text-[10px]">
                        v{sub.version}
                      </span>
                      {(sub.seasonNumber || sub.episodeNumber) && (
                        <span className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-300 font-mono text-[10px]">
                          S{sub.seasonNumber || 1} E{sub.episodeNumber || 1}
                        </span>
                      )}
                      {sub.seasonStatus && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                          {sub.seasonStatus}
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="text-[10px] text-slate-500 font-mono uppercase">Media target:</p>
                      <p className="text-xs font-bold text-slate-200 mt-0.5 flex items-center gap-1.5 truncate">
                        <Film className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                        <span>{sub.mediaTitle || `${sub.mediaType} ID: ${sub.mediaId}`}</span>
                      </p>
                    </div>

                    {sub.releaseNotes && (
                      <div className="bg-[#151821] p-3 rounded-lg border border-white/[0.04] text-xs text-slate-400">
                        <span className="font-semibold text-slate-300 block mb-0.5">Uploader Notes:</span>
                        {sub.releaseNotes}
                      </div>
                    )}

                    <div className="text-[11px] text-slate-500 flex gap-4 flex-wrap">
                      <span>
                        Uploader:
                        <b className="text-slate-300"> {sub.uploaderRole === 'Admin' ? sub.adminUploader?.username || 'Admin' : sub.uploader?.username || 'Unknown'}</b>
                        <b className="ml-1 text-violet-400">({sub.uploaderRole || 'User'})</b>
                      </span>
                      <span>Submitted: <b>{new Date(sub.createdAt).toLocaleString()}</b></span>
                    </div>
                  </div>

                  {/* Actions Panel */}
                  <div className="flex flex-col justify-between w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-white/[0.06] pt-4 lg:pt-0 lg:pl-5 space-y-3.5">
                    {sub.approvalStatus === 'Pending' && (
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Moderator Remarks</label>
                        <input
                          type="text"
                          placeholder="Add reason or notes..."
                          value={moderatorNotes[sub._id] || sub.moderatorNotes || ''}
                          onChange={(e) => handleNoteChange(sub._id, e.target.value)}
                          className="w-full px-3 py-1.5 bg-[#08090D] border border-white/[0.08] rounded-lg text-slate-200 text-xs outline-none focus:border-violet-500"
                        />
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <a
                          href={sub.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 p-2 bg-[#151821] hover:bg-white/[0.08] text-slate-200 rounded-lg text-xs font-semibold text-center border border-white/[0.06] transition flex items-center justify-center gap-1.5"
                          title="Download File"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => handleOpenView(sub)}
                          className="flex-1 p-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/25 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(sub)}
                          className="flex-1 p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenReplace(sub)}
                          className="flex-1 p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
                          title="Re-upload or fix broken subtitle file"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Replace</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubtitle(sub._id)}
                          className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 rounded-lg text-xs font-semibold transition flex items-center justify-center"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      {sub.approvalStatus === 'Pending' && (
                        <div className="flex gap-2 border-t border-white/[0.06] pt-2 mt-1">
                          <button
                            type="button"
                            disabled={processingId === sub._id}
                            onClick={() => handleUpdateStatus(sub._id, 'Approved')}
                            className="flex-grow p-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            type="button"
                            disabled={processingId === sub._id}
                            onClick={() => handleUpdateStatus(sub._id, 'Rejected')}
                            className="flex-grow p-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
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
            <div className="bg-[#151821] border border-white/[0.06] rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Language</label>
                  <input
                    type="text"
                    value={editForm.language}
                    onChange={e => setEditForm({ ...editForm, language: e.target.value })}
                    className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Version</label>
                  <input
                    type="text"
                    value={editForm.version}
                    onChange={e => setEditForm({ ...editForm, version: e.target.value })}
                    className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Format</label>
                  <input
                    type="text"
                    value={editForm.format}
                    onChange={e => setEditForm({ ...editForm, format: e.target.value })}
                    className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Season No</label>
                  <input
                    type="number"
                    value={editForm.seasonNumber}
                    onChange={e => setEditForm({ ...editForm, seasonNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Episode No</label>
                  <input
                    type="number"
                    value={editForm.episodeNumber}
                    onChange={e => setEditForm({ ...editForm, episodeNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Approval Status</label>
                  <select
                    value={editForm.approvalStatus}
                    onChange={e => setEditForm({ ...editForm, approvalStatus: e.target.value })}
                    className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Release Notes</label>
                <textarea
                  rows="2"
                  value={editForm.releaseNotes}
                  onChange={e => setEditForm({ ...editForm, releaseNotes: e.target.value })}
                  className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500"
                  placeholder="Notes about sync, rips, or translator info..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-lg border border-white/[0.08] bg-[#151821] text-xs font-semibold text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-xs font-semibold text-white shadow-sm hover:brightness-110"
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
            <div className="text-center py-12 text-xs text-slate-400">Loading subtitle contents...</div>
          ) : (
            <pre className="p-4 bg-[#08090D] border border-white/[0.08] rounded-xl text-xs font-mono text-slate-300 overflow-x-auto max-h-[60vh] leading-relaxed select-all">
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
            <span className="text-xs text-slate-400">Translate English lines directly to natural Sinhala:</span>
            <select
              value={translationEngine}
              onChange={e => setTranslationEngine(e.target.value)}
              className="px-2.5 py-1 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-200 outline-none"
            >
              <option value="gemini">Google Gemini AI</option>
              <option value="groq">Groq Llama-3 (Fast)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Source Text (English)</label>
            <textarea
              rows="4"
              value={aiSourceText}
              onChange={e => setAiSourceText(e.target.value)}
              placeholder="Paste English subtitle dialogue lines here..."
              className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 font-mono"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAiTranslate}
              disabled={isAiTranslating}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
            >
              {isAiTranslating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              <span>{isAiTranslating ? 'Translating...' : 'Translate to Sinhala'}</span>
            </button>
          </div>

          {aiError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
              {aiError}
            </div>
          )}

          {aiTranslatedText && (
            <div>
              <label className="block text-[11px] font-semibold text-emerald-400 mb-1">Translated Sinhala Output</label>
              <textarea
                rows="4"
                readOnly
                value={aiTranslatedText}
                className="w-full px-3 py-2 bg-[#08090D] border border-emerald-500/30 rounded-lg text-xs text-emerald-300 outline-none font-sinhala leading-relaxed"
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
          <p className="text-xs text-slate-400">
            Upload a replacement file for this subtitle record without changing the media association:
          </p>

          <input
            type="file"
            accept=".srt,.vtt,.ass,.txt"
            onChange={e => setReplaceFileInput(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:bg-violet-600 file:text-white file:text-xs file:font-semibold"
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-3.5 py-1.5 rounded-lg border border-white/[0.08] bg-[#151821] text-xs font-semibold text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isReplacing || !replaceFileInput}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-xs font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-50"
            >
              {isReplacing ? 'Uploading...' : 'Replace File'}
            </button>
          </div>
        </form>
      </ModalDrawer>
    </div>
  );
}
