import React, { useState, useEffect } from 'react';
import apiClient from '@/services/api/apiClient';
import {
  Settings2,
  Palette,
  Search,
  Link as LinkIcon,
  Type,
  Globe2,
  Bot,
  ShieldAlert,
  Code,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  Sparkles,
} from 'lucide-react';
import { StatCard } from '../ui/StatCard';

const TABS = [
  { id: 'brand', label: 'Brand & Identity', icon: Palette },
  { id: 'seo', label: 'SEO & Metadata', icon: Search },
  { id: 'navigation', label: 'Navbar Links', icon: LinkIcon },
  { id: 'home', label: 'Homepage Labels', icon: Type },
  { id: 'footer', label: 'Footer Controls', icon: Globe2 },
  { id: 'ai', label: 'AI Engine', icon: Bot },
  { id: 'system', label: 'System & Maintenance', icon: ShieldAlert },
  { id: 'advanced', label: 'Advanced JSON', icon: Code },
];

export function SiteSettingsManager() {
  const [activeTab, setActiveTab] = useState<string>('brand');
  const [draft, setDraft] = useState<any>({});
  const [jsonText, setJsonText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/api/admin/site-content');
      const data = res.data || {};
      setDraft(data);
      setJsonText(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch site settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleFieldChange = (section: string, field: string, value: any) => {
    setDraft((prev: any) => {
      const updated = {
        ...prev,
        [section]: {
          ...(prev[section] || {}),
          [field]: value,
        },
      };
      setJsonText(JSON.stringify(updated, null, 2));
      return updated;
    });
  };

  const handleSaveAll = async (payloadToSave?: any) => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let finalData = payloadToSave || draft;
      if (activeTab === 'advanced') {
        finalData = JSON.parse(jsonText);
        setDraft(finalData);
      }

      // Site content is updated through the backend's idempotent PUT route.
      await apiClient.put('/api/admin/site-content', finalData);
      setSuccess('Site settings saved and applied to live platform successfully!');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  // Helper for array field updates (e.g. navigation links)
  const handleAddLink = (section: string, listKey: string) => {
    setDraft((prev: any) => {
      const currentList = prev[section]?.[listKey] || [];
      const updated = {
        ...prev,
        [section]: {
          ...(prev[section] || {}),
          [listKey]: [...currentList, { label: 'New Link', href: '/' }],
        },
      };
      setJsonText(JSON.stringify(updated, null, 2));
      return updated;
    });
  };

  const handleRemoveLink = (section: string, listKey: string, index: number) => {
    setDraft((prev: any) => {
      const currentList = prev[section]?.[listKey] || [];
      const updated = {
        ...prev,
        [section]: {
          ...(prev[section] || {}),
          [listKey]: currentList.filter((_: any, idx: number) => idx !== index),
        },
      };
      setJsonText(JSON.stringify(updated, null, 2));
      return updated;
    });
  };

  const handleUpdateLink = (
    section: string,
    listKey: string,
    index: number,
    field: string,
    val: string
  ) => {
    setDraft((prev: any) => {
      const currentList = [...(prev[section]?.[listKey] || [])];
      if (currentList[index]) {
        currentList[index] = { ...currentList[index], [field]: val };
      }
      const updated = {
        ...prev,
        [section]: {
          ...(prev[section] || {}),
          [listKey]: currentList,
        },
      };
      setJsonText(JSON.stringify(updated, null, 2));
      return updated;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Settings2 className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">Site Builder & Settings</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#9E57F6]/15 text-[#9E57F6] border border-[#9E57F6]/30">
              DYNAMIC CONFIG
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Customize branding assets, SEO metadata, navigation menus, AI engine selections, and site-wide maintenance gate.
          </p>
        </div>

        <button
          type="button"
          disabled={saving || loading}
          onClick={() => handleSaveAll()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#9E57F6] text-white hover:bg-[#8B3CE8] disabled:opacity-50 transition shadow-lg shadow-[#9E57F6]/20"
        >
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>{saving ? 'Applying...' : 'Save All Settings'}</span>
        </button>
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

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-white/[0.06]">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 whitespace-nowrap ${
                isActive
                  ? 'border-[#9E57F6] text-white bg-white/[0.03]'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.01]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#9E57F6]' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="bg-[#141418] border border-white/[0.06] rounded-2xl p-6">
        {loading ? (
          <div className="py-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#9E57F6]" />
            <span>Loading configuration data...</span>
          </div>
        ) : (
          <>
            {/* Brand Tab */}
            {activeTab === 'brand' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Site Name</label>
                  <input
                    type="text"
                    value={draft.brand?.siteName || ''}
                    onChange={e => handleFieldChange('brand', 'siteName', e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0C0C0E] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-[#9E57F6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Short Tagline</label>
                  <input
                    type="text"
                    value={draft.brand?.tagline || ''}
                    onChange={e => handleFieldChange('brand', 'tagline', e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0C0C0E] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-[#9E57F6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Primary Main URL</label>
                  <input
                    type="text"
                    value={draft.brand?.primaryUrl || ''}
                    onChange={e => handleFieldChange('brand', 'primaryUrl', e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0C0C0E] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-[#9E57F6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Header Logo URL</label>
                  <input
                    type="text"
                    value={draft.brand?.headerLogoUrl || ''}
                    onChange={e => handleFieldChange('brand', 'headerLogoUrl', e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0C0C0E] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-[#9E57F6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Footer Logo URL</label>
                  <input
                    type="text"
                    value={draft.brand?.footerLogoUrl || ''}
                    onChange={e => handleFieldChange('brand', 'footerLogoUrl', e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0C0C0E] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-[#9E57F6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Favicon Shortcut URL</label>
                  <input
                    type="text"
                    value={draft.brand?.faviconUrl || ''}
                    onChange={e => handleFieldChange('brand', 'faviconUrl', e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0C0C0E] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-[#9E57F6]"
                  />
                </div>
              </div>
            )}

            {/* SEO Tab */}
            {activeTab === 'seo' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Homepage Meta Title</label>
                  <input
                    type="text"
                    value={draft.seo?.homeTitle || ''}
                    onChange={e => handleFieldChange('seo', 'homeTitle', e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0C0C0E] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-[#9E57F6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Homepage Meta Description</label>
                  <textarea
                    rows={3}
                    value={draft.seo?.homeDescription || ''}
                    onChange={e => handleFieldChange('seo', 'homeDescription', e.target.value)}
                    className="w-full p-3 rounded-xl bg-[#0C0C0E] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-[#9E57F6] resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Default Keywords (comma-separated)</label>
                  <textarea
                    rows={2}
                    value={draft.seo?.keywords || ''}
                    onChange={e => handleFieldChange('seo', 'keywords', e.target.value)}
                    className="w-full p-3 rounded-xl bg-[#0C0C0E] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-[#9E57F6] resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Social Sharing OpenGraph Image URL</label>
                  <input
                    type="text"
                    value={draft.seo?.ogImage || ''}
                    onChange={e => handleFieldChange('seo', 'ogImage', e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0C0C0E] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-[#9E57F6]"
                  />
                </div>
              </div>
            )}

            {/* Navigation Tab */}
            {activeTab === 'navigation' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">Main Navbar Menu Links</h3>
                    <p className="text-[11px] text-slate-400">Configure public navigation bar shortcuts.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddLink('navigation', 'links')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#9E57F6]/15 border border-[#9E57F6]/30 text-[#9E57F6] hover:bg-[#9E57F6]/25 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Menu Item</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {(draft.navigation?.links || []).map((link: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-[#0C0C0E] border border-white/[0.06]">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={link.label || ''}
                          onChange={e => handleUpdateLink('navigation', 'links', idx, 'label', e.target.value)}
                          placeholder="Label (e.g. Movies)"
                          className="w-full px-3 py-1.5 rounded-lg bg-[#141418] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-[#9E57F6]"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={link.href || ''}
                          onChange={e => handleUpdateLink('navigation', 'links', idx, 'href', e.target.value)}
                          placeholder="URL Path (e.g. /movies)"
                          className="w-full px-3 py-1.5 rounded-lg bg-[#141418] border border-white/[0.08] text-xs font-mono text-slate-200 focus:outline-none focus:border-[#9E57F6]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLink('navigation', 'links', idx)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/[0.04] transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Homepage Tab */}
            {activeTab === 'home' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Catalog Section Title</label>
                  <input
                    type="text"
                    value={draft.home?.catalogTitle || ''}
                    onChange={e => handleFieldChange('home', 'catalogTitle', e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0C0C0E] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-[#9E57F6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Subtitle Block Header</label>
                  <input
                    type="text"
                    value={draft.home?.subtitleTitle || ''}
                    onChange={e => handleFieldChange('home', 'subtitleTitle', e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0C0C0E] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-[#9E57F6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Newsletter Header</label>
                  <input
                    type="text"
                    value={draft.home?.newsletterTitle || ''}
                    onChange={e => handleFieldChange('home', 'newsletterTitle', e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0C0C0E] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-[#9E57F6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Newsletter Button Text</label>
                  <input
                    type="text"
                    value={draft.home?.newsletterButton || ''}
                    onChange={e => handleFieldChange('home', 'newsletterButton', e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0C0C0E] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-[#9E57F6]"
                  />
                </div>
              </div>
            )}

            {/* Footer Tab */}
            {activeTab === 'footer' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Footer Bio Text</label>
                  <textarea
                    rows={3}
                    value={draft.footer?.description || ''}
                    onChange={e => handleFieldChange('footer', 'description', e.target.value)}
                    className="w-full p-3 rounded-xl bg-[#0C0C0E] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-[#9E57F6] resize-none"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Contact Email</label>
                    <input
                      type="text"
                      value={draft.footer?.email || ''}
                      onChange={e => handleFieldChange('footer', 'email', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#0C0C0E] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-[#9E57F6]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Copyright Attribution</label>
                    <input
                      type="text"
                      value={draft.footer?.copyright || ''}
                      onChange={e => handleFieldChange('footer', 'copyright', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#0C0C0E] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-[#9E57F6]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* AI Engine Tab */}
            {activeTab === 'ai' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between p-4 rounded-xl bg-[#0C0C0E] border border-white/[0.06]">
                  <div>
                    <div className="text-xs font-bold text-slate-200">Public AI Search Chat Widget</div>
                    <div className="text-[11px] text-slate-400">Show floating AI assistant on public website pages.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(draft.ai?.enableChat)}
                    onChange={e => handleFieldChange('ai', 'enableChat', e.target.checked)}
                    className="w-4 h-4 rounded text-[#9E57F6] focus:ring-[#9E57F6]"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-[#0C0C0E] border border-white/[0.06]">
                  <div>
                    <div className="text-xs font-bold text-slate-200">Subtitle AI Translation Studio</div>
                    <div className="text-[11px] text-slate-400">Enable AI translation tooling in admin panel.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(draft.ai?.enableTranslation)}
                    onChange={e => handleFieldChange('ai', 'enableTranslation', e.target.checked)}
                    className="w-4 h-4 rounded text-[#9E57F6] focus:ring-[#9E57F6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Default Translation Engine</label>
                  <select
                    value={draft.ai?.defaultEngine || 'gemini'}
                    onChange={e => handleFieldChange('ai', 'defaultEngine', e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0C0C0E] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-[#9E57F6]"
                  >
                    <option value="gemini">Google Gemini 1.5 Flash (AI)</option>
                    <option value="groq">Groq Llama 3 (Fast)</option>
                    <option value="openrouter">OpenRouter Multi-model</option>
                  </select>
                </div>
              </div>
            )}

            {/* System & Maintenance Tab */}
            {activeTab === 'system' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between p-4 rounded-xl bg-[#0C0C0E] border border-amber-500/20 bg-amber-500/5">
                  <div>
                    <div className="text-xs font-bold text-amber-300">Global Maintenance Mode Gate</div>
                    <div className="text-[11px] text-slate-400">
                      When enabled, public visitors see maintenance screen. Admins still have full access.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(draft.system?.maintenanceMode)}
                    onChange={e => handleFieldChange('system', 'maintenanceMode', e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Maintenance Screen Message</label>
                  <textarea
                    rows={3}
                    value={draft.system?.maintenanceMessage || ''}
                    onChange={e => handleFieldChange('system', 'maintenanceMessage', e.target.value)}
                    placeholder="KSubZone is currently undergoing scheduled platform upgrades. We will be back online shortly!"
                    className="w-full p-3 rounded-xl bg-[#0C0C0E] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-[#9E57F6] resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Global Header Announcement Banner</label>
                  <input
                    type="text"
                    value={draft.system?.announcement || ''}
                    onChange={e => handleFieldChange('system', 'announcement', e.target.value)}
                    placeholder="Leave blank to hide announcement banner"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0C0C0E] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-[#9E57F6]"
                  />
                </div>
              </div>
            )}

            {/* Advanced JSON Editor Tab */}
            {activeTab === 'advanced' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs flex items-center gap-2">
                  <Code className="w-4 h-4 flex-shrink-0" />
                  <span>Direct JSON schema editor. Click "Save All Settings" when done to persist changes.</span>
                </div>

                <textarea
                  rows={18}
                  value={jsonText}
                  onChange={e => setJsonText(e.target.value)}
                  className="w-full p-4 rounded-xl bg-[#0C0C0E] border border-white/[0.08] font-mono text-xs text-emerald-300 leading-relaxed focus:outline-none focus:border-[#9E57F6] resize-none selection:bg-emerald-500/30"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
