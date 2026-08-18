'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import apiClient from '@/services/api/apiClient';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import { useToast } from '@/features/admin/components/Toast';
import {
  TrendingUp, Film, Tv, Languages, Star, Users, Settings,
  Database, ShieldCheck, CheckCircle, Sliders, Calendar, Sparkles
} from 'lucide-react';

export default function SeoManager() {
  const { admin } = useAuth();
  const toast = useToast();
  
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
    <div className="min-h-screen bg-luxury-950 text-slate-100 flex flex-col lg:flex-row">
      <AdminSidebar />

      {/* Primary Details Panel */}
      <main className="flex-grow p-6 sm:p-8 overflow-y-auto min-w-0">
        <div className="max-w-5xl mx-auto space-y-6">
          
          <div className="flex items-center gap-2 border-b border-white/5 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Settings className="w-5 h-5 text-brand-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-primary">Configuration Registers</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">System Settings & API Keys</h1>
              <p className="text-slate-400 text-xs mt-1">Configure global platform attributes, TMDB API keys, and dynamic metadata parameters</p>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>{success}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Left: Input Form */}
            <div className="bg-luxury-900 border border-white/5 p-5 sm:p-6 rounded-2xl space-y-5">
              <h3 className="text-xs font-black uppercase tracking-wider text-brand-primary flex items-center gap-2 border-b border-white/5 pb-2">
                <ShieldCheck className="w-4.5 h-4.5" />
                Configure Key-Value
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Setting Key Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TMDB_API_KEY, SMTP_HOST"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary font-mono transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Setting Value</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter configuration value..."
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 bg-brand-primary hover:bg-opacity-95 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-brand-primary/10 cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Config Key'}
                </button>
              </form>
            </div>

            {/* Right: Active Settings */}
            <div className="lg:col-span-2 bg-luxury-900 border border-white/5 p-5 sm:p-6 rounded-2xl space-y-5">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2 border-b border-white/5 pb-2">
                <Sliders className="w-4.5 h-4.5 text-brand-secondary" />
                Active System Setting Parameter Registers
              </h3>

              {loading ? (
                <div className="text-slate-500 text-xs text-center py-12">Checking settings...</div>
              ) : settings.length === 0 ? (
                <p className="text-slate-500 text-xs text-center py-12 font-mono">No custom configurations registered. Use the left panel to seed settings!</p>
              ) : (
                <div className="space-y-3 font-mono text-xs max-h-[60vh] overflow-y-auto pr-1">
                  {settings.map((item) => (
                    <div 
                      key={item._id}
                      className="p-3.5 bg-luxury-950/60 rounded-xl border border-white/5 flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:border-white/10 transition"
                    >
                      <div className="min-w-0">
                        <span className="text-brand-accent font-black block sm:inline">{item.key}:</span>
                        <span className="text-slate-300 ml-0 sm:ml-2 break-all font-sans font-bold">
                          {typeof item.value === 'object' && item.value !== null
                            ? JSON.stringify(item.value)
                            : String(item.value ?? '')}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 flex-shrink-0 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
