import { format } from 'date-fns';
import { ExternalLink, Search } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { SearchResultType } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { iconFor } from '@/components/CommandPalette';
import { EmptyState, ErrorBanner, PageHeader, Skeleton } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';

const TYPE_FILTERS: { label: string; types?: SearchResultType[] }[] = [
  { label: 'Everything' },
  { label: 'News', types: ['news'] },
  { label: 'Pages', types: ['page'] },
  { label: 'Files', types: ['file'] },
  { label: 'Assessments', types: ['assessment'] },
  { label: 'People', types: ['user'] },
  { label: 'Events', types: ['event'] },
];

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [draft, setDraft] = useState(q);
  const [filterIdx, setFilterIdx] = useState(0);
  const { api } = useAuth();
  useEffect(() => setDraft(q), [q]);
  const types = TYPE_FILTERS[filterIdx].types;
  const res = useAsync(q.trim().length >= 2 ? `search:${api.kind}:${q}:${filterIdx}` : null, () => api.search(q.trim(), types ? { types } : undefined, 40), [q, filterIdx], 60_000);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setParams(draft.trim() ? { q: draft.trim() } : {});
  };

  return (
    <div>
      <PageHeader title="Search" subtitle="Everything in iLINQ: news, class pages, files, assessments and people" />
      <form onSubmit={submit} className="relative mb-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted/80" />
        <input className="input !pl-10" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search…" autoFocus aria-label="Search" />
      </form>
      <div className="mb-4 flex flex-wrap gap-2">
        {TYPE_FILTERS.map((f, i) => (
          <button key={f.label} className={`chip ${filterIdx === i ? '!border-sky/50 !bg-navy-700/70 text-ink' : ''}`} onClick={() => setFilterIdx(i)}>
            {f.label}
          </button>
        ))}
      </div>
      <ErrorBanner error={res.error} onRetry={res.refresh} />
      {q.trim().length < 2 ? (
        <EmptyState icon={<Search className="h-6 w-6" />} title="Type at least two characters" />
      ) : res.loading ? (
        <div className="space-y-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : !res.data?.data.length ? (
        <EmptyState title={`No results for “${q}”`} />
      ) : (
        <ul className="space-y-2">
          {res.data.data.map((r) => {
            const Icon = iconFor(r.type);
            const internal = r.type === 'news' ? `/news/${r.id}` : null;
            const content = (
              <>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-700 text-sky">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{r.title}</span>
                  <span className="block truncate text-xs text-ink-muted">
                    {[r.meta, r.context?.map((c) => c.name).join(' › '), r.date ? format(new Date(r.date), 'd MMM yyyy') : null].filter(Boolean).join(' · ')}
                  </span>
                  {r.description && <span className="mt-0.5 line-clamp-2 block text-xs text-ink-muted/80">{r.description}</span>}
                </span>
                {!internal && <ExternalLink className="h-4 w-4 shrink-0 text-ink-muted/80" />}
              </>
            );
            const cls = 'flex items-center gap-3 rounded-card border border-line/10 bg-white/[0.02] px-3 py-2.5 transition hover:bg-white/[0.06]';
            return (
              <li key={`${r.type}-${r.id}`}>
                {internal ? (
                  <Link to={internal} className={cls}>
                    {content}
                  </Link>
                ) : (
                  <a href={api.absolute(r.url)} target="_blank" rel="noreferrer" className={cls}>
                    {content}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
