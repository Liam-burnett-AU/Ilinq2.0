import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, createApi, tokenStore, type PortalApi } from '@/api';
import type { RelatedUser, SessionInfo, User } from '@/api/types';
import { config } from '@/lib/config';

const SESSION_KEY = 'ilinq2.session';
const MODE_KEY = 'ilinq2.mode';
const VIEW_AS_KEY = 'ilinq2.viewAs';

interface StoredSession extends SessionInfo {
  mode: 'live' | 'demo';
}

interface AuthState {
  api: PortalApi;
  session: StoredSession | null;
  user: User | null;
  /** For parents: the child currently being viewed. */
  viewAs: RelatedUser | null;
  /** The user id whose timetable/calendar/feedback should be shown. */
  subjectId: number | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string, mode?: 'live' | 'demo') => Promise<void>;
  loginWithToken: (jwt: string) => Promise<void>;
  startDemo: (as?: 'student' | 'parent') => Promise<void>;
  logout: () => Promise<void>;
  setViewAs: (child: RelatedUser | null) => void;
}

const AuthContext = createContext<AuthState | null>(null);

function readStored(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(readStored);
  const initialMode = (session?.mode ?? (sessionStorage.getItem(MODE_KEY) as 'live' | 'demo' | null) ?? (config.demoOnly ? 'demo' : 'live')) as 'live' | 'demo';
  const [api, setApi] = useState<PortalApi>(() => createApi(initialMode));
  const [user, setUser] = useState<User | null>(null);
  const [viewAs, setViewAsState] = useState<RelatedUser | null>(() => {
    try {
      const raw = sessionStorage.getItem(VIEW_AS_KEY);
      return raw ? (JSON.parse(raw) as RelatedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(!!session);
  const [error, setError] = useState<string | null>(null);

  const persist = (s: StoredSession | null) => {
    setSession(s);
    if (s) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
      sessionStorage.setItem(MODE_KEY, s.mode);
    } else {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(VIEW_AS_KEY);
    }
  };

  // Load the full user profile whenever we have a session.
  useEffect(() => {
    if (!session) {
      setUser(null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    api
      .getUser(session.id)
      .then((u) => {
        if (!alive) return;
        setUser(u);
        // Parents default to their first child.
        if (u.role.type === 'parent' && u.students?.length && !viewAs) setViewAs(u.students[0]);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        if (e instanceof ApiError && e.isUnauthorised) {
          persist(null);
          tokenStore.clear();
        } else setError(e instanceof Error ? e.message : 'Could not load your profile');
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, session?.mode, api]);

  const setViewAs = useCallback((child: RelatedUser | null) => {
    setViewAsState(child);
    if (child) sessionStorage.setItem(VIEW_AS_KEY, JSON.stringify(child));
    else sessionStorage.removeItem(VIEW_AS_KEY);
  }, []);

  const login = useCallback(async (username: string, password: string, mode: 'live' | 'demo' = 'live') => {
    const next = createApi(mode);
    const info = await next.login(username, password);
    setApi(next);
    setViewAs(null);
    persist({ ...info, mode });
  }, [setViewAs]);

  const loginWithToken = useCallback(async (jwt: string) => {
    tokenStore.set(jwt.trim());
    const next = createApi('live', jwt.trim());
    try {
      const info = await next.loginWithJwt(jwt.trim());
      setApi(next);
      setViewAs(null);
      persist({ ...info, mode: 'live' });
    } catch (e) {
      tokenStore.clear();
      throw e;
    }
  }, [setViewAs]);

  const startDemo = useCallback(async (as: 'student' | 'parent' = 'student') => {
    await login(as === 'parent' ? 'jreed' : 'sreed', 'demo', 'demo');
  }, [login]);

  const logout = useCallback(async () => {
    await api.logout();
    tokenStore.clear();
    persist(null);
    setViewAs(null);
    setUser(null);
    setApi(createApi(config.demoOnly ? 'demo' : 'live'));
  }, [api, setViewAs]);

  const subjectId = user ? (user.role.type === 'parent' ? viewAs?.id ?? null : user.id) : null;

  const value = useMemo<AuthState>(
    () => ({ api, session, user, viewAs, subjectId, loading, error, login, loginWithToken, startDemo, logout, setViewAs }),
    [api, session, user, viewAs, subjectId, loading, error, login, loginWithToken, startDemo, logout, setViewAs],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
