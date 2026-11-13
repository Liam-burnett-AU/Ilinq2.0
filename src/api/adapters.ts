import { differenceInMinutes, isSameDay, parseISO } from 'date-fns';
import type { CalendarAjaxEvent, NewsFeedItem, SbLink } from './types';

export type EventKind = 'class' | 'dueWork' | 'event' | 'booking' | 'termWeek';

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
  /** Event category label from Schoolbox ("College Event", "Sport", "Due Work", …). */
  typeLabel?: string;
  /** Author for events; the teacher for classes. */
  author?: string;
  completed?: boolean;
  /** Schoolbox-relative link to the item (class page, assessment, event). */
  path?: string;
  /** Timetable class code, e.g. 10-SCI10-B. */
  code?: string;
  /** Folder/class id (class page id) when known. */
  folderId?: number;
  /** Class or folder name for due work. */
  folderName?: string;
  /** "Assessment Task" / "Class Work" … */
  workType?: string;
  attendanceStatus?: 1 | 2 | 3 | null;
  className: string;
  raw: CalendarAjaxEvent;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const GROUP_RE = /\bgroup(\d+)\b/;
const CLASS_TITLE_RE = /^(.*?)\s*\(([^()]+)\)\s*(?:,\s*(.+))?$/s;

export const hrefOf = (l: SbLink | null | undefined): string | undefined => (typeof l === 'string' ? l || undefined : l?.href || undefined);

/**
 * Classify a Schoolbox calendar item, using the field set observed on
 * ilinq.sheldoncollege.com (Schoolbox 26.1):
 *
 *   class    data.classAttendance / data.timetable present, className "source7 …"
 *   dueWork  meta.type "Due Work" / meta.assessmentType, className "source2 type4 personal"
 *   termWeek meta.type "Term Weeks" (all-day banner rows such as "WEEK 6 - TERM 4")
 *   booking  resource bookings
 *   event    everything else (College Event, Reminders, Sport, Technology, …)
 *
 * Note: every item carries `meta.completed`, so that flag must NOT be used
 * to detect due work.
 */
export function classify(ev: CalendarAjaxEvent): EventKind {
  const d = ev.data ?? {};
  const meta = d.meta ?? {};
  const type = (meta.type ?? '').trim();
  if ('classAttendance' in d || d.timetable?.code || /^source7\b/.test(ev.className)) return 'class';
  if (/^due\s*work$/i.test(type) || meta.assessmentType || /\bsource2\b.*\bpersonal\b/.test(ev.className) || /\bduework\b/i.test(ev.className)) return 'dueWork';
  if (/^term\s*weeks?$/i.test(type)) return 'termWeek';
  if (/\b(resource|booking)\b/i.test(type) || /\bbooking\b/i.test(ev.className)) return 'booking';
  return 'event';
}

export function parseEventDate(value: string, allDay: boolean, endOfDay = false): Date {
  if (DATE_ONLY.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return endOfDay ? new Date(y, m - 1, d, 23, 59, 59) : new Date(y, m - 1, d);
  }
  const parsed = parseISO(value);
  if (isNaN(parsed.getTime())) return new Date(NaN);
  void allDay;
  return parsed;
}

/** Collapse the padded "Subject                 (CODE), ROOM" class titles. */
export function parseClassTitle(title: string): { subject: string; code?: string; room?: string } {
  const clean = title.replace(/\s+/g, ' ').trim();
  const m = clean.match(CLASS_TITLE_RE);
  if (!m) return { subject: clean };
  return { subject: m[1].trim(), code: m[2].trim(), room: m[3]?.trim() };
}

export function toPortalEvent(ev: CalendarAjaxEvent): PortalEvent {
  const d = ev.data ?? {};
  const meta = d.meta ?? {};
  const kind = classify(ev);
  const start = parseEventDate(ev.start, ev.allDay);
  let end: Date;
  if (!ev.end) {
    // Due work: no end supplied. Due at end of the day when all-day, else at the start time.
    end = ev.allDay || DATE_ONLY.test(ev.start) ? parseEventDate(ev.start, true, true) : start;
  } else {
    end = parseEventDate(ev.end, ev.allDay, true);
    // FullCalendar all-day ends are exclusive (next day). Pull it back a tick.
    if (DATE_ONLY.test(ev.end) && end > start) end = new Date(end.getTime() - 24 * 3600 * 1000);
  }
  if (isNaN(end.getTime())) end = start;

  const groupId = Number(ev.className.match(GROUP_RE)?.[1]) || undefined;
  const linksObj = d.links && !Array.isArray(d.links) ? d.links : undefined;

  let title = decodeEntities(ev.title);
  let location = meta.location || undefined;
  let detail = meta.detail || undefined;
  let path: string | undefined = linksObj?.path || undefined;
  let code: string | undefined;
  let folderId = groupId;
  let folderName: string | undefined;
  let author = meta.author || undefined;

  if (kind === 'class') {
    const parsed = parseClassTitle(title);
    title = parsed.subject;
    code = d.timetable?.code || parsed.code;
    location = location || parsed.room;
    detail = undefined;
    path = path || (groupId ? `/homepage/${groupId}` : undefined);
  } else if (kind === 'dueWork') {
    folderName = meta.folderName || title.split('\n')[0]?.trim() || undefined;
    folderId = meta.folderId ?? groupId;
    title = meta.title || title.split('\n').slice(1).join(' ').trim() || title;
    const more = d.custom?.moreDetailsLink;
    path = (typeof more === 'string' && more) || (meta.eventId ? `/learning/assessments/${meta.eventId}` : undefined);
    location = undefined;
    author = undefined;
  } else if (kind === 'event' || kind === 'booking') {
    if (!path && typeof meta.eventId === 'number') path = `/calendar/event/${meta.eventId}`;
  }

  const attendance = d.attendance && typeof d.attendance === 'object' && typeof d.attendance.status === 'object' ? d.attendance.status?.current ?? null : null;

  return {
    id: String(meta.eventId ?? `${ev.title}-${ev.start}`),
    kind,
    title,
    start,
    end,
    allDay: ev.allDay || (DATE_ONLY.test(ev.start) && !ev.end),
    colour: ev.color || '#3d5c93',
    location,
    detail,
    typeLabel: meta.type || undefined,
    author,
    completed: kind === 'dueWork' ? !!meta.completed : undefined,
    path,
    code,
    folderId,
    folderName,
    workType: meta.workType || undefined,
    attendanceStatus: attendance,
    className: ev.className,
    raw: ev,
  };
}

export function normaliseEvents(events: CalendarAjaxEvent[]): PortalEvent[] {
  return events
    .map(toPortalEvent)
    .filter((e) => !isNaN(e.start.getTime()))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

export const onDay = (events: PortalEvent[], day: Date) =>
  events.filter((e) => isSameDay(e.start, day) || (e.allDay && e.start <= day && e.end >= day));

export const classesOn = (events: PortalEvent[], day: Date) => onDay(events, day).filter((e) => e.kind === 'class' && !e.allDay);

/** "Week 6 · Term 4" style label for a day, from Schoolbox "Term Weeks" banners. */
export function termWeekFor(events: PortalEvent[], day: Date): string | undefined {
  const t = events.find((e) => e.kind === 'termWeek' && e.start <= day && e.end >= day);
  if (!t) return undefined;
  const m = t.title.match(/week\s*(\d+)\s*-\s*term\s*(\d+)/i);
  return m ? `Week ${m[1]} · Term ${m[2]}` : t.title;
}

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

/** Distinct timetable classes seen in a set of events (for the Classes page). */
export interface ClassSummary {
  code: string;
  subject: string;
  teacher?: string;
  rooms: string[];
  folderId?: number;
  path?: string;
  colour: string;
  count: number;
}

export function summariseClasses(events: PortalEvent[]): ClassSummary[] {
  const map = new Map<string, ClassSummary>();
  for (const e of events) {
    if (e.kind !== 'class') continue;
    const key = e.code || e.title;
    const cur = map.get(key);
    if (cur) {
      cur.count++;
      if (e.location && !cur.rooms.includes(e.location)) cur.rooms.push(e.location);
      cur.teacher ||= e.author;
    } else {
      map.set(key, { code: e.code || '', subject: e.title, teacher: e.author, rooms: e.location ? [e.location] : [], folderId: e.folderId, path: e.path, colour: e.colour, count: 1 });
    }
  }
  return [...map.values()].sort((a, b) => a.subject.localeCompare(b.subject));
}

/** Apply an alpha to "#rrggbb" or "rgba(r, g, b, a)" colours for tinted backgrounds. */
export function withAlpha(colour: string, alpha: number): string {
  const hex = colour.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }
  const rgba = colour.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgba) return `rgba(${rgba[1]}, ${rgba[2]}, ${rgba[3]}, ${alpha})`;
  return colour;
}

/** Schoolbox class colours are pastels made for white backgrounds; darken for dark UI accents. */
export function readableAccent(colour: string): string {
  const hex = colour.match(/^#([0-9a-f]{6})$/i);
  const rgba = colour.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  let r: number, g: number, b: number;
  if (hex) {
    const n = parseInt(hex[1], 16);
    [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  } else if (rgba) [r, g, b] = [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])];
  else return colour;
  // Boost saturation of very light pastels so each subject keeps a distinct hue.
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max > 200 && max - min < 60) {
    const k = 2.6;
    const mid = (max + min) / 2;
    const adj = (c: number) => Math.round(Math.min(255, Math.max(0, mid + (c - mid) * k)) * 0.78);
    return `rgb(${adj(r)}, ${adj(g)}, ${adj(b)})`;
  }
  return colour;
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
  return hrefOf(n.featureImage?._links?.image) || hrefOf(n.featureImage?._links?.fetch);
}
