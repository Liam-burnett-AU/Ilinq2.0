import { addDays, startOfDay, startOfWeek } from 'date-fns';
import { Bell, BellOff, ExternalLink, Star, Users } from 'lucide-react';
import { useMemo } from 'react';
import { readableAccent, summariseClasses } from '@/api/adapters';
import { useAuth } from '@/auth/AuthContext';
import { Card, EmptyState, ErrorBanner, PageHeader, Skeleton } from '@/components/ui';
import { useCalendarRange } from '@/hooks/useCalendar';

export default function ClassesPage() {
  const { user, api } = useAuth();
  // Classes are not in the user's group list on Schoolbox; derive them from two weeks of timetable.
  const monday = useMemo(() => startOfWeek(startOfDay(new Date()), { weekStartsOn: 1 }), []);
  const cal = useCalendarRange(addDays(monday, -7), addDays(monday, 14));
  const classes = useMemo(() => summariseClasses(cal.events), [cal.events]);
  const groups = useMemo(() => (user?.groups ?? []).filter((g) => g.enrolmentStatus !== 'notEnroled'), [user]);

  return (
    <div>
      <PageHeader title="My classes & groups" subtitle="Classes from your timetable, plus the groups on your iLINQ profile" />
      <ErrorBanner error={cal.error} onRetry={cal.refresh} />
      <div className="space-y-5">
        <Card title={`Classes${classes.length ? ` · ${classes.length}` : ''}`}>
          {cal.loading ? (
            <Skeleton className="h-32" />
          ) : classes.length === 0 ? (
            <EmptyState title="No timetabled classes in the last two weeks" hint="Classes appear here once they show up on your timetable." />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {classes.map((c) => {
                const href = api.absolute(c.path);
                const inner = (
                  <>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-mono text-[10px] font-semibold text-white" style={{ background: readableAccent(c.colour) }}>
                      {c.code.split('-')[1]?.replace(/\d+$/, '').slice(0, 4) || c.subject.slice(0, 3).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-white">{c.subject}</span>
                      <span className="block truncate text-xs text-slate-400">
                        {[c.code, c.teacher, c.rooms.join(', ')].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    {href && <ExternalLink className="h-4 w-4 text-slate-500 group-hover:text-sky" />}
                  </>
                );
                const cls = 'group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-3 transition hover:bg-white/[0.06]';
                return (
                  <li key={c.code || c.subject}>
                    {href ? (
                      <a href={href} target="_blank" rel="noreferrer" className={cls}>
                        {inner}
                      </a>
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
            <ul className="grid gap-2 sm:grid-cols-2">
              {groups.map((g) => (
                <li key={g.id}>
                  <a href={api.absolute(g._links?.homepage) ?? '#'} target="_blank" rel="noreferrer" className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-3 transition hover:bg-white/[0.06]">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-700 font-mono text-[11px] font-semibold text-sky">{g.name.replace(/[^A-Za-z0-9 ]/g, '').trim().slice(0, 2).toUpperCase()}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-white">{g.name}</span>
                      <span className="block text-xs text-slate-400">
                        {g.membership === 'admin' ? 'Administrator' : g.membership === 'write' ? 'Contributor' : 'Member'}
                        {g.type ? ` · ${g.type}` : ''}
                        {g.enrolmentStatus === 'pending' ? ' · pending' : ''}
                      </span>
                    </span>
                    {g.isFavourite && <Star className="h-4 w-4 text-gold" aria-label="Favourite" />}
                    {g.isNotificationsOn === false ? <BellOff className="h-4 w-4 text-slate-500" aria-label="Notifications off" /> : g.isForceFollow ? <Bell className="h-4 w-4 text-slate-500" aria-label="Following" /> : null}
                    <ExternalLink className="h-4 w-4 text-slate-500 group-hover:text-sky" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
