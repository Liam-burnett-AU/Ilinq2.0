import { Copy, ExternalLink, KeyRound, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UserToken } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { Card, PageHeader } from '@/components/ui';
import { config } from '@/lib/config';

const SCOPES = [
  ['https://schoolbox.education/scope/session', 'Sign in to iLINQ 2.0 (required)'],
  ['https://schoolbox.education/scope/calendar:readonly', 'Read calendar & timetable'],
  ['https://schoolbox.education/scope/news:readonly', 'Read news'],
  ['https://schoolbox.education/scope/user:readonly', 'Read your profile'],
  ['https://schoolbox.education/scope/search', 'Search'],
  ['https://schoolbox.education/scope/learningMoment:readonly', 'Read feedback & learning moments'],
];

export default function ProfilePage() {
  const { user, session, api, logout, viewAs, setViewAs } = useAuth();
  const navigate = useNavigate();
  const [tokenName, setTokenName] = useState('iLINQ 2.0 on my phone');
  const [months, setMonths] = useState(6);
  const [created, setCreated] = useState<UserToken | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!user) return null;
  const avatar = api.proxied(user._links?.avatar);

  const makeToken = async () => {
    setBusy(true);
    setErr(null);
    try {
      setCreated(await api.createToken(tokenName, SCOPES.map(([s]) => s), months));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not create token');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Profile & settings" />
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-navy-700 text-xl font-semibold text-sky">
            {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : (user.preferredName || user.firstName)[0]}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-white">{user.fullName || `${user.firstName} ${user.lastName ?? ''}`}</h2>
            <p className="text-sm text-slate-400">
              {user.role.name}
              {user.yearLevel ? ` · ${user.yearLevel.name}` : ''}
              {user.schoolHouse ? ` · ${user.schoolHouse.name} House` : ''}
              {user.positionTitle ? ` · ${user.positionTitle}` : ''}
            </p>
            <p className="font-mono text-xs text-slate-500">
              {user.username}
              {user.email ? ` · ${user.email}` : ''}
              {user.campus?.length ? ` · ${user.campus.map((c) => c.name).join(', ')}` : ''}
            </p>
          </div>
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-xl bg-white/[0.03] p-3">
            <dt className="text-xs uppercase tracking-wider text-slate-500">Data source</dt>
            <dd className="mt-1 text-white">{api.kind === 'demo' ? 'Demo fixtures' : config.schoolboxOrigin.replace(/^https?:\/\//, '')}</dd>
          </div>
          <div className="rounded-xl bg-white/[0.03] p-3">
            <dt className="text-xs uppercase tracking-wider text-slate-500">Signed in as</dt>
            <dd className="mt-1 text-white">{session?.role}</dd>
          </div>
          <div className="rounded-xl bg-white/[0.03] p-3">
            <dt className="text-xs uppercase tracking-wider text-slate-500">Timetable cycle</dt>
            <dd className="mt-1 text-white">{user.campus?.[0]?.days ? `${user.campus[0].days} days` : '—'}</dd>
          </div>
        </dl>
      </Card>

      {user.role.type === 'parent' && (
        <Card title="Your students">
          <ul className="grid gap-2 sm:grid-cols-2">
            {(user.students ?? []).map((s) => (
              <li key={s.id}>
                <button onClick={() => setViewAs(s)} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left ${viewAs?.id === s.id ? 'border-sky/50 bg-navy-700/50' : 'border-white/5 bg-white/[0.02]'}`}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-700 text-sky">{(s.givenName || s.firstname)[0]}</span>
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-white">{s.fullName}</span>
                    <span className="block text-xs text-slate-400">{s.role.name}</span>
                  </span>
                  {viewAs?.id === s.id && <span className="chip !border-gold/50 text-gold">Viewing</span>}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {user.role.type === 'student' && user.guardians?.length ? (
        <Card title="Guardians">
          <ul className="text-sm text-slate-200">
            {user.guardians.map((g) => (
              <li key={g.id}>{g.fullName}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card title="API token for this app" action={<KeyRound className="h-4 w-4 text-sky" />}>
        <p className="text-sm text-slate-300">
          Generate a scoped Schoolbox token so you can sign in to iLINQ 2.0 without a password (for example on a phone). Tokens expire after at most 12 months and can be revoked in classic iLINQ.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px_auto]">
          <input className="input" value={tokenName} onChange={(e) => setTokenName(e.target.value)} aria-label="Token name" />
          <select className="input" value={months} onChange={(e) => setMonths(Number(e.target.value))} aria-label="Expiry">
            {[1, 3, 6, 12].map((m) => (
              <option key={m} value={m}>
                {m} month{m > 1 ? 's' : ''}
              </option>
            ))}
          </select>
          <button className="btn-primary" onClick={makeToken} disabled={busy}>
            Create token
          </button>
        </div>
        <ul className="mt-3 grid gap-1 text-xs text-slate-400 sm:grid-cols-2">
          {SCOPES.map(([s, label]) => (
            <li key={s} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-sky" /> {label}
            </li>
          ))}
        </ul>
        {err && <p className="mt-3 text-sm text-red-200">{err}</p>}
        {created?.token && (
          <div className="mt-3 rounded-xl border border-gold/30 bg-gold/5 p-3">
            <p className="text-xs text-gold">Copy this now. It will not be shown again.</p>
            <div className="mt-1 flex items-start gap-2">
              <code className="flex-1 break-all font-mono text-xs text-white">{created.token}</code>
              <button className="btn-ghost !px-2" onClick={() => navigator.clipboard.writeText(created.token!)} aria-label="Copy token">
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      <Card title="Classic iLINQ">
        <div className="flex flex-wrap gap-2">
          {[
            ['My profile', user._links?.profile ?? '/'],
            ['Notifications', '/notifications'],
            ['Messages', '/messages'],
            ['ePortfolio', '/eportfolio'],
            ['Settings', '/settings'],
          ].map(([label, path]) => (
            <a key={label} className="btn-ghost" href={api.absolute(path)} target="_blank" rel="noreferrer">
              {label} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ))}
        </div>
      </Card>

      <button className="btn-ghost text-red-200" onClick={() => logout().then(() => navigate('/login'))}>
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </div>
  );
}
