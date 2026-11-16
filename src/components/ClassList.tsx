import { ExternalLink, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ApiError } from '@/api';
import type { GroupMember } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { ClassicFrame } from './ClassicFrame';
import { Avatar } from './Avatar';
import { Card, EmptyState, ErrorBanner, Skeleton } from './ui';
import { useAsync } from '@/hooks/useAsync';

interface Loaded {
  source: 'group' | 'search';
  members: GroupMember[];
  groupName?: string;
}

/**
 * People in a class/group, with photos.
 * Tries the group members endpoint first, then a folder search for users.
 * If neither is permitted for this account, shows the classic page instead.
 */
export function ClassList({ folderId, title }: { folderId: number; title: string }) {
  const { api, user } = useAuth();
  const [q, setQ] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const res = useAsync<Loaded>(`members:${api.kind}:${folderId}`, async () => {
    try {
      const g = await api.getGroupMembers(folderId);
      if (g?.members?.length) return { source: 'group', members: g.members, groupName: g.groupName };
    } catch (e) {
      if (!(e instanceof ApiError) || !(e.isUnauthorised || e.status === 404)) throw e;
    }
    const s = await api.searchFolder(folderId, '', 200);
    const members: GroupMember[] = s.data
      .filter((r) => r.type.startsWith('user'))
      .map((r) => ({
        id: r.id,
        fullName: r.title,
        firstName: r.title.split(' ')[0],
        lastName: r.title.split(' ').slice(1).join(' '),
        roleType: (r.type.split('.')[1] as GroupMember['roleType']) ?? undefined,
        role: r.meta ?? undefined,
        isStaff: r.type === 'user.staff',
        _links: { profile: r.url, avatar: r.image ?? `/portrait.php?id=${r.id}&size=square64` },
      }));
    if (!members.length) throw new ApiError(403, 'Class lists are not available to your account through the API.');
    return { source: 'search', members };
  }, [folderId], 600_000);

  const { staff, students } = useMemo(() => {
    const all = (res.data?.members ?? []).filter((m) => {
      const k = q.trim().toLowerCase();
      return !k || `${m.fullName} ${m.house ?? ''} ${m.role ?? ''}`.toLowerCase().includes(k);
    });
    const by = (a: GroupMember, b: GroupMember) => (a.lastName ?? '').localeCompare(b.lastName ?? '') || a.fullName.localeCompare(b.fullName);
    return {
      staff: all.filter((m) => m.isStaff || m.roleType === 'staff').sort(by),
      students: all.filter((m) => !(m.isStaff || m.roleType === 'staff')).sort(by),
    };
  }, [res.data, q]);

  if (res.error && !res.data) {
    const blocked = res.error instanceof ApiError && (res.error.isUnauthorised || res.error.status === 404);
    return (
      <div className="space-y-4">
        <ErrorBanner error={blocked ? new Error('The class list API is not open to this account, so here is the classic class page instead. The members panel is usually on it.') : res.error} onRetry={res.refresh} />
        <ClassicFrame path={`/homepage/${folderId}`} title={`${title} on iLINQ`} />
      </div>
    );
  }

  const Person = ({ m }: { m: GroupMember }) => {
    const me = m.id === user?.id;
    const avatar = api.proxied(m._links?.avatar) ?? api.avatar(m.id);
    const sub = [m.house, m.yearLevel ? `Year ${m.yearLevel}` : null, m.isStaff ? m.role : null].filter(Boolean).join(' · ');
    const href = api.absolute(m._links?.profile || `/search/user/${m.id}`);
    if (view === 'list') {
      return (
        <a href={href} target="_blank" rel="noreferrer" className={`group flex items-center gap-3 rounded-card px-2 py-1.5 hover:bg-white/5 ${me ? 'ring-1 ring-gold/40' : ''}`}>
          <Avatar src={avatar} name={m.fullName} size={36} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-ink">{m.fullName}{me ? ' (you)' : ''}</span>
            <span className="block truncate text-xs text-ink-muted">{sub}</span>
          </span>
          <ExternalLink className="h-3.5 w-3.5 text-ink-muted/60 opacity-0 group-hover:opacity-100" />
        </a>
      );
    }
    return (
      <a href={href} target="_blank" rel="noreferrer" className={`group flex flex-col items-center gap-2 rounded-card border border-line/10 bg-white/[0.02] p-3 text-center transition hover:bg-white/[0.06] ${me ? 'ring-1 ring-gold/40' : ''}`}>
        <Avatar src={avatar} name={m.fullName} size={72} rounded="rounded-card" />
        <span className="min-w-0 w-full">
          <span className="block truncate text-sm font-medium text-ink">{m.givenName || m.firstName}</span>
          <span className="block truncate text-xs text-ink-muted">{m.lastName}</span>
          {sub && <span className="mt-0.5 block truncate text-[11px] text-ink-muted/80">{sub}</span>}
        </span>
      </a>
    );
  };

  const Section = ({ heading, people }: { heading: string; people: GroupMember[] }) =>
    people.length === 0 ? null : (
      <Card title={`${heading} · ${people.length}`}>
        {view === 'grid' ? (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {people.map((m) => (
              <li key={m.id}>
                <Person m={m} />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
            {people.map((m) => (
              <li key={m.id}>
                <Person m={m} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[12rem]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted/70" />
          <input className="input !pl-9" placeholder="Find a person…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a person" />
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-card bg-white/5 p-1 text-xs" role="tablist">
          {(['grid', 'list'] as const).map((v) => (
            <button key={v} role="tab" aria-selected={view === v} className={`rounded-card px-3 py-1 ${view === v ? 'bg-navy-700 text-ink' : 'text-ink-muted'}`} onClick={() => setView(v)}>
              {v === 'grid' ? 'Photos' : 'List'}
            </button>
          ))}
        </div>
        {res.data && (
          <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
            <Users className="h-3.5 w-3.5" /> {res.data.members.length} people
            <span className="font-mono text-[10px] opacity-60">· via {res.data.source === 'group' ? 'group members' : 'page search'}</span>
          </span>
        )}
      </div>
      {res.loading ? (
        <Skeleton className="h-48" />
      ) : !res.data?.members.length ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title="No members listed" />
      ) : (
        <>
          <Section heading="Teachers" people={staff} />
          <Section heading="Students" people={students} />
          {staff.length + students.length === 0 && <EmptyState title={`No one matches “${q}”`} />}
        </>
      )}
    </div>
  );
}
