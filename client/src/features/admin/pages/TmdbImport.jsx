'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import apiClient from '@/services/api/apiClient';
import { motion } from 'framer-motion';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import DataTable from '@/features/admin/components/DataTable';
import { useToast } from '@/features/admin/components/Toast';
import {
  Tv, Database, Search, Download, RefreshCw, CheckSquare, Clock
} from 'lucide-react';

export default function TmdbImport() {
  const { admin } = useAuth();
  const toast = useToast();
  
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
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResults([]);

    try {
      const res = await apiClient.get(`/api/admin/tmdb/search`, {
        params: { query, type }
      });
      setResults(res.data);
      setSelectedIds([]);
      if (res.data.length === 0) {
        toast.info('No items found matching search terms.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Search execution failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDiscover = async (nextSource = source) => {
    setMode('discover');
    setType('tv');
    setSource(nextSource);
    setLoading(true);
    setResults([]);
    setSelectedIds([]);

    try {
      const res = await apiClient.get('/api/admin/tmdb/discover/korean-dramas', {
        params: { source: nextSource }
      });
      const dataResults = res.data.results || [];
      setResults(dataResults);
      if (dataResults.length === 0) {
        toast.info('No Korean drama titles found for this source.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Korean drama discovery failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (tmdbId) => {
    setImportingId(tmdbId);

    try {
      const res = await apiClient.post(`/api/admin/tmdb/import`, 
        { id: tmdbId, type, isHistorical }
      );
      toast.success(res.data.message || 'Import operation completed successfully!');
      
      // Remove imported item from search list
      setResults(prev => prev.filter(item => item.id !== tmdbId));
      setSelectedIds(prev => prev.filter(id => id !== tmdbId));
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cascading import failed.');
    } finally {
      setImportingId(null);
    }
  };

  const toggleSelected = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === results.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(results.map(item => item.id));
    }
  };

  const handleBulkImport = async () => {
    if (selectedIds.length === 0) return;
    setBulkImporting(true);

    try {
      const res = await apiClient.post('/api/admin/tmdb/bulk-import',
        { ids: selectedIds, type: 'tv', isHistorical }
      );
      toast.success(res.data.message || 'Bulk import completed.');
      setResults(prev => prev.filter(item => !selectedIds.includes(item.id)));
      setSelectedIds([]);
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk import failed.');
    } finally {
      setBulkImporting(false);
    }
  };

  const historyColumns = [
    {
      key: 'title',
      label: 'Title',
      sortable: true,
      render: (val, row) => (
        <div className="font-semibold text-slate-100 flex items-center gap-2">
          <span>{val}</span>
        </div>
      )
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (val) => (
        <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 uppercase">
          {val === 'tv' ? 'TV Series' : 'Movie'}
        </span>
      )
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
          Failed: 'bg-red-500/10 text-red-400 border-red-500/20'
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
    <div className="min-h-screen bg-luxury-950 text-slate-100 flex flex-col lg:flex-row">
      <AdminSidebar />

      <main className="flex-grow p-6 sm:p-8 overflow-y-auto min-w-0">
        <div className="max-w-5xl mx-auto">
          
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">Korean Drama Import Center</h1>
            <p className="text-slate-400 text-xs mt-1">Discover, search, and bulk-import Korean dramas from TMDB metadata with seasons, episodes, cast, and SEO fields.</p>
          </div>

          {/* Visual Step Indicator */}
          <div className="flex flex-col sm:flex-row gap-2 mb-8 bg-luxury-900/40 border border-white/5 p-3 rounded-2xl">
            <div className={`flex-1 flex items-center gap-2.5 p-2 rounded-xl transition ${results.length === 0 ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' : 'text-slate-500 bg-white/[0.01]'}`}>
              <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${results.length === 0 ? 'bg-brand-primary text-white font-mono' : 'bg-white/5 font-mono'}`}>1</span>
              <span className="text-xs font-bold uppercase tracking-wider">Search & Discover</span>
            </div>
            <div className={`flex-1 flex items-center gap-2.5 p-2 rounded-xl transition ${results.length > 0 && !importingId && !bulkImporting ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' : 'text-slate-500 bg-white/[0.01]'}`}>
              <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${results.length > 0 && !importingId && !bulkImporting ? 'bg-brand-primary text-white font-mono' : 'bg-white/5 font-mono'}`}>2</span>
              <span className="text-xs font-bold uppercase tracking-wider">Preview Metadata</span>
            </div>
            <div className={`flex-1 flex items-center gap-2.5 p-2 rounded-xl transition ${importingId || bulkImporting ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' : 'text-slate-500 bg-white/[0.01]'}`}>
              <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${importingId || bulkImporting ? 'bg-brand-primary text-white font-mono' : 'bg-white/5 font-mono'}`}>3</span>
              <span className="text-xs font-bold uppercase tracking-wider">Confirm & Import</span>
            </div>
          </div>

          <div className="bg-luxury-900 border border-white/5 p-5 rounded-2xl mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Tv className="w-4 h-4 text-brand-primary" /> Korean Drama Discovery
                </h2>
                <p className="text-[11px] text-slate-500 mt-1">Use presets to find popular and trending dramas without typing a title.</p>
              </div>
              <button
                type="button"
                onClick={() => handleDiscover(source)}
                disabled={loading}
                className="h-10 px-4 rounded-xl bg-white/5 border border-white/10 hover:border-brand-primary/40 text-slate-200 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Source
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
              {discoverSources.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleDiscover(item.id)}
                  className={`h-10 px-3 rounded-xl border text-[11px] font-black uppercase tracking-wider transition ${
                    source === item.id && mode === 'discover'
                      ? 'bg-brand-primary border-brand-primary text-white'
                      : 'bg-luxury-950 border-white/10 text-slate-400 hover:text-white hover:border-brand-primary/30'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="bg-luxury-900 border border-white/5 p-6 rounded-2xl mb-8">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-grow relative">
                <input
                  type="text"
                  required
                  placeholder={type === 'movie' ? "Search K-Movies (e.g. Train to Busan, Parasite)..." : "Search K-Dramas (e.g. Moving, Goblin)..."}
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setMode('search'); }}
                  className="w-full pl-11 pr-4 h-12 bg-luxury-950 border border-white/10 rounded-xl focus:border-brand-primary outline-none text-slate-200 text-sm transition"
                />
                <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
              </div>

              {/* Selector */}
              <div className="flex bg-luxury-950 border border-white/10 p-1.5 rounded-xl self-start sm:self-auto flex-shrink-0">
                <button
                  type="button"
                  onClick={() => { setType('movie'); setMode('search'); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                    type === 'movie' ? 'bg-brand-primary text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Movies
                </button>
                <button
                  type="button"
                  onClick={() => { setType('tv'); setMode('search'); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                    type === 'tv' ? 'bg-brand-primary text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  TV Series
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-6 h-12 bg-brand-primary hover:bg-opacity-90 disabled:bg-opacity-50 text-white font-bold rounded-xl text-sm transition self-stretch flex items-center justify-center gap-2"
              >
                {loading ? 'Searching...' : 'Find Matches'}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-6">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isHistorical}
                  onChange={(e) => setIsHistorical(e.target.checked)}
                  className="w-4 h-4 rounded bg-luxury-950 border-white/10 text-brand-primary focus:ring-0 focus:ring-offset-0"
                />
                Mark imports as <span className="text-brand-primary font-bold">Historical Drama</span>
              </label>
            </div>
          </div>

          {/* Results grid */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {mode === 'discover' ? 'Discovered Korean Dramas' : 'Search Results'}
              </h3>

              {results.length > 0 && mode === 'discover' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 text-[11px] font-bold uppercase tracking-wider flex items-center gap-2"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    {selectedIds.length === results.length ? 'Clear All' : 'Select All'}
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkImport}
                    disabled={selectedIds.length === 0 || bulkImporting}
                    className="h-9 px-4 rounded-xl bg-brand-primary disabled:bg-brand-primary/40 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {bulkImporting ? 'Importing...' : `Bulk Import ${selectedIds.length}`}
                  </button>
                </div>
              )}
            </div>
            
            {loading ? (
              <div className="text-center py-16 text-slate-500">Querying metadata provider...</div>
            ) : results.length === 0 ? (
              <div className="text-center py-16 bg-luxury-900/20 rounded-2xl border border-white/5 text-slate-500 text-sm">
                Matches from TMDB will appear here. Simulated local results will trigger if the server API keys are not verified.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {results.map((item) => (
                  <div 
                    key={item.id}
                    className={`bg-luxury-900 border p-4 rounded-xl flex gap-4 transition-all hover:border-brand-primary/20 ${
                      selectedIds.includes(item.id) ? 'border-brand-primary/50 shadow-lg shadow-brand-primary/10' : 'border-white/5'
                    }`}
                  >
                    {mode === 'discover' && (
                      <label className="self-start pt-1">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelected(item.id)}
                          className="w-4 h-4 accent-brand-primary"
                        />
                      </label>
                    )}
                    <img
                      src={item.poster_path ? (item.poster_path.startsWith('http') ? item.poster_path : `https://image.tmdb.org/t/p/w185${item.poster_path}`) : 'https://placehold.co/120x180/111/fff?text=No+Photo'}
                      alt={item.title}
                      className="w-20 h-28 object-cover rounded-lg bg-luxury-950 flex-shrink-0 border border-white/5"
                    />
                    
                    <div className="flex-grow flex flex-col justify-between overflow-hidden">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-extrabold text-sm text-slate-100 truncate">{item.title}</h4>
                          <span className="text-[10px] text-brand-primary font-mono bg-brand-primary/10 px-1.5 py-0.5 rounded border border-brand-primary/20 flex-shrink-0 uppercase">
                            Rating: {item.vote_average || 'N/A'}
                          </span>
                        </div>
                        
                        {item.original_title && (
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.original_title}</p>
                        )}
                        
                        <p className="text-slate-400 text-xs mt-2 line-clamp-2 leading-relaxed">
                          {item.overview || 'No description available from TMDB.'}
                        </p>
                      </div>

                      <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/5">
                        <span className="text-[10px] text-slate-500 font-mono">
                          RELEASE: {item.release_date || 'Unknown'}
                        </span>
                        
                        <button
                          onClick={() => handleImport(item.id)}
                          disabled={importingId === item.id}
                          className="px-3.5 py-1.5 bg-brand-primary hover:bg-opacity-95 disabled:bg-opacity-50 text-white text-[11px] font-bold rounded-lg transition flex items-center gap-1.5"
                        >
                          {importingId === item.id ? (
                            <>
                              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Importing...
                            </>
                          ) : (
                            <>
                              <Download className="w-3.5 h-3.5" />
                              One-Click Import
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
          <div className="mt-12 bg-luxury-900 border border-white/5 p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-brand-primary" />
              <h3 className="text-sm font-black text-white uppercase tracking-wider">TMDB Import Execution Logs</h3>
            </div>
            <DataTable
              columns={historyColumns}
              data={history}
              loading={loadingHistory}
              searchPlaceholder="Search imports history..."
            />
          </div>

        </div>
      </main>
    </div>
  );
}
