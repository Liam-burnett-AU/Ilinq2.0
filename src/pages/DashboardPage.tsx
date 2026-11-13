import { addDays, format, startOfDay } from 'date-fns';
import { ArrowRight, Clock, ExternalLink } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { bucketDueWork, classesOn, isUnread, nowAndNext, onDay, readableAccent, stripHtml, termWeekFor } from '@/api/adapters';
import { useAuth } from '@/auth/AuthContext';
import { EventRow, subline, timeRange } from '@/components/EventCard';
import { Card, EmptyState, ErrorBanner, Skeleton } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useCalendarRange } from '@/hooks/useCalendar';
import { useNow } from '@/hooks/useNow';
import { config } from '@/lib/config';

export default function DashboardPage() {
  const { api, user, viewAs } = useAuth();
  const now = useNow();
  const today = startOfDay(now);
  const range = useMemo(() => ({ start: addDays(today, -7), end: addDays(today, 21) }), [today]);
  const cal = useCalendarRange(range.start, range.end);
  const news = useAsync(`news:${api.kind}`, () => api.getNewsFeed(), [], 120_000);

  const classes = classesOn(cal.events, today);
  const { current, next, minutesLeft, minutesToNext } = nowAndNext(classes, now);
  const due = bucketDueWork(cal.events.filter((e) => e.kind === 'dueWork'), now);
  const upcoming = cal.events.filter((e) => e.kind === 'event' && e.end >= now).slice(0, 5);
  const todayEvents = onDay(cal.events, today).filter((e) => e.kind === 'event');
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const name = user?.preferredName || user?.firstName;
  const viewingChild = user?.role.type === 'parent' && viewAs;
  const termWeek = termWeekFor(cal.events, today);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {greeting}, {name}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {format(now, 'EEEE d MMMM')}
            {termWeek ? ` · ${termWeek}` : ''}
            {viewingChild ? ` · viewing ${viewAs.givenName || viewAs.firstname}'s day` : ''}
            {classes.length ? ` · ${classes.length} classes today` : ' · no classes today'}
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link to="/timetable" className="btn-ghost">
            Week view <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <ErrorBanner error={cal.error} onRetry={cal.refresh} />

      {/* Now / next */}
      <section className="grid gap-3 sm:grid-cols-2">
        <NowCard label={current ? 'Now' : 'Up next'} event={current ?? next} minutes={current ? minutesLeft : minutesToNext} mode={current ? 'left' : 'until'} loading={cal.loading} />
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
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Today's timetable */}
        <Card title="Today" className="lg:col-span-1" action={<span className="font-mono text-xs text-slate-500">{format(today, 'EEE d MMM')}</span>}>
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
                  <li key={c.id} className={`flex items-center gap-3 rounded-xl px-2.5 py-2 ${live ? 'bg-navy-700/60 ring-1 ring-sky/40' : past ? 'opacity-50' : ''}`}>
                    <span className="w-16 shrink-0 font-mono text-[11px] text-slate-400">{format(c.start, 'h:mm')}–{format(c.end, 'h:mm')}</span>
                    <span className="h-7 w-1 rounded-full" style={{ background: readableAccent(c.colour) }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-white">{c.title}</span>
                      <span className="block truncate text-xs text-slate-400">{[c.location, subline(c)].filter(Boolean).join(' · ')}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          {todayEvents.length > 0 && (
            <div className="mt-3 space-y-1.5 border-t border-white/5 pt-3">
              {todayEvents.map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </div>
          )}
        </Card>

        {/* News */}
        <Card title="Latest news" className="lg:col-span-2" action={<Link to="/news" className="text-xs text-sky hover:underline">All news</Link>}>
          <ErrorBanner error={news.error} onRetry={news.refresh} />
          {news.loading ? (
            <div className="space-y-3">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {(news.data ?? []).slice(0, 5).map((n) => (
                <li key={n.id}>
                  <Link to={`/news/${n.id}`} className="group flex items-start gap-3 py-2.5">
                    <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${isUnread(n) ? 'bg-gold' : 'bg-transparent'}`} aria-label={isUnread(n) ? 'Unread' : undefined} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-white group-hover:text-sky">{n.title}</span>
                      <span className="line-clamp-1 block text-xs text-slate-400">{stripHtml(n.blurb)}</span>
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-slate-500">{format(new Date(n.publishAt), 'd MMM')}</span>
                  </Link>
                </li>
              ))}
              {news.data && news.data.length === 0 && <EmptyState title="No news for you right now" />}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Coming up" className="lg:col-span-2" action={<Link to="/calendar" className="text-xs text-sky hover:underline">Calendar</Link>}>
          {cal.loading ? <Skeleton className="h-24" /> : upcoming.length ? <div className="space-y-2">{upcoming.map((e) => <EventRow key={e.id} event={e} showDate />)}</div> : <EmptyState title="No upcoming events in the next three weeks" />}
        </Card>
        <Card title="Quick links">
          <ul className="space-y-1">
            {config.quickLinks.map((l) => (
              <li key={l.href + l.label}>
                <a href={l.href} target="_blank" rel="noreferrer" className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-white">{l.label}</span>
                    <span className="block truncate text-xs text-slate-500">{l.description}</span>
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-500 group-hover:text-sky" />
                </a>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function NowCard({ label, event, minutes, mode, loading }: { label: string; event: ReturnType<typeof classesOn>[number] | null; minutes: number | null; mode: 'left' | 'until'; loading: boolean }) {
  return (
    <section className="card card-pad relative overflow-hidden animate-fade-up">
      <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: event ? readableAccent(event.colour) : 'transparent' }} />
      <h2 className="text-sm font-semibold uppercase tracking-wider text-sky/90">{label}</h2>
      {loading ? (
        <Skeleton className="mt-3 h-16" />
      ) : event ? (
        <>
          <p className="mt-2 text-xl font-semibold text-white">{event.title}</p>
          <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-slate-400">
            <span className="font-mono">{timeRange(event)}</span>
            {event.location && <span>{event.location}</span>}
            {subline(event) && <span>{subline(event)}</span>}
          </p>
          {minutes !== null && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-200">
              <Clock className="h-3.5 w-3.5 text-gold" />
              {mode === 'left' ? `${minutes} min left` : minutes < 60 ? `in ${minutes} min` : `in ${Math.round(minutes / 60)} h`}
            </p>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm text-slate-400">No more classes today.</p>
      )}
    </section>
  );
}
