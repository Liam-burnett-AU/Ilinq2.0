import { Bell, ChevronDown, Globe, LogOut, Search, SlidersHorizontal, User as UserIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { usePrefs } from '@/prefs/PrefsContext';
import { CLASSIC_PAGES } from '@/pages/ClassicPage';
import { CommandPalette } from './CommandPalette';
import { CustomisePanel } from './CustomisePanel';
import { LogoSlot } from './LogoSlot';
import { NAV } from './nav';

export function Shell() {
  const { user, api, logout, viewAs, setViewAs } = useAuth();
  const { prefs } = usePrefs();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [customiseOpen, setCustomiseOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const nav = NAV.filter((n) => !prefs.hiddenNav.includes(n.to));
  const mobile = nav.slice(0, 4);
  const isParent = user?.role.type === 'parent';
  const displayName = user?.preferredName || user?.firstName || user?.username;
  const compact = prefs.density === 'compact';

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      {/* Sidebar (desktop) */}
      <aside className="hidden border-r border-line/10 bg-navy-950/60 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="px-5 py-5">
          <LogoSlot />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label="Primary">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </NavLink>
          ))}
          <button className="nav-link w-full" onClick={() => setPaletteOpen(true)}>
            <Search className="h-[18px] w-[18px]" />
            Search
            <kbd className="ml-auto rounded border border-line/15 bg-white/5 px-1.5 font-mono text-[10px] text-ink-muted">⌘K</kbd>
          </button>

          <div className="pt-4">
            <p className="card-title px-3 pb-1">iLINQ pages</p>
            {CLASSIC_PAGES.filter((p) => p.path !== '/').map((p) => (
              <NavLink key={p.path} to={`/classic${p.path}`} className={({ isActive }) => `nav-link !py-1.5 text-[13px] ${isActive ? 'nav-link-active' : ''}`}>
                <Globe className="h-4 w-4 opacity-70" />
                {p.label}
              </NavLink>
            ))}
          </div>
        </nav>
        <div className="border-t border-line/10 p-3">
          {api.kind === 'demo' && (
            <div className="mb-2 rounded-card border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold">
              Demo data. Sign in with your College account for live iLINQ.
            </div>
          )}
          <button className="nav-link w-full" onClick={() => setCustomiseOpen(true)}>
            <SlidersHorizontal className="h-[18px] w-[18px]" /> Customise
          </button>
          <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
            <UserIcon className="h-[18px] w-[18px]" />
            <span className="truncate">{displayName}</span>
            <span className="ml-auto text-[10px] uppercase tracking-wider text-ink-muted">{user?.role.type}</span>
          </NavLink>
          <button className="nav-link w-full text-ink-muted" onClick={() => logout().then(() => navigate('/login'))}>
            <LogOut className="h-[18px] w-[18px]" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line/10 bg-navy-950/80 px-4 py-3 backdrop-blur lg:px-8">
          <div className="lg:hidden">
            <LogoSlot size="sm" />
          </div>
          <div className="hidden items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-ink-muted lg:flex">
            <span>{new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
          <div className="flex items-center gap-2">
            {isParent && user?.students && user.students.length > 0 && (
              <label className="relative">
                <span className="sr-only">Viewing child</span>
                <select
                  className="input !w-auto appearance-none !py-1.5 pr-8 text-xs"
                  value={viewAs?.id ?? ''}
                  onChange={(e) => setViewAs(user.students!.find((s) => s.id === Number(e.target.value)) ?? null)}
                >
                  {user.students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.givenName || s.firstname} {s.lastname}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
              </label>
            )}
            <button className="btn-ghost !px-2.5" onClick={() => setPaletteOpen(true)} aria-label="Search">
              <Search className="h-4 w-4" />
            </button>
            <NavLink to="/classic/notifications" className="btn-ghost !px-2.5" aria-label="Notifications">
              <Bell className="h-4 w-4" />
            </NavLink>
            <button className="btn-ghost !px-2.5" onClick={() => setCustomiseOpen(true)} aria-label="Customise">
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            <NavLink to="/profile" className="btn-ghost !px-2.5 lg:hidden" aria-label="Profile">
              <UserIcon className="h-4 w-4" />
            </NavLink>
          </div>
        </header>

        <main id="main" className={`flex-1 px-4 pb-24 lg:px-8 lg:pb-10 ${compact ? 'pt-3' : 'pt-5'}`}>
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>

        {/* Bottom tab bar (mobile) */}
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line/10 bg-navy-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Primary">
          {mobile.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[11px] ${isActive ? 'text-gold' : 'text-ink-muted'}`}>
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
          <button onClick={() => setCustomiseOpen(true)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-ink-muted">
            <SlidersHorizontal className="h-5 w-5" />
            More
          </button>
        </nav>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <CustomisePanel open={customiseOpen} onClose={() => setCustomiseOpen(false)} />
    </div>
  );
}
