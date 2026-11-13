import { differenceInMinutes, isSameDay, parseISO } from 'date-fns';
import type { CalendarAjaxEvent, NewsFeedItem } from './types';

export type EventKind = 'class' | 'dueWork' | 'event' | 'booking';

/** A normalised calendar item used throughout the UI. */
export interface PortalEvent {
  id: string;
  kind: EventKind;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  colour: string;
  location?: string;
  detail?: string;
  typeLabel?: string;
  author?: string;
  completed?: boolean;
  path?: string;
  classAttendanceUrl?: string | null;
  attendanceStatus?: 1 | 2 | 3 | null;
  className: string;
  raw: CalendarAjaxEvent;
}

const CLASS_RE = /\b(class|lesson|period|timetable|homeroom|home\s*room|pastoral care|tutor)\b/i;
const DUE_RE = /\b(due\s*work|duework|due|assessment|assignment|task|quiz|exam|homework|submission)\b/i;
const BOOKING_RE = /\b(booking|resource)\b/i;

/**
 * Classify a Schoolbox calendar item. The ajax feed mixes timetable classes,
 * due work, resource bookings and school events; the type is only hinted at
 * through `className`, `data.meta.type|variant` and the presence of
 * `classAttendance` / `completed`. These heuristics are covered by tests.
 */
export function classify(ev: CalendarAjaxEvent): EventKind {
  const meta = ev.data?.meta ?? {};
  const hay = [ev.className, meta.type, meta.variant, meta.eventType, meta.level].filter(Boolean).join(' ');

  if (ev.data?.classAttendance && (ev.data.classAttendance.url || ev.data.classAttendance.target)) return 'class';
  if (/\b(timetable|class)\b/i.test(hay) && !DUE_RE.test(meta.type ?? '')) return 'class';
  if (typeof meta.completed === 'boolean' || /duework|due[-_ ]?work/i.test(hay) || DUE_RE.test(meta.type ?? '')) return 'dueWork';
  if (BOOKING_RE.test(hay)) return 'booking';
  if (CLASS_RE.test(meta.type ?? '')) return 'class';
  return 'event';
}

export function parseEventDate(value: string, allDay: boolean, endOfDay = false): Date {
  if (allDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return endOfDay ? new Date(y, m - 1, d, 23, 59, 59) : new Date(y, m - 1, d);
  }
  return parseISO(value);
}

export function toPortalEvent(ev: CalendarAjaxEvent): PortalEvent {
  const meta = ev.data?.meta ?? {};
  const kind = classify(ev);
  const start = parseEventDate(ev.start, ev.allDay);
  let end = parseEventDate(ev.end, ev.allDay, true);
  // FullCalendar all-day ends are exclusive (next day). Pull it back a tick.
  if (ev.allDay && /^\d{4}-\d{2}-\d{2}$/.test(ev.end) && end > start) end = new Date(end.getTime() - 24 * 3600 * 1000);
  return {
    id: String(meta.eventId ?? `${ev.title}-${ev.start}`),
    kind,
    title: decodeEntities(ev.title),
    start,
    end,
    allDay: ev.allDay,
    colour: ev.color || '#3d5c93',
    location: meta.location || undefined,
    detail: meta.detail || undefined,
    typeLabel: meta.type || undefined,
    author: meta.author || undefined,
    completed: meta.completed,
    path: ev.data?.links?.path || undefined,
    classAttendanceUrl: ev.data?.classAttendance?.url ?? null,
    attendanceStatus: ev.data?.attendance?.status?.current ?? null,
    className: ev.className,
    raw: ev,
  };
}

export function normaliseEvents(events: CalendarAjaxEvent[]): PortalEvent[] {
  return events.map(toPortalEvent).sort((a, b) => a.start.getTime() - b.start.getTime());
}

export const onDay = (events: PortalEvent[], day: Date) =>
  events.filter((e) => isSameDay(e.start, day) || (e.allDay && e.start <= day && e.end >= day));

export const classesOn = (events: PortalEvent[], day: Date) => onDay(events, day).filter((e) => e.kind === 'class' && !e.allDay);

/** Current and next class relative to `now`. */
export function nowAndNext(classes: PortalEvent[], now: Date) {
  const sorted = [...classes].sort((a, b) => a.start.getTime() - b.start.getTime());
  const current = sorted.find((c) => c.start <= now && c.end > now) ?? null;
  const next = sorted.find((c) => c.start > now) ?? null;
  const minutesToNext = next ? differenceInMinutes(next.start, now) : null;
  const minutesLeft = current ? differenceInMinutes(current.end, now) : null;
  return { current, next, minutesToNext, minutesLeft };
}

export type DueBucket = 'overdue' | 'today' | 'thisWeek' | 'later' | 'done';

export function bucketDueWork(items: PortalEvent[], now: Date): Record<DueBucket, PortalEvent[]> {
  const out: Record<DueBucket, PortalEvent[]> = { overdue: [], today: [], thisWeek: [], later: [], done: [] };
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const weekAhead = new Date(endOfToday.getTime() + 7 * 24 * 3600 * 1000);
  for (const it of items) {
    if (it.completed) out.done.push(it);
    else if (it.end < now && !isSameDay(it.end, now)) out.overdue.push(it);
    else if (isSameDay(it.end, now)) out.today.push(it);
    else if (it.end <= weekAhead) out.thisWeek.push(it);
    else out.later.push(it);
  }
  return out;
}

/** Strip HTML tags for use in previews. */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return decodeEntities(html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

export const isUnread = (n: NewsFeedItem) => !n.viewedAt;

export function newsImage(n: NewsFeedItem): string | undefined {
  return n.featureImage?._links?.image?.href;
}
