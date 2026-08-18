'use client';

import React, { useEffect, useState, useMemo } from 'react';
import apiClient from '@/services/api/apiClient';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import ModalDrawer from '@/features/admin/components/ModalDrawer';
import { useToast } from '@/features/admin/components/Toast';
import {
  Server, Search, Database, Eye, RefreshCw, AlertCircle, X,
  FileText, Terminal, Download, Edit2, Trash2, Save,
  Layers, PlusCircle, Check
} from 'lucide-react';

export default function DatabaseViewer() {
  const toast = useToast();

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
  const fetchDocuments = async () => {
    if (!selectedCol) return;
    setLoadingDocs(true);
    setError('');
    try {
      const res = await apiClient.get(`/api/admin/database/collections/${selectedCol}?limit=${limit}&skip=${skip}`);
      setDocuments(res.data.documents || []);
      setTotalDocs(res.data.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to retrieve collection items.');
      toast.error('Failed to retrieve collection items.');
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    setSkip(0);
    fetchDocuments();
  }, [selectedCol]);

  useEffect(() => {
    fetchDocuments();
  }, [skip]);

  // Clean identifier helper to identify records easily
  const getIdentifier = (doc, collection) => {
    if (!doc) return '-';
    switch (collection) {
      case 'users':
        return doc.email || doc.username || doc._id;
      case 'admins':
        return doc.username || doc.email || doc._id;
      case 'movies':
        return doc.title || doc.originalTitle || doc._id;
      case 'dramas':
        return doc.title || doc.originalTitle || doc._id;
      case 'seasons':
        return `Season ${doc.seasonNumber || 'N/A'}`;
      case 'episodes':
        return `Episode ${doc.episodeNumber || 'N/A'}: ${doc.episodeTitle || 'No Title'}`;
      case 'genres':
        return doc.name || doc.slug || doc._id;
      case 'subtitles':
        return `${doc.language || 'Sinhala'} Subtitle (${doc.format?.toUpperCase() || 'SRT'}) v${doc.version || '1.0'}`;
      case 'reviews':
        return `${doc.reviewerName || 'Review'} - Rating: ${doc.rating || doc.imdbRating || 'N/A'}`;
      case 'comments':
        return doc.text ? (doc.text.length > 50 ? doc.text.substring(0, 50) + '...' : doc.text) : doc._id;
      case 'analytics':
        return `${doc.page || 'Page View'} (${doc.ip || 'Unknown IP'})`;
      case 'settings':
        return doc.key || doc._id;
      case 'articles':
        return doc.title || doc._id;
      case 'roles':
        return doc.name || doc._id;
      case 'permissions':
        return `${doc.name} (${doc.description || ''})`;
      default:
        return doc.title || doc.name || doc.username || doc.email || doc._id;
    }
  };

  // Determine dynamic columns to show in preview table based on document fields
  const displayColumns = useMemo(() => {
    if (documents.length === 0) return ['_id', 'createdAt'];
    const keys = new Set(['_id']);
    keys.add('Record Identifier');

    // Scan all documents to gather typical fields (excluding objects and long descriptions)
    documents.forEach(doc => {
      Object.keys(doc).forEach(key => {
        const val = doc[key];
        if (
          key !== '_id' && 
          key !== 'data' && 
          key !== 'createdAt' && 
          key !== 'updatedAt' && 
          key !== 'title' &&
          key !== 'name' &&
          key !== 'username' &&
          key !== 'email' &&
          key !== 'description' &&
          key !== 'synopsis' &&
          key !== 'content' &&
          typeof val !== 'object' && 
          String(val).length < 50
        ) {
          keys.add(key);
        }
      });
    });
    
    const fields = Array.from(keys).slice(0, 5);
    fields.push('createdAt');
    return fields;
  }, [documents]);

  // Client-side local filtering
  const filteredDocuments = useMemo(() => {
    if (!searchTerm.trim()) return documents;
    const term = searchTerm.toLowerCase();
    return documents.filter(doc => {
      return Object.entries(doc).some(([key, val]) => {
        if (typeof val === 'object') {
          return JSON.stringify(val).toLowerCase().includes(term);
        }
        return String(val).toLowerCase().includes(term);
      });
    });
  }, [documents, searchTerm]);

  // Export collection as JSON download
  const handleExportJSON = () => {
    if (documents.length === 0) return;
    const jsonStr = JSON.stringify(documents, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ksubzone_${selectedCol}_export.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  // Handle Input Changes for Dynamic Form Builder
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

  // Handle RAW JSON editing sync
  const handleRawJsonChange = (val) => {
    setRawJsonText(val);
    try {
      const parsed = JSON.parse(val);
      setEditForm(parsed);
    } catch (e) {
      // Keep state as is, parsing error handled on submit
    }
  };

  // Save/Update database record
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
      
      // Update local state list
      setDocuments(prev => prev.map(doc => doc._id === editDoc._id ? res.data.document : doc));
      
      setTimeout(() => {
        setEditDoc(null);
      }, 800);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save updates to record.');
      toast.error('Failed to save record updates.');
    } finally {
      setSaving(false);
    }
  };

  // Delete database record
  const handleDeleteRecord = async (id) => {
    if (!window.confirm(`Are you sure you want to delete this record (${id}) from table '${selectedCol}'? This action cannot be undone.`)) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      await apiClient.delete(`/api/admin/database/collections/${selectedCol}/${id}`);
      setSuccess(`Record deleted successfully.`);
      toast.success('Record deleted successfully.');
      setDocuments(prev => prev.filter(doc => doc._id !== id));
      setTotalDocs(prev => Math.max(0, prev - 1));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete record.');
      toast.error('Failed to delete record.');
    }
  };

  const handleWipeDatabase = async () => {
    const confirmInput = window.prompt(
      "WARNING: This will permanently delete all Movies, Dramas, Seasons, Episodes, Subtitles, and Articles from the live database. Active accounts and roles will NOT be deleted. Type 'WIPE' to confirm:"
    );
    if (confirmInput !== 'WIPE') {
      if (confirmInput !== null) {
        toast.error("Wipe cancelled. Confirmation word did not match.");
      }
      return;
    }

    setWiping(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiClient.post('/api/admin/database/wipe-all');
      setSuccess(res.data.message || 'Database cleared successfully.');
      toast.success('Database cleared successfully.');
      fetchCollections();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to wipe database.');
      toast.error('Failed to wipe database.');
    } finally {
      setWiping(false);
    }
  };

  return (
    <div className="min-h-screen bg-luxury-950 text-slate-100 flex flex-col lg:flex-row">
      <AdminSidebar />

      <main className="flex-grow p-6 sm:p-8 overflow-y-auto min-w-0 max-w-[1600px] w-full mx-auto">
        <div className="space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Server className="w-5 h-5 text-amber-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400">Database Browser</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">Database Manager & Records Explorer</h1>
              <p className="text-slate-400 text-xs mt-1">
                Active Engine: <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono text-[10px] uppercase font-bold">{dbDriver}</span> • Clean viewer with dynamic editing, deletion, and relations identifiers tracking.
              </p>
            </div>
            
            <div className="flex gap-2 self-start sm:self-auto flex-wrap">
              <button
                onClick={handleWipeDatabase}
                disabled={wiping}
                className="h-10 px-4 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-xs font-bold text-red-400 flex items-center gap-2 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> {wiping ? 'Wiping...' : 'Wipe Media Data'}
              </button>
              <button
                onClick={fetchCollections}
                className="h-10 px-4 rounded-xl border border-white/10 bg-white/[0.03] text-xs font-bold text-slate-200 hover:bg-white/[0.07] flex items-center gap-2 transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" /> Refresh Engine
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0" /> {success}
            </div>
          )}

          {/* Core Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
            
            {/* Sidebar Collection Lists */}
            <aside className="space-y-4">
              <div className="rounded-2xl border border-white/5 bg-luxury-900 p-4">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-slate-500" /> Tables / Collections
                </h2>
                
                {loadingCollections ? (
                  <div className="py-8 text-center text-xs text-slate-500 animate-pulse">Loading collections...</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-col gap-2 lg:gap-0 lg:space-y-1">
                    {collections.map(col => {
                      const isActive = selectedCol === col.name;
                      return (
                        <button
                          key={col.name}
                          onClick={() => { setSelectedCol(col.name); setActiveDoc(null); }}
                          className={`w-full h-10 px-3 rounded-xl text-xs font-semibold flex items-center justify-between transition text-left cursor-pointer ${
                            isActive 
                              ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold' 
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-amber-400' : 'bg-slate-600'}`} />
                            {col.name}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono ${isActive ? 'bg-amber-500/20 text-amber-400' : 'bg-luxury-950 text-slate-500'}`}>
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
            <div className="space-y-4">
              
              {/* Toolbar */}
              <div className="rounded-2xl border border-white/5 bg-luxury-900 p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:max-w-md">
                  <input
                    type="text"
                    placeholder={`Search within '${selectedCol}' records...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 rounded-xl text-xs bg-luxury-950 border border-white/10 focus:border-amber-400/50 outline-none text-slate-200 transition"
                  />
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                  <button
                    onClick={handleExportJSON}
                    disabled={documents.length === 0}
                    className="h-10 px-4 rounded-xl border border-white/10 bg-white/[0.03] text-xs font-bold text-slate-200 hover:bg-white/[0.07] flex items-center justify-center gap-2 transition disabled:opacity-50 flex-1 md:flex-initial cursor-pointer"
                  >
                    <Download className="w-4 h-4" /> Export JSON
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="rounded-2xl border border-white/5 bg-luxury-900 overflow-hidden shadow-2xl">
                {loadingDocs ? (
                  <div className="py-24 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                    Fetching documents from database...
                  </div>
                ) : filteredDocuments.length === 0 ? (
                  <div className="py-24 text-center text-xs text-slate-500">
                    No documents found in '{selectedCol}'.
                  </div>
                ) : (
                  <div className="overflow-x-auto font-sans">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 bg-luxury-950/40 text-[10px] font-black uppercase tracking-wider text-slate-400">
                          {displayColumns.map(col => (
                            <th key={col} className="px-5 py-4">{col}</th>
                          ))}
                          <th className="px-5 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                        {filteredDocuments.map(doc => (
                          <tr key={doc._id} className="hover:bg-white/[0.01] transition-colors group">
                            {displayColumns.map(col => {
                              if (col === 'Record Identifier') {
                                return (
                                  <td key={col} className="px-5 py-4 max-w-[220px] truncate font-bold text-white">
                                    {getIdentifier(doc, selectedCol)}
                                  </td>
                                );
                              }
                              let val = doc[col];
                              if (typeof val === 'boolean') val = val ? 'true' : 'false';
                              if (typeof val === 'object' && val !== null) val = '{...}';
                              return (
                                <td key={col} className="px-5 py-4 max-w-[150px] truncate font-mono text-[11px] text-slate-400">
                                  {val !== undefined && val !== null ? String(val) : '-'}
                                </td>
                              );
                            })}
                            
                            {/* Action columns */}
                            <td className="px-5 py-3 text-right">
                              <div className="inline-flex gap-1.5">
                                <button
                                  onClick={() => setActiveDoc(doc)}
                                  className="h-8 px-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-[10px] font-bold hover:bg-white/10 transition flex items-center gap-1 cursor-pointer"
                                  title="View raw JSON"
                                >
                                  <Eye className="w-3.5 h-3.5" /> View
                                </button>
                                <button
                                  onClick={() => handleEditClick(doc)}
                                  className="h-8 px-2.5 rounded-lg bg-amber-500/15 border border-amber-500/20 text-amber-400 text-[10px] font-bold hover:bg-amber-500 hover:text-white transition flex items-center gap-1 cursor-pointer"
                                  title="Edit properties"
                                >
                                  <Edit2 className="w-3.5 h-3.5" /> Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteRecord(doc._id)}
                                  className="h-8 px-2.5 rounded-lg bg-red-500/15 border border-red-500/20 text-red-400 text-[10px] font-bold hover:bg-red-500 hover:text-white transition flex items-center gap-1 cursor-pointer"
                                  title="Delete record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
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
                  <div className="px-5 py-4 border-t border-white/5 bg-luxury-950/20 flex items-center justify-between gap-4 text-xs text-slate-400">
                    <span>
                      Showing <b className="text-slate-200">{skip + 1}</b> to <b className="text-slate-200">{Math.min(skip + limit, totalDocs)}</b> of <b className="text-slate-200">{totalDocs}</b> records
                    </span>
                    <div className="flex gap-2">
                      <button
                        disabled={skip === 0 || loadingDocs}
                        onClick={() => setSkip(prev => Math.max(0, prev - limit))}
                        className="h-8 px-3.5 rounded-lg border border-white/10 text-[10px] font-bold text-slate-200 disabled:opacity-50 hover:bg-white/5 transition cursor-pointer"
                      >
                        Previous
                      </button>
                      <button
                        disabled={skip + limit >= totalDocs || loadingDocs}
                        onClick={() => setSkip(prev => prev + limit)}
                        className="h-8 px-3.5 rounded-lg border border-white/10 text-[10px] font-bold text-slate-200 disabled:opacity-50 hover:bg-white/5 transition cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* JSON Viewer Modal Drawer */}
      <ModalDrawer
        isOpen={Boolean(activeDoc)}
        onClose={() => setActiveDoc(null)}
        title="Document Inspector"
        size="lg"
      >
        {activeDoc && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">_id: {activeDoc._id}</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-luxury-950 p-4.5 overflow-auto max-h-[70vh] font-mono text-xs leading-5 text-emerald-400 select-text">
              <div className="mb-2.5 text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5 border-b border-white/5 pb-2">
                <Terminal className="w-3.5 h-3.5" /> Parsed Fields Tree
              </div>
              <pre>{JSON.stringify(activeDoc, null, 2)}</pre>
            </div>
            <div className="flex justify-end pt-3">
              <button
                onClick={() => setActiveDoc(null)}
                className="h-10 px-5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-200 hover:bg-white/10 transition cursor-pointer"
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
          <div className="space-y-5">
            {/* Form Mode Selector tabs */}
            <div className="flex border-b border-white/5 bg-luxury-950/20 py-2 gap-4">
              <button
                type="button"
                onClick={() => setEditTab('fields')}
                className={`py-1 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${editTab === 'fields' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Form Fields
              </button>
              <button
                type="button"
                onClick={() => setEditTab('json')}
                className={`py-1 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${editTab === 'json' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Raw JSON
              </button>
            </div>

            {/* Form Editor Body */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400">
                  {success}
                </div>
              )}

              {editTab === 'fields' ? (
                <form onSubmit={handleUpdateRecord} className="grid grid-cols-1 gap-4">
                  {Object.entries(editForm).map(([key, value]) => {
                    const isBool = typeof value === 'boolean';
                    const isNum = typeof value === 'number';
                    const isLongText = typeof value === 'string' && value.length > 65;
                    const isObj = typeof value === 'object' && value !== null;

                    if (isObj) {
                      return (
                        <div key={key} className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{key}</label>
                          <textarea
                            disabled
                            rows={3}
                            value={JSON.stringify(value, null, 2)}
                            className="w-full rounded-xl border border-white/5 bg-luxury-950/40 px-3 py-2 text-xs font-mono text-slate-500 select-text cursor-not-allowed"
                          />
                          <span className="text-[9px] text-slate-600">Objects/Arrays can only be updated in the "Raw JSON" tab.</span>
                        </div>
                      );
                    }

                    return (
                      <div key={key} className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                          {key}
                          <span className="text-[9px] text-slate-600 font-mono">({typeof value})</span>
                        </label>

                        {isBool ? (
                          <div className="flex items-center h-11 bg-luxury-950 px-4 rounded-xl border border-white/5">
                            <input
                              type="checkbox"
                              checked={!!value}
                              id={`edit-bool-${key}`}
                              onChange={(e) => handleFormFieldChange(key, e.target.checked, 'checkbox')}
                              className="w-5 h-5 rounded border-white/10 bg-luxury-950 text-amber-500 focus:ring-amber-500 focus:ring-offset-luxury-950 cursor-pointer"
                            />
                            <label htmlFor={`edit-bool-${key}`} className="ml-3 text-xs text-slate-300 font-bold select-none cursor-pointer">
                              Enabled / Active
                            </label>
                          </div>
                        ) : isLongText ? (
                          <textarea
                            rows={4}
                            value={String(value)}
                            onChange={(e) => handleFormFieldChange(key, e.target.value, 'string')}
                            className="w-full rounded-xl border border-white/10 bg-luxury-950 px-4 py-3 text-xs text-slate-100 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                          />
                        ) : (
                          <input
                            type={isNum ? 'number' : 'text'}
                            value={value !== null ? String(value) : ''}
                            onChange={(e) => handleFormFieldChange(key, e.target.value, isNum ? 'number' : 'string')}
                            className="w-full h-11 rounded-xl border border-white/10 bg-luxury-950 px-4 text-xs text-slate-100 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                          />
                        )}
                      </div>
                    );
                  })}
                </form>
              ) : (
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Document Object JSON</label>
                  <textarea
                    rows={12}
                    value={rawJsonText}
                    onChange={(e) => handleRawJsonChange(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-luxury-950 p-4 font-mono text-xs text-emerald-400 outline-none focus:border-amber-400"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setEditDoc(null)}
                className="h-10 px-5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-200 hover:bg-white/10 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateRecord}
                disabled={saving}
                className="h-10 px-5 rounded-xl bg-amber-500 text-white text-xs font-black uppercase tracking-wider hover:bg-amber-600 disabled:opacity-50 transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </ModalDrawer>

    </div>
  );
}
