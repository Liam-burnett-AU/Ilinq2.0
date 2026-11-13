import { addDays, startOfDay, startOfWeek } from 'date-fns';
import { ArrowRight, Bell, BellOff, Star, Users } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { readableAccent, summariseClasses } from '@/api/adapters';
import { useAuth } from '@/auth/AuthContext';
import { Card, EmptyState, ErrorBanner, PageHeader, Skeleton } from '@/components/ui';
import { useCalendarRange } from '@/hooks/useCalendar';

export default function ClassesPage() {
  const { user } = useAuth();
  // Classes are not in the user's group list on Schoolbox; derive them from two weeks of timetable.
  const monday = useMemo(() => startOfWeek(startOfDay(new Date()), { weekStartsOn: 1 }), []);
  const cal = useCalendarRange(addDays(monday, -7), addDays(monday, 14));
  const classes = useMemo(() => summariseClasses(cal.events), [cal.events]);
  const groups = useMemo(() => (user?.groups ?? []).filter((g) => g.enrolmentStatus !== 'notEnroled'), [user]);

  return (
    <div>
      <PageHeader title="My classes & groups" subtitle="Every class and group page, with the full classic page embedded inside" />
      <ErrorBanner error={cal.error} onRetry={cal.refresh} />
      <div className="space-y-5">
        <Card title={`Classes${classes.length ? ` · ${classes.length}` : ''}`}>
          {cal.loading ? (
            <Skeleton className="h-32" />
          ) : classes.length === 0 ? (
            <EmptyState title="No timetabled classes in the last two weeks" hint="Classes appear here once they show up on your timetable." />
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {classes.map((c) => {
                const to = c.folderId ? `/classes/${c.folderId}` : undefined;
                const inner = (
                  <>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-mono text-[10px] font-semibold text-ink" style={{ background: readableAccent(c.colour) }}>
                      {c.code.split('-')[1]?.replace(/\d+$/, '').slice(0, 4) || c.subject.slice(0, 3).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{c.subject}</span>
                      <span className="block truncate text-xs text-ink-muted">
                        {[c.code, c.teacher, c.rooms.join(', ')].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    {to && <ArrowRight className="h-4 w-4 text-ink-muted group-hover:text-sky" />}
                  </>
                );
                const cls = 'group flex items-center gap-3 rounded-card border border-line/10 bg-white/[0.02] px-3 py-3 transition hover:bg-white/[0.06]';
                return (
                  <li key={c.code || c.subject}>
                    {to ? (
                      <Link to={to} className={cls}>
                        {inner}
                      </Link>
                    ) : (
                      <div className={cls}>{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title={`Groups & co-curricular · ${groups.length}`}>
          {groups.length === 0 ? (
            <EmptyState icon={<Users className="h-6 w-6" />} title="No groups on this account" />
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {groups.map((g) => (
                <li key={g.id}>
                  <Link to={`/classes/${g.id}`} className="group flex items-center gap-3 rounded-card border border-line/10 bg-white/[0.02] px-3 py-3 transition hover:bg-white/[0.06]">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-700 font-mono text-[11px] font-semibold text-sky">{g.name.replace(/[^A-Za-z0-9 ]/g, '').trim().slice(0, 2).toUpperCase()}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{g.name}</span>
                      <span className="block text-xs text-ink-muted">
                        {g.membership === 'admin' ? 'Administrator' : g.membership === 'write' ? 'Contributor' : 'Member'}
                        {g.type ? ` · ${g.type}` : ''}
                        {g.enrolmentStatus === 'pending' ? ' · pending' : ''}
                      </span>
                    </span>
                    {g.isFavourite && <Star className="h-4 w-4 text-gold" aria-label="Favourite" />}
                    {g.isNotificationsOn === false ? <BellOff className="h-4 w-4 text-ink-muted/80" aria-label="Notifications off" /> : g.isForceFollow ? <Bell className="h-4 w-4 text-ink-muted/80" aria-label="Following" /> : null}
                    <ArrowRight className="h-4 w-4 text-ink-muted group-hover:text-sky" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
