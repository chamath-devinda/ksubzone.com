'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/services/api/apiClient';
import { useAuth } from '@/features/auth/hooks/useAuth';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import AdminTopBar from '@/features/admin/components/AdminTopBar';
import DataTable from '@/features/admin/components/DataTable';
import ModalDrawer from '@/features/admin/components/ModalDrawer';
import { useToast } from '@/features/admin/components/Toast';
import StatCard from '@/features/admin/components/StatCard';
import {
  BookOpenText, Edit3, Eye, Trash2, Plus, Save, UploadCloud, FileText,
  ShieldCheck, Star
} from 'lucide-react';

const emptyForm = {
  title: '',
  excerpt: '',
  content: '',
  category: 'Guide',
  coverImage: '',
  authorName: 'KSubZone Editorial',
  readTime: 5,
  status: 'Draft',
  isFeatured: false,
  tags: '',
  relatedMediaTitle: '',
  metaTitle: '',
  metaDescription: '',
  seoKeywords: ''
};

const autoFormatText = (text) => {
  if (!text) return '';

  let lines = text.replace(/\r\n/g, '\n').split('\n');
  let formattedLines = [];
  let inFaqBlock = false;
  let faqBuffer = [];
  let inTableBlock = false;
  let tableBuffer = [];

  const flushFaq = () => {
    if (faqBuffer.length > 0) {
      formattedLines.push('[FAQ]');
      formattedLines.push(...faqBuffer);
      formattedLines.push('[/FAQ]');
      formattedLines.push('');
      faqBuffer = [];
    }
    inFaqBlock = false;
  };

  const flushTable = () => {
    if (tableBuffer.length > 0) {
      const headerRow = tableBuffer[0];
      const cols = headerRow.length;
      
      formattedLines.push('| ' + headerRow.join(' | ') + ' |');
      formattedLines.push('| ' + Array(cols).fill('---').join(' | ') + ' |');
      
      for (let i = 1; i < tableBuffer.length; i++) {
        formattedLines.push('| ' + tableBuffer[i].join(' | ') + ' |');
      }
      formattedLines.push('');
      tableBuffer = [];
    }
    inTableBlock = false;
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) {
      if (inTableBlock) flushTable();
      formattedLines.push('');
      continue;
    }

    if (line.includes('\t')) {
      if (!inTableBlock) {
        flushFaq();
        inTableBlock = true;
        tableBuffer = [];
      }
      const cells = line.split('\t').map(c => c.trim());
      tableBuffer.push(cells);
      continue;
    } else if (inTableBlock) {
      flushTable();
    }

    const isFaqQ = line.match(/^Q[:.]\s*(.*)/i) || line.match(/^(?:FAQ|ප්‍රශ්නය)\s*[:.]\s*(.*)/i);
    const isFaqA = line.match(/^A[:.]\s*(.*)/i) || line.match(/^(?:පිළිතුර|Answer)\s*[:.]\s*(.*)/i);

    if (isFaqQ) {
      if (!inFaqBlock) inFaqBlock = true;
      faqBuffer.push('Q: ' + isFaqQ[1]);
      continue;
    } else if (isFaqA && inFaqBlock) {
      faqBuffer.push('A: ' + isFaqA[1]);
      continue;
    } else if (inFaqBlock) {
      flushFaq();
    }

    if (line.match(/^#{1,6}\s+/)) {
      formattedLines.push(line);
      continue;
    }

    const isBullet = line.match(/^[-*•]\s+(.*)/);
    const isNumbered = line.match(/^\d+[\.\)]\s+(.*)/);

    if (isBullet) {
      formattedLines.push('* ' + isBullet[1]);
      continue;
    }

    if (isNumbered) {
      formattedLines.push(line);
      continue;
    }

    const isHeadingLike = line.length < 80 && 
      !line.endsWith('.') && 
      !line.endsWith(',') && 
      !line.endsWith(':') &&
      !line.endsWith(';') &&
      !line.startsWith('|');

    if (isHeadingLike) {
      const nextLine = (i + 1 < lines.length) ? lines[i + 1].trim() : '';
      if (nextLine !== '') {
        formattedLines.push('## ' + line);
        continue;
      }
    }

    formattedLines.push(line);
  }

  flushTable();
  flushFaq();

  return formattedLines.join('\n');
};

const htmlToMarkdown = (html) => {
  if (typeof window === 'undefined') return { title: '', metaDescription: '', content: '', coverImage: '' };

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  let title = '';
  const titleTag = doc.querySelector('title');
  if (titleTag && titleTag.textContent.trim()) {
    title = titleTag.textContent.trim();
  } else {
    const ogTitle = doc.querySelector('meta[property="og:title"]');
    if (ogTitle && ogTitle.getAttribute('content')) {
      title = ogTitle.getAttribute('content').trim();
    } else {
      const h1 = doc.querySelector('h1');
      if (h1 && h1.textContent.trim()) {
        title = h1.textContent.trim();
      }
    }
  }

  let metaDescription = '';
  const metaDesc = doc.querySelector('meta[name="description"]');
  if (metaDesc && metaDesc.getAttribute('content')) {
    metaDescription = metaDesc.getAttribute('content').trim();
  } else {
    const ogDesc = doc.querySelector('meta[property="og:description"]');
    if (ogDesc && ogDesc.getAttribute('content')) {
      metaDescription = ogDesc.getAttribute('content').trim();
    }
  }

  let coverImage = '';
  const ogImg = doc.querySelector('meta[property="og:image"]');
  if (ogImg && ogImg.getAttribute('content')) {
    coverImage = ogImg.getAttribute('content').trim();
  } else {
    const firstImg = doc.querySelector('article img, main img, body img');
    if (firstImg && firstImg.getAttribute('src')) {
      coverImage = firstImg.getAttribute('src').trim();
    }
  }

  const convertInlineHtml = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tag = node.tagName.toLowerCase();
    const inner = Array.from(node.childNodes).map(convertInlineHtml).join('');

    switch (tag) {
      case 'strong':
      case 'b':
        return `**${inner.trim()}**`;
      case 'em':
      case 'i':
        return `*${inner.trim()}*`;
      case 'code':
        return `\`${inner}\``;
      case 'a':
        const href = node.getAttribute('href') || '';
        return href ? `[${inner.trim()}](${href})` : inner;
      case 'br':
        return '\n';
      default:
        return inner;
    }
  };

  const walk = (element) => {
    let text = '';
    const children = Array.from(element.childNodes);

    children.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent;
        return;
      }

      if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = child.tagName.toLowerCase();

        if (['script', 'style', 'noscript', 'nav', 'footer', 'header', 'svg', 'button', 'form'].includes(tag)) {
          return;
        }

        if (['h1', 'h2'].includes(tag)) {
          text += `\n\n## ${child.textContent.trim()}\n\n`;
        } else if (tag === 'h3') {
          text += `\n\n### ${child.textContent.trim()}\n\n`;
        } else if (['h4', 'h5', 'h6'].includes(tag)) {
          text += `\n\n#### ${child.textContent.trim()}\n\n`;
        } else if (tag === 'p') {
          text += `\n\n${convertInlineHtml(child).trim()}\n\n`;
        } else if (tag === 'ul') {
          const items = Array.from(child.querySelectorAll(':scope > li'));
          text += '\n\n' + items.map((li) => `* ${convertInlineHtml(li).trim()}`).join('\n') + '\n\n';
        } else if (tag === 'ol') {
          const items = Array.from(child.querySelectorAll(':scope > li'));
          text += '\n\n' + items.map((li, i) => `${i + 1}. ${convertInlineHtml(li).trim()}`).join('\n') + '\n\n';
        } else if (tag === 'blockquote') {
          text += `\n\n> ${child.textContent.trim()}\n\n`;
        } else if (tag === 'pre') {
          text += `\n\n\`\`\`\n${child.textContent.trim()}\n\`\`\`\n\n`;
        } else if (tag === 'table') {
          const rows = Array.from(child.querySelectorAll('tr'));
          if (rows.length > 0) {
            let mdTable = '\n\n';
            const firstRowCells = Array.from(rows[0].querySelectorAll('th, td')).map((c) => c.textContent.trim());
            mdTable += '| ' + firstRowCells.join(' | ') + ' |\n';
            mdTable += '| ' + Array(firstRowCells.length).fill('---').join(' | ') + ' |\n';

            for (let r = 1; r < rows.length; r++) {
              const cells = Array.from(rows[r].querySelectorAll('td')).map((c) => c.textContent.trim());
              mdTable += '| ' + cells.join(' | ') + ' |\n';
            }
            text += mdTable + '\n\n';
          }
        } else if (tag === 'img') {
          const src = child.getAttribute('src');
          const alt = child.getAttribute('alt') || 'Article image';
          if (src) text += `\n\n![${alt}](${src})\n\n`;
        } else if (['div', 'section', 'article', 'main'].includes(tag)) {
          text += walk(child);
        } else {
          text += convertInlineHtml(child);
        }
      }
    });
    return text;
  };

  const body = doc.body || doc;
  let markdown = walk(body);
  markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();

  return { title, metaDescription, content: markdown, coverImage };
};

const tokenHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('kd_admin_token')}` }
});

export default function ArticleManager() {
  const { admin } = useAuth();
  const toast = useToast();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [rawText, setRawText] = useState('');
  const [importedFileName, setImportedFileName] = useState('');
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'html' || ext === 'htm') {
        const result = htmlToMarkdown(text);
        if (result.title) updateField('title', result.title);
        if (result.metaDescription) updateField('metaDescription', result.metaDescription);
        if (result.coverImage) updateField('coverImage', result.coverImage);
        if (result.content) updateField('content', result.content);

        setShowAssistant(false);
        setImportedFileName('');
        toast.success('HTML content converted and imported.');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setRawText(text);
        setImportedFileName('');
        toast.success('Text file loaded into assistant.');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const fetchArticles = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiClient.get('/api/admin/articles', tokenHeaders());
      const list = Array.isArray(res.data) ? res.data : res.data?.articles;
      setArticles(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error('Failed to load articles list.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setEditingArticle(null);
    setForm(emptyForm);
    setShowAssistant(false);
    setImportedFileName('');
    setRawText('');
    setShowModal(true);
  };

  const openEdit = (article) => {
    setEditingArticle(article);
    setForm({
      title: article.title || '',
      excerpt: article.excerpt || '',
      content: article.content || '',
      category: article.category || 'Guide',
      coverImage: article.coverImage || '',
      authorName: article.authorName || 'KSubZone Editorial',
      readTime: article.readTime || 5,
      status: article.status || 'Draft',
      isFeatured: !!article.isFeatured,
      tags: Array.isArray(article.tags) ? article.tags.join(', ') : (article.tags || ''),
      relatedMediaTitle: article.relatedMediaTitle || '',
      metaTitle: article.metaTitle || '',
      metaDescription: article.metaDescription || '',
      seoKeywords: Array.isArray(article.seoKeywords) ? article.seoKeywords.join(', ') : (article.seoKeywords || '')
    });
    setShowAssistant(false);
    setImportedFileName('');
    setRawText('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      ...form,
      readTime: Number(form.readTime) || 5,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      seoKeywords: form.seoKeywords.split(',').map((k) => k.trim()).filter(Boolean)
    };

    try {
      if (editingArticle) {
        await apiClient.put(`/api/admin/articles/${editingArticle._id}`, payload, tokenHeaders());
        toast.success('Article updated.');
      } else {
        await apiClient.post('/api/admin/articles', payload, tokenHeaders());
        toast.success('Article created.');
      }
      setShowModal(false);
      fetchArticles(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save article.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (article) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${article.title}"?`)) return;
    try {
      await apiClient.delete(`/api/admin/articles/${article._id}`, tokenHeaders());
      toast.success('Article deleted.');
      fetchArticles(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete article.');
    }
  };

  const columns = [
    {
      key: 'title',
      label: 'Article Title',
      sortable: true,
      render: (_, article) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#151821] border border-white/[0.06] flex-shrink-0">
            {article.coverImage ? (
              <img src={article.coverImage} alt={article.title} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500">
                <FileText className="w-4 h-4" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <span className="font-bold text-slate-100 block text-xs truncate max-w-[280px]">{article.title}</span>
            <span className="text-[10px] text-slate-500 font-mono block truncate">{article.authorName || 'KSubZone Editorial'}</span>
          </div>
        </div>
      )
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      render: (val) => (
        <span className="px-2 py-0.5 rounded-md bg-[#151821] border border-white/[0.06] text-slate-300 text-[10px] font-semibold uppercase">
          {val || 'Guide'}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          val === 'Published' 
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
            : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
        }`}>
          {val}
        </span>
      )
    },
    {
      key: 'viewCount',
      label: 'Views',
      sortable: true,
      render: (val) => <span className="font-mono text-xs text-slate-400">{val ? Number(val).toLocaleString() : 0}</span>
    },
    {
      key: 'updatedAt',
      label: 'Updated',
      sortable: true,
      render: (val) => <span className="text-slate-400 font-mono text-xs">{val ? new Date(val).toLocaleDateString() : '—'}</span>
    },
    {
      key: 'actions',
      label: 'Actions',
      headerAlign: 'text-right',
      render: (_, article) => (
        <div className="flex justify-end gap-1.5">
          {article.status === 'Published' && (
            <Link href={`/articles/${article.slug}`} target="_blank" className="p-1.5 bg-[#151821] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 rounded-lg border border-white/[0.06] transition" title="View Article">
              <Eye className="w-3.5 h-3.5" />
            </Link>
          )}
          <button onClick={() => openEdit(article)} className="p-1.5 bg-[#151821] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 rounded-lg border border-white/[0.06] transition" title="Edit Article">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleDelete(article)} className="p-1.5 bg-[#151821] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg border border-white/[0.06] transition" title="Delete Article">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="admin-shell min-h-screen bg-[#08090D] text-slate-100 flex flex-col lg:flex-row">
      <AdminSidebar mobileOpen={mobileOpen} onCloseMobileNav={() => setMobileOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <AdminTopBar onOpenMobileNav={() => setMobileOpen(true)} />

        <main className="admin-main flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-[1560px] w-full mx-auto space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.05]">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-100 font-display tracking-tight">Manage Articles</h1>
              <p className="text-xs text-slate-400 mt-0.5">Create, edit, draft, publish, feature and SEO-control KSubZone articles</p>
            </div>
            <button
              onClick={openCreate}
              className="flex h-9 items-center gap-1.5 px-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:brightness-110 rounded-lg text-xs font-semibold text-white shadow-sm transition active:scale-95 flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Compose Article
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <StatCard label="Total articles" value={articles.length} icon={FileText} variant="secondary" />
            <StatCard label="Published" value={articles.filter(a => a.status === 'Published').length} icon={FileText} variant="secondary" />
            <StatCard label="Drafts" value={articles.filter(a => a.status === 'Draft').length} icon={FileText} variant="secondary" />
            <StatCard label="Featured" value={articles.filter(a => a.isFeatured).length} icon={Star} variant="secondary" />
          </div>

          <DataTable
            columns={columns}
            data={articles}
            loading={loading}
            searchPlaceholder="Search articles by title or excerpt..."
            searchKey="title"
          />
        </main>
      </div>

      <ModalDrawer
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingArticle ? 'Edit Article' : 'Write New Article'}
        size="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 items-start">
            
            {/* Left Column: Title, Content Editor */}
            <div className="space-y-4">
              <div className="bg-[#151821] border border-white/[0.06] rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Article Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Title</label>
                    <input required value={form.title} onChange={(e) => updateField('title', e.target.value)} className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-slate-100 text-xs outline-none focus:border-violet-500 transition" placeholder="Article Headline" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Category</label>
                    <input value={form.category} onChange={(e) => updateField('category', e.target.value)} className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-slate-100 text-xs outline-none focus:border-violet-500 transition" placeholder="e.g. Guide" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Short Excerpt</label>
                  <textarea rows="2" value={form.excerpt} onChange={(e) => updateField('excerpt', e.target.value)} className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-slate-100 text-xs outline-none focus:border-violet-500 leading-relaxed transition" placeholder="Brief summary of article..." />
                </div>
              </div>

              <div className="bg-[#151821] border border-white/[0.06] rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-fuchsia-400 flex items-center gap-1.5">
                  <BookOpenText className="w-3.5 h-3.5" /> Markdown Content Body
                </h3>
                <div>
                  <textarea required rows="14" value={form.content} onChange={(e) => updateField('content', e.target.value)} placeholder="Write article content in standard markdown..." className="w-full px-3 py-2.5 bg-[#08090D] border border-white/[0.08] rounded-lg text-slate-100 text-xs outline-none focus:border-violet-500 leading-relaxed font-mono resize-y" />
                </div>
              </div>
            </div>

            {/* Right Column: Importer, Cover & Metadata */}
            <div className="space-y-4">
              {/* HTML / Text File Import */}
              <div className="bg-[#151821] border border-white/[0.06] rounded-xl p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-violet-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Import File / HTML</h4>
                </div>
                <div
                  className="border border-dashed border-white/[0.12] hover:border-violet-500/50 rounded-xl p-4 flex flex-col items-center justify-center bg-[#08090D] cursor-pointer transition group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".html,.htm,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <UploadCloud className="w-5 h-5 text-slate-500 group-hover:text-violet-400 mb-1 transition" />
                  {importedFileName ? (
                    <p className="text-xs text-emerald-400 font-semibold truncate max-w-[200px]">{importedFileName}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400 font-medium text-center">Click to upload .html or .txt file</p>
                  )}
                </div>
              </div>

              {/* Text Paste Assistant Toggle */}
              <div className="bg-[#151821] border border-white/[0.06] rounded-xl p-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Text Paste Assistant</h4>
                  <button
                    type="button"
                    onClick={() => setShowAssistant(!showAssistant)}
                    className="px-2 py-0.5 bg-[#08090D] border border-white/[0.08] hover:bg-white/[0.04] rounded-lg text-[10px] font-semibold uppercase tracking-wider transition text-violet-400"
                  >
                    {showAssistant ? 'Hide' : 'Open'}
                  </button>
                </div>

                {showAssistant && (
                  <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2.5">
                    <textarea
                      rows="4"
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder="Paste raw text block here..."
                      className="w-full px-2.5 py-1.5 bg-[#08090D] border border-white/[0.08] rounded-lg text-slate-100 text-xs outline-none focus:border-violet-500 leading-relaxed font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const formatted = autoFormatText(rawText);
                        updateField('content', formatted);
                        setShowAssistant(false);
                        setRawText('');
                        toast.success('Formatted text inserted into editor.');
                      }}
                      className="w-full py-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-xs font-semibold transition text-white shadow-sm"
                    >
                      Format &amp; Insert
                    </button>
                  </div>
                )}
              </div>

              {/* Cover Image & Author */}
              <div className="bg-[#151821] border border-white/[0.06] rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5" /> Publishing &amp; SEO
                </h3>
                
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Cover Image URL</label>
                  <input value={form.coverImage} onChange={(e) => updateField('coverImage', e.target.value)} placeholder="https://..." className="w-full px-2.5 py-1.5 bg-[#08090D] border border-white/[0.08] rounded-lg text-slate-100 text-xs outline-none focus:border-violet-500 transition" />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Author</label>
                    <input value={form.authorName} onChange={(e) => updateField('authorName', e.target.value)} className="w-full px-2.5 py-1.5 bg-[#08090D] border border-white/[0.08] rounded-lg text-slate-100 text-xs outline-none focus:border-violet-500 transition" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Read Time (m)</label>
                    <input type="number" min="1" value={form.readTime} onChange={(e) => updateField('readTime', e.target.value)} className="w-full px-2.5 py-1.5 bg-[#08090D] border border-white/[0.08] rounded-lg text-slate-100 text-xs outline-none focus:border-violet-500 transition" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Status</label>
                    <select value={form.status} onChange={(e) => updateField('status', e.target.value)} className="w-full px-2.5 py-1.5 bg-[#08090D] border border-white/[0.08] rounded-lg text-slate-100 text-xs outline-none focus:border-violet-500 transition">
                      <option value="Draft">Draft</option>
                      <option value="Published">Published</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Related Media</label>
                    <input value={form.relatedMediaTitle} onChange={(e) => updateField('relatedMediaTitle', e.target.value)} className="w-full px-2.5 py-1.5 bg-[#08090D] border border-white/[0.08] rounded-lg text-slate-100 text-xs outline-none focus:border-violet-500 transition" placeholder="e.g. Queen of Tears" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Tags (comma separated)</label>
                  <input value={form.tags} onChange={(e) => updateField('tags', e.target.value)} className="w-full px-2.5 py-1.5 bg-[#08090D] border border-white/[0.08] rounded-lg text-slate-100 text-xs outline-none focus:border-violet-500 transition" placeholder="kdrama, review, cast" />
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                    <input type="checkbox" checked={form.isFeatured} onChange={(e) => updateField('isFeatured', e.target.checked)} className="rounded border-white/20 bg-[#08090D] text-violet-600 focus:ring-0" />
                    <span>Feature on articles home portal</span>
                  </label>
                </div>
              </div>
            </div>

          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.06]">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-white/[0.08] bg-[#151821] text-xs font-semibold text-slate-300 hover:text-white transition">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-xs font-semibold text-white shadow-sm hover:brightness-110 transition disabled:opacity-50 flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Article'}
            </button>
          </div>
        </form>
      </ModalDrawer>
    </div>
  );
}
