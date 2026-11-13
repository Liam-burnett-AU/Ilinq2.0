import { addDays, format, startOfDay } from 'date-fns';
import { ArrowRight, Clock, ExternalLink, GripVertical } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { bucketDueWork, classesOn, isUnread, nowAndNext, onDay, readableAccent, stripHtml, summariseClasses, termWeekFor, type PortalEvent } from '@/api/adapters';
import { useAuth } from '@/auth/AuthContext';
import { EventRow, subline, timeRange } from '@/components/EventCard';
import { Card, EmptyState, ErrorBanner, Skeleton } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useCalendarRange } from '@/hooks/useCalendar';
import { useNow } from '@/hooks/useNow';
import { config } from '@/lib/config';
import { WIDGET_META, usePrefs, type WidgetId } from '@/prefs/PrefsContext';

export default function DashboardPage() {
  const { api, user, viewAs, subjectId } = useAuth();
  const { prefs, editing, reorder, setEditing } = usePrefs();
  const now = useNow();
  const today = startOfDay(now);
  const range = useMemo(() => ({ start: addDays(today, -7), end: addDays(today, 21) }), [today]);
  const cal = useCalendarRange(range.start, range.end);
  const news = useAsync(`news:${api.kind}`, () => api.getNewsFeed(), [], 120_000);
  const wantsFeedback = prefs.widgets.some((w) => w.id === 'feedback' && w.visible);
  const evidence = useAsync(wantsFeedback && subjectId ? `evidence:${api.kind}:${subjectId}` : null, () => api.getEvidenceFeed(subjectId!), [subjectId], 120_000);

  const classes = classesOn(cal.events, today);
  const { current, next, minutesLeft, minutesToNext } = nowAndNext(classes, now);
  const due = bucketDueWork(cal.events.filter((e) => e.kind === 'dueWork'), now);
  const upcoming = cal.events.filter((e) => e.kind === 'event' && e.end >= now).slice(0, 5);
  const todayEvents = onDay(cal.events, today).filter((e) => e.kind === 'event');
  const myClasses = useMemo(() => summariseClasses(cal.events), [cal.events]);
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const name = user?.preferredName || user?.firstName;
  const viewingChild = user?.role.type === 'parent' && viewAs;
  const termWeek = termWeekFor(cal.events, today);

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const widgets: Record<WidgetId, ReactNode> = {
    nowNext: <NowCard label={current ? 'Now' : 'Up next'} event={current ?? next} minutes={current ? minutesLeft : minutesToNext} mode={current ? 'left' : 'until'} loading={cal.loading} />,
    dueSoon: (
      <Card title="Due soon" action={<Link to="/due-work" className="text-xs text-sky hover:underline">All due work</Link>}>
        {cal.loading ? (
          <Skeleton className="h-20" />
        ) : (
          <div className="space-y-2">
            {[...due.overdue, ...due.today, ...due.thisWeek].slice(0, 4).map((e) => (
              <EventRow key={e.id} event={e} showDate emphasis={due.overdue.includes(e) || due.today.includes(e)} />
            ))}
            {due.overdue.length + due.today.length + due.thisWeek.length === 0 && <EmptyState title="Nothing due this week" hint="Enjoy it, or get ahead on next week." />}
          </div>
        )}
      </Card>
    ),
    today: (
      <Card title="Today" action={<span className="font-mono text-xs text-ink-muted">{format(today, 'EEE d MMM')}</span>}>
        {cal.loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : classes.length === 0 ? (
          <EmptyState title="No classes today" />
        ) : (
          <ol className="relative space-y-1.5">
            {classes.map((c) => {
              const live = c === current;
              const past = c.end < now;
              return (
                <li key={c.id}>
                  <Link to={c.folderId ? `/classes/${c.folderId}` : '/classes'} className={`flex items-center gap-3 rounded-card px-2.5 py-2 transition hover:bg-white/5 ${live ? 'bg-navy-700/60 ring-1 ring-sky/40' : past ? 'opacity-50' : ''}`}>
                    <span className="w-16 shrink-0 font-mono text-[11px] text-ink-muted">{format(c.start, 'h:mm')}–{format(c.end, 'h:mm')}</span>
                    <span className="h-7 w-1 rounded-full" style={{ background: readableAccent(c.colour) }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{c.title}</span>
                      <span className="block truncate text-xs text-ink-muted">{[c.location, subline(c)].filter(Boolean).join(' · ')}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
        {todayEvents.length > 0 && (
          <div className="mt-3 space-y-1.5 border-t border-line/10 pt-3">
            {todayEvents.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </div>
        )}
      </Card>
    ),
    news: (
      <Card title="Latest news" action={<Link to="/news" className="text-xs text-sky hover:underline">All news</Link>}>
        <ErrorBanner error={news.error} onRetry={news.refresh} />
        {news.loading ? (
          <div className="space-y-3">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : (
          <ul className="divide-y divide-line/10">
            {(news.data ?? []).slice(0, 5).map((n) => (
              <li key={n.id}>
                <Link to={`/news/${n.id}`} className="group flex items-start gap-3 py-2.5">
                  <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${isUnread(n) ? 'bg-gold' : 'bg-transparent'}`} aria-label={isUnread(n) ? 'Unread' : undefined} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink group-hover:text-sky">{n.title}</span>
                    <span className="line-clamp-1 block text-xs text-ink-muted">{stripHtml(n.blurb)}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-ink-muted">{format(new Date(n.publishAt), 'd MMM')}</span>
                </Link>
              </li>
            ))}
            {news.data && news.data.length === 0 && <EmptyState title="No news for you right now" />}
          </ul>
        )}
      </Card>
    ),
    classes: (
      <Card title="My classes" action={<Link to="/classes" className="text-xs text-sky hover:underline">All classes & groups</Link>}>
        {cal.loading ? (
          <Skeleton className="h-16" />
        ) : myClasses.length === 0 ? (
          <EmptyState title="No classes on your timetable yet" />
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {myClasses.map((c) => (
              <li key={c.code || c.subject}>
                <Link to={c.folderId ? `/classes/${c.folderId}` : '/classes'} className="flex h-full items-center gap-2.5 rounded-card border border-line/10 bg-white/[0.02] px-2.5 py-2 transition hover:bg-white/[0.06]">
                  <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: readableAccent(c.colour) }} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">{c.subject}</span>
                    <span className="block truncate font-mono text-[11px] text-ink-muted">{c.code || c.teacher}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    ),
    comingUp: (
      <Card title="Coming up" action={<Link to="/calendar" className="text-xs text-sky hover:underline">Calendar</Link>}>
        {cal.loading ? <Skeleton className="h-24" /> : upcoming.length ? <div className="space-y-2">{upcoming.map((e) => <EventRow key={e.id} event={e} showDate />)}</div> : <EmptyState title="No upcoming events in the next three weeks" />}
      </Card>
    ),
    feedback: (
      <Card title="Recent feedback" action={<Link to="/feedback" className="text-xs text-sky hover:underline">All feedback</Link>}>
        <ErrorBanner error={evidence.error} onRetry={evidence.refresh} />
        {evidence.loading ? (
          <Skeleton className="h-20" />
        ) : !evidence.data?.data.length ? (
          <EmptyState title="No feedback yet" />
        ) : (
          <ul className="divide-y divide-line/10">
            {evidence.data.data.slice(0, 4).map((it, i) => {
              const o = it.object;
              const who = o.instructor?.fullName ?? o.creator?.fullName;
              return (
                <li key={`${it.discriminator}-${o.id ?? i}`} className="py-2">
                  <p className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium text-ink">{o.assessment?.title || (o.name as string) || (o.title as string) || 'Learning moment'}</span>
                    {o.mark ? <span className="shrink-0 font-mono text-xs font-semibold text-gold">{o.mark}</span> : typeof o.normalisedMark === 'number' ? <span className="shrink-0 font-mono text-xs font-semibold text-gold">{o.normalisedMark}</span> : null}
                  </p>
                  <p className="line-clamp-2 text-xs text-ink-muted">{[o.assessment?.folderName, who, stripHtml((o.comment as string) || (o.body as string))].filter(Boolean).join(' · ')}</p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    ),
    quickLinks: (
      <Card title="Quick links">
        <ul className="space-y-1">
          {config.quickLinks.map((l) => (
            <li key={l.href + l.label}>
              <a href={l.href} target="_blank" rel="noreferrer" className="group flex items-center gap-3 rounded-card px-2 py-1.5 hover:bg-white/5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">{l.label}</span>
                  <span className="block truncate text-xs text-ink-muted">{l.description}</span>
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-ink-muted group-hover:text-sky" />
              </a>
            </li>
          ))}
        </ul>
      </Card>
    ),
  };

  const visible = prefs.widgets.map((w, i) => ({ ...w, index: i })).filter((w) => w.visible);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="card-title mb-1">{format(now, 'EEEE d MMMM')}{termWeek ? ` · ${termWeek}` : ''}</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {greeting}, {name}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {viewingChild ? `Viewing ${viewAs.givenName || viewAs.firstname}'s day · ` : ''}
            {classes.length ? `${classes.length} classes today` : 'No classes today'}
            {due.overdue.length ? ` · ${due.overdue.length} overdue` : ''}
            {due.today.length ? ` · ${due.today.length} due today` : ''}
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          {editing ? (
            <button className="btn-accent" onClick={() => setEditing(false)}>
              Done arranging
            </button>
          ) : (
            <button className="btn-ghost" onClick={() => setEditing(true)}>
              Arrange
            </button>
          )}
          <Link to="/timetable" className="btn-ghost">
            Week view <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <ErrorBanner error={cal.error} onRetry={cal.refresh} />

      {editing && <p className="rounded-card border border-gold/30 bg-gold/5 px-3 py-2 text-xs text-gold">Drag widgets to reorder. Use Customise (sidebar) to resize, hide or add widgets and change the theme.</p>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {visible.map((w) => (
          <div
            key={w.id}
            className={`${w.size === 'full' ? 'lg:col-span-2' : ''} relative grid min-w-0 ${editing ? 'widget-editing cursor-grab rounded-card' : ''} ${dragIdx === w.index ? 'widget-dragging' : ''} ${overIdx === w.index && dragIdx !== null && dragIdx !== w.index ? 'widget-over' : ''}`}
            draggable={editing}
            onDragStart={(e) => {
              setDragIdx(w.index);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => {
              if (!editing) return;
              e.preventDefault();
              setOverIdx(w.index);
            }}
            onDragLeave={() => setOverIdx((o) => (o === w.index ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIdx !== null) reorder(dragIdx, w.index);
              setDragIdx(null);
              setOverIdx(null);
            }}
            onDragEnd={() => {
              setDragIdx(null);
              setOverIdx(null);
            }}
            aria-label={WIDGET_META[w.id].name}
          >
            {editing && (
              <span className="absolute -top-2.5 left-3 z-10 inline-flex items-center gap-1 rounded-full border border-gold/50 bg-navy-950 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gold">
                <GripVertical className="h-3 w-3" /> {WIDGET_META[w.id].name}
              </span>
            )}
            {widgets[w.id]}
          </div>
        ))}
        {visible.length === 0 && (
          <div className="lg:col-span-2">
            <EmptyState title="All widgets are hidden" hint="Open Customise to switch some back on." />
          </div>
        )}
      </div>
    </div>
  );
}

function NowCard({ label, event, minutes, mode, loading }: { label: string; event: PortalEvent | null; minutes: number | null; mode: 'left' | 'until'; loading: boolean }) {
  return (
    <section className="card card-pad relative min-w-0 overflow-hidden animate-fade-up">
      <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: event ? readableAccent(event.colour) : 'transparent' }} />
      <h2 className="card-title">{label}</h2>
      {loading ? (
        <Skeleton className="mt-3 h-16" />
      ) : event ? (
        <>
          <p className="mt-2 font-display text-2xl font-semibold text-ink">
            {event.folderId ? (
              <Link to={`/classes/${event.folderId}`} className="hover:text-sky">
                {event.title}
              </Link>
            ) : (
              event.title
            )}
          </p>
          <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-ink-muted">
            <span className="font-mono">{timeRange(event)}</span>
            {event.location && <span>{event.location}</span>}
            {subline(event) && <span>{subline(event)}</span>}
          </p>
          {minutes !== null && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs text-ink">
              <Clock className="h-3.5 w-3.5 text-gold" />
              {mode === 'left' ? `${minutes} min left` : minutes < 60 ? `in ${minutes} min` : `in ${Math.round(minutes / 60)} h`}
            </p>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm text-ink-muted">No more classes today.</p>
      )}
    </section>
  );
}
