'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import apiClient from '@/services/api/apiClient';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import AdminTopBar from '@/features/admin/components/AdminTopBar';
import { useToast } from '@/features/admin/components/Toast';
import {
  TrendingUp, Film, Tv, Languages, Star, Users, Settings,
  Database, ShieldCheck, CheckCircle, Sliders, Calendar, Sparkles, Plus, Key
} from 'lucide-react';

export default function SeoManager() {
  const { admin } = useAuth();
  const toast = useToast();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Custom setting form fields
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await apiClient.get('/api/admin/settings');
      setSettings(res.data || []);
    } catch (err) {
      setError('Failed to fetch settings record list');
      toast.error('Failed to fetch settings record list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!key.trim() || !value.trim()) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await apiClient.post('/api/admin/settings', {
        key: key.trim(),
        value: value.trim()
      });
      
      setSuccess('Setting saved successfully!');
      toast.success('Setting saved successfully!');
      setKey('');
      setValue('');
      fetchSettings();
    } catch (err) {
      setError('Failed to save settings to database.');
      toast.error('Failed to save settings to database.');
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
          
          <div className="pb-2 border-b border-white/[0.05]">
            <h1 className="text-2xl font-extrabold text-slate-100 font-display tracking-tight">System Configuration & API Keys</h1>
            <p className="text-xs text-slate-400 mt-0.5">Configure global platform attributes, TMDB API keys, and dynamic metadata parameters</p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>{success}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
            {/* Settings Table Card */}
            <div className="rounded-xl border border-white/[0.06] bg-[#11131A] overflow-hidden">
              <div className="p-4 border-b border-white/[0.05]">
                <h3 className="text-sm font-bold text-slate-100">Registered Parameters</h3>
                <p className="text-xs text-slate-500 mt-0.5">Key-value configurations stored in the primary runtime database</p>
              </div>

              {loading ? (
                <div className="py-16 text-center text-xs text-slate-500">Loading system parameters...</div>
              ) : settings.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-500">No custom configuration keys registered yet.</div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {settings.map((s) => (
                    <div key={s._id} className="p-3.5 sm:px-5 flex items-center justify-between gap-4 hover:bg-[#151821]/50 transition">
                      <div className="min-w-0">
                        <span className="font-mono text-xs font-bold text-violet-400 block truncate">{s.key}</span>
                        <span className="text-[10px] text-slate-500 font-mono block mt-0.5 truncate max-w-md">{s.value}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">
                        {new Date(s.updatedAt || s.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Setting Card */}
            <div className="rounded-xl border border-white/[0.06] bg-[#11131A] p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-violet-400" /> Add / Update Parameter
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Register a new key or overwrite existing value</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Configuration Key</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TMDB_API_KEY"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Value</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Parameter value..."
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 font-mono leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-xs font-semibold text-white rounded-lg shadow-sm hover:brightness-110 disabled:opacity-50 transition"
                >
                  {saving ? 'Saving...' : 'Save Parameter'}
                </button>
              </form>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
