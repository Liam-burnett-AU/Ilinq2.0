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
  role: { id: 13, name: 'Secondary Student', type: 'student' },
  campus: [{ id: 1, name: 'Secondary', code: 'SEC', days: 10 }],
  yearLevel: { id: 11, name: 'Year 10' },
  schoolHouse: { id: 2, name: 'Fraser' },
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
    { id: 801, name: '10 English A (10ENGA)', membership: 'read', enrolmentStatus: 'enroled', isFavourite: true, _links: { homepage: '/homepage/801' } },
    { id: 802, name: '10 Mathematics (10MATB)', membership: 'read', enrolmentStatus: 'enroled', _links: { homepage: '/homepage/802' } },
    { id: 803, name: '10 Science (10SCIC)', membership: 'read', enrolmentStatus: 'enroled', _links: { homepage: '/homepage/803' } },
    { id: 804, name: '10 Design & Robotics (10DRT)', membership: 'read', enrolmentStatus: 'enroled', isFavourite: true, _links: { homepage: '/homepage/804' } },
    { id: 805, name: '10 Humanities (10HUM)', membership: 'read', enrolmentStatus: 'enroled', _links: { homepage: '/homepage/805' } },
    { id: 806, name: '10 Health & PE (10HPE)', membership: 'read', enrolmentStatus: 'enroled', _links: { homepage: '/homepage/806' } },
    { id: 807, name: 'Digital Solutions (10DIG)', membership: 'read', enrolmentStatus: 'enroled', _links: { homepage: '/homepage/807' } },
    { id: 901, name: 'FTC Robotics Club', type: 'free', membership: 'write', enrolmentStatus: 'enroled', isFavourite: true, _links: { homepage: '/homepage/901' } },
    { id: 902, name: 'Fraser House', type: 'private', membership: 'read', enrolmentStatus: 'enroled', isForceFollow: true, _links: { homepage: '/homepage/902' } },
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

const SUBJECTS: Subject[] = [
  { code: '10ENGA', name: 'English', room: 'B2.04', teacher: 'Ms R White', colour: '#2a5fa3', folderId: 801 },
  { code: '10MATB', name: 'Mathematics', room: 'C1.12', teacher: 'Mr D Chen', colour: '#0f7c6d', folderId: 802 },
  { code: '10SCIC', name: 'Science', room: 'Lab 3', teacher: 'Dr A Nair', colour: '#7a3fa3', folderId: 803 },
  { code: '10DRT', name: 'Design & Robotics', room: 'Innovation Hub', teacher: 'Mr K Osei', colour: '#b3541e', folderId: 804 },
  { code: '10HUM', name: 'Humanities', room: 'B1.07', teacher: 'Mrs L Byrne', colour: '#8a6d1f', folderId: 805 },
  { code: '10HPE', name: 'Health & PE', room: 'Sports Centre', teacher: 'Mr T Hale', colour: '#1f7a8c', folderId: 806 },
  { code: '10DIG', name: 'Digital Solutions', room: 'ICT 2', teacher: 'Ms P Kaur', colour: '#3d5c93', folderId: 807 },
];

// Period times (Mon-Fri). Sheldon's real bell times will differ; this is demo data.
const PERIODS = [
  { label: 'Homeroom', start: [8, 30], end: [8, 45] },
  { label: 'P1', start: [8, 45], end: [9, 45] },
  { label: 'P2', start: [9, 45], end: [10, 45] },
  { label: 'P3', start: [11, 10], end: [12, 10] },
  { label: 'P4', start: [12, 10], end: [13, 10] },
  { label: 'P5', start: [13, 50], end: [14, 50] },
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

function classEvent(day: Date, p: (typeof PERIODS)[number], s: Subject, eventId: number): CalendarAjaxEvent {
  const start = at(day, p.start);
  const end = at(day, p.end);
  return {
    title: `${s.name} (${s.code})`,
    start: iso(start),
    end: iso(end),
    editable: false,
    allDay: false,
    color: s.colour,
    className: 'source2 type1 campus1 timetable',
    data: {
      meta: {
        eventId,
        time: `${fmt(start)}&ndash;${fmt(end)}`,
        location: s.room,
        detail: `${p.label} · ${s.teacher}`,
        eventTypeId: 1,
        eventType: 'type1',
        variant: 'class',
        type: 'Class',
        author: s.teacher,
        level: 'source2 type1 campus1',
      },
      links: { category: { id: -1, name: '' }, path: `/homepage/${s.folderId}` },
      classAttendance: { url: `/attendance/class/${s.folderId}`, target: '_self' },
    },
  };
}

function homeroom(day: Date, eventId: number): CalendarAjaxEvent {
  const p = PERIODS[0];
  const start = at(day, p.start);
  const end = at(day, p.end);
  return {
    title: 'Homeroom (10FRA)',
    start: iso(start),
    end: iso(end),
    editable: false,
    allDay: false,
    color: '#575756',
    className: 'source2 type1 campus1 timetable',
    data: {
      meta: { eventId, time: `${fmt(start)}&ndash;${fmt(end)}`, location: 'B2.01', type: 'Class', variant: 'class', detail: 'Mrs L Byrne' },
      links: { path: '/homepage/902' },
      classAttendance: { url: '/attendance/class/902', target: '_self' },
    },
  };
}

function fmt(d: Date) {
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ap = h >= 12 ? 'pm' : 'am';
  return `${((h + 11) % 12) + 1}:${m}${ap}`;
}

function dueWork(day: Date, title: string, s: Subject, id: number, completed = false, hour = 15): CalendarAjaxEvent {
  const d = at(day, [hour, 0]);
  return {
    title,
    start: iso(d),
    end: iso(d),
    editable: false,
    allDay: false,
    color: '#fbd708',
    className: 'source3 type7 campus1 dueWork',
    data: {
      meta: {
        eventId: id,
        time: fmt(d),
        detail: `${s.name} · ${s.teacher}`,
        type: 'Due Work',
        variant: 'dueWork',
        completed,
        location: s.code,
      },
      links: { path: `/learning/assessments/${id}` },
    },
  };
}

function schoolEvent(start: Date, end: Date, title: string, id: number, extra: Partial<NonNullable<CalendarAjaxEvent['data']['meta']>> = {}, allDay = false): CalendarAjaxEvent {
  return {
    title,
    start: allDay ? formatISO(start, { representation: 'date' }) : iso(start),
    end: allDay ? formatISO(addDays(end, 1), { representation: 'date' }) : iso(end),
    editable: false,
    allDay,
    color: '#a3c1e7',
    className: 'source1 type3 campus1',
    data: {
      meta: { eventId: id, type: 'School Event', variant: 'event', author: 'Sheldon College', ...extra },
      links: { path: `/calendar/event/${id}` },
      attendance: { hasAttendance: false },
    },
  };
}

/** Build a calendar feed for [start, end). */
export function buildCalendar(start: Date, end: Date): CalendarAjaxEvent[] {
  const out: CalendarAjaxEvent[] = [];
  let id = 1000;
  for (let d = new Date(start); d < end; d = addDays(d, 1)) {
    const dow = d.getDay(); // 0 Sun
    if (dow >= 1 && dow <= 5) {
      out.push(homeroom(d, id++));
      GRID[dow - 1].forEach((subjectIdx, i) => out.push(classEvent(d, PERIODS[i + 1], SUBJECTS[subjectIdx], id++)));
    }
  }
  const today = new Date();
  const monday = startOfWeek(today, { weekStartsOn: 1 });
  const dues: CalendarAjaxEvent[] = [
    dueWork(addDays(today, -3), 'Persuasive speech draft', SUBJECTS[0], 5001, true),
    dueWork(addDays(today, -1), 'Chapter 7 problem set', SUBJECTS[1], 5002),
    dueWork(today, 'Robot drivetrain CAD submission', SUBJECTS[3], 5003, false, 23),
    dueWork(addDays(today, 2), 'Prac report: titration', SUBJECTS[2], 5004),
    dueWork(addDays(today, 4), 'Source analysis: Federation', SUBJECTS[4], 5005),
    dueWork(addDays(today, 9), 'Python project milestone 2', SUBJECTS[6], 5006),
    dueWork(addDays(today, 16), 'Fitness journal reflection', SUBJECTS[5], 5007),
  ];
  const events: CalendarAjaxEvent[] = [
    schoolEvent(at(addDays(monday, 1), [15, 15]), at(addDays(monday, 1), [17, 0]), 'FTC Robotics Club', 7001, { location: 'Innovation Hub', type: 'Co-curricular' }),
    schoolEvent(at(addDays(monday, 3), [15, 15]), at(addDays(monday, 3), [17, 0]), 'FTC Robotics Club', 7002, { location: 'Innovation Hub', type: 'Co-curricular' }),
    schoolEvent(addDays(monday, 4), addDays(monday, 4), 'Free Dress Day: Fraser House fundraiser', 7003, { type: 'School Event' }, true),
    schoolEvent(at(addDays(monday, 8), [18, 0]), at(addDays(monday, 8), [20, 0]), 'Year 10 Subject Selection Evening', 7004, { location: 'Performing Arts Centre', type: 'Parent Event' }),
    schoolEvent(addDays(monday, 11), addDays(monday, 12), 'FTC Queensland Scrimmage', 7005, { location: 'Off campus', type: 'Co-curricular' }, true),
    schoolEvent(at(addDays(monday, 14), [8, 30]), at(addDays(monday, 14), [15, 0]), 'Year 10 Exam Block begins', 7006, { type: 'Academic' }),
  ];
  const inRange = (e: CalendarAjaxEvent) => new Date(e.start) < end && new Date(e.end) >= start;
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
    _links: { self: '/news/3101' },
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
    title: 'Fraser House free dress day this Friday',
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
      assessment: { id: 5001, title: 'Persuasive speech draft', folder: { name: '10 English A' } },
      mark: 'A-',
      comment: 'Strong structure and a confident voice. Tighten the evidence in paragraph two and this is an A.',
      creator: { firstName: 'Rebecca', lastName: 'White' },
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
      assessment: { id: 4990, title: 'Algebra test', folder: { name: '10 Mathematics' } },
      mark: '78%',
      comment: 'Good working shown throughout. Revise factorising quadratics with non-unit coefficients.',
      creator: { firstName: 'David', lastName: 'Chen' },
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
