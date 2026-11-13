import { addDays, formatISO, set, startOfWeek } from 'date-fns';
import type { CalendarAjaxEvent, EvidenceFeedItem, NewsArticleResponse, NewsFeedItem, NewsTopic, SearchResult, User } from '../types';

// Demo data in the exact shapes the Schoolbox API returns, generated relative
// to "now" so the dashboard always looks alive. Names are fictional.

export const DEMO_STUDENT: User = {
  id: 4690,
  externalId: '4690',
  username: 'sreed',
  firstName: 'Sam',
  lastName: 'Reed',
  preferredName: null,
  fullName: 'Sam Reed',
  email: 'sreed@student.sheldoncollege.com',
  role: { id: 17, name: 'Year 10 Student', type: 'student' },
  campus: [{ id: 1, name: 'Senior College', code: '01-59', days: 5 }],
  yearLevel: { id: 12, name: '10' },
  schoolHouse: { id: 1, name: 'Integra' },
  flags: { enableTimetable: true, showNotificationsPanel: true, calendarView: 'agendaWeek' },
  guardians: [
    {
      id: 25,
      externalId: '25001',
      title: 'Ms',
      firstname: 'Janna',
      lastname: 'Reed',
      givenName: 'Janna',
      fullName: 'Janna Reed',
      role: { id: 3, name: 'Parent', type: 'parent', parent: true, student: false, staff: false, guest: false },
    },
  ],
  groups: [
    { id: 10860, name: 'Integra', type: 'private', isForceFollow: false, isFavourite: true, isNotificationsOn: true, enrolmentStatus: 'enroled', membership: 'read', _links: { homepage: '/homepage/10860' } },
    { id: 22819, name: 'Year 10 Student Information 2026', type: 'private', isForceFollow: true, isFavourite: true, isNotificationsOn: true, enrolmentStatus: 'enroled', membership: 'read', _links: { homepage: '/homepage/22819' } },
    { id: 23574, name: 'Advanced Robotics', type: 'private', isForceFollow: false, isFavourite: true, isNotificationsOn: true, enrolmentStatus: 'enroled', membership: 'read', _links: { homepage: '/homepage/23574' } },
    { id: 25573, name: 'Strength & Conditioning Program', type: 'moderated', isForceFollow: true, isFavourite: true, isNotificationsOn: true, enrolmentStatus: 'enroled', membership: 'read', _links: { homepage: '/homepage/25573' } },
    { id: 14304, name: 'Junior Learning Centre (JLC)', type: 'free', isForceFollow: false, isFavourite: false, isNotificationsOn: false, enrolmentStatus: 'enroled', membership: 'read', _links: { homepage: '/homepage/14304' } },
  ],
  _links: { profile: '/search/user/4690', avatar: null },
};

export const DEMO_PARENT: User = {
  id: 25,
  externalId: '25001',
  username: 'jreed',
  title: 'Ms',
  firstName: 'Janna',
  lastName: 'Reed',
  fullName: 'Ms Janna Reed',
  email: 'janna.reed@example.com',
  role: { id: 3, name: 'Parent', type: 'parent' },
  campus: [{ id: 1, name: 'Secondary', code: 'SEC', days: 10 }],
  students: [
    {
      id: 4690,
      externalId: '4690',
      firstname: 'Sam',
      lastname: 'Reed',
      givenName: 'Sam',
      fullName: 'Sam Reed',
      role: { id: 13, name: 'Secondary Student', type: 'student', student: true, parent: false, staff: false, guest: false },
    },
  ],
  groups: [{ id: 950, name: 'Parents & Friends', type: 'free', membership: 'read', enrolmentStatus: 'enroled', _links: { homepage: '/homepage/950' } }],
  flags: { enableTimetable: false, calendarView: 'month' },
};

interface Subject {
  code: string;
  name: string;
  room: string;
  teacher: string;
  colour: string;
  folderId: number;
}

// Real Schoolbox class codes look like 10-SCI10-B; colours are the pastels Schoolbox assigns.
const SUBJECTS: Subject[] = [
  { code: '10-ENG10-C', name: 'English', room: 'SA3', teacher: 'Ms R White', colour: '#dfe9ff', folderId: 38233 },
  { code: '10-PMM10-C', name: 'Pre-Mathematical Methods', room: 'AS5', teacher: 'Mr D Chen', colour: '#f9ffe1', folderId: 38256 },
  { code: '10-SCI10-B', name: 'Science', room: 'SI7', teacher: 'Dr A Nair', colour: '#e8d9ff', folderId: 38259 },
  { code: '10-DES10-B', name: 'Design and Technologies', room: 'LA2', teacher: 'Mr K Osei', colour: '#ffe9db', folderId: 38227 },
  { code: '10-HUM10-A', name: 'Humanities', room: 'SB3', teacher: 'Mrs L Byrne', colour: '#ffdff9', folderId: 38241 },
  { code: '10-HPE10-A', name: 'Health & Physical Education', room: 'SE1', teacher: 'Mr T Hale', colour: '#fdddea', folderId: 38236 },
  { code: '10-DIG10-A', name: 'Digital Technologies', room: 'AS1', teacher: 'Ms P Kaur', colour: '#dfffdf', folderId: 38228 },
];

// Senior College bell times (demo approximation of the real timetable).
const PERIODS = [
  { label: 'Home Group', start: [8, 21], end: [8, 30] },
  { label: 'P1', start: [8, 31], end: [9, 40] },
  { label: 'P2', start: [9, 41], end: [10, 50] },
  { label: 'P3', start: [11, 21], end: [12, 30] },
  { label: 'P4', start: [13, 11], end: [14, 20] },
  { label: 'P5', start: [14, 21], end: [15, 30] },
] as const;

// subject index per weekday per period (P1..P5)
const GRID: number[][] = [
  [0, 1, 2, 3, 4],
  [1, 6, 0, 5, 2],
  [3, 3, 1, 4, 0],
  [2, 5, 6, 0, 1],
  [4, 0, 3, 2, 6],
];

const iso = (d: Date) => formatISO(d);
const at = (day: Date, [h, m]: readonly [number, number] | number[]) => set(day, { hours: h, minutes: m, seconds: 0, milliseconds: 0 });
const dateOnly = (d: Date) => formatISO(d, { representation: 'date' });

function fmt(d: Date) {
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ap = h >= 12 ? 'pm' : 'am';
  return `${((h + 11) % 12) + 1}:${m}${ap}`;
}

/** Timetable class event, exactly as Schoolbox 26.1 returns it (padded title, timetable.code, classAttendance). */
function classEvent(day: Date, p: (typeof PERIODS)[number], s: Subject, eventId: string): CalendarAjaxEvent {
  const start = at(day, p.start);
  const end = at(day, p.end);
  return {
    resourceId: null,
    title: `${s.name.padEnd(30)} (${s.code}), ${s.room}`,
    start: iso(start),
    end: iso(end),
    editable: false,
    allDay: false,
    color: s.colour,
    className: `source7 type1 group${s.folderId}`,
    data: {
      meta: {
        eventId,
        time: `${fmt(start)}&ndash;${fmt(end)}`,
        detail: '',
        location: s.room,
        eventTypeId: 1,
        eventType: 'type1',
        variant: 'event',
        type: '',
        author: s.teacher,
        authorId: 10135,
        level: `source7 type1 group${s.folderId}`,
        completed: false,
      },
      links: { category: { id: -1, name: '' } },
      styles: { visible: '' },
      timetable: { code: s.code },
      classAttendance: { url: null, target: null },
    },
  };
}

function homeroom(day: Date, eventId: string): CalendarAjaxEvent {
  const p = PERIODS[0];
  const start = at(day, p.start);
  const end = at(day, p.end);
  return {
    resourceId: null,
    title: `${'Home Group'.padEnd(30)} (10-HMG10-A), LD4`,
    start: iso(start),
    end: iso(end),
    editable: false,
    allDay: false,
    color: '#ffe9db',
    className: 'source7 type1 campus1',
    data: {
      meta: { eventId, time: `${fmt(start)}&ndash;${fmt(end)}`, detail: '', location: 'LD4', eventTypeId: 1, eventType: 'type1', variant: 'event', type: '', author: 'Mr S Trafford', authorId: 1, level: 'source7 type1 campus1', completed: false },
      links: { category: { id: -1, name: '' } },
      styles: { visible: '' },
      timetable: { code: '10-HMG10-A' },
      classAttendance: { url: null, target: null },
    },
  };
}

/** Due work event as Schoolbox returns it: all-day date, empty end, links as an array, custom.moreDetailsLink. */
function dueWork(day: Date, title: string, s: Subject, id: number, completed = false, workType = 'Assessment Task', timed?: [number, number]): CalendarAjaxEvent {
  const start = timed ? iso(at(day, timed)) : dateOnly(day);
  return {
    title: `${s.name} (${s.code})\n${title}`,
    start,
    end: '',
    editable: false,
    allDay: !timed,
    color: completed ? 'rgba(255, 255, 255, 1.000)' : 'rgba(215, 100, 100, 1.000)',
    className: 'source2 type4 personal',
    resourceId: id,
    data: {
      meta: {
        eventId: id,
        time: '',
        title,
        detail: '',
        location: '',
        eventType: 'type4',
        variant: 'event',
        type: 'Due Work',
        author: '',
        authorId: -1,
        level: 'source2 type4 personal',
        completed,
        folderName: `${s.name} (${s.code})`,
        folderId: s.folderId,
        workType,
        workTypeId: workType === 'Class Work' ? 7 : 1,
        weighted: 0,
        assessmentType: 'dueWork',
        colour: 'rgba(215, 100, 100, 1.000)',
        editable: false,
      },
      links: [],
      styles: { visible: true },
      attendance: { hasAttendance: false },
      custom: { modifyLink: false, moreDetailsLink: `/learning/assessments/${id}/4690` },
    },
  };
}

function schoolEvent(start: Date, end: Date, title: string, id: number, type: string, extra: Partial<NonNullable<CalendarAjaxEvent['data']['meta']>> = {}, allDay = false, colour = '#a3bddb'): CalendarAjaxEvent {
  return {
    resourceId: null,
    title,
    start: allDay ? dateOnly(start) : iso(start),
    end: allDay ? dateOnly(addDays(end, 1)) : iso(end),
    editable: false,
    allDay,
    color: colour,
    className: 'source1 type1 group10794 group22819',
    data: {
      meta: { editable: false, eventId: id, time: '', detail: '', location: '', eventTypeId: 1, eventType: 'type1', variant: 'event', type, author: 'Sheldon College', authorId: 1484, level: 'source1 type1 group10794', completed: false, seriesId: null, ...extra },
      links: { category: { id: -1, name: '' }, path: '' },
      styles: { visible: '' },
      attendance: { hasAttendance: false, status: { current: null } },
    },
  };
}

/** "WEEK 6 - TERM 4" banner rows that Schoolbox puts in the calendar. */
function termWeek(monday: Date, week: number, term: number, id: number): CalendarAjaxEvent {
  return schoolEvent(monday, addDays(monday, 4), `WEEK ${week} - TERM ${term}`, id, 'Term Weeks', {}, true, '#eaffec');
}

/** Build a calendar feed for [start, end). */
export function buildCalendar(start: Date, end: Date): CalendarAjaxEvent[] {
  const out: CalendarAjaxEvent[] = [];
  let n = 0;
  for (let d = new Date(start); d < end; d = addDays(d, 1)) {
    const dow = d.getDay(); // 0 Sun
    if (dow >= 1 && dow <= 5) {
      out.push(homeroom(d, `hmg-${dateOnly(d)}`));
      GRID[dow - 1].forEach((subjectIdx, i) => out.push(classEvent(d, PERIODS[i + 1], SUBJECTS[subjectIdx], `cls-${dateOnly(d)}-${n++}`)));
    }
  }
  const today = new Date();
  const monday = startOfWeek(today, { weekStartsOn: 1 });
  const dues: CalendarAjaxEvent[] = [
    dueWork(addDays(today, -3), 'Persuasive speech draft', SUBJECTS[0], 5001, true, 'Class Work'),
    dueWork(addDays(today, -1), 'Chapter 7 problem set', SUBJECTS[1], 5002, false, 'Class Work'),
    dueWork(today, 'Instrument 3.1 - Website Development (AI Agent)', SUBJECTS[6], 5003, false, 'Assessment Task', [15, 30]),
    dueWork(today, 'RQ & Method', SUBJECTS[2], 5004, false, 'Class Work'),
    dueWork(addDays(today, 2), 'Prac report: titration', SUBJECTS[2], 5005),
    dueWork(addDays(today, 4), 'Source analysis: Federation', SUBJECTS[4], 5006),
    dueWork(addDays(today, 9), 'Instrument 4.1 - Game On! Movement for Life', SUBJECTS[5], 5007),
    dueWork(addDays(today, 16), '4.1 Semester Examination', SUBJECTS[1], 5008),
  ];
  const events: CalendarAjaxEvent[] = [
    termWeek(addDays(monday, -7), 5, 4, 9001),
    termWeek(monday, 6, 4, 9002),
    termWeek(addDays(monday, 7), 7, 4, 9003),
    termWeek(addDays(monday, 14), 8, 4, 9004),
    schoolEvent(at(monday, [8, 30]), at(monday, [9, 40]), 'Assembly - World Teachers Week (Prep to Year 12)', 7001, 'College Event', { location: 'Stadium' }),
    schoolEvent(at(addDays(monday, 1), [15, 30]), at(addDays(monday, 1), [17, 0]), 'Advanced Robotics (FTC build)', 7002, 'Technology', { location: 'Innovation Hub' }, false, '#e0e1ff'),
    schoolEvent(at(addDays(monday, 3), [15, 30]), at(addDays(monday, 3), [17, 0]), 'Advanced Robotics (FTC build)', 7003, 'Technology', { location: 'Innovation Hub' }, false, '#e0e1ff'),
    schoolEvent(addDays(monday, 4), addDays(monday, 4), 'Free Dress Day: Integra House fundraiser', 7004, 'College Event', {}, true),
    schoolEvent(at(addDays(monday, 4), [8, 30]), at(addDays(monday, 4), [9, 40]), 'NO ASSEMBLY (MONDAY PERIOD 4)', 7005, 'Reminders', {}, false, '#d4d1d1'),
    schoolEvent(at(addDays(monday, 8), [18, 0]), at(addDays(monday, 8), [20, 0]), 'Year 10 Subject Selection Evening', 7006, 'College Event', { location: 'Performing Arts Centre' }),
    schoolEvent(addDays(monday, 12), addDays(monday, 12), 'FTC Brisbane South Qualifier (Robotics)', 7007, 'Technology', { location: "St Peter's Lutheran College, Indooroopilly" }, true, '#e0e1ff'),
    schoolEvent(at(addDays(monday, 14), [8, 30]), at(addDays(monday, 14), [15, 0]), 'Year 10 Exam Block begins', 7008, 'Assessment/Exam', {}),
  ];
  const inRange = (e: CalendarAjaxEvent) => new Date(e.start) < end && new Date(e.end || e.start) >= start;
  return [...out, ...dues.filter(inRange), ...events.filter(inRange)];
}

export const DEMO_TOPICS: NewsTopic[] = [
  { id: 1, name: 'College News', slug: 'college-news', sequence: 1 },
  { id: 2, name: 'Secondary', slug: 'secondary', sequence: 2 },
  { id: 3, name: 'Co-curricular', slug: 'co-curricular', sequence: 3 },
  { id: 4, name: 'Robotics', slug: 'robotics', sequence: 4 },
  { id: 5, name: 'Parents', slug: 'parents', sequence: 5 },
];

const now = new Date();
const daysAgo = (n: number, h = 9) => iso(at(addDays(now, -n), [h, 0]));

export const DEMO_NEWS: NewsFeedItem[] = [
  {
    id: 3101,
    title: 'FTC team qualifies for the Queensland Championship',
    blurb: '<p>Congratulations to our FIRST Tech Challenge team who placed in the top alliance at the regional scrimmage and secured a spot at the state championship.</p>',
    featureImage: null,
    publishAt: daysAgo(0, 8),
    topics: [DEMO_TOPICS[3], DEMO_TOPICS[2]],
    status: 'Published',
    readMore: { available: true, string: 'Read more' },
    metadata: { commentCount: 4 },
    attachments: 1,
    viewedAt: null,
    _links: { self: { href: '/news/3101', auth: null } }, author: { fullname: 'Mrs L Green' },
  },
  {
    id: 3102,
    title: 'Year 10 subject selection: what you need to know',
    blurb: '<p>Subject selection for 2027 opens next week. Read the handbook, talk to your teachers and come along to the information evening.</p>',
    featureImage: null,
    publishAt: daysAgo(1, 15),
    topics: [DEMO_TOPICS[1], DEMO_TOPICS[4]],
    status: 'Published',
    readMore: { available: true, string: 'Read more' },
    metadata: { commentCount: 0 },
    attachments: 2,
    viewedAt: null,
    _links: { self: '/news/3102' },
  },
  {
    id: 3103,
    title: 'Library hours extended during exam block',
    blurb: '<p>The Resource Centre will be open until 5:30pm Monday to Thursday during the Year 10 and 11 exam block.</p>',
    featureImage: null,
    publishAt: daysAgo(2, 11),
    topics: [DEMO_TOPICS[1]],
    status: 'Published',
    readMore: { available: false },
    metadata: { commentCount: 0 },
    attachments: 0,
    viewedAt: daysAgo(2, 12),
    _links: { self: '/news/3103' },
  },
  {
    id: 3104,
    title: 'Integra House free dress day this Friday',
    blurb: '<p>Gold coin donation supporting the Redlands Foodbank. Wear your house colours!</p>',
    featureImage: null,
    publishAt: daysAgo(3, 9),
    topics: [DEMO_TOPICS[0]],
    status: 'Published',
    readMore: { available: false },
    metadata: { commentCount: 2 },
    attachments: 0,
    viewedAt: daysAgo(3, 10),
    _links: { self: '/news/3104' },
  },
  {
    id: 3105,
    title: 'Car park changes from Monday',
    blurb: '<p>The Taylor Road drop-off loop will be one-way during construction of the new STEM wing. Please allow extra time.</p>',
    featureImage: null,
    publishAt: daysAgo(5, 16),
    topics: [DEMO_TOPICS[0], DEMO_TOPICS[4]],
    status: 'Published',
    readMore: { available: true, string: 'Read more' },
    metadata: { commentCount: 1 },
    attachments: 1,
    viewedAt: daysAgo(4, 8),
    _links: { self: '/news/3105' },
  },
];

const LOREM =
  'Students should read the attached handbook before the information evening. Heads of Faculty will be available on the night to discuss prerequisites, workload and pathways into senior subjects, including the new Engineering and Digital Solutions offerings.';

export const DEMO_ARTICLES: Record<number, NewsArticleResponse> = Object.fromEntries(
  DEMO_NEWS.map((n) => [
    n.id,
    {
      isSavedForLater: false,
      article: {
        ...n,
        author: { id: 2, firstname: 'Rebecca', lastname: 'White', title: 'Ms', fullname: 'Ms Rebecca White' },
        sticky: n.id === 3101,
        attachedFiles:
          n.attachments && n.attachments > 0
            ? [{ name: n.id === 3102 ? 'Senior-Subject-Handbook-2027.pdf' : 'Information.pdf', mime: 'application/pdf', type: 'document', size: 482_000, _links: { download: '/send.php?id=1&save=1' } }]
            : [],
        body: `${n.blurb}<p>${LOREM}</p><h3>Key dates</h3><ul><li>Information evening: next Wednesday, 6pm, Performing Arts Centre</li><li>Selections close: end of Week 8</li></ul><p>Questions? Contact the Secondary Office via the front desk.</p>`,
      },
    },
  ]),
);

export const DEMO_EVIDENCE: EvidenceFeedItem[] = [
  {
    discriminator: 'dueWorkFeedback',
    date: daysAgo(1, 14),
    object: {
      id: 1,
      mark: 'A-',
      normalisedMark: 88,
      comment: '<p>Strong structure and a confident voice. Tighten the evidence in paragraph two and this is an A.</p>',
      instructor: { firstName: 'Rebecca', lastName: 'White', fullName: 'Ms Rebecca White' },
      assessment: { id: 5001, title: 'Persuasive speech draft', folderName: 'English', folderId: 38233, workType: 'Class Work', dueAt: daysAgo(3, 23) },
      _links: { summary: '/learning/assessments/5001/4690' },
    },
  },
  {
    discriminator: 'badge',
    date: daysAgo(4, 10),
    object: { id: 2, name: 'Design Thinking: Prototype', title: 'Design Thinking: Prototype', creator: { firstName: 'Kwame', lastName: 'Osei' } },
  },
  {
    discriminator: 'evidence',
    date: daysAgo(6, 12),
    object: {
      id: 3,
      body: 'Sam led the drivetrain redesign after the first scrimmage, documenting each iteration in the engineering notebook. Great collaboration with the build team.',
      creator: { firstName: 'Kwame', lastName: 'Osei' },
      tags: [{ name: 'Collaboration' }, { name: 'Engineering' }],
    },
  },
  {
    discriminator: 'dueWorkFeedback',
    date: daysAgo(9, 16),
    object: {
      id: 4,
      mark: '',
      normalisedMark: 78,
      comment: '<p>Good working shown throughout. Revise factorising quadratics with non-unit coefficients.</p>',
      instructor: { firstName: 'David', lastName: 'Chen', fullName: 'Mr David Chen' },
      assessment: { id: 4990, title: 'Algebra test', folderName: 'Pre-Mathematical Methods', folderId: 38256, workType: 'Assessment Task' },
      _links: { summary: '/learning/assessments/4990/4690' },
    },
  },
];

export const DEMO_SEARCH: SearchResult[] = [
  ...DEMO_NEWS.map<SearchResult>((n) => ({ id: n.id, type: 'news', date: n.publishAt, url: `/news/${n.id}`, title: n.title, meta: n.topics?.[0]?.name, description: n.blurb.replace(/<[^>]+>/g, ''), icon: 'news' })),
  ...SUBJECTS.map<SearchResult>((s) => ({ id: s.folderId, type: 'page.class', url: `/homepage/${s.folderId}`, title: `${s.name} (${s.code})`, meta: s.teacher, icon: 'home', context: [{ id: 2, name: 'Classes' }, { id: 3, name: 'Year 10' }] })),
  { id: 901, type: 'page.other', url: '/homepage/901', title: 'FTC Robotics Club', meta: 'Co-curricular', icon: 'home' },
  { id: 61, type: 'file.document', url: '/send.php?id=61&save=1', title: 'Senior Subject Handbook 2027.pdf', meta: 'Secondary', icon: 'document' },
  { id: 62, type: 'file.document', url: '/send.php?id=62&save=1', title: 'Secondary Bell Times.pdf', meta: 'Key Information', icon: 'document' },
  { id: 63, type: 'link', url: 'https://sheldoncollege.com', title: 'Sheldon College website', icon: 'link' },
  { id: 2, type: 'user.staff', url: '/search/user/2', title: 'Ms Rebecca White', meta: 'Head of English', icon: 'user' },
  { id: 7, type: 'user.staff', url: '/search/user/7', title: 'Mr Kwame Osei', meta: 'Design & Robotics', icon: 'user' },
];

/** Items inside a class page, as /api/search/folder/{id} returns them. */
export const DEMO_FOLDER_ITEMS = (folderId: number): SearchResult[] => {
  const s = SUBJECTS.find((x) => x.folderId === folderId);
  const name = s?.name ?? 'Group';
  return [
    { id: folderId * 10 + 1, type: 'page.unit', url: `/homepage/${folderId}/unit-1`, title: `${name}: Term 4 Unit Outline`, meta: 'Unit', icon: 'home' },
    { id: folderId * 10 + 2, type: 'file.document', url: `/send.php?id=${folderId * 10 + 2}&save=1`, title: `${name} - Assessment 4.1 Task Sheet.pdf`, meta: 'Assessment', icon: 'document', date: daysAgo(12) },
    { id: folderId * 10 + 3, type: 'file.document', url: `/send.php?id=${folderId * 10 + 3}&save=1`, title: 'Week 6 Lesson Slides.pptx', meta: 'Resources', icon: 'document', date: daysAgo(2) },
    { id: folderId * 10 + 4, type: 'assessment.dueWork', url: `/learning/assessments/${folderId * 10 + 4}`, title: 'Checkpoint 2', meta: 'Class Work', icon: 'due-work', date: daysAgo(-5) },
    { id: folderId * 10 + 5, type: 'link', url: 'https://www.qcaa.qld.edu.au', title: 'QCAA syllabus', meta: 'Links', icon: 'link' },
    { id: folderId * 10 + 6, type: 'forum', url: `/homepage/${folderId}/discussion`, title: 'Class discussion', meta: 'Discussion', icon: 'forum' },
    { id: folderId * 10 + 7, type: 'file.video', url: `/send.php?id=${folderId * 10 + 7}`, title: 'Revision walkthrough.mp4', meta: 'Resources', icon: 'video', date: daysAgo(6) },
  ];
};
