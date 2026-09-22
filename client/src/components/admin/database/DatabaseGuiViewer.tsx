import React, { useState, useEffect } from 'react';
import apiClient from '@/services/api/apiClient';
import {
  Database,
  Layers,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Eye,
  AlertTriangle,
  Code,
  Save,
  CheckCircle2,
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { StatCard } from '../ui/StatCard';

interface CollectionInfo {
  name: string;
  count?: number;
}

export function DatabaseGuiViewer() {
  const [collections, setCollections] = useState<CollectionInfo[]>([]);
  const [selectedCol, setSelectedCol] = useState<string>('movies');
  const [dbDriver, setDbDriver] = useState<string>('Supabase / Postgres');
  const [documents, setDocuments] = useState<any[]>([]);
  const [totalDocs, setTotalDocs] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Pagination
  const [page, setPage] = useState<number>(1);
  const limit = 30;

  // View / Edit Modal states
  const [inspectDoc, setInspectDoc] = useState<any | null>(null);
  const [editDoc, setEditDoc] = useState<any | null>(null);
  const [jsonText, setJsonText] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Delete modal
  const [docToDelete, setDocToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const fetchCollections = async () => {
    try {
      const res = await apiClient.get('/api/admin/database/collections');
      const list = res.data.collections || [
        { name: 'movies' },
        { name: 'dramas' },
        { name: 'seasons' },
        { name: 'episodes' },
        { name: 'subtitles' },
        { name: 'users' },
        { name: 'settings' },
      ];
      setCollections(list);
      if (res.data.driver) setDbDriver(res.data.driver);
      if (list.length > 0 && !selectedCol) {
        setSelectedCol(list[0].name);
      }
    } catch (err: any) {
      // Fallback default list if endpoint is unavailable
      setCollections([
        { name: 'movies' },
        { name: 'dramas' },
        { name: 'seasons' },
        { name: 'episodes' },
        { name: 'subtitles' },
        { name: 'users' },
        { name: 'settings' },
      ]);
    }
  };

  const fetchDocuments = async (col: string, p: number = 1) => {
    if (!col) return;
    setLoading(true);
    setError('');
    const skip = (p - 1) * limit;

    try {
      const res = await apiClient.get(`/api/admin/database/collections/${col}`, {
        params: { limit, skip },
      });
      setDocuments(res.data.documents || []);
      setTotalDocs(res.data.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to fetch documents for collection "${col}".`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  useEffect(() => {
    if (selectedCol) {
      setPage(1);
      fetchDocuments(selectedCol, 1);
    }
  }, [selectedCol]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchDocuments(selectedCol, newPage);
  };

  const handleOpenEdit = (doc: any) => {
    setEditDoc(doc);
    setJsonText(JSON.stringify(doc, null, 2));
  };

  const handleSaveEdit = async () => {
    if (!editDoc) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const parsed = JSON.parse(jsonText);
      const docId = editDoc._id || editDoc.id;
      await apiClient.put(`/api/admin/database/collections/${selectedCol}/${docId}`, {
        document: parsed,
      });

      setSuccess(`Document "${docId}" updated successfully.`);
      setEditDoc(null);
      fetchDocuments(selectedCol, page);
    } catch (err: any) {
      setError('JSON Syntax or Save Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!docToDelete) return;
    setDeleting(true);
    setError('');
    setSuccess('');

    try {
      const docId = docToDelete._id || docToDelete.id;
      await apiClient.delete(`/api/admin/database/collections/${selectedCol}/${docId}`);
      setSuccess(`Document "${docId}" deleted successfully.`);
      setDocToDelete(null);
      fetchDocuments(selectedCol, page);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Deletion failed.');
    } finally {
      setDeleting(false);
    }
  };

  const filteredDocs = documents.filter(doc => {
    if (!searchTerm.trim()) return true;
    const str = JSON.stringify(doc).toLowerCase();
    return str.includes(searchTerm.toLowerCase());
  });

  const totalPages = Math.max(1, Math.ceil(totalDocs / limit));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">Database GUI Viewer</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#9E57F6]/15 text-[#9E57F6] border border-[#9E57F6]/30">
              RAW INSPECTOR
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Directly browse and safely manage underlying relational collections, document schemas, and record values.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl text-xs font-mono font-medium bg-[#141418] border border-white/[0.08] text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Driver: {dbDriver}
          </span>
          <button
            type="button"
            onClick={() => fetchDocuments(selectedCol, page)}
            disabled={loading}
            className="p-2 rounded-xl bg-[#141418] border border-white/[0.1] text-slate-300 hover:bg-white/[0.06] transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#9E57F6]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Collection Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {collections.map(col => (
          <button
            key={col.name}
            type="button"
            onClick={() => setSelectedCol(col.name)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
              selectedCol === col.name
                ? 'bg-[#9E57F6] text-white border-[#9E57F6] shadow-md shadow-[#9E57F6]/20'
                : 'bg-[#141418] text-slate-400 border-white/[0.06] hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="capitalize">{col.name}</span>
            {col.count !== undefined && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30 font-mono">
                {col.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">{success}</span>
        </div>
      )}

      {/* Search & Pagination Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#141418] border border-white/[0.06]">
        <div className="relative w-full max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder={`Search across current ${selectedCol} page...`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0C0C0E] border border-white/[0.08] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#9E57F6]"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono">
            Page {page} of {totalPages} ({totalDocs} records)
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => handlePageChange(page - 1)}
              className="p-1.5 rounded-lg bg-[#0C0C0E] border border-white/[0.08] text-slate-400 hover:text-white disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => handlePageChange(page + 1)}
              className="p-1.5 rounded-lg bg-[#0C0C0E] border border-white/[0.08] text-slate-400 hover:text-white disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-[#141418] border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#0C0C0E]/80 border-b border-white/[0.06] text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="px-5 py-3">Document ID</th>
                <th className="px-5 py-3">Key Metadata Preview</th>
                <th className="px-5 py-3">Timestamps</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#9E57F6]" />
                    <span>Querying database collection...</span>
                  </td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    No documents found in "{selectedCol}".
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc, idx) => {
                  const docId = doc._id || doc.id || `row-${idx}`;
                  const title = doc.title || doc.name || doc.username || doc.key || 'Record';
                  const extra = doc.slug || doc.email || doc.value || doc.status;

                  return (
                    <tr key={docId} className="hover:bg-white/[0.02] transition">
                      <td className="px-5 py-3.5 font-mono text-[11px] text-[#9E57F6] font-semibold">
                        {String(docId).slice(-12)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-200 truncate max-w-md">
                          {String(title)}
                        </div>
                        {extra && (
                          <div className="text-[11px] text-slate-500 truncate max-w-md font-mono mt-0.5">
                            {typeof extra === 'object' ? JSON.stringify(extra) : String(extra)}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px]">
                        {doc.updatedAt || doc.createdAt
                          ? new Date(doc.updatedAt || doc.createdAt).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectDoc(doc)}
                            className="p-1.5 rounded-lg bg-[#0C0C0E] border border-white/[0.08] text-slate-400 hover:text-white transition"
                            title="Inspect JSON"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(doc)}
                            className="p-1.5 rounded-lg bg-[#0C0C0E] border border-white/[0.08] text-slate-400 hover:text-[#9E57F6] transition"
                            title="Edit Record"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDocToDelete(doc)}
                            className="p-1.5 rounded-lg bg-[#0C0C0E] border border-white/[0.08] text-slate-400 hover:text-rose-400 transition"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Inspect Document Modal */}
      {inspectDoc && (
        <Modal
          isOpen={Boolean(inspectDoc)}
          onClose={() => setInspectDoc(null)}
          title={`Inspect Record: ${inspectDoc._id || inspectDoc.id || ''}`}
          size="lg"
        >
          <div className="space-y-3">
            <pre className="p-4 rounded-xl bg-[#0C0C0E] border border-white/[0.08] font-mono text-[11px] text-emerald-300 max-h-[500px] overflow-auto leading-relaxed selection:bg-emerald-500/30">
              {JSON.stringify(inspectDoc, null, 2)}
            </pre>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setInspectDoc(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#141418] border border-white/[0.1] text-slate-300 hover:bg-white/[0.06]"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Document JSON Modal */}
      {editDoc && (
        <Modal
          isOpen={Boolean(editDoc)}
          onClose={() => setEditDoc(null)}
          title={`Edit Record: ${editDoc._id || editDoc.id || ''}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                Careful: Modifying relations or IDs directly can orphan episodes or subtitles. Verify syntax before saving.
              </span>
            </div>

            <textarea
              rows={16}
              value={jsonText}
              onChange={e => setJsonText(e.target.value)}
              className="w-full p-4 rounded-xl bg-[#0C0C0E] border border-white/[0.08] font-mono text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-[#9E57F6] resize-none"
            />

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEditDoc(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#141418] border border-white/[0.1] text-slate-300 hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveEdit}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#9E57F6] text-white hover:bg-[#8B3CE8] disabled:opacity-50 transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving Changes...' : 'Save Document'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Record Confirmation Dialog */}
      {docToDelete && (
        <ConfirmDialog
          isOpen={Boolean(docToDelete)}
          onClose={() => setDocToDelete(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Database Record"
          message={`Are you sure you want to permanently delete document "${docToDelete._id || docToDelete.id}" from collection "${selectedCol}"? This action cannot be reversed.`}
          confirmLabel="Delete Record"
          confirmVariant="danger"
          loading={deleting}
        />
      )}
    </div>
  );
}
