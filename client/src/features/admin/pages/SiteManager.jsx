'use client';

import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '@/services/api/apiClient';
import {
  CheckCircle, ExternalLink, Globe2, Image, Link as LinkIcon, ListPlus,
  Palette, RotateCcw, Save, Search, Settings, Trash2, Type, Bot, ShieldAlert,
  Sliders, Eye, Sparkles
} from 'lucide-react';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import AdminTopBar from '@/features/admin/components/AdminTopBar';
import { useToast } from '@/features/admin/components/Toast';
import { defaultSiteContent, mergeSiteContent } from '@/config/siteContent';
import { useSiteContent } from '@/hooks/useSiteContent';
import { resolveLogoUrl } from '@/utils/mediaImages';

const sections = [
  { id: 'brand', label: 'Brand & Identity', icon: Palette, color: 'text-violet-400' },
  { id: 'seo', label: 'SEO & Metadata', icon: Search, color: 'text-sky-400' },
  { id: 'navigation', label: 'Navbar & Navigation', icon: LinkIcon, color: 'text-fuchsia-400' },
  { id: 'home', label: 'Homepage Labels', icon: Type, color: 'text-amber-400' },
  { id: 'footer', label: 'Footer Controls', icon: Globe2, color: 'text-emerald-400' },
  { id: 'ai', label: 'AI Features Engine', icon: Bot, color: 'text-purple-400' },
  { id: 'system', label: 'System & Mode', icon: ShieldAlert, color: 'text-rose-400' },
  { id: 'advanced', label: 'Advanced JSON Code', icon: Settings, color: 'text-slate-400' }
];

const textFields = {
  brand: [
    ['siteName', 'Site Name'],
    ['shortName', 'Short Name'],
    ['tagline', 'Tagline / Slogan'],
    ['logoText', 'Logo Brand Text'],
    ['logoUrl', 'Logo Image URL'],
    ['faviconUrl', 'Favicon Shortcut URL'],
    ['primaryUrl', 'Primary Main Website URL']
  ],
  seo: [
    ['homeTitle', 'Homepage Meta Title Tag'],
    ['homeDescription', 'Homepage Meta Description tag', 'textarea'],
    ['keywords', 'SEO Search Keywords (comma-separated)', 'textarea'],
    ['ogImage', 'Social Sharing Open Graph Image URL']
  ],
  home: [
    ['catalogTitle', 'Movie/Drama Catalog Header Title'],
    ['catalogDescription', 'Catalog Section Subheading Description', 'textarea'],
    ['emptyTitle', 'No Search Results Empty State Title'],
    ['emptyDescription', 'No Search Results Subheading Description', 'textarea'],
    ['subtitleTitle', 'Subtitle Block Header Label'],
    ['subtitleEmpty', 'No Subtitles Available Label Text', 'textarea'],
    ['newsletterTitle', 'Newsletter Box Header Title'],
    ['newsletterDescription', 'Newsletter Box Description Text', 'textarea'],
    ['newsletterPlaceholder', 'Newsletter Email Input Placeholder'],
    ['newsletterButton', 'Newsletter Submit Button Text']
  ],
  footer: [
    ['description', 'Footer Description Bio text', 'textarea'],
    ['quickLinksTitle', 'Quick Links Title Header'],
    ['contactTitle', 'Contact Section Title Header'],
    ['contactText', 'Contact Description Info Text', 'textarea'],
    ['email', 'Contact Email address'],
    ['phone', 'Contact Hotline phone'],
    ['copyright', 'Copyright Attribution Notice']
  ],
  ai: [
    ['enableChat', 'Enable Public AI Search Chat Assistant', 'checkbox'],
    ['enableTranslation', 'Enable Subtitle AI Translation Studio Tools', 'checkbox'],
    ['defaultEngine', 'Default AI Engine (gemini / groq / openrouter)']
  ],
  system: [
    ['maintenanceMode', 'Enable Site-Wide Maintenance Gate', 'checkbox'],
    ['maintenanceMessage', 'Maintenance Screen Notice Text', 'textarea'],
    ['announcement', 'Global Banner Announcement Message (Leave blank to hide)']
  ]
};

const arrayFields = {
  navigation: [
    { key: 'links', title: 'Top Navigation Menu Links', columns: ['label', 'href'] }
  ],
  footer: [
    { key: 'links', title: 'Footer Directory Links', columns: ['label', 'href'] }
  ],
  home: [
    { key: 'features', title: 'Home Benefit Highlights', columns: ['title', 'description'] }
  ]
};

export default function SiteManager() {
  const toast = useToast();
  const { refresh: refreshSiteContent } = useSiteContent();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [draft, setDraft] = useState(defaultSiteContent);
  const [activeSection, setActiveSection] = useState('brand');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [jsonDraft, setJsonDraft] = useState('');

  const loadContent = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/api/admin/site-content');
      const merged = mergeSiteContent(defaultSiteContent, res.data || {});
      setDraft(merged);
      setJsonDraft(JSON.stringify(merged, null, 2));
    } catch (err) {
      setError('Failed to fetch site content settings.');
      toast.error('Failed to fetch site content settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, []);

  const updateField = (section, key, val) => {
    setDraft((prev) => {
      const updated = {
        ...prev,
        [section]: {
          ...(prev[section] || {}),
          [key]: val
        }
      };
      setJsonDraft(JSON.stringify(updated, null, 2));
      return updated;
    });
  };

  const updateArrayItem = (section, groupKey, index, key, val) => {
    setDraft((prev) => {
      const list = [...(prev[section]?.[groupKey] || [])];
      if (typeof list[index] === 'string') {
        list[index] = val;
      } else {
        list[index] = {
          ...(list[index] || {}),
          [key]: val
        };
      }
      const updated = {
        ...prev,
        [section]: {
          ...(prev[section] || {}),
          [groupKey]: list
        }
      };
      setJsonDraft(JSON.stringify(updated, null, 2));
      return updated;
    });
  };

  const addArrayItem = (section, groupKey, columns) => {
    setDraft((prev) => {
      const list = [...(prev[section]?.[groupKey] || [])];
      const newItem = columns.length === 1 && columns[0] === 'value'
        ? ''
        : columns.reduce((acc, col) => ({ ...acc, [col]: '' }), {});
      list.push(newItem);
      const updated = {
        ...prev,
        [section]: {
          ...(prev[section] || {}),
          [groupKey]: list
        }
      };
      setJsonDraft(JSON.stringify(updated, null, 2));
      return updated;
    });
  };

  const removeArrayItem = (section, groupKey, index) => {
    setDraft((prev) => {
      const list = (prev[section]?.[groupKey] || []).filter((_, i) => i !== index);
      const updated = {
        ...prev,
        [section]: {
          ...(prev[section] || {}),
          [groupKey]: list
        }
      };
      setJsonDraft(JSON.stringify(updated, null, 2));
      return updated;
    });
  };

  const saveContent = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      let contentToSave = draft;
      if (activeSection === 'advanced') {
        contentToSave = mergeSiteContent(defaultSiteContent, JSON.parse(jsonDraft));
        setDraft(contentToSave);
      }

      const res = await apiClient.put('/api/admin/site-content', contentToSave);
      setDraft(mergeSiteContent(defaultSiteContent, res.data.content || draft));
      await refreshSiteContent();
      setSuccess('Site builder settings updated successfully!');
      toast.success('Site builder settings updated.');
    } catch (err) {
      const isJsonErr = err instanceof SyntaxError;
      const msg = isJsonErr ? 'Advanced JSON has invalid formatting.' : err.response?.data?.message || 'Failed to save site builder settings.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const resetSection = () => {
    if (!window.confirm('Are you sure you want to reset this section back to standard system values? Unsaved changes will be discarded.')) return;
    setDraft((prev) => ({ ...prev, [activeSection]: defaultSiteContent[activeSection] }));
    toast.info('Section content reset to default state locally.');
  };

  const activeFields = textFields[activeSection] || [];
  const activeArrays = arrayFields[activeSection] || [];
  const brand = draft.brand || {};

  return (
    <div className="admin-shell min-h-screen bg-[#08090D] text-slate-100 flex flex-col lg:flex-row">
      <AdminSidebar mobileOpen={mobileOpen} onCloseMobileNav={() => setMobileOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <AdminTopBar onOpenMobileNav={() => setMobileOpen(true)} />

        <main className="admin-main flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-[1560px] w-full mx-auto space-y-6">
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-white/[0.05] pb-4">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-100 font-display tracking-tight">Site Builder & Content Engine</h1>
              <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
                Control logos, labels, navigation structures, SEO configurations, and repeated labels dynamically across KSubZone.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="h-9 px-3.5 rounded-lg border border-white/[0.08] bg-[#11131A] hover:bg-white/[0.04] text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Preview Website
              </a>
              <button
                type="button"
                onClick={resetSection}
                className="h-9 px-3.5 rounded-lg border border-white/[0.08] bg-[#11131A] hover:bg-white/[0.04] text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
              <button
                type="button"
                onClick={saveContent}
                disabled={saving || loading}
                className="h-9 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-xs font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-50 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              {success}
            </div>
          )}

          {/* Section Navigation Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 bg-[#11131A] p-1.5 rounded-xl border border-white/[0.06] admin-custom-scrollbar">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => { setActiveSection(section.id); setError(''); setSuccess(''); }}
                  className={`h-9 px-3 rounded-lg text-xs font-semibold flex items-center gap-2 transition flex-shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : section.color}`} />
                  <span>{section.label}</span>
                </button>
              );
            })}
          </div>

          {/* Core Settings Content Area */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 items-start">
            
            {/* Editor Area */}
            <section className="rounded-xl border border-white/[0.06] bg-[#11131A] p-5 space-y-5">
              {loading ? (
                <div className="py-16 text-center text-xs text-slate-400 animate-pulse">Loading settings...</div>
              ) : (
                <div className="space-y-5">
                  <div className="border-b border-white/[0.05] pb-3">
                    <h3 className="text-sm font-bold text-slate-100">
                      {sections.find(s => s.id === activeSection)?.label} Settings
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Customize UI text bindings for public site</p>
                  </div>

                  {activeSection === 'advanced' ? (
                    <div className="space-y-3">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold text-slate-400">Complete Web Content Raw JSON Configuration</span>
                        <textarea
                          rows={20}
                          value={jsonDraft}
                          onChange={(event) => setJsonDraft(event.target.value)}
                          spellCheck={false}
                          className="w-full rounded-xl border border-white/[0.08] bg-[#08090D] px-4 py-3 font-mono text-xs leading-5 text-emerald-400 outline-none focus:border-violet-500"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeFields.map(([key, label, type]) => (
                        <div key={key} className={type === 'textarea' ? 'md:col-span-2' : ''}>
                          <label className="block mb-1">
                            <span className="block text-[11px] font-semibold text-slate-400">{label}</span>
                          </label>
                          
                          {type === 'textarea' ? (
                            <textarea
                              rows={4}
                              value={draft[activeSection]?.[key] || ''}
                              onChange={(event) => updateField(activeSection, key, event.target.value)}
                              className="w-full rounded-lg border border-white/[0.08] bg-[#08090D] px-3 py-2 text-xs text-slate-100 outline-none focus:border-violet-500 leading-relaxed"
                            />
                          ) : type === 'checkbox' ? (
                            <div className="flex items-center h-10 bg-[#08090D] px-3 rounded-lg border border-white/[0.08]">
                              <input
                                type="checkbox"
                                checked={!!draft[activeSection]?.[key]}
                                id={`chk-${key}`}
                                onChange={(event) => updateField(activeSection, key, event.target.checked)}
                                className="w-4 h-4 rounded border-white/20 bg-[#11131A] text-violet-600 focus:ring-0 cursor-pointer"
                              />
                              <label htmlFor={`chk-${key}`} className="ml-2.5 text-xs text-slate-300 font-semibold select-none cursor-pointer">
                                Option Enabled
                              </label>
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={draft[activeSection]?.[key] || ''}
                              onChange={(event) => updateField(activeSection, key, event.target.value)}
                              className="w-full h-9 rounded-lg border border-white/[0.08] bg-[#08090D] px-3 text-xs text-slate-100 outline-none focus:border-violet-500"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {activeArrays.map((group) => (
                    <div key={group.key} className="rounded-xl border border-white/[0.06] bg-[#151821] p-4 space-y-3.5">
                      <div className="flex items-center justify-between gap-3 border-b border-white/[0.05] pb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">{group.title}</h3>
                        <button
                          type="button"
                          onClick={() => addArrayItem(activeSection, group.key, group.columns)}
                          className="h-7 px-2.5 rounded-md bg-[#11131A] border border-white/[0.06] hover:bg-white/[0.06] text-[11px] font-semibold text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <ListPlus className="w-3 h-3 text-violet-400" /> Add Item
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        {(draft[activeSection]?.[group.key] || []).length === 0 ? (
                          <div className="py-4 text-center text-xs text-slate-500 font-mono">Empty list</div>
                        ) : (
                          (draft[activeSection]?.[group.key] || []).map((item, index) => (
                            <div key={`${group.key}-${index}`} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_36px] gap-2 items-center bg-[#11131A] p-2 rounded-lg border border-white/[0.04]">
                              {group.columns.map((column) => (
                                <input
                                  key={column}
                                  type="text"
                                  placeholder={column === 'value' ? 'Label / Value' : column.toUpperCase()}
                                  value={column === 'value' ? item : item?.[column] || ''}
                                  onChange={(event) => updateArrayItem(activeSection, group.key, index, column, event.target.value)}
                                  className={`${group.columns.length === 1 ? 'sm:col-span-2' : ''} h-8 rounded-md border border-white/[0.08] bg-[#08090D] px-2.5 text-xs text-slate-100 outline-none focus:border-violet-500`}
                                />
                              ))}
                              <button
                                type="button"
                                onClick={() => removeArrayItem(activeSection, group.key, index)}
                                className="h-8 rounded-md border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white flex items-center justify-center transition cursor-pointer"
                                aria-label="Remove item"
                                title="Delete row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Sidebar Brand Preview Widget */}
            <aside className="space-y-4">
              <div className="rounded-xl border border-white/[0.06] bg-[#11131A] p-4 space-y-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-violet-400" /> Brand Identity Preview
                </h3>
                
                <div className="rounded-lg border border-white/[0.06] bg-[#08090D] p-3 space-y-2">
                  <div className="flex items-center gap-2.5">
                    {resolveLogoUrl(brand.logoUrl) ? (
                      <img src={resolveLogoUrl(brand.logoUrl)} alt={brand.siteName || 'Logo'} className="h-8 w-auto object-contain max-w-[70px]" />
                    ) : (
                      <span className="h-8 w-8 rounded-lg bg-violet-600/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                        <Image className="w-3.5 h-3.5 text-violet-400" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-white">{brand.logoText || brand.siteName}</p>
                      <p className="truncate text-[10px] text-slate-500">{brand.tagline}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-400 border-t border-white/[0.05] pt-2.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Site Name:</span>
                    <span className="text-slate-200 font-medium truncate max-w-[120px]">{brand.siteName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Links:</span>
                    <span className="text-slate-200 font-mono">{(draft.navigation?.links || []).length} items</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">System Mode:</span>
                    {draft.system?.maintenanceMode ? (
                      <span className="text-rose-400 font-bold uppercase text-[10px]">Maintenance</span>
                    ) : (
                      <span className="text-emerald-400 font-bold uppercase text-[10px]">Live</span>
                    )}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
