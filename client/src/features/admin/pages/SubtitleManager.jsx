'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import apiClient from '@/services/api/apiClient';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import ModalDrawer from '@/features/admin/components/ModalDrawer';
import { useToast } from '@/features/admin/components/Toast';
import { useSiteContent } from '@/hooks/useSiteContent';
import {
  Film, Languages, Check, X, Clipboard, Download,
  Edit2, Trash2, Eye, Sparkles, Wand2, Loader2, AlertCircle
} from 'lucide-react';

export default function SubtitleManager() {
  const { admin } = useAuth();
  const { content } = useSiteContent();
  const toast = useToast();
  const enableTranslation = content.ai?.enableTranslation !== false;
  
  const [subtitles, setSubtitles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Note inputs
  const [moderatorNotes, setModeratorNotes] = useState({});
  const [processingId, setProcessingId] = useState(null);

  // Tabs
  const [filterTab, setFilterTab] = useState('Pending');

  // View/Edit states
  const [selectedSubtitle, setSelectedSubtitle] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // 'edit', 'view', 'ai_translate'
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

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/admin/subtitles');
      setSubtitles(res.data);
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
      .then(res => {
        if (!res.ok) throw new Error('File not accessible');
        return res.text();
      })
      .then(text => {
        setPreviewContent(text.slice(0, 4000));
      })
      .catch(err => {
        setPreviewContent('Unable to load file preview. Please download the file to inspect the subtitles.');
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
      seasonNumber: sub.seasonNumber !== undefined && sub.seasonNumber !== null ? String(sub.seasonNumber) : '',
      episodeNumber: sub.episodeNumber !== undefined && sub.episodeNumber !== null ? String(sub.episodeNumber) : '',
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
      const res = await apiClient.put(`/api/admin/subtitles/${selectedSubtitle._id}`, editForm);
      setSubtitles(prev => prev.map(sub => 
        sub._id === selectedSubtitle._id ? res.data.subtitle : sub
      ));
      
      setActiveModal(null);
      setSelectedSubtitle(null);
      toast.success('Subtitle modified successfully.');
    } catch (err) {
      toast.error('Failed to update subtitle details.');
    }
  };

  const handleAiTranslate = async () => {
    if (!aiSourceText.trim()) return;
    setIsAiTranslating(true);
    setAiError('');
    setAiTranslatedText('');
    
    try {
      const res = await apiClient.post('/api/admin/ai/translate', {
        srtContent: aiSourceText,
        engine: translationEngine
      }, {
        timeout: 120000 // 2 minutes custom timeout
      });
      setAiTranslatedText(res.data.translatedSrt);
      toast.success(translationEngine === 'gemini' ? 'Gemini translated SRT successfully.' : 'Google translated SRT successfully.');
    } catch (err) {
      setAiError(err.response?.data?.error || 'Translation failed. Please check backend setup.');
      toast.error('AI translation failed.');
    } finally {
      setIsAiTranslating(false);
    }
  };

  const handleDeleteSubtitle = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subtitle? This action is permanent.')) {
      return;
    }
    try {
      await apiClient.delete(`/api/admin/subtitles/${id}`);
      setSubtitles(prev => prev.filter(sub => sub._id !== id));
      toast.success('Subtitle deleted successfully.');
    } catch (err) {
      toast.error('Failed to delete subtitle.');
    }
  };

  const filteredSubtitles = subtitles.filter(sub => sub.approvalStatus === filterTab);

  return (
    <div className="min-h-screen bg-luxury-950 text-slate-100 flex flex-col lg:flex-row">
      <AdminSidebar />

      <main className="flex-grow p-6 sm:p-8 overflow-y-auto min-w-0">
        <div className="max-w-5xl mx-auto">
          
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">Subtitles Approvals Queue</h1>
              <p className="text-slate-400 text-xs mt-1">Review Sinhala and English subtitle uploads, verify formatting, and approve for the live catalog</p>
            </div>
            {enableTranslation && (
              <button
                onClick={() => setActiveModal('ai_translate')}
                className="px-5 py-2.5 bg-brand-accent/10 hover:bg-brand-accent/20 border border-brand-accent/30 text-brand-accent rounded-xl text-xs font-black uppercase tracking-widest transition flex items-center justify-center gap-2 shadow-neon-accent flex-shrink-0"
              >
                <Sparkles className="w-4 h-4" /> AI Translate
              </button>
            )}
          </div>

          {/* Tab Filter Chips */}
          <div className="flex gap-2 mb-6 bg-luxury-900/50 p-1.5 rounded-xl border border-white/5 w-fit">
            {['Pending', 'Approved', 'Rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterTab(status)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition relative ${
                  filterTab === status
                    ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
                }`}
              >
                <span>{status}</span>
                {subtitles.filter(s => s.approvalStatus === status).length > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                    status === 'Pending' 
                      ? 'bg-amber-500/20 text-amber-300' 
                      : status === 'Approved' 
                        ? 'bg-emerald-500/20 text-emerald-300' 
                        : 'bg-red-500/20 text-red-300'
                  }`}>
                    {subtitles.filter(s => s.approvalStatus === status).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* List queue */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-16 text-slate-500">Checking pending subtitle uploads...</div>
            ) : filteredSubtitles.length === 0 ? (
              <div className="text-center py-16 text-slate-500 bg-luxury-900 border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2">
                <AlertCircle className="w-8 h-8 text-slate-600 mb-1" />
                <span>No subtitles found in the "{filterTab}" queue.</span>
              </div>
            ) : (
              filteredSubtitles.map((sub) => (
                <div 
                  key={sub._id}
                  className="bg-luxury-900 border border-white/5 p-5 rounded-2xl flex flex-col lg:flex-row justify-between gap-6 hover:border-white/10 transition-colors"
                >
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="px-2.5 py-0.5 rounded bg-brand-primary/10 border border-brand-primary/20 text-brand-primary font-bold uppercase text-[9px] tracking-wider">
                        {sub.language}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 font-mono text-[9px] uppercase tracking-wider">
                        Format: {sub.format}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/5 text-slate-400 font-mono text-[9px]">
                        Ver: {sub.version}
                      </span>
                      {(sub.seasonNumber || sub.episodeNumber) && (
                        <span className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-300 font-mono text-[9px] uppercase tracking-wider">
                          S{sub.seasonNumber || 1} E{sub.episodeNumber || 1}
                        </span>
                      )}
                      {sub.seasonStatus && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-[9px] uppercase tracking-wider">
                          {sub.seasonStatus}
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="text-[10px] text-slate-500 font-mono uppercase">Media target identifier:</p>
                      <p className="text-sm font-extrabold text-slate-200 mt-0.5 flex items-center gap-1.5">
                        <Film className="w-4 h-4 text-brand-primary" />
                        {sub.mediaType} ID: {sub.mediaId}
                      </p>
                    </div>

                    {sub.releaseNotes && (
                      <div className="bg-luxury-950/40 p-3 rounded-xl border border-white/5 text-xs text-slate-400">
                        <span className="font-bold text-slate-300 block mb-1">Uploader Notes:</span>
                        {sub.releaseNotes}
                      </div>
                    )}

                    <div className="text-[11px] text-slate-500 flex gap-4 flex-wrap">
                      <span>
                        Uploader:
                        <b className="text-slate-300"> {sub.uploaderRole === 'Admin' ? sub.adminUploader?.username || 'Admin' : sub.uploader?.username || 'Unknown'}</b>
                        <b className="ml-1 text-brand-primary">({sub.uploaderRole || 'User'})</b>
                      </span>
                      <span>Submitted: <b>{new Date(sub.createdAt).toLocaleString()}</b></span>
                    </div>
                  </div>

                  {/* Actions Panel */}
                  <div className="flex flex-col justify-between w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-white/5 pt-4 lg:pt-0 lg:pl-6 space-y-4">
                    {sub.approvalStatus === 'Pending' && (
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Moderator Remarks</label>
                        <input
                          type="text"
                          placeholder="Add reason/remarks..."
                          value={moderatorNotes[sub._id] || sub.moderatorNotes || ''}
                          onChange={(e) => handleNoteChange(sub._id, e.target.value)}
                          className="w-full px-3.5 py-2 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary"
                        />
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <a
                          href={sub.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 p-2.5 bg-white/5 hover:bg-white/10 text-slate-200 rounded-xl text-xs font-bold text-center border border-white/10 transition flex items-center justify-center gap-1.5"
                          title="Download File"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </a>
                        <button
                          onClick={() => handleOpenView(sub)}
                          className="flex-1 p-2.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/25 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Preview
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenEdit(sub)}
                          className="flex-1 p-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit Details
                        </button>
                        <button
                          onClick={() => handleDeleteSubtitle(sub._id)}
                          className="flex-1 p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                      
                      {sub.approvalStatus === 'Pending' && (
                        <div className="flex gap-2 border-t border-white/5 pt-2 mt-1">
                          <button
                            disabled={processingId === sub._id}
                            onClick={() => handleUpdateStatus(sub._id, 'Approved')}
                            className="flex-grow p-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                          >
                            <Check className="w-4 h-4" /> Approve
                          </button>
                          <button
                            disabled={processingId === sub._id}
                            onClick={() => handleUpdateStatus(sub._id, 'Rejected')}
                            className="flex-grow p-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                          >
                            <X className="w-4 h-4" /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      <ModalDrawer
        isOpen={activeModal === 'edit'}
        onClose={() => { setActiveModal(null); setSelectedSubtitle(null); }}
        title="Edit Subtitle Details"
        size="md"
      >
        {selectedSubtitle && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Language</label>
                <select
                  value={editForm.language}
                  onChange={(e) => setEditForm(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-xs outline-none text-slate-200 focus:border-brand-primary transition"
                >
                  <option value="Sinhala">Sinhala</option>
                  <option value="English">English</option>
                </select>
              </div>
              
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Format</label>
                <select
                  value={editForm.format}
                  onChange={(e) => setEditForm(prev => ({ ...prev, format: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-xs outline-none text-slate-200 focus:border-brand-primary transition"
                >
                  <option value="srt">SRT</option>
                  <option value="vtt">VTT</option>
                  <option value="ass">ASS</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Version</label>
                <input
                  type="text"
                  value={editForm.version}
                  onChange={(e) => setEditForm(prev => ({ ...prev, version: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-xs outline-none text-slate-200 focus:border-brand-primary transition"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Season Status</label>
                <select
                  value={editForm.seasonStatus}
                  onChange={(e) => setEditForm(prev => ({ ...prev, seasonStatus: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-xs outline-none text-slate-200 focus:border-brand-primary transition"
                >
                  <option value="Ongoing">Ongoing</option>
                  <option value="Complete">Complete</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Season Number</label>
                <input
                  type="number"
                  value={editForm.seasonNumber}
                  placeholder="1"
                  onChange={(e) => setEditForm(prev => ({ ...prev, seasonNumber: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-xs outline-none text-slate-200 focus:border-brand-primary transition"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Episode Number</label>
                <input
                  type="number"
                  value={editForm.episodeNumber}
                  placeholder="1"
                  onChange={(e) => setEditForm(prev => ({ ...prev, episodeNumber: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-xs outline-none text-slate-200 focus:border-brand-primary transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Approval Status</label>
              <select
                value={editForm.approvalStatus}
                onChange={(e) => setEditForm(prev => ({ ...prev, approvalStatus: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-xs outline-none text-slate-200 focus:border-brand-primary transition"
              >
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Release Notes / Uploader Notes</label>
              <textarea
                value={editForm.releaseNotes}
                onChange={(e) => setEditForm(prev => ({ ...prev, releaseNotes: e.target.value }))}
                rows={2}
                className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary transition"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Moderator Remarks</label>
              <textarea
                value={editForm.moderatorNotes}
                onChange={(e) => setEditForm(prev => ({ ...prev, moderatorNotes: e.target.value }))}
                rows={2}
                className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary transition"
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => { setActiveModal(null); setSelectedSubtitle(null); }}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}
      </ModalDrawer>

      {/* View Modal */}
      <ModalDrawer
        isOpen={activeModal === 'view'}
        onClose={() => { setActiveModal(null); setSelectedSubtitle(null); }}
        title="View Subtitle Info & Preview"
        size="xl"
      >
        {selectedSubtitle && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-luxury-950/40 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Language</span>
                <span className="text-xs font-extrabold text-brand-primary">{selectedSubtitle.language}</span>
              </div>
              <div className="bg-luxury-950/40 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Format &amp; Version</span>
                <span className="text-xs font-extrabold text-slate-200">{selectedSubtitle.format?.toUpperCase()} (v{selectedSubtitle.version})</span>
              </div>
              <div className="bg-luxury-950/40 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Target Episode</span>
                <span className="text-xs font-extrabold text-sky-400">
                  {selectedSubtitle.seasonNumber || selectedSubtitle.episodeNumber
                    ? `S${selectedSubtitle.seasonNumber || 1} E${selectedSubtitle.episodeNumber || 1}`
                    : 'N/A (Movie)'}
                </span>
              </div>
              <div className="bg-luxury-950/40 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Status</span>
                <span className={`text-xs font-extrabold ${
                  selectedSubtitle.approvalStatus === 'Approved' ? 'text-emerald-400' : selectedSubtitle.approvalStatus === 'Rejected' ? 'text-red-400' : 'text-yellow-400'
                }`}>{selectedSubtitle.approvalStatus}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-luxury-950/40 p-3 rounded-xl border border-white/5 text-xs text-slate-400">
                <span className="font-bold text-slate-300 block mb-1">Uploader Notes:</span>
                {selectedSubtitle.releaseNotes || <span className="italic text-slate-500">No notes provided</span>}
              </div>
              <div className="bg-luxury-950/40 p-3 rounded-xl border border-white/5 text-xs text-slate-400">
                <span className="font-bold text-slate-300 block mb-1">Moderator Remarks:</span>
                {selectedSubtitle.moderatorNotes || <span className="italic text-slate-500">No remarks added yet</span>}
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">File Content Preview (First 4000 characters)</span>
              <div className="bg-luxury-950 border border-white/10 rounded-xl p-4.5 font-mono text-[10px] text-slate-300 overflow-auto max-h-[35vh] h-48 select-text">
                {previewLoading ? (
                  <div className="text-center py-12 text-slate-500">Fetching subtitle content preview...</div>
                ) : (
                  <pre className="whitespace-pre-wrap leading-relaxed">{previewContent}</pre>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5">
              <a
                href={selectedSubtitle.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition uppercase tracking-wider"
              >
                <Download className="w-3.5 h-3.5" /> Download Full File
              </a>
            </div>
          </div>
        )}
      </ModalDrawer>

      {/* AI Translator Modal */}
      <ModalDrawer
        isOpen={activeModal === 'ai_translate'}
        onClose={() => setActiveModal(null)}
        title="KSubZone AI Subtitle Translator"
        size="xl"
      >
        <p className="text-xs text-slate-400 mb-4">Translate raw English SRT files into Sinhala while preserving standard subtitle timecodes and indices.</p>

        {/* Translation Engine Selector */}
        <div className="bg-luxury-950 border border-white/5 p-4.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mb-4">
          <div>
            <span className="font-bold text-slate-200">Translation Engine</span>
            <p className="text-[10px] text-slate-500 mt-0.5">Choose between Gemini 1.5 Flash (AI) or Google Translate (Free)</p>
          </div>
          <select
            value={translationEngine}
            onChange={(e) => setTranslationEngine(e.target.value)}
            className="h-10 px-3.5 bg-luxury-900 border border-white/10 rounded-xl outline-none focus:border-brand-primary text-slate-300 text-xs cursor-pointer min-w-[180px]"
          >
            <option value="gemini">Gemini 1.5 Flash (AI)</option>
            <option value="google">Google Translate (Free)</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[50vh] min-h-[300px]">
          {/* Source Text */}
          <div className="flex flex-col h-full overflow-hidden border border-white/10 rounded-xl bg-luxury-950">
            <div className="px-4 py-2 border-b border-white/10 bg-white/5 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">English SRT</span>
              <button 
                onClick={() => setAiSourceText('')}
                className="text-[10px] text-slate-500 hover:text-white"
              >
                Clear
              </button>
            </div>
            <textarea
              value={aiSourceText}
              onChange={(e) => setAiSourceText(e.target.value)}
              placeholder="Paste SRT contents here..."
              className="flex-1 w-full bg-transparent resize-none p-4 text-xs font-mono text-slate-300 outline-none placeholder:text-slate-600 leading-relaxed"
            />
          </div>

          {/* Translated Text */}
          <div className="flex flex-col h-full overflow-hidden border border-brand-primary/20 rounded-xl bg-luxury-950 relative">
            <div className="px-4 py-2 border-b border-brand-primary/20 bg-brand-primary/5 flex items-center justify-between">
              <span className="text-xs font-bold text-brand-primary uppercase tracking-wider">Sinhala ({translationEngine === 'gemini' ? 'AI Output' : 'Google Output'})</span>
              {aiTranslatedText && (
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(aiTranslatedText);
                    toast.success('Translated text copied to clipboard.');
                  }}
                  className="text-[10px] text-brand-primary hover:text-white flex items-center gap-1 font-bold"
                >
                  <Clipboard className="w-3 h-3" /> Copy
                </button>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4 relative">
              {isAiTranslating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-luxury-950/80 backdrop-blur-sm z-10">
                  <Loader2 className="w-8 h-8 text-brand-accent animate-spin mb-3" />
                  <p className="text-brand-accent text-xs font-bold animate-pulse">
                    {translationEngine === 'gemini' ? 'Gemini AI is translating srt layout...' : 'Google Translate is translating srt layout...'}
                  </p>
                </div>
              ) : null}
              
              {aiError && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {aiError}
                </div>
              )}

              <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">{aiTranslatedText || (translationEngine === 'gemini' ? 'Gemini output will render here...' : 'Google Translate output will render here...')}</pre>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3 pt-4 border-t border-white/5">
          <button
            onClick={() => setActiveModal(null)}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-300 transition"
          >
            Close
          </button>
          <button
            onClick={handleAiTranslate}
            disabled={isAiTranslating || !aiSourceText.trim()}
            className="px-6 py-2.5 bg-gradient-to-r from-brand-primary to-brand-accent hover:opacity-90 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg font-black uppercase tracking-wider"
          >
            {isAiTranslating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            Translate SRT
          </button>
        </div>
      </ModalDrawer>
    </div>
  );
}
