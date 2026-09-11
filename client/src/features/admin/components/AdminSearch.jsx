'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import apiClient from '@/services/api/apiClient';
import ModalDrawer from './ModalDrawer';

export default function AdminSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle');
  const [active, setActive] = useState(-1);
  const input = useRef(null);
  const router = useRouter();
  useEffect(() => {
    const key = event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setOpen(value => !value); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  useEffect(() => {
    if (!open || query.trim().length < 2) { setResults([]); setStatus('idle'); return; }
    const controller = new AbortController();
    setStatus('loading'); setActive(-1);
    const timer = setTimeout(async () => {
      try {
        const { data } = await apiClient.get('/api/admin/search', { params: { q: query.trim() }, signal: controller.signal });
        if (!controller.signal.aborted) { setResults(data.results || []); setStatus('ready'); }
      } catch {
        if (!controller.signal.aborted) { setResults([]); setStatus('error'); }
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, open]);
  const choose = item => { setOpen(false); router.push(item.href); };
  return <>
    <button type="button" onClick={() => setOpen(true)} className="admin-search-trigger" aria-label="Search admin content">
      <Search size={18} /><span className="hidden sm:inline">Search content…</span><kbd className="hidden lg:inline">Ctrl K</kbd>
    </button>
    <ModalDrawer isOpen={open} onClose={() => setOpen(false)} title="Search your content">
      <label className="block text-sm" htmlFor="admin-global-search">Movies, dramas, articles and subtitles</label>
      <input ref={input} id="admin-global-search" type="search" autoFocus maxLength={100} value={query} onChange={e => setQuery(e.target.value)}
        role="combobox" aria-autocomplete="list" aria-expanded={results.length > 0} aria-controls="admin-search-results" aria-activedescendant={active >= 0 ? `admin-result-${active}` : undefined}
        className="w-full rounded-xl border p-3" placeholder="Enter at least two characters"
        onKeyDown={e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, results.length - 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
          if (e.key === 'Enter' && results[active]) { e.preventDefault(); choose(results[active]); }
        }} />
      <p role="status" className="text-sm text-slate-500 dark:text-slate-400">{status === 'loading' ? 'Searching…' : status === 'error' ? 'Search unavailable. Change the query to retry.' : status === 'ready' && !results.length ? 'No matching content.' : status === 'idle' ? 'Search across modules you have permission to manage.' : `${results.length} results`}</p>
      <ul id="admin-search-results" role="listbox" aria-label="Search results" className="space-y-1">
        {results.map((item, index) => <li key={`${item.type}-${item.id}`} id={`admin-result-${index}`} role="option" aria-selected={index === active}>
          <button tabIndex={-1} type="button" onClick={() => choose(item)} className={`w-full rounded-xl p-3 text-left ${index === active ? 'bg-violet-500/20' : 'hover:bg-violet-500/10'}`}>
            <span className="block text-xs text-violet-400">{item.type}</span><span className="block truncate">{item.title}</span>
          </button>
        </li>)}
      </ul>
    </ModalDrawer>
  </>;
}
