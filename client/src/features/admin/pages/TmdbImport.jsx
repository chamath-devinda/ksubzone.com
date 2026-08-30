'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import apiClient from '@/services/api/apiClient';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import AdminTopBar from '@/features/admin/components/AdminTopBar';
import DataTable from '@/features/admin/components/DataTable';
import { useToast } from '@/features/admin/components/Toast';
import {
  Tv, Database, Search, Download, RefreshCw, CheckSquare, Clock, Sparkles
} from 'lucide-react';

const IMPORT_TIMEOUT_MS = 240000;

export default function TmdbImport() {
  const { admin } = useAuth();
  const toast = useToast();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('tv'); // 'movie' or 'tv'
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [mode, setMode] = useState('discover'); // 'discover' or 'search'
  const [source, setSource] = useState('popular');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isHistorical, setIsHistorical] = useState(false);

  // Import state
  const [importingId, setImportingId] = useState(null);
  const [bulkImporting, setBulkImporting] = useState(false);

  // Import history states
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const discoverSources = [
    { id: 'popular', label: 'Popular K-Dramas' },
    { id: 'top_rated', label: 'Top Rated' },
    { id: 'latest', label: 'Latest Releases' },
    { id: 'trending', label: 'Trending Now' },
    { id: 'airing', label: 'Airing Now' }
  ];

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await apiClient.get('/api/admin/tmdb/history');
      setHistory(res.data);
    } catch (err) {
      console.error('Failed to load TMDB import history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    handleDiscover('popular');
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;
    setLoading(true);
    setMode('search');
    try {
      const res = await apiClient.get(`/api/admin/tmdb/search?query=${encodeURIComponent(query)}&type=${type}`);
      setResults(res.data);
      setSelectedIds([]);
    } catch (err) {
      toast.error('Search query failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDiscover = async (src) => {
    setSource(src);
    setMode('discover');
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/admin/tmdb/discover?source=${src}`);
      setResults(res.data);
      setSelectedIds([]);
    } catch (err) {
      toast.error('Failed to discover dramas from TMDB');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (tmdbId) => {
    setImportingId(tmdbId);
    try {
      const res = await apiClient.post(
        '/api/admin/tmdb/import',
        { tmdbId, type, isHistorical },
        { timeout: IMPORT_TIMEOUT_MS }
      );
      toast.success(res.data.message || 'Media imported successfully with full seasons and episodes!');
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImportingId(null);
    }
  };

  const handleBulkImport = async () => {
    if (selectedIds.length === 0) return;
    setBulkImporting(true);
    try {
      const res = await apiClient.post(
        '/api/admin/tmdb/bulk-import',
        { tmdbIds: selectedIds, type: 'tv', isHistorical },
        { timeout: IMPORT_TIMEOUT_MS }
      );
      toast.success(`Bulk import completed: ${res.data.successCount} added, ${res.data.failedCount} skipped.`);
      setSelectedIds([]);
      fetchHistory();
    } catch (err) {
      toast.error('Bulk import process failed');
    } finally {
      setBulkImporting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === results.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(results.map(r => r.id));
    }
  };

  const toggleSelected = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const historyColumns = [
    {
      key: 'title',
      label: 'Title',
      sortable: true,
      render: (val, row) => (
        <span className="font-bold text-slate-200 block text-xs truncate max-w-[280px]">
          {val || row.name || 'Untitled'}
        </span>
      )
    },
    {
      key: 'type',
      label: 'Media Type',
      sortable: true,
      render: (val) => <span className="uppercase text-[10px] font-mono font-bold text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">{val}</span>
    },
    {
      key: 'tmdbId',
      label: 'TMDB ID',
      sortable: true,
      render: (val) => <span className="font-mono text-slate-400 text-xs">{val}</span>
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val) => {
        const colors = {
          Success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          Duplicate: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          Failed: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        };
        return (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colors[val] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
            {val}
          </span>
        );
      }
    },
    {
      key: 'timestamp',
      label: 'Date',
      sortable: true,
      render: (val) => <span className="text-slate-500 font-mono text-xs">{val}</span>
    }
  ];

  return (
    <div className="admin-shell min-h-screen bg-[#08090D] text-slate-100 flex flex-col lg:flex-row">
      <AdminSidebar mobileOpen={mobileOpen} onCloseMobileNav={() => setMobileOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <AdminTopBar onOpenMobileNav={() => setMobileOpen(true)} />

        <main className="admin-main flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-[1560px] w-full mx-auto space-y-6">
          
          <div className="pb-2 border-b border-white/[0.05]">
            <h1 className="text-2xl font-extrabold text-slate-100 font-display tracking-tight">TMDB Media Importer</h1>
            <p className="text-xs text-slate-400 mt-0.5">Discover, search, and bulk-import Korean dramas and movies from TMDB with seasons, episodes, cast, and SEO fields</p>
          </div>

          {/* Discovery Presets Card */}
          <div className="bg-[#11131A] border border-white/[0.06] p-4 sm:p-5 rounded-xl space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" /> Korean Drama Discovery
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Use presets to find popular and trending dramas without typing a title.</p>
              </div>
              <button
                type="button"
                onClick={() => handleDiscover(source)}
                disabled={loading}
                className="h-8 px-3 rounded-lg bg-[#151821] border border-white/[0.08] text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {discoverSources.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleDiscover(item.id)}
                  className={`h-9 px-3 rounded-lg border text-xs font-semibold transition ${
                    source === item.id && mode === 'discover'
                      ? 'bg-violet-600 border-violet-500 text-white shadow-sm'
                      : 'bg-[#08090D] border-white/[0.08] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Form Card */}
          <div className="bg-[#11131A] border border-white/[0.06] p-4 sm:p-5 rounded-xl space-y-3.5">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-grow relative">
                <input
                  type="text"
                  required
                  placeholder={type === 'movie' ? "Search K-Movies (e.g. Wonderland, Parasite)..." : "Search K-Dramas (e.g. Queen of Tears, Moving)..."}
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setMode('search'); }}
                  className="w-full pl-9 pr-3.5 h-10 bg-[#08090D] border border-white/[0.08] rounded-lg focus:border-violet-500 outline-none text-slate-100 text-xs transition"
                />
                <Search className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-500" />
              </div>

              {/* Selector */}
              <div className="flex bg-[#08090D] border border-white/[0.08] p-1 rounded-lg self-start sm:self-auto flex-shrink-0">
                <button
                  type="button"
                  onClick={() => { setType('movie'); setMode('search'); }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                    type === 'movie' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Movies
                </button>
                <button
                  type="button"
                  onClick={() => { setType('tv'); setMode('search'); }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                    type === 'tv' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Dramas
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-4 h-10 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:brightness-110 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition shadow-sm flex items-center justify-center gap-1.5 flex-shrink-0"
              >
                {loading ? 'Searching...' : 'Find Matches'}
              </button>
            </form>

            <div className="pt-2 border-t border-white/[0.04] flex items-center gap-6">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isHistorical}
                  onChange={(e) => setIsHistorical(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#08090D] border-white/20 text-violet-600 focus:ring-0"
                />
                <span>Mark imports as <b className="text-violet-400">Historical Drama</b></span>
              </label>
            </div>
          </div>

          {/* Results grid */}
          <div className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {mode === 'discover' ? 'Discovered Korean Dramas' : 'Search Results'}
              </h3>

              {results.length > 0 && mode === 'discover' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="h-8 px-3 rounded-lg bg-[#11131A] border border-white/[0.08] hover:bg-white/[0.04] text-slate-300 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>{selectedIds.length === results.length ? 'Clear All' : 'Select All'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkImport}
                    disabled={selectedIds.length === 0 || bulkImporting}
                    className="h-8 px-3.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-semibold disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{bulkImporting ? 'Importing...' : `Bulk Import (${selectedIds.length})`}</span>
                  </button>
                </div>
              )}
            </div>
            
            {loading ? (
              <div className="text-center py-16 text-slate-500 text-xs">Querying TMDB metadata provider...</div>
            ) : results.length === 0 ? (
              <div className="text-center py-16 bg-[#11131A] rounded-xl border border-white/[0.06] text-slate-500 text-xs">
                Matches from TMDB will appear here.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map((item) => (
                  <div 
                    key={item.id}
                    className={`bg-[#11131A] border p-3.5 rounded-xl flex gap-3.5 transition-all hover:border-white/[0.12] ${
                      selectedIds.includes(item.id) ? 'border-violet-500/50 bg-[#13151D]' : 'border-white/[0.06]'
                    }`}
                  >
                    {mode === 'discover' && (
                      <label className="self-start pt-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelected(item.id)}
                          className="w-4 h-4 accent-violet-600"
                        />
                      </label>
                    )}
                    <img
                      src={item.poster_path ? (item.poster_path.startsWith('http') ? item.poster_path : `https://image.tmdb.org/t/p/w185${item.poster_path}`) : 'https://placehold.co/120x180/111/fff?text=No+Photo'}
                      alt={item.title}
                      className="w-16 h-24 object-cover rounded-lg bg-[#151821] flex-shrink-0 border border-white/[0.06]"
                    />
                    
                    <div className="flex-grow flex flex-col justify-between overflow-hidden min-w-0">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-bold text-xs text-slate-100 truncate">{item.title}</h4>
                          <span className="text-[9px] text-violet-400 font-mono bg-violet-500/10 px-1.5 py-0.2 rounded border border-violet-500/20 flex-shrink-0">
                            ★ {item.vote_average || '—'}
                          </span>
                        </div>
                        
                        {item.original_title && (
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">{item.original_title}</p>
                        )}
                        
                        <p className="text-slate-400 text-[11px] mt-1.5 line-clamp-2 leading-relaxed">
                          {item.overview || 'No overview provided.'}
                        </p>
                      </div>

                      <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-white/[0.04]">
                        <span className="text-[10px] text-slate-500 font-mono">
                          {item.release_date || 'TBD'}
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => handleImport(item.id)}
                          disabled={importingId === item.id}
                          className="px-2.5 py-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-[10px] font-semibold rounded-lg transition flex items-center gap-1"
                        >
                          {importingId === item.id ? (
                            <>
                              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Importing...</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-3 h-3" />
                              <span>Import</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Import History Table */}
          <div className="mt-8 bg-[#11131A] border border-white/[0.06] p-4 sm:p-5 rounded-xl space-y-3.5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">TMDB Import Execution Logs</h3>
            </div>
            <DataTable
              columns={historyColumns}
              data={history}
              loading={loadingHistory}
              searchPlaceholder="Search imports history..."
              searchKey="title"
            />
          </div>

        </main>
      </div>
    </div>
  );
}
