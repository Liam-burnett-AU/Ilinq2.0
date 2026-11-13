// Types mirroring the Schoolbox API (alaress/schoolbox-api-docs, 26.x).
// Only the fields this app reads are modelled; unknown fields are preserved
// at runtime because we never strip responses.

export type RoleType = 'staff' | 'student' | 'parent' | 'guest';

export interface Role {
  id: number;
  name: string;
  type: RoleType;
}

export interface NamedId {
  id: number;
  name: string;
}

export interface Campus extends NamedId {
  code?: string;
  /** Number of days in this campus' timetable cycle. */
  days?: number;
}

/** Entry in `user.groups` (userGroupMembership-readableFields). */
export interface GroupMembership {
  id: number;
  name: string;
  type?: 'private' | 'moderated' | 'free';
  isForceFollow?: boolean;
  isFavourite?: boolean;
  isNotificationsOn?: boolean;
  enrolmentStatus?: 'enroled' | 'notEnroled' | 'pending';
  membership?: 'admin' | 'write' | 'read' | 'none';
  _links?: { homepage?: string | null };
}

/** `guardians` / `students` entries (userRelated). Note lower-case name keys. */
export interface RelatedUser {
  id: number;
  externalId?: string;
  title?: string | null;
  firstname: string;
  preferredName?: string | null;
  givenName?: string;
  lastname: string;
  fullName: string;
  role: Role & { student?: boolean; staff?: boolean; parent?: boolean; guest?: boolean };
}

export interface UserShort {
  id: number;
  title?: string | null;
  firstName: string;
  preferredName?: string | null;
  givenName?: string;
  lastName?: string | null;
  fullName: string;
  role?: Role;
  yearLevel?: NamedId | null;
}

export interface User {
  id: number;
  externalId?: string;
  username: string;
  title?: string | null;
  firstName: string;
  lastName?: string | null;
  preferredName?: string | null;
  fullName?: string | null;
  email?: string;
  positionTitle?: string | null;
  superuser?: boolean;
  enabled?: boolean;
  role: Role;
  campus?: Campus[];
  yearLevel?: NamedId | null;
  schoolHouse?: NamedId | null;
  groups?: GroupMembership[];
  guardians?: RelatedUser[] | null;
  students?: RelatedUser[] | null;
  impersonableUsers?: UserShort[];
  flags?: {
    showContacts?: boolean;
    enableTimetable?: boolean;
    showSideNav?: boolean;
    showNotificationsPanel?: boolean;
    showGradeGraph?: boolean;
    calendarView?: 'month' | 'agendaWeek' | 'agendaDay' | 'list';
  };
  _links?: { profile?: string; avatar?: string | null };
}

/** POST /api/session success body. */
export interface SessionInfo {
  id: number;
  /** Key for RSS / VCAL feeds on behalf of the user. */
  key: string;
  role: RoleType;
  username: string;
}

/** GET /calendar/ajax/full item (FullCalendar-shaped). */
export interface CalendarAjaxEvent {
  resourceId?: string | number | null;
  title: string;
  /** RFC3339 date-time, or YYYY-MM-DD when allDay. */
  start: string;
  end: string;
  editable: boolean;
  allDay: boolean;
  color: string;
  className: string;
  data: {
    meta?: {
      editable?: boolean;
      eventId?: number | string;
      time?: string;
      detail?: string;
      location?: string;
      eventTypeId?: number;
      eventType?: string;
      variant?: string;
      type?: string;
      author?: string;
      authorId?: number;
      level?: string;
      completed?: boolean;
      seriesId?: number | string | null;
    };
    links?: { category?: NamedId | { id: number; name: string }; path?: string | null };
    styles?: { visible?: string };
    attendance?: { hasAttendance?: boolean; status?: { current?: 1 | 2 | 3 | null } };
    classAttendance?: { url?: string | null; target?: string | null };
  };
}

export interface NewsTopic {
  id?: number;
  name: string;
  slug: string;
  sequence?: number;
}

export interface NewsFeatureImage {
  mime?: string;
  size?: number;
  _links?: { image?: { href: string; auth?: boolean | null } };
}

/** Item from GET /news/lists/feed. */
export interface NewsFeedItem {
  id: number;
  title: string;
  /** Raw HTML blurb. */
  blurb: string;
  featureImage?: NewsFeatureImage | null;
  publishAt: string;
  topics?: NewsTopic[];
  status?: string;
  statusDate?: string;
  readMore?: { string?: string; available?: boolean };
  metadata?: { commentCount?: number | null };
  attachments?: number | null;
  viewedAt?: string | null;
  _links?: { self?: string; saveForLater?: string; unsaveForLater?: string; update?: string };
}

export interface NewsAuthor {
  id?: number;
  firstname?: string;
  lastname?: string;
  title?: string;
  fullname?: string;
  preferredName?: string | null;
  givenName?: string;
}

export interface SbFile {
  hash?: string;
  name: string;
  mime?: string;
  type?: 'image' | 'video' | 'audio' | 'document' | 'other';
  size?: number;
  _links?: { icon?: string; image?: string; stream?: string; poster?: string; download?: string };
}

/** GET /news/{id}. */
export interface NewsArticleResponse {
  isSavedForLater?: boolean;
  article: NewsFeedItem & {
    body?: string;
    author?: NewsAuthor;
    attachedFiles?: SbFile[];
    sticky?: boolean;
  };
}

export interface ListMetadata {
  count?: number;
  cursor?: { current: string | null; next: string | null };
}

export type SearchResultType =
  | 'assessment' | 'assessment.dueWork' | 'assessment.lessonPlan' | 'assessment.project' | 'assessment.task' | 'assessment.quiz' | 'assessment.lti'
  | 'badge' | 'blog' | 'event' | 'file' | 'file.audio' | 'file.document' | 'file.image' | 'file.video' | 'file.other'
  | 'forum' | 'link' | 'news' | 'page' | 'page.class' | 'page.course' | 'page.unit' | 'page.homepage' | 'page.other'
  | 'textBox' | 'tile' | 'user' | 'user.guest' | 'user.parent' | 'user.staff' | 'user.student';

export interface SearchResult {
  id: number;
  type: SearchResultType | string;
  date?: string | null;
  url: string;
  title: string;
  meta?: string | null;
  image?: string | null;
  description?: string | null;
  creator?: { id: number; firstName?: string; lastName?: string | null; fullName?: string; title?: string | null } | null;
  context?: { id: number; name: string; url?: string }[];
  icon?: string;
  _links?: Record<string, string>;
  _subResults?: SearchResultList;
}

export interface SearchResultList {
  data: SearchResult[];
  metadata?: ListMetadata;
}

export interface SearchFilter {
  types?: SearchResultType[];
  date?: { from?: string; to?: string };
  creator?: { id: number };
}

/** GET /learning/evidenceFeed/user/{id} items. */
export type EvidenceDiscriminator = 'evidence' | 'badge' | 'dueWorkFeedback' | string;

export interface EvidenceFeedItem {
  discriminator: EvidenceDiscriminator;
  date: string;
  object: Record<string, unknown> & {
    id?: number;
    body?: string;
    title?: string;
    name?: string;
    comment?: string;
    mark?: string | null;
    creator?: { firstName?: string | null; lastName?: string | null; _links?: { avatar?: string } };
    tags?: { name: string }[];
    assessment?: { id?: number; title?: string; folder?: { name?: string } };
    _links?: Record<string, string>;
  };
}

export interface EvidenceFeedResponse {
  data: EvidenceFeedItem[];
  metadata?: ListMetadata;
}

export interface AssessmentItem {
  id: number;
  title: string;
  assessmentType: 'dueWork' | 'quiz' | 'task' | 'project' | 'LTI' | 'lessonPlan' | 'dialogAgent' | 'reporting';
  folder?: { id: number; name: string; code?: string | string[] | null; yearLevel?: NamedId[] | null };
  subjectCode?: string | null;
  workType?: NamedId | null;
  weight?: number | null;
  dueDate?: string | null;
  markType?: string | null;
}

export interface AssessmentList {
  data: AssessmentItem[];
  metadata?: ListMetadata;
}

export interface UserToken {
  token?: string;
  name?: string | null;
  jwtId: string;
  type?: 'api' | 'qrcode' | 'apitest' | null;
  scopes?: string[];
  createdAt?: string;
  expiry?: string;
}

/** RFC 7807 problem details, returned when Accept: application/json. */
export interface Problem {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
}
