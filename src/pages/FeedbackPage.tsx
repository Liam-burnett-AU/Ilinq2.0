import { format } from 'date-fns';
import { Award, MessageSquareQuote, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { EvidenceFeedItem } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { Card, EmptyState, ErrorBanner, PageHeader, Skeleton } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';

type Filter = 'all' | 'feedback' | 'badge' | 'moment';

function kindOf(it: EvidenceFeedItem): Exclude<Filter, 'all'> {
  if (it.discriminator === 'badge' || 'name' in it.object) return 'badge';
  if (it.discriminator === 'dueWorkFeedback' || 'assessment' in it.object || 'mark' in it.object) return 'feedback';
  return 'moment';
}

export default function FeedbackPage() {
  const { api, subjectId, user, viewAs } = useAuth();
  const [filter, setFilter] = useState<Filter>('all');
  const q = useAsync(subjectId ? `evidence:${api.kind}:${subjectId}` : null, () => api.getEvidenceFeed(subjectId!), [subjectId], 120_000);
  const items = (q.data?.data ?? []).filter((it) => filter === 'all' || kindOf(it) === filter);
  const who = user?.role.type === 'parent' && viewAs ? `${viewAs.givenName || viewAs.firstname}'s` : 'Your';

  return (
    <div>
      <PageHeader title="Feedback & achievements" subtitle={`${who} learning moments, badges and due work feedback`} />
      <ErrorBanner error={q.error} onRetry={q.refresh} />
      <div className="mb-4 flex flex-wrap gap-2">
        {(['all', 'feedback', 'badge', 'moment'] as Filter[]).map((f) => (
          <button key={f} className={`chip ${filter === f ? '!border-sky/50 !bg-navy-700/70 text-white' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'Everything' : f === 'feedback' ? 'Due work feedback' : f === 'badge' ? 'Badges' : 'Learning moments'}
          </button>
        ))}
      </div>
      {q.loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="Nothing here yet" hint="Feedback appears once teachers mark due work or post a learning moment." />
      ) : (
        <ol className="relative space-y-3 border-l border-white/10 pl-5">
          {items.map((it, i) => {
            const k = kindOf(it);
            const o = it.object;
            const Icon = k === 'badge' ? Award : k === 'feedback' ? MessageSquareQuote : Sparkles;
            const teacher = o.creator ? [o.creator.firstName, o.creator.lastName].filter(Boolean).join(' ') : '';
            return (
              <li key={`${k}-${o.id ?? i}`} className="relative">
                <span className={`absolute -left-[29px] top-3 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-navy-950 ${k === 'badge' ? 'bg-gold text-navy-950' : 'bg-navy-600 text-white'}`}>
                  <Icon className="h-3 w-3" />
                </span>
                <Card>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-base font-semibold text-white">
                      {k === 'badge' ? (o.name as string) || (o.title as string) : k === 'feedback' ? o.assessment?.title || 'Feedback' : 'Learning moment'}
                    </h3>
                    <span className="font-mono text-xs text-slate-500">{format(new Date(it.date), 'd MMM yyyy')}</span>
                  </div>
                  {k === 'feedback' && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      {o.assessment?.folder?.name}
                      {o.mark ? ` · Mark: ` : ''}
                      {o.mark && <span className="font-mono font-semibold text-gold">{o.mark}</span>}
                    </p>
                  )}
                  {(o.comment || o.body) && <p className="mt-2 text-sm leading-6 text-slate-200">{(o.comment as string) || (o.body as string)}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    {teacher && <span>{teacher}</span>}
                    {o.tags?.map((t) => (
                      <span key={t.name} className="chip">
                        {t.name}
                      </span>
                    ))}
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
