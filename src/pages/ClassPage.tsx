import { addDays, format, startOfDay, startOfWeek } from 'date-fns';
import { ArrowLeft, ExternalLink, FileText, Link2, MessageSquare, Newspaper, Video } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { bucketDueWork, isUnread, readableAccent, stripHtml, summariseClasses } from '@/api/adapters';
import { useAuth } from '@/auth/AuthContext';
import { ClassicFrame } from '@/components/ClassicFrame';
import { EventRow } from '@/components/EventCard';
import { Card, EmptyState, ErrorBanner, PageHeader, Skeleton } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useCalendarRange } from '@/hooks/useCalendar';
import { useNow } from '@/hooks/useNow';

type Tab = 'overview' | 'classic';

export default function ClassPage() {
  const { id } = useParams();
  const folderId = Number(id);
  const { api, user, subjectId } = useAuth();
  const now = useNow();
  const [tab, setTab] = useState<Tab>('overview');
  const [q, setQ] = useState('');

  const monday = useMemo(() => startOfWeek(startOfDay(new Date()), { weekStartsOn: 1 }), []);
  const week = useCalendarRange(addDays(monday, -7), addDays(monday, 14));
  const cls = useMemo(() => summariseClasses(week.events).find((c) => c.folderId === folderId), [week.events, folderId]);
  const group = user?.groups?.find((g) => g.id === folderId);
  const title = cls?.subject ?? group?.name ?? `Page ${folderId}`;

  const dueRange = useMemo(() => ({ start: addDays(startOfDay(now), -21), end: addDays(startOfDay(now), 60) }), [now]);
  const due = useAsync(subjectId && Number.isFinite(folderId) ? `cal:${api.kind}:${subjectId}:folder:${folderId}` : null, () => api.getCalendar(subjectId!, dueRange.start, dueRange.end, folderId), [subjectId, folderId], 120_000);
  const dueItems = useMemo(() => (due.data ? bucketDueWork((due.data ? summariseForDue(due.data, folderId) : []), now) : null), [due.data, folderId, now]);
  const news = useAsync(Number.isFinite(folderId) ? `foldernews:${api.kind}:${folderId}` : null, () => api.getFolderNews(folderId), [folderId], 300_000);
  const items = useAsync(Number.isFinite(folderId) ? `folder:${api.kind}:${folderId}:${q}` : null, () => api.searchFolder(folderId, q), [folderId, q], 300_000);

  const upcomingClasses = week.events.filter((e) => e.kind === 'class' && e.folderId === folderId && e.start >= now).slice(0, 3);

  return (
    <div>
      <Link to="/classes" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Classes
      </Link>
      <PageHeader
        title={title}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {cls?.code && <span className="font-mono">{cls.code}</span>}
            {cls?.teacher && <span>{cls.teacher}</span>}
            {cls?.rooms.length ? <span>{cls.rooms.join(', ')}</span> : null}
            {group?.type && <span className="chip">{group.type}</span>}
          </span>
        }
        actions={
          <>
            <div className="grid grid-cols-2 gap-1 rounded-card bg-white/5 p-1 text-sm" role="tablist">
              {(['overview', 'classic'] as Tab[]).map((t) => (
                <button key={t} role="tab" aria-selected={tab === t} className={`rounded-card px-3 py-1.5 transition ${tab === t ? 'bg-navy-700 text-ink' : 'text-ink-muted hover:text-ink'}`} onClick={() => setTab(t)}>
                  {t === 'overview' ? 'Overview' : 'Full page'}
                </button>
              ))}
            </div>
            <a className="btn-ghost" href={api.absolute(`/homepage/${folderId}`)} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </>
        }
      />
      {cls && <div className="mb-4 h-1 w-24 rounded-full" style={{ background: readableAccent(cls.colour) }} aria-hidden />}

      {tab === 'classic' ? (
        <ClassicFrame path={`/homepage/${folderId}`} title={`${title} on iLINQ`} />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="min-w-0 space-y-5 lg:col-span-2">
            <Card title="Due work for this class" action={<Link to="/due-work" className="text-xs text-sky hover:underline">All due work</Link>}>
              <ErrorBanner error={due.error} onRetry={due.refresh} />
              {due.loading || !dueItems ? (
                <Skeleton className="h-24" />
              ) : (
                <div className="space-y-2">
                  {[...dueItems.overdue, ...dueItems.today, ...dueItems.thisWeek, ...dueItems.later].map((e) => (
                    <EventRow key={e.id} event={e} showDate emphasis={dueItems.overdue.includes(e) || dueItems.today.includes(e)} />
                  ))}
                  {dueItems.overdue.length + dueItems.today.length + dueItems.thisWeek.length + dueItems.later.length === 0 && <EmptyState title="Nothing due for this class" />}
                </div>
              )}
            </Card>

            <Card
              title="Resources & content"
              action={<input className="input !w-44 !py-1 text-xs" placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter content" />}
            >
              <ErrorBanner error={items.error} onRetry={items.refresh} />
              {items.loading ? (
                <Skeleton className="h-32" />
              ) : !items.data?.data.length ? (
                <EmptyState title="No content indexed for this page" hint="Open the full page to browse everything the teacher has posted." />
              ) : (
                <ul className="divide-y divide-line/10">
                  {items.data.data.map((r) => {
                    const Icon = r.type.startsWith('file.video') ? Video : r.type.startsWith('file') ? FileText : r.type === 'link' ? Link2 : r.type === 'forum' ? MessageSquare : r.type === 'news' ? Newspaper : FileText;
                    return (
                      <li key={`${r.type}-${r.id}`}>
                        <a href={api.absolute(r.url)} target="_blank" rel="noreferrer" className="group flex items-center gap-3 py-2">
                          <Icon className="h-4 w-4 shrink-0 text-sky/80" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-ink group-hover:text-sky">{r.title}</span>
                            <span className="block truncate text-xs text-ink-muted">{[r.meta, r.date ? format(new Date(r.date), 'd MMM') : null].filter(Boolean).join(' · ')}</span>
                          </span>
                          <ExternalLink className="h-3.5 w-3.5 text-ink-muted/60 group-hover:text-sky" />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          <div className="min-w-0 space-y-5">
            <Card title="Next lessons">
              {week.loading ? (
                <Skeleton className="h-20" />
              ) : upcomingClasses.length ? (
                <div className="space-y-2">
                  {upcomingClasses.map((e) => (
                    <EventRow key={e.id} event={e} showDate />
                  ))}
                </div>
              ) : (
                <EmptyState title="No lessons in the next week" />
              )}
            </Card>
            <Card title="Class news">
              <ErrorBanner error={news.error} onRetry={news.refresh} />
              {news.loading ? (
                <Skeleton className="h-20" />
              ) : !news.data?.length ? (
                <EmptyState title="No news posted to this page" />
              ) : (
                <ul className="divide-y divide-line/10">
                  {news.data.slice(0, 6).map((n) => (
                    <li key={n.id}>
                      <Link to={`/news/${n.id}`} className="group block py-2">
                        <span className="flex items-center gap-2">
                          {isUnread(n) && <span className="h-1.5 w-1.5 rounded-full bg-gold" />}
                          <span className="truncate text-sm text-ink group-hover:text-sky">{n.title}</span>
                        </span>
                        <span className="line-clamp-2 block text-xs text-ink-muted">{stripHtml(n.blurb)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

import { normaliseEvents } from '@/api/adapters';
import type { CalendarAjaxEvent } from '@/api/types';
function summariseForDue(raw: CalendarAjaxEvent[], folderId: number) {
  return normaliseEvents(raw).filter((e) => e.kind === 'dueWork' && (e.folderId === folderId || !e.folderId));
}
