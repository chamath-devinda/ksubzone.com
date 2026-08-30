'use client';

import React, { useEffect, useState, useMemo } from 'react';
import apiClient from '@/services/api/apiClient';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import AdminTopBar from '@/features/admin/components/AdminTopBar';
import ModalDrawer from '@/features/admin/components/ModalDrawer';
import { useToast } from '@/features/admin/components/Toast';
import {
  Server, Search, Database, Eye, RefreshCw, AlertCircle, X,
  FileText, Terminal, Download, Edit2, Trash2, Save,
  Layers, PlusCircle, Check
} from 'lucide-react';

export default function DatabaseViewer() {
  const toast = useToast();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collections, setCollections] = useState([]);
  const [dbDriver, setDbDriver] = useState('');
  const [selectedCol, setSelectedCol] = useState('');
  const [documents, setDocuments] = useState([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [activeDoc, setActiveDoc] = useState(null); // Document for raw view
  const [editDoc, setEditDoc] = useState(null); // Document being edited
  const [editForm, setEditForm] = useState({}); // Draft fields
  const [rawJsonText, setRawJsonText] = useState(''); // Raw JSON textarea string
  const [editTab, setEditTab] = useState('fields'); // 'fields' | 'json'
  const [saving, setSaving] = useState(false);
  const [wiping, setWiping] = useState(false);

  // Pagination
  const [limit] = useState(50);
  const [skip, setSkip] = useState(0);

  // Fetch all collections list
  const fetchCollections = async () => {
    setLoadingCollections(true);
    setError('');
    try {
      const res = await apiClient.get('/api/admin/database/collections');
      setCollections(res.data.collections || []);
      setDbDriver(res.data.driver || 'SQLite');
      if (res.data.collections?.length > 0 && !selectedCol) {
        setSelectedCol(res.data.collections[0].name);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to connect to database manager.');
      toast.error('Failed to connect to database manager.');
    } finally {
      setLoadingCollections(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  // Fetch documents for selected collection
  const fetchDocuments = async (colName, currentSkip = 0) => {
    if (!colName) return;
    setLoadingDocs(true);
    setError('');
    try {
      const res = await apiClient.get(`/api/admin/database/collections/${colName}`, {
        params: { limit, skip: currentSkip }
      });
      setDocuments(res.data.documents || []);
      setTotalDocs(res.data.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to fetch '${colName}' documents.`);
      toast.error(`Failed to fetch '${colName}' documents.`);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (selectedCol) {
      setSkip(0);
      fetchDocuments(selectedCol, 0);
    }
  }, [selectedCol]);

  useEffect(() => {
    if (selectedCol) {
      fetchDocuments(selectedCol, skip);
    }
  }, [skip]);

  // Client-side search within current document page
  const filteredDocuments = useMemo(() => {
    if (!searchTerm.trim()) return documents;
    const term = searchTerm.toLowerCase();
    return documents.filter(doc => {
      return JSON.stringify(doc).toLowerCase().includes(term);
    });
  }, [documents, searchTerm]);

  // Detect and format display columns
  const displayColumns = useMemo(() => {
    if (!documents || documents.length === 0) return ['_id'];
    const keys = new Set();
    documents.forEach(doc => {
      Object.keys(doc).forEach(k => keys.add(k));
    });
    
    // Sort columns prioritizing _id and title/name/email/username
    const priority = ['_id', 'title', 'name', 'username', 'email', 'dramaTitle', 'episodeNumber', 'type', 'status'];
    const rest = Array.from(keys).filter(k => !priority.includes(k) && k !== 'passwordHash');
    const sorted = [...priority.filter(p => keys.has(p)), ...rest];
    
    return sorted.slice(0, 7); // Show max 7 columns in table
  }, [documents]);

  const getIdentifier = (doc, col) => {
    if (doc.title) return doc.title;
    if (doc.name) return doc.name;
    if (doc.username) return doc.username;
    if (doc.email) return doc.email;
    if (doc.episodeTitle) return doc.episodeTitle;
    if (doc.key) return doc.key;
    if (doc.slug) return doc.slug;
    return doc._id;
  };

  // Delete Document
  const handleDeleteRecord = async (id) => {
    if (!window.confirm(`Are you sure you want to permanently delete record ${id} from '${selectedCol}'?`)) return;
    try {
      await apiClient.delete(`/api/admin/database/collections/${selectedCol}/${id}`);
      toast.success('Document deleted successfully.');
      setDocuments(prev => prev.filter(d => d._id !== id));
      setTotalDocs(prev => Math.max(0, prev - 1));
      fetchCollections(); // Refresh counts
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete record.');
    }
  };

  // Wipe All Media Data
  const handleWipeDatabase = async () => {
    const confirmation = window.prompt(
      'WARNING: This will permanently ERASE all Movies, Dramas, Seasons, Episodes, and Subtitles.\n\nType "WIPE" to confirm:'
    );
    if (confirmation !== 'WIPE') {
      toast.info('Wipe operation cancelled.');
      return;
    }

    setWiping(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiClient.post('/api/admin/database/wipe-media');
      setSuccess(res.data.message || 'Media collections wiped successfully.');
      toast.success('Media catalog erased.');
      fetchCollections();
      if (selectedCol) fetchDocuments(selectedCol, 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to wipe database.');
      toast.error('Failed to wipe database.');
    } finally {
      setWiping(false);
    }
  };

  // Export JSON Dump
  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(documents, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ksubzone_${selectedCol}_dump_${new Date().toISOString().slice(0,10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selectedCol} collection as JSON.`);
  };

  // Open Edit Modal
  const handleEditClick = (doc) => {
    setEditDoc(doc);
    const formFields = { ...doc };
    delete formFields._id;
    delete formFields.createdAt;
    delete formFields.updatedAt;
    
    setEditForm(formFields);
    setRawJsonText(JSON.stringify(formFields, null, 2));
    setEditTab('fields');
    setError('');
    setSuccess('');
  };

  const handleFormFieldChange = (key, val, type) => {
    const nextForm = { ...editForm };
    if (type === 'number') {
      nextForm[key] = val === '' ? '' : Number(val);
    } else if (type === 'checkbox') {
      nextForm[key] = Boolean(val);
    } else {
      nextForm[key] = val;
    }
    setEditForm(nextForm);
    setRawJsonText(JSON.stringify(nextForm, null, 2));
  };

  const handleRawJsonChange = (val) => {
    setRawJsonText(val);
    try {
      const parsed = JSON.parse(val);
      setEditForm(parsed);
    } catch (e) {}
  };

  const handleUpdateRecord = async (e) => {
    e.preventDefault();
    if (!editDoc) return;
    setSaving(true);
    setError('');
    setSuccess('');

    let payload = editForm;
    if (editTab === 'json') {
      try {
        payload = JSON.parse(rawJsonText);
      } catch (err) {
        setError('Invalid JSON syntax formatting. Please fix before saving.');
        toast.error('Invalid JSON syntax formatting.');
        setSaving(false);
        return;
      }
    }

    try {
      const res = await apiClient.put(`/api/admin/database/collections/${selectedCol}/${editDoc._id}`, payload);
      setSuccess('Record updated successfully.');
      toast.success('Record updated successfully.');
      setDocuments(prev => prev.map(doc => doc._id === editDoc._id ? res.data.document : doc));
      setEditDoc(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update document.');
      toast.error('Failed to update document.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-shell min-h-screen bg-[#08090D] text-slate-100 flex flex-col lg:flex-row">
      <AdminSidebar mobileOpen={mobileOpen} onCloseMobileNav={() => setMobileOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <AdminTopBar onOpenMobileNav={() => setMobileOpen(true)} />

        <main className="admin-main flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-[1560px] w-full mx-auto space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.05]">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400 font-mono text-[10px] font-bold uppercase">
                  {dbDriver || 'SQLite'} Database
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-100 font-display tracking-tight mt-1">Database Inspector</h1>
              <p className="text-xs text-slate-400 mt-0.5">Explore raw database tables, edit documents, purge records, and extract data backups</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleWipeDatabase}
                disabled={wiping}
                className="h-9 px-3.5 rounded-lg border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> {wiping ? 'Wiping...' : 'Wipe Media Data'}
              </button>
              <button
                type="button"
                onClick={fetchCollections}
                className="h-9 px-3.5 rounded-lg border border-white/[0.08] bg-[#11131A] text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400 flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0" /> {success}
            </div>
          )}

          {/* Core Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
            
            {/* Sidebar Collection Lists */}
            <aside className="space-y-4">
              <div className="rounded-xl border border-white/[0.06] bg-[#11131A] p-3.5 space-y-2">
                <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-violet-400" /> Tables / Collections
                </h2>
                
                {loadingCollections ? (
                  <div className="py-8 text-center text-xs text-slate-500 animate-pulse">Loading collections...</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-col gap-1">
                    {collections.map(col => {
                      const isActive = selectedCol === col.name;
                      return (
                        <button
                          key={col.name}
                          type="button"
                          onClick={() => { setSelectedCol(col.name); setActiveDoc(null); }}
                          className={`w-full h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition text-left cursor-pointer ${
                            isActive 
                              ? 'bg-violet-600/15 border border-violet-500/30 text-violet-300 font-bold' 
                              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-violet-400' : 'bg-slate-600'}`} />
                            {col.name}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${isActive ? 'bg-violet-500/20 text-violet-300' : 'bg-[#08090D] text-slate-500'}`}>
                            {col.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </aside>

            {/* Document Browser Grid Container */}
            <div className="space-y-3.5">
              
              {/* Toolbar */}
              <div className="rounded-xl border border-white/[0.06] bg-[#11131A] p-3 flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:max-w-md">
                  <input
                    type="text"
                    placeholder={`Search within '${selectedCol}' records...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-9 pl-9 pr-3.5 rounded-lg text-xs bg-[#08090D] border border-white/[0.08] focus:border-violet-500 outline-none text-slate-100 transition"
                  />
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    disabled={documents.length === 0}
                    className="h-9 px-3.5 rounded-lg border border-white/[0.08] bg-[#151821] text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition disabled:opacity-50 flex-1 sm:flex-initial cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Export JSON
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="rounded-xl border border-white/[0.06] bg-[#11131A] overflow-hidden shadow-sm">
                {loadingDocs ? (
                  <div className="py-20 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-violet-400" />
                    Fetching documents from database...
                  </div>
                ) : filteredDocuments.length === 0 ? (
                  <div className="py-20 text-center text-xs text-slate-500">
                    No documents found in '{selectedCol}'.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/[0.06] bg-[#151821] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {displayColumns.map(col => (
                            <th key={col} className="px-4 py-3">{col}</th>
                          ))}
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04] text-xs text-slate-300">
                        {filteredDocuments.map(doc => (
                          <tr key={doc._id} className="hover:bg-[#151821]/50 transition-colors">
                            {displayColumns.map(col => {
                              if (col === 'Record Identifier' || col === '_id') {
                                return (
                                  <td key={col} className="px-4 py-3 max-w-[220px] truncate font-bold text-slate-200">
                                    {getIdentifier(doc, selectedCol)}
                                  </td>
                                );
                              }
                              let val = doc[col];
                              if (typeof val === 'boolean') val = val ? 'true' : 'false';
                              if (typeof val === 'object' && val !== null) val = '{...}';
                              return (
                                <td key={col} className="px-4 py-3 max-w-[150px] truncate font-mono text-[11px] text-slate-400">
                                  {val !== undefined && val !== null ? String(val) : '—'}
                                </td>
                              );
                            })}
                            
                            {/* Action columns */}
                            <td className="px-4 py-2.5 text-right">
                              <div className="inline-flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => setActiveDoc(doc)}
                                  className="p-1.5 rounded-lg bg-[#151821] border border-white/[0.06] text-slate-400 hover:text-slate-200 text-xs transition flex items-center gap-1 cursor-pointer"
                                  title="View raw JSON"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEditClick(doc)}
                                  className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 text-xs transition flex items-center gap-1 cursor-pointer"
                                  title="Edit properties"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecord(doc._id)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs transition flex items-center gap-1 cursor-pointer"
                                  title="Delete record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Table Footer / Pagination */}
                {totalDocs > limit && (
                  <div className="px-4 py-3 border-t border-white/[0.06] bg-[#0D0F15] flex items-center justify-between gap-4 text-xs text-slate-400">
                    <span className="text-[11px] text-slate-500 font-mono">
                      Showing <b className="text-slate-200">{skip + 1}</b> to <b className="text-slate-200">{Math.min(skip + limit, totalDocs)}</b> of <b className="text-slate-200">{totalDocs}</b> records
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        disabled={skip === 0 || loadingDocs}
                        onClick={() => setSkip(prev => Math.max(0, prev - limit))}
                        className="px-3 py-1 rounded-lg border border-white/[0.06] bg-[#151821] text-xs font-semibold text-slate-300 disabled:opacity-30 hover:text-white transition cursor-pointer"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={skip + limit >= totalDocs || loadingDocs}
                        onClick={() => setSkip(prev => prev + limit)}
                        className="px-3 py-1 rounded-lg border border-white/[0.06] bg-[#151821] text-xs font-semibold text-slate-300 disabled:opacity-30 hover:text-white transition cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* JSON Viewer Modal Drawer */}
      <ModalDrawer
        isOpen={Boolean(activeDoc)}
        onClose={() => setActiveDoc(null)}
        title="Document Inspector"
        size="lg"
      >
        {activeDoc && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">_id: {activeDoc._id}</span>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#08090D] p-4 overflow-auto max-h-[65vh] font-mono text-xs leading-5 text-emerald-400 select-text">
              <pre>{JSON.stringify(activeDoc, null, 2)}</pre>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveDoc(null)}
                className="px-4 py-2 rounded-lg bg-[#151821] border border-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        )}
      </ModalDrawer>

      {/* Record Editor Modal Drawer */}
      <ModalDrawer
        isOpen={Boolean(editDoc)}
        onClose={() => setEditDoc(null)}
        title={`Edit record in '${selectedCol}'`}
        size="lg"
      >
        {editDoc && (
          <div className="space-y-4">
            {/* Form Mode Selector tabs */}
            <div className="flex border-b border-white/[0.06] pb-2 gap-3">
              <button
                type="button"
                onClick={() => setEditTab('fields')}
                className={`text-xs font-semibold transition ${editTab === 'fields' ? 'text-violet-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Form Fields
              </button>
              <button
                type="button"
                onClick={() => setEditTab('json')}
                className={`text-xs font-semibold transition ${editTab === 'json' ? 'text-violet-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Raw JSON
              </button>
            </div>

            {/* Form Editor Body */}
            <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1 admin-custom-scrollbar">
              {error && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400">
                  {success}
                </div>
              )}

              {editTab === 'fields' ? (
                <form onSubmit={handleUpdateRecord} className="grid grid-cols-1 gap-3.5">
                  {Object.entries(editForm).map(([key, value]) => {
                    const isBool = typeof value === 'boolean';
                    const isNum = typeof value === 'number';
                    const isLongText = typeof value === 'string' && value.length > 65;
                    const isObj = typeof value === 'object' && value !== null;

                    if (isObj) {
                      return (
                        <div key={key} className="flex flex-col gap-1">
                          <label className="text-[11px] font-semibold text-slate-400">{key}</label>
                          <textarea
                            disabled
                            rows={3}
                            value={JSON.stringify(value, null, 2)}
                            className="w-full rounded-lg border border-white/[0.06] bg-[#08090D] px-3 py-2 text-xs font-mono text-slate-500 select-text cursor-not-allowed"
                          />
                        </div>
                      );
                    }

                    return (
                      <div key={key} className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                          {key}
                          <span className="text-[10px] text-slate-500 font-mono">({typeof value})</span>
                        </label>

                        {isBool ? (
                          <div className="flex items-center h-9 bg-[#08090D] px-3 rounded-lg border border-white/[0.08]">
                            <input
                              type="checkbox"
                              checked={!!value}
                              id={`edit-bool-${key}`}
                              onChange={(e) => handleFormFieldChange(key, e.target.checked, 'checkbox')}
                              className="w-4 h-4 rounded border-white/20 bg-[#11131A] text-violet-600 focus:ring-0 cursor-pointer"
                            />
                            <label htmlFor={`edit-bool-${key}`} className="ml-2 text-xs text-slate-300 font-medium select-none cursor-pointer">
                              Enabled / Active
                            </label>
                          </div>
                        ) : isLongText ? (
                          <textarea
                            rows={4}
                            value={String(value)}
                            onChange={(e) => handleFormFieldChange(key, e.target.value, 'string')}
                            className="w-full rounded-lg border border-white/[0.08] bg-[#08090D] px-3 py-2 text-xs text-slate-100 outline-none focus:border-violet-500 leading-relaxed"
                          />
                        ) : (
                          <input
                            type={isNum ? 'number' : 'text'}
                            value={value !== null ? String(value) : ''}
                            onChange={(e) => handleFormFieldChange(key, e.target.value, isNum ? 'number' : 'string')}
                            className="w-full h-9 rounded-lg border border-white/[0.08] bg-[#08090D] px-3 text-xs text-slate-100 outline-none focus:border-violet-500"
                          />
                        )}
                      </div>
                    );
                  })}
                </form>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-400">Document Object JSON</label>
                  <textarea
                    rows={12}
                    value={rawJsonText}
                    onChange={(e) => handleRawJsonChange(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] bg-[#08090D] p-3 font-mono text-xs text-emerald-400 outline-none focus:border-violet-500"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setEditDoc(null)}
                className="px-4 py-2 rounded-lg bg-[#151821] border border-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateRecord}
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-semibold shadow-sm hover:brightness-110 disabled:opacity-50 transition"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </ModalDrawer>
    </div>
  );
}
