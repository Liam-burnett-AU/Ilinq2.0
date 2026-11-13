import { ArrowRight, KeyRound, Sparkles } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { LogoSlot } from '@/components/LogoSlot';
import { Spinner } from '@/components/ui';
import { config } from '@/lib/config';

export default function LoginPage() {
  const { session, login, loginWithToken, startDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname: string } } };
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [jwt, setJwt] = useState('');
  const [tab, setTab] = useState<'password' | 'token'>('password');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Navigate to={location.state?.from?.pathname ?? '/'} replace />;

  const go = () => navigate(location.state?.from?.pathname ?? '/', { replace: true });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (tab === 'password') await login(username.trim(), password);
      else await loginWithToken(jwt);
      go();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 401
            ? 'Incorrect username or password.'
            : err.status === 502 || err.status === 0
              ? 'Could not reach iLINQ. The app must be served through its proxy (npm run dev / npm start).'
              : err.message,
        );
      } else setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-8 flex justify-center">
          <LogoSlot size="lg" />
        </div>
        <div className="card card-pad">
          <h1 className="text-xl font-semibold text-white">Sign in to iLINQ</h1>
          <p className="mt-1 text-sm text-slate-400">
            Students and staff use their College network login. Parents use their iLINQ parent account.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1 text-sm" role="tablist">
            {(['password', 'token'] as const).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} className={`rounded-lg py-1.5 transition ${tab === t ? 'bg-navy-700 text-white' : 'text-slate-400 hover:text-white'}`} onClick={() => setTab(t)}>
                {t === 'password' ? 'Username & password' : 'API token'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-4 space-y-3">
            {tab === 'password' ? (
              <>
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-300">Username</span>
                  <input className="input" autoComplete="username" autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value)} required />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-300">Password</span>
                  <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </label>
              </>
            ) : (
              <label className="block text-sm">
                <span className="mb-1 block text-slate-300">Schoolbox JWT</span>
                <textarea className="input min-h-[96px] font-mono text-xs" value={jwt} onChange={(e) => setJwt(e.target.value)} placeholder="eyJhbGciOi…" required />
                <span className="mt-1 block text-xs text-slate-500">
                  Create one in classic iLINQ under your profile → Tokens (needs the <code className="font-mono">session</code> scope).
                </span>
              </label>
            )}
            {error && (
              <p role="alert" className="rounded-lg border border-red-400/30 bg-red-950/40 px-3 py-2 text-sm text-red-100">
                {error}
              </p>
            )}
            <button className="btn-primary w-full" disabled={busy}>
              {busy ? <Spinner className="text-white" /> : tab === 'password' ? <ArrowRight className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <a className="hover:text-white" href={config.schoolboxOrigin} target="_blank" rel="noreferrer">
              Forgot password? Reset on classic iLINQ
            </a>
            <a className="hover:text-white" href={config.schoolboxOrigin} target="_blank" rel="noreferrer">
              Open classic iLINQ
            </a>
          </div>
        </div>

        <div className="mt-4 card card-pad flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-white">Just looking?</p>
            <p className="text-xs text-slate-400">Explore with sample data. Nothing is sent to iLINQ.</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => startDemo('student').then(go)}>
              <Sparkles className="h-4 w-4 text-gold" /> Student
            </button>
            <button className="btn-ghost" onClick={() => startDemo('parent').then(go)}>
              Parent
            </button>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">
          iLINQ 2.0 is an independent front end for {config.schoolName}'s Schoolbox portal. Your credentials go straight to ilinq.sheldoncollege.com.
        </p>
      </div>
    </div>
  );
}
