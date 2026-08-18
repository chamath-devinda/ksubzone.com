'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/services/api/apiClient';
import { useAuth } from '@/features/auth/hooks/useAuth';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
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

    // stand-alone youtube URL
    const ytMatch = line.match(/^(?:https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)(?:&\S*)?)$/i);
    if (ytMatch) {
      flushFaq();
      flushTable();
      formattedLines.push(`[youtube: ${ytMatch[1]}]`);
      formattedLines.push('');
      continue;
    }

    // copy-pasted TSV table
    if (line.includes('\t')) {
      flushFaq();
      inTableBlock = true;
      const cells = line.split('\t').map(c => c.trim());
      tableBuffer.push(cells);
      continue;
    } else if (inTableBlock && !line.includes('\t')) {
      flushTable();
    }

    // question & answer detection
    const qMatch = line.match(/^(?:ප්‍රශ්නය|ප්‍රශ්න|Question|Q)\s*[:\.-]\s*(.+)$/i);
    const aMatch = line.match(/^(?:පිළිතුර|පිළිතුරු|Answer|A)\s*[:\.-]\s*(.+)$/i);

    if (qMatch) {
      inFaqBlock = true;
      faqBuffer.push(`Q: ${qMatch[1].trim()}`);
      continue;
    } else if (aMatch) {
      faqBuffer.push(`A: ${aMatch[1].trim()}`);
      continue;
    } else if (inFaqBlock && (line.startsWith('*') || line.startsWith('-') || line.startsWith('#') || line === '')) {
      flushFaq();
    } else if (inFaqBlock && faqBuffer.length > 0) {
      faqBuffer[faqBuffer.length - 1] += '\n' + line;
      continue;
    }

    // list items normalisation
    if (line.match(/^[•o\+\-]\s*(.+)$/)) {
      const bulletContent = line.replace(/^[•o\+\-]\s*/, '').trim();
      formattedLines.push(`* ${bulletContent}`);
      continue;
    }

    // headings auto-detection
    if (line.length > 0 && line.length < 80) {
      const isPlain = !line.startsWith('#') && !line.startsWith('*') && !line.startsWith('-') && !/^\d+\./.test(line) && !line.startsWith('|');
      const noPunctuation = !line.endsWith('.') && !line.endsWith('?') && !line.endsWith('!') && !line.endsWith(')');
      
      if (isPlain && noPunctuation) {
        formattedLines.push(`## ${line}`);
        formattedLines.push('');
        continue;
      }
    }

    formattedLines.push(line);
  }

  flushFaq();
  flushTable();

  let result = formattedLines.join('\n');
  result = result.replace(/\n{3,}/g, '\n\n');
  return result;
};

const htmlToMarkdown = (htmlText) => {
  if (typeof window === 'undefined') return { title: '', metaDescription: '', content: '', coverImage: '' };
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');

  // Extract Title
  let title = '';
  const titleTag = doc.querySelector('title');
  if (titleTag) title = titleTag.textContent.trim();
  if (!title) {
    const h1Tag = doc.querySelector('h1');
    if (h1Tag) title = h1Tag.textContent.trim();
  }

  // Extract Meta Description
  let metaDescription = '';
  const metaDescTag = doc.querySelector('meta[name="description"]');
  if (metaDescTag) metaDescription = metaDescTag.getAttribute('content') || '';

  // Extract First Image as Cover Image
  let coverImage = '';
  const firstImg = doc.querySelector('img');
  if (firstImg) {
    coverImage = firstImg.getAttribute('src') || '';
  }

  // Helper function to recursively walk node and build markdown
  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent.replace(/\u00a0/g, ' ');
    }
    
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }
    
    const tag = node.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'head') {
      return '';
    }

    // Special handling for FAQPage schema section
    if (tag === 'section' && node.getAttribute('itemtype')?.includes('FAQPage')) {
      let faqText = '\n\n[FAQ]\n';
      const questions = node.querySelectorAll('[itemtype*="Question"]');
      questions.forEach(qNode => {
        const qNameNode = qNode.querySelector('[itemprop="name"]');
        const aTextNode = qNode.querySelector('[itemprop="text"]');
        if (qNameNode && aTextNode) {
          const qText = qNameNode.textContent.trim();
          const aText = convertInlineHtml(aTextNode);
          faqText += `Q: ${qText}\n`;
          faqText += `A: ${aText}\n`;
        }
      });
      faqText += '[/FAQ]\n\n';
      return faqText;
    }

    // Inline formatting tags
    if (tag === 'strong' || tag === 'b') {
      return `**${childNodesToMarkdown(node)}**`;
    }
    if (tag === 'em' || tag === 'i') {
      return `*${childNodesToMarkdown(node)}*`;
    }
    if (tag === 'code') {
      return `\`${node.textContent}\``;
    }
    if (tag === 'a') {
      const href = node.getAttribute('href') || '';
      return `[${childNodesToMarkdown(node)}](${href})`;
    }
    if (tag === 'span') {
      return childNodesToMarkdown(node);
    }
    
    // Images in body
    if (tag === 'img') {
      const src = node.getAttribute('src') || '';
      const alt = node.getAttribute('alt') || '';
      return `\n\n![${alt}](${src})\n\n`;
    }

    // YouTube embeds
    if (tag === 'iframe') {
      const src = node.getAttribute('src') || '';
      const ytMatch = src.match(/(?:embed\/|watch\?v=)([a-zA-Z0-9_-]+)/);
      if (ytMatch) {
        return `\n\n[youtube: ${ytMatch[1]}]\n\n`;
      }
    }

    // Headings
    if (/^h[1-6]$/.test(tag)) {
      const level = parseInt(tag.charAt(1));
      const hashes = level === 1 ? '##' : '#'.repeat(level);
      return `\n\n${hashes} ${node.textContent.trim()}\n\n`;
    }

    // Lists
    if (tag === 'ul') {
      let listItems = '';
      node.childNodes.forEach(li => {
        if (li.tagName && li.tagName.toLowerCase() === 'li') {
          listItems += `* ${childNodesToMarkdown(li).trim()}\n`;
        }
      });
      return `\n\n${listItems}\n\n`;
    }
    if (tag === 'ol') {
      let listItems = '';
      let index = 1;
      node.childNodes.forEach(li => {
        if (li.tagName && li.tagName.toLowerCase() === 'li') {
          listItems += `${index}. ${childNodesToMarkdown(li).trim()}\n`;
          index++;
        }
      });
      return `\n\n${listItems}\n\n`;
    }

    // Tables
    if (tag === 'table') {
      let tableMarkdown = '\n\n';
      const rows = Array.from(node.querySelectorAll('tr'));
      if (rows.length > 0) {
        let maxCols = 0;
        rows.forEach(row => {
          const cells = row.querySelectorAll('th, td');
          if (cells.length > maxCols) maxCols = cells.length;
        });
        
        rows.forEach((row, rowIndex) => {
          const cells = Array.from(row.querySelectorAll('th, td')).map(cell => {
            return convertInlineHtml(cell).trim().replace(/\|/g, '\\|');
          });
          
          while (cells.length < maxCols) {
            cells.push('');
          }
          
          tableMarkdown += `| ${cells.join(' | ')} |\n`;
          
          if (rowIndex === 0) {
            const separator = Array(maxCols).fill('---');
            tableMarkdown += `| ${separator.join(' | ')} |\n`;
          }
        });
      }
      return tableMarkdown + '\n';
    }

    // Paragraph / Div / Block containers
    if (tag === 'p' || tag === 'div' || tag === 'section' || tag === 'article' || tag === 'body') {
      const text = node.textContent.trim();
      const ytMatch = text.match(/^(?:https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)(?:&\S*)?)$/i);
      if (ytMatch) {
        return `\n\n[youtube: ${ytMatch[1]}]\n\n`;
      }
      
      const content = childNodesToMarkdown(node).trim();
      return content ? `\n\n${content}\n\n` : '';
    }

    if (tag === 'br') {
      return '\n';
    }

    return childNodesToMarkdown(node);
  };

  const childNodesToMarkdown = (parentNode) => {
    let text = '';
    parentNode.childNodes.forEach(child => {
      text += walk(child);
    });
    return text;
  };

  const convertInlineHtml = (inlineElement) => {
    let text = '';
    inlineElement.childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent.replace(/\u00a0/g, ' ');
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const cTag = child.tagName.toLowerCase();
        if (cTag === 'strong' || cTag === 'b') {
          text += `**${convertInlineHtml(child)}**`;
        } else if (cTag === 'em' || cTag === 'i') {
          text += `*${convertInlineHtml(child)}*`;
        } else if (cTag === 'span') {
          text += convertInlineHtml(child);
        } else if (cTag === 'a') {
          text += `[${convertInlineHtml(child)}](${child.getAttribute('href') || ''})`;
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
      setArticles(res.data);
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
      isFeatured: Boolean(article.isFeatured),
      tags: (article.tags || []).join(', '),
      relatedMediaTitle: article.relatedMediaTitle || '',
      metaTitle: article.metaTitle || '',
      metaDescription: article.metaDescription || '',
      seoKeywords: (article.seoKeywords || []).join(', ')
    });
    setShowAssistant(false);
    setImportedFileName('');
    setRawText('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingArticle) {
        await apiClient.put(`/api/admin/articles/${editingArticle._id}`, form, tokenHeaders());
        toast.success('Article modified successfully.');
      } else {
        await apiClient.post('/api/admin/articles', form, tokenHeaders());
        toast.success('New article created successfully.');
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
    if (!window.confirm(`Delete article "${article.title}"?`)) return;
    try {
      await apiClient.delete(`/api/admin/articles/${article._id}`, tokenHeaders());
      toast.success('Article record removed.');
      fetchArticles(true);
    } catch (err) {
      toast.error('Failed to delete article.');
    }
  };

  const columns = [
    {
      key: 'title',
      label: 'Article Info',
      sortable: true,
      render: (val, article) => (
        <div className="flex items-center gap-3">
          <img
            src={article.coverImage || 'https://placehold.co/80x50/111/fff?text=Article'}
            alt={article.title}
            className="w-16 h-10 object-cover rounded-lg bg-luxury-950 border border-white/5 flex-shrink-0"
          />
          <div>
            <p className="font-extrabold text-slate-100 text-sm line-clamp-1">{article.title}</p>
            <p className="text-[10px] text-slate-500 line-clamp-1">{article.excerpt || article.slug}</p>
            {article.isFeatured && (
              <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[9px] font-bold uppercase tracking-wider">
                Featured
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      render: (val) => <span className="font-bold text-slate-200">{val}</span>
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val) => (
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
          val === 'Published' 
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
            : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'
        }`}>
          {val}
        </span>
      )
    },
    {
      key: 'viewCount',
      label: 'Views',
      sortable: true,
      render: (val) => <span className="font-mono text-slate-400">{val || 0}</span>
    },
    {
      key: 'updatedAt',
      label: 'Updated',
      sortable: true,
      render: (val) => <span className="text-slate-400 font-mono text-xs">{val ? new Date(val).toLocaleDateString() : 'N/A'}</span>
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, article) => (
        <div className="flex justify-end gap-2">
          {article.status === 'Published' && (
            <Link href={`/articles/${article.slug}`} target="_blank" className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition" title="View Article">
              <Eye className="w-3.5 h-3.5" />
            </Link>
          )}
          <button onClick={() => openEdit(article)} className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition" title="Edit Article">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleDelete(article)} className="p-1.5 bg-brand-secondary/10 hover:bg-brand-secondary/20 text-brand-secondary rounded-lg transition" title="Delete Article">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-luxury-950 text-slate-100 flex flex-col lg:flex-row">
      <AdminSidebar />

      <main className="flex-grow p-6 sm:p-8 overflow-y-auto min-w-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">Manage Articles</h1>
              <p className="text-slate-400 text-xs mt-1">Create, edit, draft, publish, feature and SEO-control KSubZone articles.</p>
            </div>
            <button
              onClick={openCreate}
              className="px-4 py-2.5 bg-brand-primary hover:bg-opacity-90 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 flex-shrink-0"
            >
              <Plus className="w-4 h-4" /> Compose
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total articles" value={articles.length} icon={FileText} borderClass="border-l-indigo-500" iconBgClass="bg-indigo-500/10" iconColorClass="text-indigo-400" gradClass="from-indigo-500/[0.05]" />
            <StatCard label="Published" value={articles.filter(a => a.status === 'Published').length} icon={FileText} borderClass="border-l-emerald-500" iconBgClass="bg-emerald-500/10" iconColorClass="text-emerald-400" gradClass="from-emerald-500/[0.05]" />
            <StatCard label="Drafts" value={articles.filter(a => a.status === 'Draft').length} icon={FileText} borderClass="border-l-amber-500" iconBgClass="bg-amber-500/10" iconColorClass="text-amber-400" gradClass="from-amber-500/[0.05]" />
            <StatCard label="Featured" value={articles.filter(a => a.isFeatured).length} icon={FileText} borderClass="border-l-violet-500" iconBgClass="bg-violet-500/10" iconColorClass="text-violet-400" gradClass="from-violet-500/[0.05]" />
          </div>

          <DataTable
            columns={columns}
            data={articles}
            loading={loading}
            searchPlaceholder="Search articles by title or excerpt..."
          />
        </div>
      </main>

      <ModalDrawer
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingArticle ? 'Edit Article' : 'Write New Article'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-luxury-950/40 border border-white/5 rounded-2xl p-4.5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-brand-primary mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Article Setup
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Title</label>
                <input required value={form.title} onChange={(e) => updateField('title', e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary transition" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Category</label>
                <input value={form.category} onChange={(e) => updateField('category', e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary transition" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Short Excerpt</label>
              <textarea rows="2" value={form.excerpt} onChange={(e) => updateField('excerpt', e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary leading-relaxed transition" />
            </div>
          </div>

          {/* HTML / Text Import */}
          <div className="bg-luxury-950/40 border border-white/5 rounded-2xl p-4.5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <UploadCloud className="w-4 h-4 text-brand-primary" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Import HTML / Text File</h4>
              <span className="ml-auto text-[9px] text-slate-500 font-bold uppercase tracking-wider">Supports .html · .htm · .txt</span>
            </div>
            <div
              className="relative border-2 border-dashed border-brand-primary/25 hover:border-brand-primary/60 rounded-xl p-6 flex flex-col items-center justify-center bg-black/20 cursor-pointer transition-all duration-200 group"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,.htm,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <UploadCloud className="w-8 h-8 text-brand-primary/50 group-hover:text-brand-primary mb-2 transition" />
              {importedFileName ? (
                <p className="text-xs text-emerald-400 font-bold">{importedFileName} — processing…</p>
              ) : (
                <>
                  <p className="text-xs text-slate-300 font-bold">Click here to choose file</p>
                  <p className="text-[10px] text-slate-500 mt-1 text-center">HTML file content automatically parses title, metadata, cover, and markdown text body</p>
                </>
              )}
            </div>
          </div>

          {/* Collapsible Paste Assistant */}
          <div className="bg-luxury-950/40 border border-white/5 rounded-2xl p-4.5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Text Paste Assistant</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Quickly convert unformatted raw text headings, lists, tables, and FAQ grids.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssistant(!showAssistant)}
                className="px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-[10px] font-bold uppercase tracking-wider transition text-brand-primary"
              >
                {showAssistant ? 'Collapse' : 'Open Assistant'}
              </button>
            </div>

            {showAssistant && (
              <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Raw Text Block</label>
                  <textarea
                    rows="6"
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Paste text from translators or documents here. Headers, lists, TSV tables, and FAQ segments will be formatted to clean markdown."
                    className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary leading-relaxed font-mono"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                  <button
                    type="button"
                    onClick={() => {
                      const formatted = autoFormatText(rawText);
                      updateField('content', formatted);
                      setShowAssistant(false);
                      setRawText('');
                      toast.success('Formatted text imported into editor body.');
                    }}
                    className="px-4.5 py-2 bg-brand-primary hover:bg-opacity-90 rounded-xl text-xs font-bold uppercase tracking-wider transition text-white"
                  >
                    Format &amp; Insert
                  </button>
                  <div className="text-[9px] text-slate-500 space-y-0.5 bg-white/[0.02] p-3 rounded-xl border border-white/5 w-full sm:max-w-xs">
                    <p className="font-extrabold uppercase text-brand-primary text-[8px] mb-1">💡 QUICK CHEATSHEET</p>
                    <p>• Plain line without ending punctuation becomes H2</p>
                    <p>• Lines starting with bullets list are converted to * items</p>
                    <p>• Direct Copy/Paste TSV grids are formatted into Markdown tables</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-luxury-950/40 border border-white/5 rounded-2xl p-4.5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-brand-secondary mb-2 flex items-center gap-2">
              <BookOpenText className="w-4 h-4" /> Markdown Editor
            </h3>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Article Body (supports Markdown)</label>
              <textarea required rows="10" value={form.content} onChange={(e) => updateField('content', e.target.value)} placeholder="Write article here. Use blank lines to separate paragraphs. Use markdown syntax like ## (H2), ### (H3), lists, tables, YouTube embed formats, and [FAQ] blocks." className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary leading-relaxed font-mono" />
            </div>
          </div>

          <div className="bg-luxury-950/40 border border-white/5 rounded-2xl p-4.5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-yellow-500 mb-2 flex items-center gap-2">
              <Star className="w-4 h-4" /> SEO Metadata & Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Cover Image URL</label>
                <input value={form.coverImage} onChange={(e) => updateField('coverImage', e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary transition" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Read Time (minutes)</label>
                <input type="number" min="1" value={form.readTime} onChange={(e) => updateField('readTime', e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary transition" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Author</label>
                <input value={form.authorName} onChange={(e) => updateField('authorName', e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary transition" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Related Media Title</label>
                <input value={form.relatedMediaTitle} onChange={(e) => updateField('relatedMediaTitle', e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary transition" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Status</label>
                <select value={form.status} onChange={(e) => updateField('status', e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary transition">
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Tags (comma separated)</label>
                <input value={form.tags} onChange={(e) => updateField('tags', e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary transition" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">SEO Keywords (comma separated)</label>
                <input value={form.seoKeywords} onChange={(e) => updateField('seoKeywords', e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary transition" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Meta Title</label>
                <input value={form.metaTitle} onChange={(e) => updateField('metaTitle', e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary transition" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Meta Description</label>
                <input value={form.metaDescription} onChange={(e) => updateField('metaDescription', e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary transition" />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
              <input type="checkbox" checked={form.isFeatured} onChange={(e) => updateField('isFeatured', e.target.checked)} className="w-4 h-4 accent-brand-primary rounded bg-luxury-950 border-white/10" />
              Feature this article on the public articles portal page
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-300 transition">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-brand-primary hover:bg-opacity-95 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition">
              <Save className="w-4 h-4 inline mr-1" /> {saving ? 'Saving...' : 'Save Article'}
            </button>
          </div>
        </form>
      </ModalDrawer>
    </div>
  );
}
