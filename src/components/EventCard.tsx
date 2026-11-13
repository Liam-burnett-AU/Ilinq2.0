import { format } from 'date-fns';
import { CheckCircle2, Circle, ExternalLink, MapPin } from 'lucide-react';
import type { PortalEvent } from '@/api/adapters';
import { useAuth } from '@/auth/AuthContext';

export const KIND_LABEL: Record<PortalEvent['kind'], string> = { class: 'Class', dueWork: 'Due work', event: 'Event', booking: 'Booking' };

export function timeRange(e: PortalEvent) {
  if (e.allDay) return 'All day';
  const s = format(e.start, 'h:mma').toLowerCase();
  const en = format(e.end, 'h:mma').toLowerCase();
  return s === en ? s : `${s} – ${en}`;
}

export function EventRow({ event, showDate = false, emphasis = false }: { event: PortalEvent; showDate?: boolean; emphasis?: boolean }) {
  const { api } = useAuth();
  const href = api.absolute(event.path);
  const isDue = event.kind === 'dueWork';
  return (
    <div className={`group flex items-stretch gap-3 rounded-xl border px-3 py-2.5 transition ${emphasis ? 'border-gold/40 bg-gold/5' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'}`}>
      <div className="w-1 shrink-0 rounded-full" style={{ background: event.colour }} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {isDue && (event.completed ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <Circle className="h-4 w-4 shrink-0 text-slate-500" />)}
          <p className={`truncate text-sm font-medium ${event.completed ? 'text-slate-400 line-through' : 'text-white'}`}>{event.title}</p>
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
          <span className="font-mono">{showDate ? `${format(event.start, 'EEE d MMM')} · ` : ''}{timeRange(event)}</span>
          {event.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {event.location}
            </span>
          )}
          {event.detail && event.kind !== 'class' && <span className="truncate">{stripTags(event.detail)}</span>}
          {event.kind === 'class' && event.detail && <span className="truncate">{stripTags(event.detail)}</span>}
        </p>
      </div>
      {href && (
        <a href={href} target="_blank" rel="noreferrer" className="self-center rounded-lg p-1.5 text-slate-500 opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100 focus:opacity-100" aria-label={`Open ${event.title} in iLINQ`}>
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}

function stripTags(s: string) {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
