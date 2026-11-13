import { describe, expect, it } from 'vitest';
import { bucketDueWork, classify, normaliseEvents, nowAndNext, stripHtml, toPortalEvent } from '../api/adapters';
import type { CalendarAjaxEvent } from '../api/types';

const base = (over: Partial<CalendarAjaxEvent> & { data?: CalendarAjaxEvent['data'] }): CalendarAjaxEvent => ({
  title: 'X',
  start: '2026-11-13T09:00:00+10:00',
  end: '2026-11-13T10:00:00+10:00',
  editable: false,
  allDay: false,
  color: '#123456',
  className: 'source1 type3 campus1',
  data: {},
  ...over,
});

describe('classify', () => {
  it('treats events with classAttendance as classes', () => {
    expect(classify(base({ data: { classAttendance: { url: '/attendance/1' } } }))).toBe('class');
  });
  it('detects timetable class names', () => {
    expect(classify(base({ className: 'source2 type1 timetable', data: { meta: { type: 'Class' } } }))).toBe('class');
  });
  it('detects due work via completed flag or variant', () => {
    expect(classify(base({ data: { meta: { completed: false, type: 'Due Work' } } }))).toBe('dueWork');
    expect(classify(base({ data: { meta: { variant: 'dueWork' } } }))).toBe('dueWork');
  });
  it('detects bookings', () => {
    expect(classify(base({ data: { meta: { type: 'Resource Booking' } } }))).toBe('booking');
  });
  it('falls back to event', () => {
    expect(classify(base({ data: { meta: { type: 'Meeting' } } }))).toBe('event');
  });
});

describe('toPortalEvent', () => {
  it('parses all-day events and makes the exclusive end inclusive', () => {
    const e = toPortalEvent(base({ allDay: true, start: '2026-11-13', end: '2026-11-15' }));
    expect(e.start.getDate()).toBe(13);
    expect(e.end.getDate()).toBe(14);
  });
  it('decodes HTML entities in titles', () => {
    expect(toPortalEvent(base({ title: 'Design &amp; Robotics' })).title).toBe('Design & Robotics');
  });
  it('sorts normalised events by start', () => {
    const out = normaliseEvents([base({ start: '2026-11-13T12:00:00+10:00', end: '2026-11-13T13:00:00+10:00' }), base({})]);
    expect(out[0].start < out[1].start).toBe(true);
  });
});

describe('nowAndNext', () => {
  const mk = (h1: number, h2: number) =>
    toPortalEvent(base({ start: `2026-11-13T${String(h1).padStart(2, '0')}:00:00+10:00`, end: `2026-11-13T${String(h2).padStart(2, '0')}:00:00+10:00`, data: { classAttendance: { url: 'x' } } }));
  it('finds the current and next class', () => {
    const now = new Date('2026-11-13T09:30:00+10:00');
    const r = nowAndNext([mk(9, 10), mk(10, 11), mk(8, 9)], now);
    expect(r.current?.start.getHours()).toBe(new Date('2026-11-13T09:00:00+10:00').getHours());
    expect(r.minutesLeft).toBe(30);
    expect(r.minutesToNext).toBe(30);
  });
});

describe('bucketDueWork', () => {
  it('splits by overdue/today/week/later/done', () => {
    const now = new Date('2026-11-13T12:00:00+10:00');
    const due = (iso: string, completed = false) => toPortalEvent(base({ start: iso, end: iso, data: { meta: { variant: 'dueWork', completed } } }));
    const b = bucketDueWork([due('2026-11-10T15:00:00+10:00'), due('2026-11-13T23:00:00+10:00'), due('2026-11-17T15:00:00+10:00'), due('2026-12-01T15:00:00+10:00'), due('2026-11-01T15:00:00+10:00', true)], now);
    expect(b.overdue).toHaveLength(1);
    expect(b.today).toHaveLength(1);
    expect(b.thisWeek).toHaveLength(1);
    expect(b.later).toHaveLength(1);
    expect(b.done).toHaveLength(1);
  });
});

describe('stripHtml', () => {
  it('removes tags and collapses whitespace', () => {
    expect(stripHtml('<p>Hello&nbsp;<b>world</b></p>\n<p>x</p>')).toBe('Hello world x');
  });
});
