import { ArrowDown, ArrowUp, Eye, EyeOff, Maximize2, Minimize2, RotateCcw, X } from 'lucide-react';
import { THEMES, WIDGET_META, usePrefs } from '@/prefs/PrefsContext';
import { NAV } from './nav';

export function CustomisePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { prefs, setTheme, setDensity, updateWidget, reorder, toggleNav, reset, editing, setEditing } = usePrefs();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label="Customise">
      <aside className="card flex h-full w-full max-w-md flex-col overflow-hidden !rounded-none border-l border-line/15" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-line/10 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Customise</h2>
            <p className="text-xs text-ink-muted">Saved on this device.</p>
          </div>
          <button className="btn-ghost !px-2" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
          <section>
            <h3 className="card-title mb-2">Theme</h3>
            <div className="grid gap-2">
              {THEMES.map((t) => (
                <button key={t.id} onClick={() => setTheme(t.id)} className={`flex items-start gap-3 rounded-card border px-3 py-2.5 text-left transition ${prefs.theme === t.id ? 'border-sky/60 bg-navy-700/50' : 'border-line/10 hover:bg-white/5'}`} aria-pressed={prefs.theme === t.id}>
                  <ThemeSwatch id={t.id} />
                  <span>
                    <span className="block text-sm font-medium text-ink">{t.name}</span>
                    <span className="block text-xs text-ink-muted">{t.blurb}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="text-ink-muted">Density</span>
              {(['comfortable', 'compact'] as const).map((d) => (
                <button key={d} className={`chip ${prefs.density === d ? '!border-sky/50 !bg-navy-700/70' : ''}`} onClick={() => setDensity(d)} aria-pressed={prefs.density === d}>
                  {d}
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="card-title">Today page widgets</h3>
              <button className={`chip ${editing ? '!border-gold/60 text-gold' : ''}`} onClick={() => setEditing(!editing)} aria-pressed={editing}>
                {editing ? 'Drag mode on' : 'Drag on page'}
              </button>
            </div>
            <ol className="space-y-1.5">
              {prefs.widgets.map((w, i) => (
                <li key={w.id} className={`flex items-center gap-2 rounded-card border border-line/10 px-2.5 py-2 ${w.visible ? '' : 'opacity-60'}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{WIDGET_META[w.id].name}</span>
                    <span className="block truncate text-[11px] text-ink-muted">{WIDGET_META[w.id].description}</span>
                  </span>
                  <button className="btn-ghost !p-1.5" onClick={() => reorder(i, i - 1)} disabled={i === 0} aria-label="Move up">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button className="btn-ghost !p-1.5" onClick={() => reorder(i, i + 1)} disabled={i === prefs.widgets.length - 1} aria-label="Move down">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button className="btn-ghost !p-1.5" onClick={() => updateWidget(w.id, { size: w.size === 'full' ? 'half' : 'full' })} aria-label={w.size === 'full' ? 'Make half width' : 'Make full width'}>
                    {w.size === 'full' ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                  </button>
                  <button className="btn-ghost !p-1.5" onClick={() => updateWidget(w.id, { visible: !w.visible })} aria-label={w.visible ? 'Hide' : 'Show'}>
                    {w.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h3 className="card-title mb-2">Navigation</h3>
            <ul className="grid grid-cols-2 gap-1.5">
              {NAV.map((n) => {
                const hidden = prefs.hiddenNav.includes(n.to);
                return (
                  <li key={n.to}>
                    <button className={`flex w-full items-center gap-2 rounded-card border px-2.5 py-1.5 text-left text-sm ${hidden ? 'border-line/10 text-ink-muted' : 'border-sky/30 text-ink'}`} onClick={() => toggleNav(n.to)} aria-pressed={!hidden} disabled={n.to === '/'}>
                      {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5 text-sky" />}
                      {n.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <footer className="flex items-center justify-between border-t border-line/10 px-5 py-3">
          <button className="btn-ghost text-ink-muted" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Reset to default
          </button>
          <button className="btn-primary" onClick={onClose}>
            Done
          </button>
        </footer>
      </aside>
    </div>
  );
}

function ThemeSwatch({ id }: { id: string }) {
  const bg = id === 'ink' ? '#08090c' : id === 'midnight' ? '#04122a' : '#05142e';
  const r = id === 'ink' ? 2 : id === 'midnight' ? 8 : 3;
  return (
    <span className="relative mt-0.5 block h-10 w-14 shrink-0 overflow-hidden border border-line/20" style={{ background: bg, borderRadius: r }}>
      {id === 'blueprint' && <span className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(163,193,231,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(163,193,231,.15) 1px, transparent 1px)', backgroundSize: '7px 7px' }} />}
      <span className="absolute left-2 top-2 h-1 w-6 rounded-sm bg-[#a3c1e7]" />
      <span className="absolute left-2 top-4 h-1 w-4 rounded-sm bg-[#fbd708]" />
      <span className="absolute bottom-2 left-2 right-2 h-2 rounded-sm" style={{ background: id === 'ink' ? '#0f1116' : '#00295c' }} />
    </span>
  );
}
