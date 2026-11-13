import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { EventKind } from '@/api/adapters';
import { onDay, readableAccent, withAlpha } from '@/api/adapters';
import { EventRow, KIND_LABEL } from '@/components/EventCard';
import { Card, EmptyState, ErrorBanner, PageHeader } from '@/components/ui';
import { useCalendarRange } from '@/hooks/useCalendar';

const KINDS: EventKind[] = ['class', 'dueWork', 'event', 'booking'];

export default function CalendarPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => startOfDay(new Date()));
  const [kinds, setKinds] = useState<Set<EventKind>>(new Set<EventKind>(['dueWork', 'event', 'booking']));
  const gridStart = startOfWeek(month, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const cal = useCalendarRange(gridStart, addDays(gridEnd, 1));
  const visible = useMemo(() => cal.events.filter((e) => kinds.has(e.kind)), [cal.events, kinds]);
  const days = useMemo(() => {
    const out: Date[] = [];
    for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) out.push(d);
    return out;
  }, [gridStart, gridEnd]);

  const toggle = (k: EventKind) =>
    setKinds((s) => {
      const n = new Set(s);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="School events, due work and bookings from iLINQ"
        actions={
          <>
            <button className="btn-ghost !px-2" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[9rem] text-center text-sm font-medium text-ink">{format(month, 'MMMM yyyy')}</span>
            <button className="btn-ghost !px-2" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        }
      />
      <ErrorBanner error={cal.error} onRetry={cal.refresh} />
      <div className="mb-3 flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button key={k} onClick={() => toggle(k)} className={`chip ${kinds.has(k) ? '!border-sky/50 !bg-navy-700/70 text-ink' : 'opacity-60'}`} aria-pressed={kinds.has(k)}>
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-line/10 text-center text-[11px] uppercase tracking-wider text-ink-muted">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const items = onDay(visible, d);
              const sel = isSameDay(d, selected);
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setSelected(d)}
                  className={`min-h-[72px] border-b border-r border-line/10 p-1.5 text-left align-top transition hover:bg-white/5 sm:min-h-[96px] ${!isSameMonth(d, month) ? 'opacity-40' : ''} ${sel ? 'bg-navy-700/40' : ''}`}
                  aria-label={format(d, 'EEEE d MMMM')}
                  aria-pressed={sel}
                >
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday(d) ? 'bg-gold font-semibold text-navy-950' : 'text-ink/80'}`}>{format(d, 'd')}</span>
                  <div className="mt-1 hidden space-y-0.5 sm:block">
                    {items.slice(0, 3).map((e) => (
                      <div key={e.id} className="truncate rounded px-1 text-[11px] text-ink" style={{ background: withAlpha(readableAccent(e.colour), 0.4) }}>
                        {e.title}
                      </div>
                    ))}
                    {items.length > 3 && <div className="px-1 text-[10px] text-ink-muted">+{items.length - 3} more</div>}
                  </div>
                  <div className="mt-1 flex gap-0.5 sm:hidden">
                    {items.slice(0, 4).map((e) => (
                      <span key={e.id} className="h-1.5 w-1.5 rounded-full" style={{ background: readableAccent(e.colour) }} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <Card title={format(selected, 'EEEE d MMMM')}>
          {onDay(visible, selected).length === 0 ? (
            <EmptyState title="Nothing scheduled" hint="Try switching on Classes in the filters above." />
          ) : (
            <div className="space-y-2">
              {onDay(visible, selected).map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
