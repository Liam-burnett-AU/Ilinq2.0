import { ArrowRight, CornerDownLeft, FileText, Home, Link2, Newspaper, Search, User as UserIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import type { SearchResult } from '@/api/types';

const PAGES = [
  { label: 'Today', to: '/' },
  { label: 'Timetable', to: '/timetable' },
  { label: 'Due work', to: '/due-work' },
  { label: 'News', to: '/news' },
  { label: 'Calendar', to: '/calendar' },
  { label: 'Feedback & achievements', to: '/feedback' },
  { label: 'My classes', to: '/classes' },
  { label: 'Profile & settings', to: '/profile' },
];

export function iconFor(type: string) {
  if (type.startsWith('news')) return Newspaper;
  if (type.startsWith('user')) return UserIcon;
  if (type.startsWith('file')) return FileText;
  if (type === 'link') return Link2;
  return Home;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setResults([]);
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    if (!open || q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      setBusy(true);
      api
        .search(q.trim(), undefined, 8)
        .then((r) => setResults(r.data))
        .catch(() => setResults([]))
        .finally(() => setBusy(false));
    }, 220);
    return () => clearTimeout(t);
  }, [q, open, api]);

  const pageHits = useMemo(() => PAGES.filter((p) => !q || p.label.toLowerCase().includes(q.toLowerCase())).slice(0, 5), [q]);
  const items = useMemo(
    () => [
      ...pageHits.map((p) => ({ key: `p:${p.to}`, label: p.label, meta: 'Page', run: () => navigate(p.to), Icon: ArrowRight })),
      ...results.map((r) => ({
        key: `r:${r.type}:${r.id}`,
        label: r.title,
        meta: r.meta || r.type,
        Icon: iconFor(r.type),
        run: () => {
          if (r.type === 'news') navigate(`/news/${r.id}`);
          else window.open(api.absolute(r.url), '_blank', 'noopener');
        },
      })),
      ...(q.trim().length >= 2 ? [{ key: 'more', label: `Search iLINQ for “${q.trim()}”`, meta: 'All results', Icon: Search, run: () => navigate(`/search?q=${encodeURIComponent(q.trim())}`) }] : []),
    ],
    [pageHits, results, q, navigate, api],
  );

  useEffect(() => setActive(0), [items.length]);

  if (!open) return null;

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    }
    if (e.key === 'Enter' && items[active]) {
      items[active].run();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label="Search">
      <div className="card w-full max-w-xl overflow-hidden" onClick={(e) => e.stopPropagation()} onKeyDown={onKey}>
        <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
          <Search className="h-4 w-4 text-sky" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search pages, news, classes, files, people…"
            className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
            aria-label="Search"
          />
          {busy && <span className="text-xs text-slate-500">Searching…</span>}
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
          {items.map((it, i) => (
            <li key={it.key} role="option" aria-selected={i === active}>
              <button
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${i === active ? 'bg-navy-700/70 text-white' : 'text-slate-300 hover:bg-white/5'}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => {
                  it.run();
                  onClose();
                }}
              >
                <it.Icon className="h-4 w-4 shrink-0 text-sky/80" />
                <span className="flex-1 truncate">{it.label}</span>
                <span className="truncate text-xs text-slate-500">{it.meta}</span>
                {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-slate-500" />}
              </button>
            </li>
          ))}
          {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate-500">No matches</li>}
        </ul>
      </div>
    </div>
  );
}
