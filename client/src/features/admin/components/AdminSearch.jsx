'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import apiClient from '@/services/api/apiClient';
import ModalDrawer from './ModalDrawer';

const QUICK_COMMANDS = [
  { id: 'dashboard', title: 'Open Dashboard', type: 'Navigation', href: '/management/dashboard' },
  { id: 'import', title: 'Open TMDB Auto-Import', type: 'Navigation', href: '/management/import' },
  { id: 'movies', title: 'Manage Movies', type: 'Navigation', href: '/management/movies' },
  { id: 'dramas', title: 'Manage Dramas & TV', type: 'Navigation', href: '/management/dramas' },
  { id: 'subtitles', title: 'Open Subtitle Repository', type: 'Navigation', href: '/management/subtitles' },
  { id: 'studio', title: 'Open Subtitle Studio', type: 'Navigation', href: '/management/subtitle-tools' },
  { id: 'database', title: 'Open Database', type: 'Navigation', href: '/management/database' },
  { id: 'settings', title: 'Open Site Builder', type: 'Navigation', href: '/management/settings' },
];

export default function AdminSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle');
  const [active, setActive] = useState(-1);
  const input = useRef(null);
  const router = useRouter();
  const paletteItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const commands = QUICK_COMMANDS.filter(item => !normalized || `${item.title} ${item.type}`.toLowerCase().includes(normalized));
    return [...commands, ...results];
  }, [query, results]);
  const closePalette = () => {
    setOpen(false);
    setQuery('');
    setResults([]);
    setActive(-1);
  };
  useEffect(() => {
    const key = (event) => {
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
  const choose = item => { closePalette(); router.push(item.href); };
  return <>
    <button type="button" onClick={() => setOpen(true)} className="admin-search-trigger" aria-label="Search admin content">
      <Search size={16} className="text-slate-400" /><span className="hidden sm:inline text-xs">Search pages, settings or ...</span><kbd className="hidden lg:inline text-[10px]">Ctrl K</kbd>
    </button>
    <ModalDrawer isOpen={open} onClose={closePalette} title="Search your content">
      <label className="block text-sm" htmlFor="admin-global-search">Movies, dramas, articles and subtitles</label>
      <input ref={input} id="admin-global-search" type="search" autoFocus maxLength={100} value={query} onChange={e => setQuery(e.target.value)}
        role="combobox" aria-autocomplete="list" aria-expanded={paletteItems.length > 0} aria-controls="admin-search-results" aria-activedescendant={active >= 0 ? `admin-result-${active}` : undefined}
        className="w-full rounded-xl border p-3" placeholder="Enter at least two characters"
        onKeyDown={e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, paletteItems.length - 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
          if (e.key === 'Enter') {
            const selectedIndex = active >= 0 ? active : 0;
            if (paletteItems[selectedIndex]) { e.preventDefault(); choose(paletteItems[selectedIndex]); }
          }
        }} />
      <p role="status" className="text-sm text-slate-500 dark:text-slate-400">{status === 'loading' ? 'Searching…' : status === 'error' ? 'Search unavailable. Change the query to retry.' : status === 'ready' && !paletteItems.length ? 'No matching commands or content.' : status === 'idle' ? 'Jump to a module or search content you have permission to manage.' : `${paletteItems.length} matches`}</p>
      <ul id="admin-search-results" role="listbox" aria-label="Search results" className="space-y-1">
        {paletteItems.map((item, index) => <li key={`${item.type}-${item.id}`} id={`admin-result-${index}`} role="option" aria-selected={index === active}>
          <button tabIndex={-1} type="button" onClick={() => choose(item)} className={`w-full rounded-xl p-3 text-left ${index === active ? 'bg-violet-500/20' : 'hover:bg-violet-500/10'}`}>
            <span className="block text-xs text-violet-400">{item.type}</span><span className="block truncate">{item.title}</span>
          </button>
        </li>)}
      </ul>
    </ModalDrawer>
  </>;
}
