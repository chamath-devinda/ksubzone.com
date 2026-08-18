'use client';

import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '@/services/api/apiClient';
import {
  CheckCircle, ExternalLink, Globe2, Image, Link as LinkIcon, ListPlus,
  Palette, RotateCcw, Save, Search, Settings, Trash2, Type, Bot, ShieldAlert,
  Sliders, Eye, Sparkles
} from 'lucide-react';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import { useToast } from '@/features/admin/components/Toast';
import { defaultSiteContent, mergeSiteContent } from '@/config/siteContent';
import { useSiteContent } from '@/hooks/useSiteContent';
import { resolveLogoUrl } from '@/utils/mediaImages';

const sections = [
  { id: 'brand', label: 'Brand & Identity', icon: Palette, color: 'text-brand-primary' },
  { id: 'seo', label: 'SEO & Metadata', icon: Search, color: 'text-blue-400' },
  { id: 'navigation', label: 'Navbar & Navigation', icon: LinkIcon, color: 'text-brand-secondary' },
  { id: 'home', label: 'Homepage Labels', icon: Type, color: 'text-amber-400' },
  { id: 'footer', label: 'Footer Controls', icon: Globe2, color: 'text-emerald-400' },
  { id: 'ai', label: 'AI Features Engine', icon: Bot, color: 'text-purple-400' },
  { id: 'system', label: 'System & Mode', icon: ShieldAlert, color: 'text-red-400' },
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
    ['requestText', 'Request Subtitle Link Label'],
    ['followTitle', 'Social Media Heading Text'],
    ['newsletterPlaceholder', 'Footer Newsletter Input Placeholder'],
    ['copyrightSuffix', 'Copyright text Suffix label'],
    ['bottomText', 'Bottom Disclaimer/GDPR Text Block', 'textarea']
  ],
  navigation: [
    ['searchPlaceholder', 'Navbar Search Bar Placeholder'],
    ['signInLabel', 'Navbar Sign In Button Text'],
    ['adminLabel', 'Navbar Admin Panel Label Link']
  ],
  ai: [
    ['enableChatbot', 'Enable AI Assistant Chatbot Widget', 'checkbox'],
    ['enableSmartSearch', 'Enable AI Smart Search Suggestions', 'checkbox'],
    ['enableTranslation', 'Enable AI Subtitle Translation Tooling', 'checkbox']
  ],
  system: [
    ['maintenanceMode', 'Enable Under Maintenance Mode', 'checkbox'],
    ['maintenanceMessage', 'Maintenance Screen Warning Message', 'textarea']
  ]
};

const arrayFields = {
  navigation: [{ key: 'links', title: 'Navbar Link Items', columns: ['label', 'url'] }],
  footer: [
    { key: 'links', title: 'Footer Links', columns: ['label', 'url'] },
    { key: 'socials', title: 'Social Network Links', columns: ['label', 'url'] },
    { key: 'badges', title: 'Footer Info Badges', columns: ['value'] },
    { key: 'featureLabels', title: 'Footer Feature Badges', columns: ['value'] }
  ]
};

export default function SiteManager() {
  const { refreshSiteContent } = useSiteContent();
  const toast = useToast();
  
  const [activeSection, setActiveSection] = useState('brand');
  const [draft, setDraft] = useState(defaultSiteContent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [jsonDraft, setJsonDraft] = useState('');

  useEffect(() => {
    const loadContent = async () => {
      try {
        const res = await apiClient.get('/api/admin/site-content');
        const mergedContent = mergeSiteContent(defaultSiteContent, res.data || {});
        setDraft(mergedContent);
        setJsonDraft(JSON.stringify(mergedContent, null, 2));
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load site builder settings.');
        toast.error('Failed to load site builder settings.');
      } finally {
        setLoading(false);
      }
    };
    loadContent();
  }, []);

  const updateField = (section, key, value) => {
    setDraft((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  useEffect(() => {
    if (activeSection !== 'advanced') return;
    setJsonDraft(JSON.stringify(draft, null, 2));
  }, [activeSection]);

  const updateArrayItem = (section, key, index, field, value) => {
    setDraft((prev) => {
      const nextItems = [...(prev[section]?.[key] || [])];
      if (field === 'value') {
        nextItems[index] = value;
      } else {
        nextItems[index] = { ...(nextItems[index] || {}), [field]: value };
      }
      return { ...prev, [section]: { ...prev[section], [key]: nextItems } };
    });
  };

  const addArrayItem = (section, key, columns) => {
    setDraft((prev) => {
      const item = columns.includes('value') ? '' : columns.reduce((acc, col) => ({ ...acc, [col]: '' }), {});
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [key]: [...(prev[section]?.[key] || []), item]
        }
      };
    });
  };

  const removeArrayItem = (section, key, index) => {
    setDraft((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: (prev[section]?.[key] || []).filter((_, itemIndex) => itemIndex !== index)
      }
    }));
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
      setSuccess('Site builder saved successfully!');
      toast.success('Site builder settings updated. Public website content updated.');
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
    <div className="min-h-screen bg-luxury-950 text-slate-100 flex flex-col lg:flex-row">
      <AdminSidebar />

      <main className="flex-grow p-6 sm:p-8 overflow-y-auto min-w-0">
        <div className="max-w-6xl mx-auto space-y-6">
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 border-b border-white/5 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Sliders className="w-5 h-5 text-brand-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-primary">Site Builder</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">Public Interface Content Engine</h1>
              <p className="text-slate-400 text-xs mt-1 max-w-2xl">
                Control logos, labels, navigation structures, SEO configurations, and repeated labels dynamically across KSubZone.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="h-10 px-4 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-xs font-bold text-slate-200 flex items-center gap-2 transition"
              >
                <ExternalLink className="w-4 h-4" /> Preview Website
              </a>
              <button
                type="button"
                onClick={resetSection}
                className="h-10 px-4 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-xs font-bold text-slate-200 flex items-center gap-2 transition"
              >
                <RotateCcw className="w-4 h-4" /> Reset Default
              </button>
              <button
                type="button"
                onClick={saveContent}
                disabled={saving || loading}
                className="h-10 px-5 rounded-xl bg-brand-primary text-xs font-black uppercase tracking-wider text-white hover:bg-opacity-90 disabled:opacity-55 flex items-center gap-2 transition shadow-lg shadow-brand-primary/25 cursor-pointer"
              >
                <Save className="w-4 h-4" /> {saving ? 'Saving changes...' : 'Save Settings'}
              </button>
            </div>
          </div>

          {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-300">{error}</div>}
          {success && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" /> {success}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-[250px_1fr_300px] gap-6 items-start">
            
            {/* Sections Selector Menu */}
            <aside className="rounded-2xl border border-white/5 bg-luxury-900 p-3.5 space-y-1.5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1">
              {sections.map((section) => {
                const Icon = section.icon;
                const active = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => {
                      setActiveSection(section.id);
                      setError('');
                      setSuccess('');
                    }}
                    className={`w-full h-11 px-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-between transition text-left cursor-pointer ${
                      active 
                        ? 'bg-brand-primary text-white font-bold shadow-lg shadow-brand-primary/10' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                    }`}
                  >
                    <span className="flex items-center gap-3.5">
                      <Icon className={`w-4.5 h-4.5 ${active ? 'text-white' : section.color}`} />
                      {section.label}
                    </span>
                    {active && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                  </button>
                );
              })}
            </aside>

            {/* Editing Card Panel */}
            <section className="rounded-2xl border border-white/5 bg-luxury-900 p-5 sm:p-6 space-y-6">
              {loading ? (
                <div className="py-24 text-center text-xs text-slate-500 animate-pulse flex flex-col items-center justify-center gap-2">
                  <RotateCcw className="w-6 h-6 animate-spin text-brand-primary" />
                  Spinning up site content parameters...
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="border-b border-white/5 pb-4">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-200">
                      {sections.find(s => s.id === activeSection)?.label} Settings
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Customize UI text bindings for the public site</p>
                  </div>

                  {activeSection === 'advanced' ? (
                    <div className="space-y-3.5">
                      <label className="block">
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-400">Complete Web Content Raw JSON Configuration</span>
                        <textarea
                          rows={22}
                          value={jsonDraft}
                          onChange={(event) => setJsonDraft(event.target.value)}
                          spellCheck={false}
                          className="w-full rounded-xl border border-white/10 bg-luxury-950 px-4 py-3.5 font-mono text-xs leading-5 text-emerald-400 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                        />
                      </label>
                      <span className="text-[10px] text-slate-500 block leading-relaxed">
                        Caution: Editing raw JSON configuration allows full structure overrides, but invalid brackets or missing values will cause front-end errors. Keep structure intact.
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {activeFields.map(([key, label, type]) => (
                        <div key={key} className={type === 'textarea' ? 'md:col-span-2' : ''}>
                          <label className="block mb-2">
                            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span>
                          </label>
                          
                          {type === 'textarea' ? (
                            <textarea
                              rows={4}
                              value={draft[activeSection]?.[key] || ''}
                              onChange={(event) => updateField(activeSection, key, event.target.value)}
                              className="w-full rounded-xl border border-white/10 bg-luxury-950 px-4 py-3 text-xs text-slate-100 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary leading-relaxed"
                            />
                          ) : type === 'checkbox' ? (
                            <div className="flex items-center h-11 bg-luxury-950 px-4 rounded-xl border border-white/5">
                              <input
                                type="checkbox"
                                checked={!!draft[activeSection]?.[key]}
                                id={`chk-${key}`}
                                onChange={(event) => updateField(activeSection, key, event.target.checked)}
                                className="w-5 h-5 rounded border-white/10 bg-luxury-950 text-brand-primary focus:ring-brand-primary focus:ring-offset-luxury-950 cursor-pointer"
                              />
                              <label htmlFor={`chk-${key}`} className="ml-3 text-xs text-slate-300 font-bold select-none cursor-pointer">
                                Option Enabled
                              </label>
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={draft[activeSection]?.[key] || ''}
                              onChange={(event) => updateField(activeSection, key, event.target.value)}
                              className="w-full h-11 rounded-xl border border-white/10 bg-luxury-950 px-4 text-xs text-slate-100 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {activeArrays.map((group) => (
                    <div key={group.key} className="rounded-2xl border border-white/5 bg-luxury-950/60 p-4 space-y-4">
                      <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-2.5">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">{group.title}</h3>
                        <button
                          type="button"
                          onClick={() => addArrayItem(activeSection, group.key, group.columns)}
                          className="h-8 px-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] font-bold text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <ListPlus className="w-3.5 h-3.5 text-brand-secondary" /> Add Item
                        </button>
                      </div>
                      
                      <div className="space-y-2.5">
                        {(draft[activeSection]?.[group.key] || []).length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-600 font-mono">Empty list - click "Add Item" to add records</div>
                        ) : (
                          (draft[activeSection]?.[group.key] || []).map((item, index) => (
                            <div key={`${group.key}-${index}`} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_40px] gap-2.5 items-center bg-luxury-900/40 p-2 rounded-xl border border-white/5">
                              {group.columns.map((column) => (
                                <input
                                  key={column}
                                  type="text"
                                  placeholder={column === 'value' ? 'Label / Value' : column.toUpperCase()}
                                  value={column === 'value' ? item : item?.[column] || ''}
                                  onChange={(event) => updateArrayItem(activeSection, group.key, index, column, event.target.value)}
                                  className={`${group.columns.length === 1 ? 'sm:col-span-2' : ''} h-10 rounded-xl border border-white/10 bg-luxury-950 px-3.5 text-xs text-slate-100 outline-none focus:border-brand-primary`}
                                />
                              ))}
                              <button
                                type="button"
                                onClick={() => removeArrayItem(activeSection, group.key, index)}
                                className="h-10 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition cursor-pointer"
                                aria-label="Remove item"
                                title="Delete row"
                              >
                                <Trash2 className="w-4 h-4" />
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
            <aside className="space-y-6 xl:sticky xl:top-6">
              
              {/* Brand Preview Panel */}
              <div className="rounded-2xl border border-white/5 bg-luxury-900 p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-brand-secondary" /> Brand Identity Preview
                </h3>
                
                <div className="rounded-2xl border border-white/10 bg-luxury-950 p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    {resolveLogoUrl(brand.logoUrl) ? (
                      <img src={resolveLogoUrl(brand.logoUrl)} alt={brand.siteName || 'Logo'} className="h-10 w-auto object-contain max-w-[80px]" />
                    ) : (
                      <span className="h-10 w-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center flex-shrink-0">
                        <Image className="w-4 h-4 text-brand-primary" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white font-milker">{brand.logoText || brand.siteName}</p>
                      <p className="truncate text-[10px] text-slate-500">{brand.tagline}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs text-slate-400 border-t border-white/5 pt-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Site Name:</span>
                    <span className="text-slate-200 font-bold truncate max-w-[120px]">{brand.siteName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Links:</span>
                    <span className="text-slate-200 font-mono">{(draft.navigation?.links || []).length} items</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Footer Links:</span>
                    <span className="text-slate-200 font-mono">{(draft.footer?.links || []).length} items</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">System Mode:</span>
                    {draft.system?.maintenanceMode ? (
                      <span className="text-red-400 font-bold uppercase text-[10px]">Maintenance</span>
                    ) : (
                      <span className="text-emerald-400 font-bold uppercase text-[10px]">Live</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tips / Guidance Panel */}
              <div className="rounded-2xl border border-white/5 bg-luxury-900/50 p-5 space-y-2">
                <h4 className="text-[10px] font-black uppercase text-brand-accent tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Layout Details
                </h4>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Changing parameters here does not impact user authentication details or server API variables. To configure keys like TMDB key or SMTP flags, use the <strong>SEO & Settings</strong> config tables instead.
                </p>
              </div>

            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
