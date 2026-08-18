'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/api/apiClient';
import { ArrowLeft, CalendarDays, Clock3, Tag, Eye } from 'lucide-react';

// Helper to extract YouTube ID from URL or return plain ID
const getYoutubeId = (urlOrId) => {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  // If it looks like a plain video ID (11 chars, no slashes or spaces)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  // Otherwise extract from URL
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = trimmed.match(regExp);
  return (match && match[2].length >= 10) ? match[2] : null;
};

// Helper to parse line-by-line inline markdown-like formatting (bold, italic, links)
const renderFormattedText = (text, isDarkMode) => {
  if (!text) return '';
  
  const regex = /(\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\))/g;
  const matches = text.match(regex);
  
  if (!matches) {
    return text;
  }
  
  const parts = [];
  let lastIndex = 0;
  
  text.replace(regex, (match, offset) => {
    if (offset > lastIndex) {
      parts.push(text.substring(lastIndex, offset));
    }
    
    if (match.startsWith('**') && match.endsWith('**')) {
      const content = match.slice(2, -2);
      parts.push(
        <strong key={offset} className={`font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          {content}
        </strong>
      );
    } else if (match.startsWith('*') && match.endsWith('*')) {
      const content = match.slice(1, -1);
      parts.push(
        <em key={offset} className={`italic ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
          {content}
        </em>
      );
    } else if (match.startsWith('[') && match.includes('](')) {
      const closeBracket = match.indexOf(']');
      const label = match.slice(1, closeBracket);
      const url = match.slice(closeBracket + 2, -1);
      parts.push(
        <a 
          key={offset} 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className={`font-bold underline transition ${
            isDarkMode 
              ? 'text-violet-400 hover:text-violet-300' 
              : 'text-brand-primary hover:text-brand-secondary'
          }`}
        >
          {label}
        </a>
      );
    }
    
    lastIndex = offset + match.length;
    return match;
  });
  
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts;
};

const AUTHOR_REGISTRY = {
  'KSubZone Editorial': {
    name: 'KSubZone Editorial',
    role: 'Senior K-Drama Critic & Editor',
    bio: 'Our in-house editorial team brings together years of passion for Korean cinematography. From character studies to ending explanations, we cover it all.',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop'
  },
  'KSubZone Contributor': {
    name: 'KSubZone Contributor',
    role: 'Community Guest Writer',
    bio: 'A passionate drama fan sharing subtitle notes, watchlists, and viewer guides with the Sri Lankan K-drama community.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop'
  }
};

const getAuthor = (name) => {
  return AUTHOR_REGISTRY[name] || {
    name: name || 'KSubZone Writer',
    role: 'K-Drama Enthusiast',
    bio: 'Dedicated reviewer and community translator sharing detailed insights into the latest Korean entertainment releases.',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop'
  };
};

// Helper to parse FAQ lines into Q&A lists
const parseFaqItems = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const items = [];
  let currentQ = null;
  let currentA = null;
  
  for (let line of lines) {
    if (line.startsWith('Q:') || line.startsWith('Q :')) {
      if (currentQ && currentA) {
        items.push({ q: currentQ, a: currentA });
      }
      currentQ = line.replace(/^Q\s*:\s*/i, '').trim();
      currentA = null;
    } else if (line.startsWith('A:') || line.startsWith('A :')) {
      currentA = line.replace(/^A\s*:\s*/i, '').trim();
    } else {
      if (currentA) {
        currentA += '\n' + line;
      } else if (currentQ) {
        currentQ += ' ' + line;
      }
    }
  }
  if (currentQ && currentA) {
    items.push({ q: currentQ, a: currentA });
  }
  return items;
};

// Parser to split markdown text into block components
const parseArticleBlocks = (content) => {
  if (!content) return [];
  
  const normalized = content.replace(/\r\n/g, '\n');
  const rawBlocks = normalized.split(/\n\n+/);
  const blocks = [];
  
  for (let rawBlock of rawBlocks) {
    const block = rawBlock.trim();
    if (!block) continue;
    
    // 1. YouTube embeds
    const ytTagMatch = block.match(/^\[youtube:\s*(.+?)\]$/i);
    if (ytTagMatch) {
      const videoId = getYoutubeId(ytTagMatch[1]);
      if (videoId) {
        blocks.push({ type: 'youtube', videoId });
        continue;
      }
    }
    const ytUrlMatch = block.match(/^(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)(?:&\S*)?)$/i);
    if (ytUrlMatch) {
      const videoId = ytUrlMatch[2] || getYoutubeId(ytUrlMatch[1]);
      if (videoId) {
        blocks.push({ type: 'youtube', videoId });
        continue;
      }
    }
    
    // 2. Images with captions: ![caption](url)
    const imgMatch = block.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      blocks.push({ type: 'image', caption: imgMatch[1], url: imgMatch[2] });
      continue;
    }
    
    // 3. Headings
    if (block.startsWith('### ')) {
      blocks.push({ type: 'h3', text: block.slice(4).trim() });
      continue;
    }
    if (block.startsWith('## ')) {
      blocks.push({ type: 'h2', text: block.slice(3).trim() });
      continue;
    }
    if (block.startsWith('# ')) {
      blocks.push({ type: 'h1', text: block.slice(2).trim() });
      continue;
    }
    
    // 4. Tables: Lines beginning/ending with pipe
    if (block.startsWith('|')) {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length >= 2) {
        const headers = lines[0].replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
        const hasDelimiter = lines[1] && lines[1].includes('-');
        const dataStartIdx = hasDelimiter ? 2 : 1;
        
        const rows = [];
        for (let i = dataStartIdx; i < lines.length; i++) {
          const cells = lines[i].replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
          rows.push(cells);
        }
        blocks.push({ type: 'table', headers, rows });
        continue;
      }
    }
    
    // 5. Bullet Lists
    if (block.startsWith('* ') || block.startsWith('- ')) {
      const items = block.split('\n').map(line => {
        const clean = line.trim();
        if (clean.startsWith('* ')) return clean.slice(2);
        if (clean.startsWith('- ')) return clean.slice(2);
        return clean;
      }).filter(Boolean);
      blocks.push({ type: 'bullet-list', items });
      continue;
    }
    
    // 6. Numbered Lists
    if (/^\d+\.\s/.test(block)) {
      const items = block.split('\n').map(line => {
        return line.replace(/^\d+\.\s+/, '').trim();
      }).filter(Boolean);
      blocks.push({ type: 'number-list', items });
      continue;
    }
    
    // 7. FAQ Block: [FAQ] ... [/FAQ]
    if (block.startsWith('[FAQ]') && block.endsWith('[/FAQ]')) {
      const faqText = block.slice(5, -6).trim();
      const faqItems = parseFaqItems(faqText);
      blocks.push({ type: 'faq', items: faqItems });
      continue;
    }
    
    // 8. Auto-detect Q&A pattern in block
    if (block.includes('\nQ:') || block.startsWith('Q:')) {
      const faqItems = parseFaqItems(block);
      if (faqItems.length > 0) {
        blocks.push({ type: 'faq', items: faqItems });
        continue;
      }
    }
    
    // 9. Standard Paragraphs
    blocks.push({ type: 'paragraph', text: block });
  }
  return blocks;
};

// Component-based Block Renderer
const renderBlock = (block, index, isDarkMode) => {
  switch (block.type) {
    case 'h1':
      return (
        <h1 key={index} className={`text-3xl sm:text-4xl font-serif font-black mt-8 mb-4 leading-tight tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          {renderFormattedText(block.text, isDarkMode)}
        </h1>
      );
    case 'h2':
      return (
        <h2 key={index} className={`text-2xl sm:text-3xl font-serif font-bold mt-10 mb-5 pb-2 border-b leading-tight tracking-tight ${
          isDarkMode ? 'text-white border-white/10' : 'text-slate-900 border-slate-100'
        }`}>
          {renderFormattedText(block.text, isDarkMode)}
        </h2>
      );
    case 'h3':
      return (
        <h3 key={index} className={`text-xl sm:text-2xl font-serif font-semibold mt-8 mb-4 leading-snug ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
          {renderFormattedText(block.text, isDarkMode)}
        </h3>
      );
    case 'youtube':
      return (
        <div key={index} className={`my-10 rounded-3xl overflow-hidden shadow-2xl border ${
          isDarkMode ? 'border-white/10 shadow-black/60' : 'border-slate-200 shadow-slate-300/40'
        }`} style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
          <iframe
            src={`https://www.youtube.com/embed/${block.videoId}?rel=0&modestbranding=1`}
            title="YouTube video player"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      );
    case 'image':
      return (
        <div key={index} className="my-8 flex flex-col items-center">
          <img src={block.url} alt={block.caption || 'Article image'} className={`rounded-2xl w-full object-cover shadow-lg max-h-[520px] border ${
            isDarkMode ? 'border-white/5' : 'border-slate-100'
          }`} />
          {block.caption && (
            <p className={`mt-3 text-xs sm:text-sm italic font-medium text-center px-4 leading-relaxed ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              {block.caption}
            </p>
          )}
        </div>
      );
    case 'bullet-list':
      return (
        <ul key={index} className="list-none my-6 pl-2 space-y-3.5">
          {block.items.map((item, idx) => (
            <li key={idx} className={`flex items-start gap-3 leading-relaxed text-base ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              <span className="w-2.5 h-2.5 rounded-full mt-2 shrink-0 bg-brand-primary" />
              <span className="flex-1">{renderFormattedText(item, isDarkMode)}</span>
            </li>
          ))}
        </ul>
      );
    case 'number-list':
      return (
        <ol key={index} className="list-none my-6 pl-2 space-y-3.5">
          {block.items.map((item, idx) => (
            <li key={idx} className={`flex items-start gap-3 leading-relaxed text-base ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              <span className="font-extrabold text-brand-primary shrink-0 min-w-[1.25rem] text-right">{idx + 1}.</span>
              <span className="flex-1">{renderFormattedText(item, isDarkMode)}</span>
            </li>
          ))}
        </ol>
      );
    case 'table':
      return (
        <div key={index} className={`my-8 overflow-x-auto rounded-2xl border shadow-md ${
          isDarkMode ? 'border-white/5 bg-white/[0.01]' : 'border-slate-200 bg-white'
        }`}>
          <table className={`min-w-full divide-y text-left text-sm ${
            isDarkMode ? 'divide-white/5 text-slate-300' : 'divide-slate-200 text-slate-700'
          }`}>
            <thead className={`${isDarkMode ? 'bg-white/[0.03] text-slate-400' : 'bg-slate-50 text-slate-500'} text-[11px] uppercase tracking-wider font-extrabold`}>
              <tr>
                {block.headers.map((h, i) => (
                  <th key={i} className="px-6 py-4 font-black">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-white/[0.02]' : 'divide-slate-100'}`}>
              {block.rows.map((row, rowIdx) => (
                <tr key={rowIdx} className={`transition ${isDarkMode ? 'hover:bg-white/[0.01]' : 'hover:bg-slate-50/50'}`}>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="px-6 py-4 font-medium">{renderFormattedText(cell, isDarkMode)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'faq':
      return (
        <div key={index} className="my-8 space-y-4">
          {block.items.map((item, idx) => (
            <div key={idx} className={`border rounded-2xl p-5 hover:border-brand-primary/30 transition duration-300 ${
              isDarkMode 
                ? 'border-white/5 bg-white/[0.02] shadow-black/30' 
                : 'border-slate-200/80 bg-slate-50/40 shadow-slate-100/50 shadow-sm'
            }`}>
              <h4 className={`text-base sm:text-lg font-bold flex items-start gap-2.5 leading-snug ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                <span className="text-brand-primary text-xl font-black shrink-0 leading-none">Q.</span>
                <span>{renderFormattedText(item.q, isDarkMode)}</span>
              </h4>
              <div className={`mt-3 text-sm sm:text-base pl-7 leading-relaxed space-y-2 ${
                isDarkMode ? 'text-slate-300' : 'text-slate-600'
              }`}>
                {item.a.split('\n').map((para, pIdx) => (
                  <p key={pIdx}>{renderFormattedText(para, isDarkMode)}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    case 'paragraph':
    default:
      return (
        <p key={index} className={`leading-relaxed text-base sm:text-lg mb-6 text-justify ${
          isDarkMode ? 'text-slate-300' : 'text-slate-700'
        }`}>
          {renderFormattedText(block.text, isDarkMode)}
        </p>
      );
  }
};

export default function ArticleDetail({ initialData }) {
  const { slug } = useParams();
  const theme = 'dark';

  const { data, isLoading, error } = useQuery({
    queryKey: ['articleDetail', slug],
    queryFn: async () => {
      const res = await apiClient.get(`/api/articles/${slug}`);
      return res.data;
    },
    initialData
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center text-brand-primary">
        Loading article...
      </div>
    );
  }

  if (error || !data?.article) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-black text-white">Article not found</h1>
          <Link href="/articles" className="mt-4 inline-flex px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold">
            Back to Articles
          </Link>
        </div>
      </div>
    );
  }

  const { article, related = [] } = data;
  const parsedBlocks = parseArticleBlocks(article.content || '');
  const author = getAuthor(article.authorName);

  return (
    <div className="min-h-screen bg-transparent pb-16">
      <article>
        {/* Hero Banner */}
        <section className="relative min-h-[72vh] lg:min-h-[80vh] overflow-hidden flex items-end border-b border-white/5">
          <img
            src={article.coverImage || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1800&auto=format&fit=crop'}
            alt={article.title}
            className="absolute inset-0 h-full w-full object-cover scale-[1.02]"
            style={{ objectPosition: 'center top' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-luxury-950 via-luxury-950/80 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-luxury-950/40 to-transparent" />
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-14 pt-32 text-left">
            <Link href="/articles" className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-white mb-8 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Articles
            </Link>
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-5">
              <span className="rounded-full bg-brand-primary/25 border border-brand-primary/50 px-3.5 py-1 text-brand-primary">{article.category}</span>
              <span className="text-slate-400 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Draft'}</span>
              <span className="text-slate-400 flex items-center gap-1.5"><Clock3 className="w-3.5 h-3.5" /> {article.readTime || 5} min read</span>
              {article.viewCount !== undefined && (
                <span className="text-slate-400 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> {article.viewCount} Views</span>
              )}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight max-w-4xl">{article.title}</h1>
            {article.excerpt && (
              <p className="mt-5 text-base sm:text-lg text-slate-300 leading-8 max-w-3xl font-light">{article.excerpt}</p>
            )}
          </div>
        </section>

        {/* Content Area */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 text-left">
          {/* Tags & Theme Toggle Bar */}
          <div className="flex items-center justify-between gap-4 mb-8 py-4 border-b border-white/5">
            <div className="flex flex-wrap gap-2">
              {(article.tags || []).map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:border-brand-primary/30 hover:text-slate-200 transition-colors cursor-default">
                  <Tag className="w-3 h-3 text-brand-primary" /> {tag}
                </span>
              ))}
            </div>

          </div>

          {/* Article Body */}
          <div className={`rounded-3xl shadow-2xl border transition-all duration-500 overflow-hidden ${
            theme === 'light'
              ? 'bg-white border-slate-100'
              : 'bg-white/[0.025] border-white/[0.06]'
          }`}>
            {/* Reading progress strip */}
            <div className={`h-1 w-full ${
              theme === 'light'
                ? 'bg-gradient-to-r from-brand-primary via-violet-500 to-brand-secondary'
                : 'bg-gradient-to-r from-brand-primary/80 via-violet-500/80 to-brand-secondary/80'
            }`} />
            <div className="p-6 sm:p-10 lg:p-14">
              {parsedBlocks.map((block, index) => renderBlock(block, index, theme === 'dark'))}
            </div>
          </div>

          {/* Author Bio Panel */}
          <div className="mt-10 p-6 sm:p-8 rounded-3xl border border-white/5 bg-white/[0.015] flex flex-col sm:flex-row gap-6 items-center sm:items-start text-left">
            <img 
              src={author.avatar} 
              alt={author.name} 
              className="w-16 h-16 rounded-full object-cover border border-white/10 flex-shrink-0"
              onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop'; }}
            />
            <div className="flex-grow flex flex-col gap-1 text-center sm:text-left">
              <div>
                <span className="text-[10px] text-brand-primary font-extrabold uppercase tracking-widest">Written By</span>
                <h3 className="text-lg font-black text-white">{author.name}</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{author.role}</p>
              </div>
              <p className="text-sm text-slate-300 leading-6 mt-2 font-light">
                {author.bio}
              </p>
            </div>
          </div>

          {/* Related Articles */}
          {related.length > 0 && (
            <div className="mt-16 border-t border-white/5 pt-10">
              <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                <span className="w-1 h-6 rounded-full bg-brand-primary" />
                Related Articles
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {related.map((item) => (
                  <Link
                    key={item._id}
                    href={`/articles/${item.slug}`}
                    className="group rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden hover:border-brand-primary/40 hover:bg-white/[0.04] transition-all duration-300"
                  >
                    <div className="overflow-hidden h-32">
                      <img src={item.coverImage || article.coverImage} alt={item.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    </div>
                    <div className="p-4">
                      <p className="text-xs font-black text-white line-clamp-2 leading-relaxed group-hover:text-brand-primary transition-colors">{item.title}</p>
                      <p className="mt-2 text-[10px] text-brand-primary font-bold uppercase tracking-wider">{item.category}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      </article>
    </div>
  );
}
