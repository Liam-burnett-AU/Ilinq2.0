import { Bell, BookOpen, CalendarDays, ChevronDown, ClipboardList, Home, LayoutGrid, LogOut, Newspaper, Search, Sparkles, User as UserIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { config } from '@/lib/config';
import { CommandPalette } from './CommandPalette';
import { LogoSlot } from './LogoSlot';

const NAV = [
  { to: '/', label: 'Today', icon: Home, end: true },
  { to: '/timetable', label: 'Timetable', icon: LayoutGrid },
  { to: '/due-work', label: 'Due work', icon: ClipboardList },
  { to: '/news', label: 'News', icon: Newspaper },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/feedback', label: 'Feedback', icon: Sparkles },
  { to: '/classes', label: 'Classes', icon: BookOpen },
];

const MOBILE = NAV.filter((n) => ['/', '/timetable', '/due-work', '/news'].includes(n.to));

export function Shell() {
  const { user, api, logout, viewAs, setViewAs } = useAuth();
  const [paletteOpen, setPaletteOpen] = useState(false);
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

  const isParent = user?.role.type === 'parent';
  const displayName = user?.preferredName || user?.firstName || user?.username;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      {/* Sidebar (desktop) */}
      <aside className="hidden border-r border-white/5 bg-navy-950/60 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="px-5 py-5">
          <LogoSlot />
        </div>
        <nav className="flex-1 space-y-1 px-3" aria-label="Primary">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
              <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
              {label}
            </NavLink>
          ))}
          <button className="nav-link w-full" onClick={() => setPaletteOpen(true)}>
            <Search className="h-[18px] w-[18px]" />
            Search
            <kbd className="ml-auto rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] text-slate-400">⌘K</kbd>
          </button>
        </nav>
        <div className="border-t border-white/5 p-3">
          {api.kind === 'demo' && (
            <div className="mb-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold">
              Demo data. Sign in with your College account for live iLINQ.
            </div>
          )}
          <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
            <UserIcon className="h-[18px] w-[18px]" />
            <span className="truncate">{displayName}</span>
            <span className="ml-auto text-[10px] uppercase tracking-wider text-slate-500">{user?.role.type}</span>
          </NavLink>
          <button className="nav-link w-full text-slate-400" onClick={() => logout().then(() => navigate('/login'))}>
            <LogOut className="h-[18px] w-[18px]" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/5 bg-navy-950/80 px-4 py-3 backdrop-blur lg:px-8">
          <div className="lg:hidden">
            <LogoSlot size="sm" />
          </div>
          <div className="hidden items-center gap-2 text-sm text-slate-400 lg:flex">
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
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </label>
            )}
            <button className="btn-ghost !px-2.5" onClick={() => setPaletteOpen(true)} aria-label="Search">
              <Search className="h-4 w-4" />
            </button>
            <a className="btn-ghost !px-2.5" href={`${config.schoolboxOrigin}/notifications`} target="_blank" rel="noreferrer" aria-label="Notifications (opens classic iLINQ)">
              <Bell className="h-4 w-4" />
            </a>
            <NavLink to="/profile" className="btn-ghost !px-2.5 lg:hidden" aria-label="Profile">
              <UserIcon className="h-4 w-4" />
            </NavLink>
          </div>
        </header>

        <main id="main" className="flex-1 px-4 pb-24 pt-5 lg:px-8 lg:pb-10">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>

        {/* Bottom tab bar (mobile) */}
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-white/5 bg-navy-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Primary">
          {MOBILE.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[11px] ${isActive ? 'text-gold' : 'text-slate-400'}`}>
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
          <NavLink to="/calendar" className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[11px] ${isActive ? 'text-gold' : 'text-slate-400'}`}>
            <CalendarDays className="h-5 w-5" />
            More
          </NavLink>
        </nav>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
