import { describe, expect, it } from 'vitest';
import { bucketDueWork, classify, normaliseEvents, nowAndNext, parseClassTitle, readableAccent, stripHtml, summariseClasses, termWeekFor, toPortalEvent, withAlpha } from '../api/adapters';
import type { CalendarAjaxEvent } from '../api/types';

// Shapes copied from a real ilinq.sheldoncollege.com (Schoolbox 26.1) calendar feed, anonymised.
const CLASS: CalendarAjaxEvent = {
  resourceId: null,
  title: 'Science                        (10-SCI10-B), SI7',
  start: '2026-11-10T09:41:00+10:00',
  end: '2026-11-10T10:50:00+10:00',
  editable: false,
  allDay: false,
  color: '#e8d9ff',
  className: 'source7 type1 group38259',
  data: {
    meta: { eventId: '4dd4349499b0', time: '9:41am&ndash;10:50am', detail: '', location: 'SI7', eventTypeId: 1, eventType: 'type1', variant: 'event', type: '', author: 'Dr A Teacher', authorId: 1, level: 'source7 type1 group38259', completed: false },
    links: { category: { id: -1, name: '' } },
    styles: { visible: '' },
    timetable: { code: '10-SCI10-B' },
    classAttendance: { url: null, target: null },
  },
};

const HOMEROOM: CalendarAjaxEvent = { ...CLASS, title: 'Home Group                     (10-HMG10-A), LD4', className: 'source7 type1 campus1', data: { ...CLASS.data, timetable: { code: '10-HMG10-A' }, meta: { ...CLASS.data.meta, location: 'LD4' } } };

const DUE: CalendarAjaxEvent = {
  title: 'Science (10-SCI10-B)\nRQ & Method',
  start: '2026-11-13',
  end: '',
  editable: false,
  allDay: true,
  color: 'rgba(215, 100, 100, 1.000)',
  className: 'source2 type4 personal',
  resourceId: 374271,
  data: {
    meta: { eventId: 374271, time: '', title: 'RQ & Method', detail: '', location: '', eventType: 'type4', variant: 'event', type: 'Due Work', author: '', authorId: -1, level: 'source2 type4 personal', completed: false, folderName: 'Science (10-SCI10-B)', folderId: 38259, workType: 'Class Work', workTypeId: 7, weighted: 0, assessmentType: 'dueWork' },
    links: [],
    styles: { visible: true },
    custom: { modifyLink: false, moreDetailsLink: '/learning/assessments/374271/6792?returnUrl=x' },
  },
};

const EVENT: CalendarAjaxEvent = {
  resourceId: null,
  title: 'Assembly - World Teachers Week (Prep to Year 12)',
  start: '2026-11-06T08:30:00+10:00',
  end: '2026-11-06T09:40:00+10:00',
  editable: false,
  allDay: false,
  color: '#a3bddb',
  className: 'source1 type1 group10794 group22819',
  data: {
    meta: { editable: false, eventId: 119190, time: '8:30am&ndash;9:40am', detail: '<h5><strong>Assembly Stream</strong></h5>', location: 'Stadium', eventTypeId: 1, eventType: 'type1', variant: 'event', type: 'College Event', author: 'G Author', authorId: 1484, level: 'source1 type1', completed: false, seriesId: null },
    links: { category: { id: -1, name: '' }, path: '' },
    styles: { visible: '' },
    attendance: { hasAttendance: false, status: { current: null } },
  },
};

const TERM: CalendarAjaxEvent = { ...EVENT, title: 'WEEK 6 - TERM 4', start: '2026-11-09', end: '2026-11-10', allDay: true, className: 'source1 type13 group10794', data: { ...EVENT.data, meta: { ...EVENT.data.meta, eventId: 97975, type: 'Term Weeks', detail: '', location: '' } } };

describe('classify (real Schoolbox 26.1 shapes)', () => {
  it('classes via classAttendance / timetable / source7', () => {
    expect(classify(CLASS)).toBe('class');
    expect(classify(HOMEROOM)).toBe('class');
    expect(classify({ ...CLASS, data: { meta: {} } })).toBe('class'); // source7 alone
  });
  it('due work via meta.type, not the completed flag', () => {
    expect(classify(DUE)).toBe('dueWork');
    // every event carries completed:false; that alone must not make it due work
    expect(classify(EVENT)).toBe('event');
  });
  it('term week banners', () => {
    expect(classify(TERM)).toBe('termWeek');
  });
  it('other event types stay events', () => {
    for (const type of ['Reminders', 'Sport', 'Technology', 'Arts and Music', 'Assessment/Exam', 'Meeting', 'Excursion', 'Incursion']) {
      expect(classify({ ...EVENT, data: { ...EVENT.data, meta: { ...EVENT.data.meta, type } } })).toBe('event');
    }
  });
});

describe('toPortalEvent', () => {
  it('cleans class titles and links to the class page from the group id', () => {
    const e = toPortalEvent(CLASS);
    expect(e.title).toBe('Science');
    expect(e.code).toBe('10-SCI10-B');
    expect(e.location).toBe('SI7');
    expect(e.author).toBe('Dr A Teacher');
    expect(e.folderId).toBe(38259);
    expect(e.path).toBe('/homepage/38259');
  });
  it('handles due work with an empty end and array links', () => {
    const e = toPortalEvent(DUE);
    expect(e.title).toBe('RQ & Method');
    expect(e.folderName).toBe('Science (10-SCI10-B)');
    expect(e.workType).toBe('Class Work');
    expect(e.allDay).toBe(true);
    expect(e.start.getDate()).toBe(13);
    expect(e.end.getHours()).toBe(23);
    expect(e.path).toContain('/learning/assessments/374271');
    expect(e.completed).toBe(false);
  });
  it('gives events a calendar link when path is empty', () => {
    expect(toPortalEvent(EVENT).path).toBe('/calendar/event/119190');
  });
  it('makes exclusive all-day ends inclusive', () => {
    const e = toPortalEvent(TERM);
    expect(e.start.getDate()).toBe(9);
    expect(e.end.getDate()).toBe(9);
  });
  it('drops events with unparseable starts', () => {
    expect(normaliseEvents([{ ...EVENT, start: 'garbage' }])).toHaveLength(0);
  });
});

describe('parseClassTitle', () => {
  it('parses padded titles', () => {
    expect(parseClassTitle('Health & Physical Education    (10-HPE10-A), UC1')).toEqual({ subject: 'Health & Physical Education', code: '10-HPE10-A', room: 'UC1' });
    expect(parseClassTitle('Plain')).toEqual({ subject: 'Plain' });
  });
});

describe('termWeekFor / summariseClasses', () => {
  it('labels the week', () => {
    const evs = normaliseEvents([TERM, CLASS]);
    expect(termWeekFor(evs, new Date(2026, 10, 9, 12))).toBe('Week 6 · Term 4');
    expect(termWeekFor(evs, new Date(2026, 10, 20))).toBeUndefined();
  });
  it('summarises distinct classes', () => {
    const evs = normaliseEvents([CLASS, { ...CLASS, start: '2026-11-11T09:41:00+10:00', end: '2026-11-11T10:50:00+10:00', data: { ...CLASS.data, meta: { ...CLASS.data.meta, location: 'SI8' } } }, HOMEROOM]);
    const s = summariseClasses(evs);
    expect(s).toHaveLength(2);
    const sci = s.find((c) => c.code === '10-SCI10-B')!;
    expect(sci.count).toBe(2);
    expect(sci.rooms).toEqual(['SI7', 'SI8']);
    expect(sci.path).toBe('/homepage/38259');
  });
});

describe('nowAndNext', () => {
  const mk = (h1: number, h2: number) => toPortalEvent({ ...CLASS, start: `2026-11-13T${String(h1).padStart(2, '0')}:00:00+10:00`, end: `2026-11-13T${String(h2).padStart(2, '0')}:00:00+10:00` });
  it('finds the current and next class', () => {
    const now = new Date('2026-11-13T09:30:00+10:00');
    const r = nowAndNext([mk(9, 10), mk(10, 11), mk(8, 9)], now);
    expect(r.current?.start.getTime()).toBe(new Date('2026-11-13T09:00:00+10:00').getTime());
    expect(r.minutesLeft).toBe(30);
    expect(r.minutesToNext).toBe(30);
  });
});

describe('bucketDueWork', () => {
  it('splits by overdue/today/week/later/done using end-of-day due times', () => {
    const now = new Date(2026, 10, 13, 12);
    const due = (date: string, completed = false) => toPortalEvent({ ...DUE, start: date, data: { ...DUE.data, meta: { ...DUE.data.meta, completed } } });
    const b = bucketDueWork([due('2026-11-10'), due('2026-11-13'), due('2026-11-17'), due('2026-12-01'), due('2026-11-01', true)], now);
    expect(b.overdue).toHaveLength(1);
    expect(b.today).toHaveLength(1);
    expect(b.thisWeek).toHaveLength(1);
    expect(b.later).toHaveLength(1);
    expect(b.done).toHaveLength(1);
  });
});

describe('colours', () => {
  it('applies alpha to hex and rgba', () => {
    expect(withAlpha('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
    expect(withAlpha('rgba(215, 100, 100, 1.000)', 0.2)).toBe('rgba(215, 100, 100, 0.2)');
  });
  it('darkens pastel class colours but leaves saturated ones alone', () => {
    expect(readableAccent('#e8d9ff')).not.toBe('#e8d9ff');
    expect(readableAccent('#2a5fa3')).toBe('#2a5fa3');
  });
});

describe('stripHtml', () => {
  it('removes tags and collapses whitespace', () => {
    expect(stripHtml('<p>Hello&nbsp;<b>world</b></p>\n<p>x</p>')).toBe('Hello world x');
  });
});
