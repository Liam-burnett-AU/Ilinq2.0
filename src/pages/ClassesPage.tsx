import { Bell, BellOff, ExternalLink, Star } from 'lucide-react';
import { useMemo } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { Card, EmptyState, PageHeader } from '@/components/ui';

const CLASS_CODE = /\(([A-Z0-9]{3,10})\)\s*$/;

export default function ClassesPage() {
  const { user, api } = useAuth();
  const groups = useMemo(() => (user?.groups ?? []).filter((g) => g.enrolmentStatus !== 'notEnroled'), [user]);
  const classes = groups.filter((g) => CLASS_CODE.test(g.name));
  const others = groups.filter((g) => !CLASS_CODE.test(g.name));

  const List = ({ items }: { items: typeof groups }) => (
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map((g) => {
        const href = api.absolute(g._links?.homepage);
        const code = g.name.match(CLASS_CODE)?.[1];
        return (
          <li key={g.id}>
            <a href={href ?? '#'} target="_blank" rel="noreferrer" className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-3 transition hover:bg-white/[0.06]">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-700 font-mono text-[10px] font-semibold text-sky">{code ? code.slice(0, 5) : g.name.slice(0, 2).toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">{g.name.replace(CLASS_CODE, '').trim()}</span>
                <span className="block text-xs text-slate-400">
                  {g.membership === 'admin' ? 'Administrator' : g.membership === 'write' ? 'Contributor' : 'Member'}
                  {g.enrolmentStatus === 'pending' ? ' · pending' : ''}
                </span>
              </span>
              {g.isFavourite && <Star className="h-4 w-4 text-gold" aria-label="Favourite" />}
              {g.isNotificationsOn === false ? <BellOff className="h-4 w-4 text-slate-500" /> : g.isForceFollow ? <Bell className="h-4 w-4 text-slate-500" /> : null}
              <ExternalLink className="h-4 w-4 text-slate-500 group-hover:text-sky" />
            </a>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div>
      <PageHeader title="My classes & groups" subtitle="Class pages, clubs and house groups from your iLINQ profile" />
      {groups.length === 0 ? (
        <EmptyState title="No groups on this account" hint="Parents see their own groups here; switch to classic iLINQ to browse a child's class pages." />
      ) : (
        <div className="space-y-5">
          {classes.length > 0 && (
            <Card title={`Classes · ${classes.length}`}>
              <List items={classes} />
            </Card>
          )}
          {others.length > 0 && (
            <Card title={`Groups & co-curricular · ${others.length}`}>
              <List items={others} />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
