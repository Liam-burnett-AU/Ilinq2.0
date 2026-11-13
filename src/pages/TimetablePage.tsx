import { addDays, addWeeks, format, isSameDay, isToday, startOfDay, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { classesOn, onDay, readableAccent, termWeekFor, withAlpha } from '@/api/adapters';
import { useAuth } from '@/auth/AuthContext';
import { EventRow, subline } from '@/components/EventCard';
import { EmptyState, ErrorBanner, PageHeader, Skeleton } from '@/components/ui';
import { useCalendarRange } from '@/hooks/useCalendar';
import { useNow } from '@/hooks/useNow';

const DAY_START = 8; // 8:00
const DAY_END = 16; // 16:00
const PX_PER_HOUR = 72;

export default function TimetablePage() {
  const now = useNow();
  const [offset, setOffset] = useState(0);
  const { api } = useAuth();
  const monday = useMemo(() => addWeeks(startOfWeek(startOfDay(new Date()), { weekStartsOn: 1 }), offset), [offset]);
  const days = useMemo(() => Array.from({ length: 5 }, (_, i) => addDays(monday, i)), [monday]);
  const cal = useCalendarRange(monday, addDays(monday, 7));
  const [selected, setSelected] = useState<Date>(() => {
    const d = new Date();
    return d.getDay() === 0 || d.getDay() === 6 ? monday : startOfDay(d);
  });

  const hours = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i);
  const gridHeight = (DAY_END - DAY_START) * PX_PER_HOUR;
  const pos = (d: Date) => ((d.getHours() + d.getMinutes() / 60 - DAY_START) / (DAY_END - DAY_START)) * gridHeight;

  return (
    <div>
      <PageHeader
        title="Timetable"
        subtitle={[`Week of ${format(monday, 'd MMM')}`, termWeekFor(cal.events, monday)].filter(Boolean).join(' · ')}
        actions={
          <>
            <button className="btn-ghost !px-2" onClick={() => setOffset((o) => o - 1)} aria-label="Previous week">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="btn-ghost" onClick={() => setOffset(0)}>
              This week
            </button>
            <button className="btn-ghost !px-2" onClick={() => setOffset((o) => o + 1)} aria-label="Next week">
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        }
      />
      <ErrorBanner error={cal.error} onRetry={cal.refresh} />

      {/* Mobile: day picker + list */}
      <div className="lg:hidden">
        <div className="mb-3 grid grid-cols-5 gap-1">
          {days.map((d) => (
            <button key={d.toISOString()} onClick={() => setSelected(d)} className={`rounded-card py-2 text-center ${isSameDay(d, selected) ? 'bg-navy-700 text-ink' : 'bg-white/5 text-ink/80'}`}>
              <span className="block text-[11px] uppercase tracking-wider">{format(d, 'EEE')}</span>
              <span className={`block text-lg font-semibold ${isToday(d) ? 'text-gold' : ''}`}>{format(d, 'd')}</span>
            </button>
          ))}
        </div>
        {cal.loading ? (
          <Skeleton className="h-60" />
        ) : (
          <div className="space-y-2">
            {onDay(cal.events, selected).filter((e) => e.kind !== 'booking' && e.kind !== 'termWeek').length === 0 && <EmptyState title="Nothing on this day" />}
            {onDay(cal.events, selected)
              .filter((e) => e.kind !== 'booking' && e.kind !== 'termWeek')
              .map((e) => (
                <EventRow key={e.id} event={e} emphasis={e.kind === 'class' && e.start <= now && e.end > now} />
              ))}
          </div>
        )}
      </div>

      {/* Desktop: week grid */}
      <div className="card hidden overflow-hidden lg:block">
        <div className="grid grid-cols-[56px_repeat(5,minmax(0,1fr))] border-b border-line/10">
          <div />
          {days.map((d) => (
            <div key={d.toISOString()} className={`min-w-0 overflow-hidden px-3 py-2 text-center ${isToday(d) ? 'bg-navy-800/60' : ''}`}>
              <div className="text-[11px] uppercase tracking-wider text-ink-muted">{format(d, 'EEEE')}</div>
              <div className={`text-lg font-semibold ${isToday(d) ? 'text-gold' : 'text-ink'}`}>{format(d, 'd MMM')}</div>
              <div className="mt-1 flex flex-wrap justify-center gap-1">
                {onDay(cal.events, d)
                  .filter((e) => e.kind === 'dueWork' || e.kind === 'event')
                  .slice(0, 4)
                  .map((e) => (
                    <span key={e.id} className="chip max-w-full truncate !py-0 text-[10px]" title={`${e.title}${e.allDay ? '' : ` · ${format(e.start, 'h:mma').toLowerCase()}`}${e.location ? ` · ${e.location}` : ''}`} style={{ borderColor: withAlpha(readableAccent(e.colour), 0.5) }}>
                      {e.kind === 'dueWork' ? 'Due: ' : e.allDay ? '' : `${format(e.start, 'h:mm')} `}
                      {e.title}
                    </span>
                  ))}
                {onDay(cal.events, d).filter((e) => e.kind === 'dueWork' || e.kind === 'event').length > 4 && (
                  <span className="text-[10px] text-ink-muted/80">+{onDay(cal.events, d).filter((e) => e.kind === 'dueWork' || e.kind === 'event').length - 4} more</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="relative grid grid-cols-[56px_repeat(5,minmax(0,1fr))]" style={{ height: gridHeight }}>
          {/* hour labels + lines */}
          <div className="relative">
            {hours.map((h) => (
              <div key={h} className="absolute -translate-y-1/2 pr-2 text-right font-mono text-[10px] text-ink-muted/80" style={{ top: (h - DAY_START) * PX_PER_HOUR, width: 56 }}>
                {format(new Date(2000, 0, 1, h), 'h a')}
              </div>
            ))}
          </div>
          {days.map((d) => {
            const items = classesOn(cal.events, d);
            return (
              <div key={d.toISOString()} className={`relative border-l border-line/10 ${isToday(d) ? 'bg-navy-800/30' : ''}`}>
                {hours.map((h) => (
                  <div key={h} className="absolute inset-x-0 border-t border-line/10" style={{ top: (h - DAY_START) * PX_PER_HOUR }} />
                ))}
                {isToday(d) && now.getHours() >= DAY_START && now.getHours() < DAY_END && (
                  <div className="absolute inset-x-0 z-10 border-t-2 border-gold" style={{ top: pos(now) }}>
                    <span className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-gold" />
                  </div>
                )}
                {cal.loading && <Skeleton className="absolute inset-2" />}
                {items.map((e) => {
                  const top = Math.max(0, pos(e.start));
                  const height = Math.max(14, pos(e.end) - top);
                  const tiny = height < 24;
                  const live = e.start <= now && e.end > now;
                  const href = api.absolute(e.path);
                  const Tag = href ? 'a' : 'div';
                  return (
                    <Tag
                      key={e.id}
                      {...(href ? { href, target: '_blank', rel: 'noreferrer' } : {})}
                      className={`absolute inset-x-1 overflow-hidden rounded-lg border px-2 text-left text-xs transition hover:brightness-110 ${tiny ? 'py-0 leading-[14px]' : 'py-1'} ${live ? 'ring-2 ring-gold/70' : ''}`}
                      style={{ top, height, background: withAlpha(readableAccent(e.colour), 0.22), borderColor: withAlpha(readableAccent(e.colour), 0.6) }}
                      title={`${e.title}\n${format(e.start, 'h:mm')}–${format(e.end, 'h:mm a')}${e.location ? `\n${e.location}` : ''}`}
                    >
                      <div className={`truncate font-medium text-ink ${tiny ? 'text-[9px]' : ''}`}>{e.title}{tiny && e.location ? ` · ${e.location}` : ''}</div>
                      {height > 36 && <div className="truncate text-[11px] text-ink/90/80">{[e.location, subline(e)].filter(Boolean).join(' · ')}</div>}
                      {height > 52 && <div className="font-mono text-[10px] text-ink/80/70">{format(e.start, 'h:mm')}–{format(e.end, 'h:mm')}</div>}
                    </Tag>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
