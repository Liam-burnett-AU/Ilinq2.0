import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemeId = 'blueprint' | 'midnight' | 'ink';
export type WidgetId = 'nowNext' | 'dueSoon' | 'today' | 'news' | 'classes' | 'comingUp' | 'feedback' | 'quickLinks';
export type WidgetSize = 'half' | 'full';

export interface WidgetConfig {
  id: WidgetId;
  visible: boolean;
  size: WidgetSize;
}

export interface Prefs {
  theme: ThemeId;
  widgets: WidgetConfig[];
  /** Nav items hidden from the sidebar / tab bar. */
  hiddenNav: string[];
  /** Compact spacing. */
  density: 'comfortable' | 'compact';
}

export const THEMES: { id: ThemeId; name: string; blurb: string }[] = [
  { id: 'blueprint', name: 'Blueprint', blurb: 'Grid paper, hairline rules, corner ticks. The iLINQ 2.0 signature look.' },
  { id: 'midnight', name: 'Midnight', blurb: 'Soft rounded cards on deep navy.' },
  { id: 'ink', name: 'Ink', blurb: 'Near-black, editorial serif headings, sharp edges.' },
];

export const WIDGET_META: Record<WidgetId, { name: string; description: string }> = {
  nowNext: { name: 'Now / next class', description: 'Your current or upcoming class with time remaining.' },
  dueSoon: { name: 'Due soon', description: 'Overdue, today and this week.' },
  today: { name: "Today's timetable", description: 'All classes and events for today.' },
  news: { name: 'Latest news', description: 'Articles audienced to you.' },
  classes: { name: 'My classes', description: 'Quick tiles for each class page.' },
  comingUp: { name: 'Coming up', description: 'Events in the next three weeks.' },
  feedback: { name: 'Recent feedback', description: 'Latest marks and comments.' },
  quickLinks: { name: 'Quick links', description: 'College website, classic iLINQ, key info.' },
};

export const DEFAULT_PREFS: Prefs = {
  theme: 'blueprint',
  widgets: [
    { id: 'nowNext', visible: true, size: 'half' },
    { id: 'dueSoon', visible: true, size: 'half' },
    { id: 'today', visible: true, size: 'half' },
    { id: 'news', visible: true, size: 'half' },
    { id: 'classes', visible: true, size: 'full' },
    { id: 'comingUp', visible: true, size: 'half' },
    { id: 'feedback', visible: true, size: 'half' },
    { id: 'quickLinks', visible: false, size: 'half' },
  ],
  hiddenNav: [],
  density: 'comfortable',
};

const KEY = 'ilinq2.prefs.v1';

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return mergePrefs(parsed);
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Merge stored prefs with defaults so new widgets appear for existing users. */
export function mergePrefs(parsed: Partial<Prefs>): Prefs {
  const known = new Set(DEFAULT_PREFS.widgets.map((w) => w.id));
  const stored = (parsed.widgets ?? []).filter((w) => known.has(w.id));
  const missing = DEFAULT_PREFS.widgets.filter((w) => !stored.some((s) => s.id === w.id));
  return {
    theme: THEMES.some((t) => t.id === parsed.theme) ? (parsed.theme as ThemeId) : DEFAULT_PREFS.theme,
    widgets: [...stored, ...missing],
    hiddenNav: Array.isArray(parsed.hiddenNav) ? parsed.hiddenNav : [],
    density: parsed.density === 'compact' ? 'compact' : 'comfortable',
  };
}

export function moveWidget(widgets: WidgetConfig[], from: number, to: number): WidgetConfig[] {
  if (from === to || from < 0 || to < 0 || from >= widgets.length || to >= widgets.length) return widgets;
  const next = [...widgets];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

interface PrefsState {
  prefs: Prefs;
  editing: boolean;
  setEditing: (v: boolean) => void;
  setTheme: (t: ThemeId) => void;
  setDensity: (d: Prefs['density']) => void;
  updateWidget: (id: WidgetId, patch: Partial<WidgetConfig>) => void;
  reorder: (from: number, to: number) => void;
  toggleNav: (to: string) => void;
  reset: () => void;
}

const Ctx = createContext<PrefsState | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* private mode */
    }
    document.documentElement.dataset.theme = prefs.theme;
    document.documentElement.dataset.density = prefs.density;
  }, [prefs]);

  const setTheme = useCallback((theme: ThemeId) => setPrefs((p) => ({ ...p, theme })), []);
  const setDensity = useCallback((density: Prefs['density']) => setPrefs((p) => ({ ...p, density })), []);
  const updateWidget = useCallback((id: WidgetId, patch: Partial<WidgetConfig>) => setPrefs((p) => ({ ...p, widgets: p.widgets.map((w) => (w.id === id ? { ...w, ...patch } : w)) })), []);
  const reorder = useCallback((from: number, to: number) => setPrefs((p) => ({ ...p, widgets: moveWidget(p.widgets, from, to) })), []);
  const toggleNav = useCallback((to: string) => setPrefs((p) => ({ ...p, hiddenNav: p.hiddenNav.includes(to) ? p.hiddenNav.filter((x) => x !== to) : [...p.hiddenNav, to] })), []);
  const reset = useCallback(() => setPrefs(DEFAULT_PREFS), []);

  const value = useMemo(() => ({ prefs, editing, setEditing, setTheme, setDensity, updateWidget, reorder, toggleNav, reset }), [prefs, editing, setTheme, setDensity, updateWidget, reorder, toggleNav, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrefs() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePrefs must be used within PrefsProvider');
  return ctx;
}
