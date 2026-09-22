import React, { useState, useEffect } from 'react';
import apiClient from '@/services/api/apiClient';
import {
  Radio,
  FileCheck2,
  ExternalLink,
  Plus,
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Globe2,
  ShieldCheck,
  Save,
  Trash2,
} from 'lucide-react';
import { StatCard } from '../ui/StatCard';
import { StatusBadge } from '../ui/StatusBadge';

interface SettingRecord {
  key: string;
  value: any;
}

export function SeoManagementStudio() {
  const [settings, setSettings] = useState<SettingRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // New setting form
  const [newKey, setNewKey] = useState<string>('');
  const [newValue, setNewValue] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const fetchSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/api/admin/settings');
      setSettings(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch settings records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleCreateSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await apiClient.post('/api/admin/settings', {
        key: newKey.trim(),
        value: newValue.trim(),
      });
      setSuccess(`Setting key "${newKey.trim()}" saved successfully.`);
      setNewKey('');
      setNewValue('');
      fetchSettings();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save setting.');
    } finally {
      setSaving(false);
    }
  };

  const sitemaps = [
    { name: 'Primary Index', path: '/sitemap.xml', type: 'Sitemap Index' },
    { name: 'Static Pages', path: '/sitemap-static.xml', type: 'Static Routes' },
    { name: 'Movies Catalog', path: '/sitemap-movies.xml', type: 'Catalog Entities' },
    { name: 'Dramas Series', path: '/sitemap-dramas.xml', type: 'Series Entities' },
    { name: 'Episodes Watch', path: '/sitemap-episodes.xml', type: 'Episode Streams' },
    { name: 'Articles News', path: '/sitemap-articles.xml', type: 'News & Blog' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Radio className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">SEO & Search Indexing Studio</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#9E57F6]/15 text-[#9E57F6] border border-[#9E57F6]/30">
              GOOGLEBOT OPTIMIZED
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Monitor XML sitemaps health, verify crawler directives, and manage dynamic TMDB API & metadata keys.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/robots.txt"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#141418] border border-white/[0.08] text-slate-300 hover:text-white transition"
          >
            <span>robots.txt</span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </a>
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#141418] border border-white/[0.08] text-slate-300 hover:text-white transition"
          >
            <span>sitemap.xml</span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Crawling Architecture"
          value="ASTRO SSG"
          trend={{ direction: 'up', label: '100% Pre-rendered HTML' }}
          icon={Globe2}
          accentColor="violet"
        />
        <StatCard
          label="Sitemaps Endpoints"
          value={sitemaps.length}
          trend={{ direction: 'up', label: 'Automated XML Generators' }}
          icon={FileCheck2}
          accentColor="sky"
        />
        <StatCard
          label="Structured Data"
          value="JSON-LD"
          trend={{ direction: 'up', label: 'Movie, TVSeries, Episode schemas' }}
          icon={CheckCircle2}
          accentColor="emerald"
        />
        <StatCard
          label="Robots Directives"
          value="ALLOW ALL"
          trend={{ direction: 'neutral', label: 'Admin routes disallowed' }}
          icon={ShieldCheck}
          accentColor="pink"
        />
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">{success}</span>
        </div>
      )}

      {/* Sitemaps Directory Grid */}
      <div className="bg-[#141418] border border-white/[0.06] rounded-2xl p-5 space-y-4">
        <div className="border-b border-white/[0.06] pb-3">
          <h2 className="text-sm font-bold text-slate-200">Active XML Sitemaps Endpoints</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            These endpoints generate dynamic, search-compliant XML feeds directly from Supabase content.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sitemaps.map(s => (
            <a
              key={s.path}
              href={s.path}
              target="_blank"
              rel="noreferrer"
              className="p-3.5 rounded-xl bg-[#0C0C0E] border border-white/[0.06] hover:border-[#9E57F6]/40 transition group flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-bold text-slate-200 group-hover:text-[#9E57F6] transition">
                  {s.name}
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">{s.path}</div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-slate-400 font-medium">
                {s.type}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Custom System Keys & Metadata */}
      <div className="bg-[#141418] border border-white/[0.06] rounded-2xl p-5 space-y-5">
        <div className="border-b border-white/[0.06] pb-3">
          <h2 className="text-sm font-bold text-slate-200">Global Configuration & API Parameters</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Database-backed system settings table for API tokens (e.g. TMDB_API_KEY) and runtime feature flags.
          </p>
        </div>

        {/* Add Key Form */}
        <form onSubmit={handleCreateSetting} className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={newKey}
            onChange={e => setNewKey(e.target.value)}
            placeholder="Setting Key (e.g. TMDB_API_KEY)"
            className="flex-1 min-w-[200px] px-3.5 py-2 rounded-xl bg-[#0C0C0E] border border-white/[0.08] text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#9E57F6]"
          />
          <input
            type="text"
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
            placeholder="Value / Token String"
            className="flex-1 min-w-[240px] px-3.5 py-2 rounded-xl bg-[#0C0C0E] border border-white/[0.08] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#9E57F6]"
          />
          <button
            type="submit"
            disabled={saving || !newKey.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#9E57F6] text-white hover:bg-[#8B3CE8] disabled:opacity-50 transition shadow-md shadow-[#9E57F6]/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Set Key'}</span>
          </button>
        </form>

        {/* Existing Keys Table */}
        <div className="bg-[#0C0C0E] border border-white/[0.06] rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#141418] border-b border-white/[0.06] text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="px-4 py-2.5">Key Name</th>
                <th className="px-4 py-2.5">Current Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={2} className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-[#9E57F6]" />
                    <span>Loading settings keys...</span>
                  </td>
                </tr>
              ) : settings.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-8 text-center text-slate-500">
                    No custom keys found. Add one above.
                  </td>
                </tr>
              ) : (
                settings.map(s => (
                  <tr key={s.key} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-2.5 font-mono text-[11px] font-bold text-[#9E57F6]">
                      {s.key}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-300">
                      {typeof s.value === 'object' ? JSON.stringify(s.value) : String(s.value)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
